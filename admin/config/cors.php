<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | API katalog bersifat publik dan read-only. Frontend memanggilnya lewat
    | proxy Next.js, jadi CORS hanya untuk akses langsung dari localhost:3000.
    |
    */

    'paths' => ['api/*'],

    'allowed_methods' => ['GET'],

    'allowed_origins' => [
        'http://localhost:3000',
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => false,

];
