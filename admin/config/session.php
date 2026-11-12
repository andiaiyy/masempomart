<?php

use Illuminate\Support\Str;

return [

    'driver' => env('SESSION_DRIVER', 'file'), // ✅ file cocok untuk dev & cookie-based session

    'lifetime' => (int) env('SESSION_LIFETIME', 120),
    'expire_on_close' => env('SESSION_EXPIRE_ON_CLOSE', false),

    'encrypt' => env('SESSION_ENCRYPT', false),

    'files' => storage_path('framework/sessions'),

    'connection' => env('SESSION_CONNECTION', null),
    'table' => env('SESSION_TABLE', 'sessions'),
    'store' => env('SESSION_STORE', null),

    'lottery' => [2, 100],

   'cookie' => env(
        'SESSION_COOKIE',
        Str::slug(env('APP_NAME', 'laravel'), '_') . '_session'
    ),

    'path' => env('SESSION_PATH', '/'),

    // ✅ Ubah jadi 'localhost' supaya cookie bisa dikenali oleh frontend
    'domain' => env('SESSION_DOMAIN', '127.0.0.1'),

    // ✅ Untuk dev lokal (tanpa HTTPS)
    'secure' => env('SESSION_SECURE_COOKIE', false),

    'http_only' => env('SESSION_HTTP_ONLY', true), // Disarankan tetap true

    // ✅ 'lax' memungkinkan cookie dikirim pada POST cross-origin (misalnya login dari frontend)
    'same_site' => env('SESSION_SAME_SITE', 'lax'),

    'partitioned' => env('SESSION_PARTITIONED_COOKIE', false),
];
