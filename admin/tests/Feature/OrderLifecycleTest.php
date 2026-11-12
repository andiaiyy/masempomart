<?php

namespace Tests\Feature;

use App\Models\Order;
use App\Models\ProductVariant;
use App\Services\Orders;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class OrderLifecycleTest extends TestCase
{
    use RefreshDatabase;

    private function order(ProductVariant $variant, int $quantity = 2): Order
    {
        return app(Orders::class)->place($this->customer(), [['variant_id' => $variant->id, 'quantity' => $quantity]], $this->shipping());
    }

    public function test_abandoned_orders_expire_and_return_their_packs(): void
    {
        $variant = $this->variant(stock: 5);
        $order = $this->order($variant);
        $this->travel(config('shop.hold_minutes') + 1)->minutes();

        $this->assertSame(1, app(Orders::class)->expireStale());
        $this->assertSame(0, app(Orders::class)->expireStale());

        $this->assertSame('expired', $order->fresh()->status);
        $this->assertSame(5, $variant->fresh()->stock);
    }

    public function test_the_catalog_frees_packs_from_abandoned_orders(): void
    {
        $variant = $this->variant(stock: 2);
        $this->order($variant);
        $this->getJson('/api/products')->assertJsonPath('data.0.in_stock', false);

        $this->travel(2)->hours();

        $this->getJson('/api/products')->assertJsonPath('data.0.variants.0.stock', 2);
    }

    public function test_admin_payment_keeps_the_packs_reserved_and_counts_once(): void
    {
        $variant = $this->variant(stock: 5);
        $order = $this->order($variant);

        app(Orders::class)->markPaid($order);
        app(Orders::class)->markPaid($order);

        $order->refresh();
        $this->assertSame('paid', $order->status);
        $this->assertSame('bank_transfer', $order->payment_type);
        $this->assertNotNull($order->paid_at);
        $this->assertSame(3, $variant->fresh()->stock);
    }

    public function test_payment_after_expiry_takes_the_packs_again(): void
    {
        $variant = $this->variant(stock: 5);
        $order = $this->order($variant);
        app(Orders::class)->release($order, 'expired');

        app(Orders::class)->markPaid($order);

        $order->refresh();
        $this->assertSame('paid', $order->status);
        $this->assertNull($order->issue);
        $this->assertSame(3, $variant->fresh()->stock);
    }

    public function test_payment_after_expiry_flags_packs_that_sold_out_meanwhile(): void
    {
        $variant = $this->variant(stock: 2);
        $order = $this->order($variant);
        app(Orders::class)->release($order, 'expired');
        $this->order($variant); // someone else bought the two packs

        app(Orders::class)->markPaid($order);

        $order->refresh();
        $this->assertSame('paid', $order->status);
        $this->assertStringContainsString('out of stock', $order->issue);
        $this->assertSame(0, $variant->fresh()->stock);
    }

    public function test_admin_cancel_returns_packs_and_shipping_needs_a_paid_order(): void
    {
        $orders = app(Orders::class);
        $variant = $this->variant(stock: 5);
        $order = $this->order($variant);

        $this->assertFalse($orders->ship($order, 'JNE', 'RESI1'));
        $this->assertTrue($orders->release($order, 'cancelled'));
        $this->assertFalse($orders->release($order, 'cancelled'));
        $this->assertSame(5, $variant->fresh()->stock);

        $paid = $this->order($variant);
        $orders->markPaid($paid);
        $this->assertTrue($orders->ship($paid, 'JNE', 'RESI1'));
        $this->assertTrue($orders->complete($paid));
        $this->assertSame('completed', $paid->status);
    }

    public function test_order_page_shows_status_without_the_address(): void
    {
        $order = $this->order($this->variant());

        $this->getJson("/api/orders/{$order->code}")
            ->assertOk()
            ->assertJsonPath('status', 'pending')
            ->assertJsonPath('payment.bank_accounts', []) // none set up yet
            ->assertJsonMissingPath('address')
            ->assertJsonMissingPath('phone');
        $this->getJson('/api/orders/MM-NOPE')->assertNotFound();
    }
}
