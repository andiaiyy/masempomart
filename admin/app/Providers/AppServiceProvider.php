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

        // On Vercel each request may run on a different machine, so a photo uploaded in the product
        // form must wait in the bucket (R2), not on one machine's disk, until the form is saved
        if (config('shop.media_disk') !== 'public') {
            config(['livewire.temporary_file_upload.disk' => config('shop.media_disk')]);
        }
    }
}
