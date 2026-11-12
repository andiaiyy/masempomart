<?php

namespace App\Providers;

use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Each group counts its own requests. A plain `throttle:10,1` keys by IP alone, so the
        // checkout limit also counted the shopper's address searches, courier quotes and receipt
        // polls, and refused real orders with "Too Many Attempts".
        RateLimiter::for('checkout', fn (Request $request) => Limit::perMinute(10)->by($request->ip()));
        RateLimiter::for('shipping', fn (Request $request) => Limit::perMinute(90)->by($request->ip()));
        RateLimiter::for('receipt', fn (Request $request) => Limit::perMinute(60)->by($request->ip()));
    }
}
