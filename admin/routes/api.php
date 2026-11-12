<?php

use App\Http\Controllers\Api\CatalogController;
use App\Http\Controllers\Api\CheckoutController;
use App\Http\Controllers\Api\ShippingController;
use Illuminate\Support\Facades\Route;

Route::get('/categories', [CatalogController::class, 'categories']);
Route::get('/products', [CatalogController::class, 'index']);
Route::get('/products/{slug}', [CatalogController::class, 'show']);
Route::get('/variants', [CatalogController::class, 'variants']);

Route::get('/shipping/options', [ShippingController::class, 'options']);
Route::get('/shipping/destinations', [ShippingController::class, 'destinations'])->middleware('throttle:shipping');
Route::post('/shipping/quote', [ShippingController::class, 'quote'])->middleware('throttle:shipping');

Route::post('/checkout', [CheckoutController::class, 'store'])->middleware('throttle:checkout');
Route::get('/orders/{code}', [CheckoutController::class, 'show'])->middleware('throttle:receipt');
