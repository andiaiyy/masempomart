<?php

namespace Tests\Feature;

use App\Services\Shipping;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class CatalogAndShippingTest extends TestCase
{
    use RefreshDatabase;

    public function test_courier_options_come_from_rajaongkir_cheapest_first(): void
    {
        $options = app(Shipping::class)->options(self::DESTINATION, 1001, 50000);

        // 1.001 g bills as 2 kg; SiCepat REG is cheapest
        $this->assertSame(['sicepat REG 18000', 'jne REG 20000', 'jne YES 36000'], array_map(fn ($o) => "{$o['courier']} {$o['service']} {$o['cost']}", $options));
        $this->assertSame(['SiCepat', '2-4 hari'], [$options[0]['courier_name'], $options[0]['etd']]);
        $this->assertSame(600, app(Shipping::class)->weight(500));

        // One request for both couriers, joined the way the API expects
        Http::assertSent(fn ($request) => str_ends_with($request->url(), 'calculate/domestic-cost')
            && $request['origin'] == 77 && $request['destination'] == self::DESTINATION
            && $request['weight'] == 1001 && $request['courier'] === 'jne:sicepat'
            && $request->header('key') === ['test-key']);
        Http::assertSentCount(1);

        // Asked again: answered from the cache, not the API
        app(Shipping::class)->options(self::DESTINATION, 1001, 50000);
        Http::assertSentCount(1);

        config(['shop.shipping.free_over' => 50000]);
        $free = app(Shipping::class)->options(self::DESTINATION, 1001, 50000);
        $this->assertSame([0, 18000], [$free[0]['cost'], $free[0]['courier_cost']]);
    }

    public function test_quote_endpoint_lists_courier_services_for_the_cart(): void
    {
        $variant = $this->variant(price: 20000, grams: 950);

        $this->postJson('/api/shipping/quote', ['destination_id' => self::DESTINATION, 'items' => [['variant_id' => $variant->id, 'quantity' => 1]]])
            ->assertOk()
            ->assertJsonPath('subtotal', 20000)
            ->assertJsonPath('weight_grams', 1050)
            ->assertJsonPath('options.0', ['courier' => 'sicepat', 'courier_name' => 'SiCepat', 'service' => 'REG', 'description' => 'Reguler', 'cost' => 18000, 'etd' => '2-4 hari'])
            ->assertJsonCount(3, 'options');
    }

    public function test_destination_search_and_missing_setup(): void
    {
        $this->getJson('/api/shipping/destinations?search=Panakkukang')
            ->assertOk()
            ->assertJsonPath('data.0.id', self::DESTINATION)
            ->assertJsonPath('data.0.city', 'MAKASSAR')
            ->assertJsonPath('data.0.postal_code', '90231');
        $this->getJson('/api/shipping/destinations?search=Narnia')->assertOk()->assertJsonPath('data', []);
        $this->getJson('/api/shipping/destinations?search=ab')->assertJsonValidationErrors('search');

        config(['shop.rajaongkir.key' => null]);
        $this->getJson('/api/shipping/options')->assertJsonPath('shipping_ready', false);
        $this->getJson('/api/shipping/destinations?search=Tamalanrea')
            ->assertStatus(503)
            ->assertJsonPath('message', 'Ongkir belum bisa dihitung: toko belum menyambungkan RajaOngkir.');
    }

    public function test_catalog_hides_products_and_variants_that_are_off_sale(): void
    {
        $listed = $this->variant(product: ['name' => 'Nastar']);
        $listed->product->variants()->create(['name' => 'Hidden', 'price' => 1, 'weight_grams' => 1, 'is_active' => false]);
        $this->variant(product: ['name' => 'Off sale', 'is_active' => false]);

        $this->getJson('/api/products')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Nastar')
            ->assertJsonCount(1, 'data.0.variants');

        $this->getJson("/api/products/{$listed->product->slug}")->assertOk()->assertJsonPath('price_from', 15000);
        $this->getJson('/api/products/does-not-exist')->assertNotFound();
        $this->getJson('/api/categories')->assertOk()->assertJsonPath('0.product_count', 1);
    }

    public function test_product_page_gets_specs_in_order_and_its_neighbours(): void
    {
        $first = $this->variant(product: ['name' => 'A Keripik', 'specs' => [['label' => 'Asal', 'value' => 'Maros'], ['label' => 'Daya tahan', 'value' => '3 bulan']]])->product;
        $middle = $this->variant(product: ['name' => 'B Keripik'])->product;
        $last = $this->variant(product: ['name' => 'C Keripik'])->product;

        $this->getJson("/api/products/{$first->slug}")
            ->assertJsonPath('specs', [['label' => 'Asal', 'value' => 'Maros'], ['label' => 'Daya tahan', 'value' => '3 bulan']])
            ->assertJsonPath('previous', null)
            ->assertJsonPath('next.slug', $middle->slug);
        $this->getJson("/api/products/{$middle->slug}")
            ->assertJsonPath('previous.slug', $first->slug)
            ->assertJsonPath('next.slug', $last->slug);
        $this->getJson("/api/products/{$last->slug}")->assertJsonPath('next', null);
    }

    public function test_cart_can_refresh_prices_and_stock(): void
    {
        $onSale = $this->variant(stock: 4, price: 12000);
        $offSale = $this->variant(product: ['is_active' => false]);

        $this->getJson("/api/variants?ids={$onSale->id},{$offSale->id},999,abc")
            ->assertOk()
            ->assertJsonCount(2)
            ->assertJsonFragment(['id' => $onSale->id, 'price' => 12000, 'stock' => 4, 'available' => true])
            ->assertJsonFragment(['id' => $offSale->id, 'available' => false]);
    }

    public function test_catalog_filters_sorts_and_reports_ranges_and_counts(): void
    {
        $cheap = $this->variant(stock: 0, price: 12000, product: ['name' => 'Permen']);
        $promo = $this->variant(price: 30000, product: ['name' => 'Mete']);
        $promo->update(['compare_at_price' => 36000]);
        $dear = $this->variant(price: 98000, product: ['name' => 'Nastar']);

        $names = fn (string $query) => collect($this->getJson("/api/products?{$query}")->assertOk()->json('data'))->pluck('name')->all();

        $this->assertSame(['Mete', 'Nastar'], $names('min_price=20000'));
        $this->assertSame(['Permen', 'Mete'], $names('max_price=50000&sort=price_asc'));
        $this->assertSame(['Nastar', 'Mete', 'Permen'], $names('sort=price_desc'));
        $this->assertSame(['Mete', 'Nastar'], $names('in_stock=1&sort=name'));
        $this->assertSame(['Mete'], $names('on_sale=1'));

        $this->getJson('/api/products?min_price=50000')
            ->assertJsonPath('meta.total', 1)
            // Bounds and counts describe the whole category/search, not the filtered list
            ->assertJsonPath('meta.price_range', ['min' => 12000, 'max' => 98000])
            ->assertJsonPath('meta.counts', ['in_stock' => 2, 'on_sale' => 1]);

        $this->getJson("/api/products/{$promo->product->slug}")->assertJsonPath('variants.0.compare_at_price', 36000);
        $this->getJson("/api/products/{$dear->product->slug}")->assertJsonPath('variants.0.compare_at_price', null);
        $this->assertSame(0, $cheap->fresh()->stock);
    }

    public function test_best_selling_counts_only_paid_orders(): void
    {
        $orders = app(\App\Services\Orders::class);
        $popular = $this->variant(stock: 20, product: ['name' => 'B Populer']);
        $unpaidOnly = $this->variant(stock: 20, product: ['name' => 'A Belum dibayar']);
        $this->variant(product: ['name' => 'C Sepi']);

        $paid = $orders->place($this->customer(), [['variant_id' => $popular->id, 'quantity' => 3]], $this->shipping());
        $orders->markPaid($paid, 'qris');
        $orders->place($this->customer(), [['variant_id' => $unpaidOnly->id, 'quantity' => 10]], $this->shipping());

        $names = collect($this->getJson('/api/products?sort=best')->assertOk()->json('data'))->pluck('name')->all();

        // Paid sales first; the big unpaid order doesn't count, so the rest fall back to A-Z
        $this->assertSame(['B Populer', 'A Belum dibayar', 'C Sepi'], $names);
    }

    public function test_catalog_filters_by_category_and_search(): void
    {
        $this->variant(product: ['name' => 'Kacang Mete']);

        $this->getJson('/api/products?category=keripik&q=mete')->assertJsonCount(1, 'data');
        $this->getJson('/api/products?q=coklat')->assertJsonCount(0, 'data');
        $this->getJson('/api/products?category=minuman')->assertJsonCount(0, 'data');
    }
}
