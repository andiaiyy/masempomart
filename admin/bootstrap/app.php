<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware) {
        // The storefront proxies /api through Next.js. Trusting it makes rate limits count
        // per shopper (X-Forwarded-For) instead of lumping everyone under the proxy's IP.
        $middleware->trustProxies(at: env('TRUSTED_PROXIES', '127.0.0.1,::1'));
    })
    ->withExceptions(function (Exceptions $exceptions) {
        //
    })->create();
