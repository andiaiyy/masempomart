<?php

/*
 * Entry point on Vercel (vercel-php runtime): every request that isn't a static file in public/
 * comes here (see vercel.json). Same as public/index.php, except that Vercel's disk is read-only
 * apart from /tmp, so Laravel's caches, compiled views and storage live there.
 */

use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

foreach ([
    'APP_CONFIG_CACHE' => '/tmp/config.php',
    'APP_EVENTS_CACHE' => '/tmp/events.php',
    'APP_PACKAGES_CACHE' => '/tmp/packages.php',
    'APP_ROUTES_CACHE' => '/tmp/routes.php',
    'APP_SERVICES_CACHE' => '/tmp/services.php',
    'VIEW_COMPILED_PATH' => '/tmp/views',
] as $key => $value) {
    putenv("{$key}={$value}");
    $_ENV[$key] = $_SERVER[$key] = $value;
}

foreach (['views', 'storage/framework/cache/data', 'storage/framework/sessions', 'storage/framework/views', 'storage/logs', 'storage/app/private', 'storage/app/public'] as $dir) {
    if (! is_dir("/tmp/{$dir}")) {
        mkdir("/tmp/{$dir}", 0755, true);
    }
}

require __DIR__.'/../vendor/autoload.php';

$app = require_once __DIR__.'/../bootstrap/app.php';
$app->useStoragePath('/tmp/storage');

$app->handleRequest(Request::capture());
