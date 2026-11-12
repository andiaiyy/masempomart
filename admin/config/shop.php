<?php

return [

    // The storefront's address, for receipt links in emails
    'storefront_url' => rtrim(env('STOREFRONT_URL', 'http://localhost:3000'), '/'),

    // Vercel Cron sends this as a bearer token to /api/cron/expire-orders
    'cron_secret' => env('CRON_SECRET'),

    // Defaults for the admin's Shop settings page, used until something is saved there
    'instagram_url' => env('SHOP_INSTAGRAM_URL', 'https://www.instagram.com/masempo.mart'),
    'order_notify_email' => env('SHOP_ORDER_NOTIFY_EMAIL'),

    // Minutes an unpaid order keeps its packs reserved while the shopper makes the bank transfer.
    // The receipt shows this deadline. An admin can still mark a late transfer paid afterwards.
    'hold_minutes' => (int) env('SHOP_HOLD_MINUTES', 60),

    // Variants at or below this many packs show up in the admin "Low stock" list.
    'low_stock' => (int) env('SHOP_LOW_STOCK', 5),

    // Disk for product and category photos: "public" locally, an S3-compatible bucket (R2) in production.
    'media_disk' => env('SHOP_MEDIA_DISK', 'public'),

    // Parcel weight = packs + packaging. Free shipping from this subtotal (0 = never); the shop
    // then pays the courier, so every courier option shows Gratis.
    'shipping' => [
        'packaging_grams' => (int) env('SHOP_PACKAGING_GRAMS', 100),
        'free_over' => (int) env('SHOP_FREE_SHIPPING_OVER', 0),
    ],

    /*
     * Courier rates from RajaOngkir (Komerce API v1). The origin is the destination id parcels
     * leave from: find it with `php artisan rajaongkir:search "<kecamatan or postal code>"`.
     * Couriers are codes from RajaOngkir's courier list, joined with ":".
     */
    'rajaongkir' => [
        'key' => env('RAJAONGKIR_API_KEY'),
        'base_url' => env('RAJAONGKIR_BASE_URL', 'https://rajaongkir.komerce.id/api/v1'),
        'origin' => (int) env('RAJAONGKIR_ORIGIN', 0),
        'couriers' => env('RAJAONGKIR_COURIERS', 'jne:jnt:sicepat:pos:tiki:ninja:lion'),
    ],

];
