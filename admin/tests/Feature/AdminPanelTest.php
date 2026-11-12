<?php

namespace Tests\Feature;

use App\Filament\Pages\ShopSettings;
use App\Filament\Resources\OrderResource\Pages\ViewOrder;
use App\Filament\Resources\ProductResource\Pages\CreateProduct;
use App\Filament\Resources\ProductResource\Pages\EditProduct;
use App\Filament\Resources\RestockResource\Pages\CreateRestock;
use App\Models\Order;
use App\Models\Product;
use App\Models\Setting;
use App\Models\User;
use App\Services\Orders;
use Filament\Forms\Components\Repeater;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Livewire\Livewire;
use Tests\TestCase;

class AdminPanelTest extends TestCase
{
    use RefreshDatabase;

    public function test_guests_are_sent_to_the_login_page(): void
    {
        $this->get('/')->assertRedirect('/login');
        $this->get('/login')->assertOk();
    }

    public function test_panel_pages_render(): void
    {
        $this->actingAs(User::factory()->create());
        $variant = $this->variant(stock: 2);
        $order = app(Orders::class)->place($this->customer(), [['variant_id' => $variant->id, 'quantity' => 1]], $this->shipping());

        foreach (['/', '/products', '/products/create', "/products/{$variant->product_id}/edit", '/categories',
            '/restocks', "/restocks/create?variant={$variant->id}", '/orders', "/orders/{$order->id}", '/shop-settings', '/users'] as $url) {
            $this->get($url)->assertOk();
        }
    }

    public function test_product_form_saves_variants_but_not_stock_of_existing_ones(): void
    {
        $this->actingAs(User::factory()->create());
        $category = $this->variant()->product->category;
        $undoRepeaterFake = Repeater::fake();

        Livewire::test(CreateProduct::class)
            ->fillForm([
                'name' => 'Nastar Nanas',
                'slug' => 'nastar-nanas',
                'category_id' => $category->id,
                'variants' => [
                    ['name' => '250 g', 'price' => 55000, 'weight_grams' => 450, 'stock' => 12, 'is_active' => true],
                    ['name' => '500 g', 'price' => 98000, 'weight_grams' => 750, 'stock' => 6, 'is_active' => true],
                ],
            ])
            ->call('create')
            ->assertHasNoFormErrors();

        $product = Product::where('slug', 'nastar-nanas')->with('variants')->sole();
        $this->assertSame([12, 6], $product->variants->sortBy('sort_order')->pluck('stock')->all());

        // An order reserves a pack while the form is open; saving must not undo that.
        $form = Livewire::test(EditProduct::class, ['record' => $product->getRouteKey()]);
        app(Orders::class)->place($this->customer(), [['variant_id' => $product->variants->first()->id, 'quantity' => 1]], $this->shipping());
        $form->fillForm(['name' => 'Nastar Nanas Premium'])->call('save')->assertHasNoFormErrors();

        $this->assertSame('Nastar Nanas Premium', $product->fresh()->name);
        $this->assertSame(11, $product->variants->first()->fresh()->stock);
        $undoRepeaterFake();
    }

    public function test_was_price_must_be_above_the_price(): void
    {
        $this->actingAs(User::factory()->create());
        $category = $this->variant()->product->category;
        $undoRepeaterFake = Repeater::fake();

        Livewire::test(CreateProduct::class)
            ->fillForm([
                'name' => 'Kacang Disko',
                'slug' => 'kacang-disko-promo',
                'category_id' => $category->id,
                'variants' => [['name' => '250 g', 'price' => 20000, 'compare_at_price' => 18000, 'weight_grams' => 270, 'stock' => 5, 'is_active' => true]],
            ])
            ->call('create')
            ->assertHasFormErrors(['variants.0.compare_at_price']);

        $this->assertFalse(Product::where('slug', 'kacang-disko-promo')->exists());
        $undoRepeaterFake();
    }

    public function test_restocks_and_write_offs_move_stock(): void
    {
        $this->actingAs(User::factory()->create());
        $variant = $this->variant(stock: 3);

        Livewire::test(CreateRestock::class)
            ->fillForm(['product_variant_id' => $variant->id, 'quantity' => 20, 'expires_on' => '2027-03-01'])
            ->call('create')
            ->assertHasNoFormErrors();
        $this->assertSame(23, $variant->fresh()->stock);

        Livewire::test(CreateRestock::class)
            ->fillForm(['product_variant_id' => $variant->id, 'quantity' => -30, 'note' => 'Bocor'])
            ->call('create')
            ->assertHasFormErrors(['quantity']);
        $this->assertSame(23, $variant->fresh()->stock);

        Livewire::test(CreateRestock::class)
            ->fillForm(['product_variant_id' => $variant->id, 'quantity' => -3])
            ->call('create')
            ->assertHasFormErrors(['note' => 'required']);
    }

    public function test_paid_orders_can_be_shipped_from_the_order_page(): void
    {
        $this->actingAs(User::factory()->create());
        $order = app(Orders::class)->place($this->customer(), [['variant_id' => $this->variant()->id, 'quantity' => 1]], $this->shipping());
        app(Orders::class)->markPaid($order);

        Livewire::test(ViewOrder::class, ['record' => $order->getRouteKey()])
            ->callAction('ship', data: ['courier' => 'JNE', 'tracking_number' => 'CGK123'])
            ->assertHasNoActionErrors();

        $this->assertSame('shipped', Order::find($order->id)->status);
    }

    public function test_admin_marks_a_transfer_paid_even_after_the_reservation_ended(): void
    {
        $this->actingAs(User::factory()->create());
        $variant = $this->variant(stock: 5);
        $order = app(Orders::class)->place($this->customer(), [['variant_id' => $variant->id, 'quantity' => 2]], $this->shipping());
        app(Orders::class)->release($order, 'expired');
        $this->assertSame(5, $variant->fresh()->stock);

        Livewire::test(ViewOrder::class, ['record' => $order->getRouteKey()])
            ->callAction('markPaid')
            ->assertHasNoActionErrors();

        $order->refresh();
        $this->assertSame('paid', $order->status);
        $this->assertSame('bank_transfer', $order->payment_type);
        $this->assertSame(3, $variant->fresh()->stock);
    }

    public function test_shop_settings_page_saves_accounts_contact_and_notify_email(): void
    {
        $this->actingAs(User::factory()->create());
        $undoRepeaterFake = Repeater::fake();

        Livewire::test(ShopSettings::class)
            ->fillForm([
                'bank_accounts' => [['bank' => 'BCA', 'account_number' => '123-456 7890', 'account_name' => 'Masempo Mart']],
                'payment_whatsapp' => '0812 3456 7890',
                'instagram_url' => 'https://www.instagram.com/masempo.mart?igsh=MWg5d3d1&utm_source=qr',
                'order_notify_email' => 'toko@example.com',
            ])
            ->call('save')
            ->assertHasNoFormErrors();

        $this->assertSame([['bank' => 'BCA', 'account_number' => '1234567890', 'account_name' => 'Masempo Mart']], Setting::read('bank_accounts'));
        $this->assertSame('6281234567890', Setting::read('payment_whatsapp'));
        $this->assertSame('https://www.instagram.com/masempo.mart', Setting::read('instagram_url'));
        $this->assertSame('toko@example.com', Setting::read('order_notify_email'));

        Livewire::test(ShopSettings::class)
            ->fillForm(['payment_whatsapp' => 'not a number'])
            ->call('save')
            ->assertHasFormErrors(['payment_whatsapp']);

        $undoRepeaterFake();
    }
}
