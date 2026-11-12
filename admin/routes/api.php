<?php

use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\ShippingController;
use App\Http\Controllers\Api\ShopController;
use App\Services\Orders;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::get('/shop', [ShopController::class, 'contact']);
Route::get('/categories', [CatalogController::class, 'categories']);
Route::get('/products', [CatalogController::class, 'index']);
Route::get('/products/{slug}', [CatalogController::class, 'show']);
Route::get('/variants', [CatalogController::class, 'variants']);

Route::get('/shipping/options', [ShippingController::class, 'options']);
Route::get('/shipping/destinations', [ShippingController::class, 'destinations'])->middleware('throttle:shipping');
Route::post('/shipping/quote', [ShippingController::class, 'quote'])->middleware('throttle:shipping');

Route::post('/checkout', [CheckoutController::class, 'store'])->middleware('throttle:checkout');
Route::get('/orders/{code}', [CheckoutController::class, 'show'])->middleware('throttle:receipt');

// Vercel Cron (vercel.json) calls this daily with "Authorization: Bearer <CRON_SECRET>". Catalog and
// checkout requests expire stale orders too; this catches quiet days.
Route::get('/cron/expire-orders', function (Request $request, Orders $orders) {
    $secret = (string) config('shop.cron_secret');
    abort_unless($secret !== '' && hash_equals("Bearer {$secret}", (string) $request->header('Authorization')), 403);

    return response()->json(['expired' => $orders->expireStale()]);
});
