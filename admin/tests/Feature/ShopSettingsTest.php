<?php

namespace Tests\Feature;

use App\Models\Setting;
use App\Services\Orders;
use App\Services\ShopSettings;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ShopSettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_whatsapp_takes_a_number_or_a_link(): void
    {
        $this->assertSame('6281234567890', ShopSettings::normalizeWhatsapp('0812-3456 7890'));
        $this->assertSame('6281234567890', ShopSettings::normalizeWhatsapp('+62 812 3456 7890'));
        $this->assertSame('https://wa.link/abc123', ShopSettings::normalizeWhatsapp(' https://wa.link/abc123 '));
        $this->assertNull(ShopSettings::normalizeWhatsapp('call me'));

        $settings = app(ShopSettings::class);
        Setting::write('payment_whatsapp', '6281234567890');
        $this->assertSame('https://wa.me/6281234567890?text=Halo%20toko', $settings->whatsappUrl('Halo toko'));

        // A wa.me link still gets the message; other links open as they are
        Setting::write('payment_whatsapp', 'https://wa.me/6281234567890');
        $this->assertSame('https://wa.me/6281234567890?text=Halo', $settings->whatsappUrl('Halo'));
        Setting::write('payment_whatsapp', 'https://api.whatsapp.com/send?phone=6281234567890');
        $this->assertSame('https://wa.me/6281234567890', $settings->whatsappUrl());
        Setting::write('payment_whatsapp', 'https://wa.link/abc123');
        $this->assertSame('https://wa.link/abc123', $settings->whatsappUrl('Halo'));
    }

    public function test_instagram_links_lose_their_tracking(): void
    {
        $clean = 'https://www.instagram.com/masempo.mart';
        $this->assertSame($clean, ShopSettings::normalizeInstagram('https://www.instagram.com/masempo.mart?obrf=MWg5d3d1Z2Fyem9yNA%3D%3D&utm_source=qr'));
        $this->assertSame($clean, ShopSettings::normalizeInstagram('@masempo.mart'));
        $this->assertSame($clean, ShopSettings::normalizeInstagram('instagram.com/masempo.mart/'));
        $this->assertNull(ShopSettings::normalizeInstagram('not a profile!'));
    }

    public function test_storefront_gets_the_contact_links(): void
    {
        Setting::write('payment_whatsapp', '6281234567890');

        $this->getJson('/api/shop')->assertOk()->assertExactJson([
            'whatsapp_url' => 'https://wa.me/6281234567890',
            'instagram_url' => 'https://www.instagram.com/masempo.mart',
            'instagram_handle' => '@masempo.mart',
        ]);
    }

    public function test_cron_expires_orders_only_with_the_secret(): void
    {
        config(['shop.cron_secret' => 'cron-secret']);
        $variant = $this->variant(stock: 5);
        app(Orders::class)->place($this->customer(), [['variant_id' => $variant->id, 'quantity' => 2]], $this->shipping());
        $this->travel(config('shop.hold_minutes') + 1)->minutes();

        $this->getJson('/api/cron/expire-orders')->assertForbidden();
        $this->getJson('/api/cron/expire-orders', ['Authorization' => 'Bearer wrong'])->assertForbidden();
        $this->assertSame(3, $variant->fresh()->stock);

        $this->getJson('/api/cron/expire-orders', ['Authorization' => 'Bearer cron-secret'])->assertOk()->assertJsonPath('expired', 1);
        $this->assertSame(5, $variant->fresh()->stock);

        config(['shop.cron_secret' => null]);
        $this->getJson('/api/cron/expire-orders', ['Authorization' => 'Bearer '])->assertForbidden();
    }
}
