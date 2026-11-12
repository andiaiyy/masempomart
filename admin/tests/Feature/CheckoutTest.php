<?php

namespace Tests\Feature;

use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Models\Setting;
use Tests\TestCase;

class CheckoutTest extends TestCase
{
    use RefreshDatabase;

    private function checkout(array $items, array $customer = [], ?array $shipping = null)
    {
        return $this->postJson('/api/checkout', ['customer' => $this->customer($customer), 'items' => $items, 'shipping' => $shipping ?? $this->shipping()]);
    }

    public function test_order_reserves_stock_and_is_priced_from_the_database(): void
    {
        $variant = $this->variant(stock: 10, price: 15000, grams: 450);

        $this->checkout([['variant_id' => $variant->id, 'quantity' => 2, 'price' => 1]])
            ->assertCreated()
            ->assertJsonStructure(['code']);

        $order = Order::with('items')->sole();
        $this->assertSame('pending', $order->status);
        $this->assertSame(30000, $order->subtotal);
        // 2 × 450 g + 100 g packaging = 1 kg, JNE REG from the (fake) RajaOngkir
        $this->assertSame(1000, $order->weight_grams);
        $this->assertSame(10000, $order->shipping);
        $this->assertSame(['jne', 'REG', '2-3 hari', self::DESTINATION], [$order->shipping_courier, $order->shipping_service, $order->shipping_etd, $order->destination_id]);
        $this->assertSame(40000, $order->total);
        $this->assertSame(8, $variant->fresh()->stock);
        $this->assertTrue($order->expires_at->isFuture());
    }

    public function test_cannot_order_more_packs_than_in_stock(): void
    {
        $variant = $this->variant(stock: 2);

        $this->checkout([['variant_id' => $variant->id, 'quantity' => 3]])
            ->assertUnprocessable()
            ->assertJsonPath('errors.items.0', "{$variant->label()} tinggal 2 pak.");

        $this->assertSame(2, $variant->fresh()->stock);
        $this->assertSame(0, Order::count());
    }

    public function test_the_last_pack_goes_to_one_order_only(): void
    {
        $variant = $this->variant(stock: 1);

        $this->checkout([['variant_id' => $variant->id, 'quantity' => 1]])->assertCreated();
        $this->checkout([['variant_id' => $variant->id, 'quantity' => 1]])
            ->assertUnprocessable()
            ->assertJsonPath('errors.items.0', "{$variant->label()} sudah habis.");

        $this->assertSame(0, $variant->fresh()->stock);
    }

    public function test_split_lines_of_one_variant_are_counted_together(): void
    {
        $variant = $this->variant(stock: 1);

        $this->checkout([['variant_id' => $variant->id, 'quantity' => 1], ['variant_id' => $variant->id, 'quantity' => 1]])
            ->assertUnprocessable();
        $this->assertSame(1, $variant->fresh()->stock);
    }

    public function test_a_failing_line_puts_back_packs_taken_for_earlier_lines(): void
    {
        $plenty = $this->variant(stock: 5);
        $scarce = $this->variant(stock: 0);

        $this->checkout([['variant_id' => $plenty->id, 'quantity' => 2], ['variant_id' => $scarce->id, 'quantity' => 1]])
            ->assertUnprocessable();
        $this->assertSame(5, $plenty->fresh()->stock);
    }

    public function test_products_taken_off_sale_cannot_be_ordered(): void
    {
        $variant = $this->variant(product: ['is_active' => false]);

        $this->checkout([['variant_id' => $variant->id, 'quantity' => 1]])->assertUnprocessable()->assertJsonValidationErrors('items');
    }

    public function test_destination_and_courier_must_be_picked(): void
    {
        $variant = $this->variant();

        $this->checkout([['variant_id' => $variant->id, 'quantity' => 1]], ['destination_id' => null], ['courier' => '', 'service' => ''])
            ->assertJsonValidationErrors(['customer.destination_id', 'shipping.courier', 'shipping.service']);
    }

    public function test_a_courier_service_that_does_not_serve_the_address_is_refused(): void
    {
        $variant = $this->variant(stock: 3);

        // Made-up service, as if the page were tampered with or the courier dropped the route
        $this->checkout([['variant_id' => $variant->id, 'quantity' => 1]], shipping: ['courier' => 'jne', 'service' => 'FREE'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('shipping');

        $this->assertSame(3, $variant->fresh()->stock);
        $this->assertSame(0, Order::count());
    }

    public function test_no_order_when_rajaongkir_is_down(): void
    {
        $this->rajaOngkirDown = true;
        $variant = $this->variant(stock: 3);

        $this->checkout([['variant_id' => $variant->id, 'quantity' => 1]])
            ->assertStatus(503)
            ->assertJsonPath('message', 'Ongkir belum bisa dihitung. Coba lagi sebentar lagi.');

        $this->assertSame(3, $variant->fresh()->stock);
        $this->assertSame(0, Order::count());
    }

    public function test_searching_and_quoting_do_not_use_up_the_checkout_limit(): void
    {
        $variant = $this->variant(stock: 30);
        // A shopper trying a dozen kecamatan and couriers, with the receipt of an earlier order polling
        foreach (range(1, 15) as $i) {
            $this->getJson('/api/shipping/destinations?search=Panakkukang')->assertOk();
            $this->postJson('/api/shipping/quote', ['destination_id' => self::DESTINATION, 'items' => [['variant_id' => $variant->id, 'quantity' => 1]]])->assertOk();
        }

        $this->checkout([['variant_id' => $variant->id, 'quantity' => 1]])->assertCreated();

        // Checkout keeps its own limit of 10 a minute
        foreach (range(2, 10) as $i) {
            $this->checkout([['variant_id' => $variant->id, 'quantity' => 1]])->assertCreated();
        }
        $this->checkout([['variant_id' => $variant->id, 'quantity' => 1]])->assertTooManyRequests();
    }

    public function test_the_shop_pays_shipping_above_the_free_shipping_threshold(): void
    {
        config(['shop.shipping.free_over' => 50000]);
        $variant = $this->variant(price: 25000);

        $this->checkout([['variant_id' => $variant->id, 'quantity' => 2]])->assertCreated();

        $order = Order::sole();
        $this->assertSame(0, $order->shipping);
        $this->assertSame(50000, $order->total);
    }

    public function test_receipt_lists_where_to_transfer_until_the_order_is_paid(): void
    {
        Setting::write('bank_accounts', [['bank' => 'BCA', 'account_number' => '1234567890', 'account_name' => 'Masempo Mart']]);
        Setting::write('payment_whatsapp', '6281234567890');
        $code = $this->checkout([['variant_id' => $this->variant()->id, 'quantity' => 1]])->json('code');

        $this->getJson("/api/orders/{$code}")
            ->assertOk()
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('payment.bank_accounts.0.account_number', '1234567890')
            ->assertJsonPath('payment.whatsapp', '6281234567890')
            ->assertJsonPath('payment.pay_before', fn ($at) => now()->addMinutes(config('shop.hold_minutes'))->diffInSeconds($at, true) < 5);

        app(\App\Services\Orders::class)->markPaid(Order::sole());

        $this->getJson("/api/orders/{$code}")->assertJsonPath('status', 'paid')->assertJsonPath('payment', null);
    }
}
