<?php

use App\Services\Orders;
use App\Services\RajaOngkir;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('orders:expire', function (Orders $orders) {
    $this->info($orders->expireStale().' unpaid order(s) expired, their packs are back in stock.');
})->purpose('Expire unpaid orders whose reservation ran out');

// Finds the destination id for RAJAONGKIR_ORIGIN (where parcels ship from), e.g. "Tanete Riattang"
Artisan::command('rajaongkir:search {query}', function (RajaOngkir $rajaOngkir) {
    if (! filled(config('shop.rajaongkir.key'))) {
        $this->error('Set RAJAONGKIR_API_KEY in .env first.');

        return 1;
    }
    // Searching works before the origin is set
    config(['shop.rajaongkir.origin' => max(1, (int) config('shop.rajaongkir.origin'))]);
    $rows = $rajaOngkir->destinations($this->argument('query'));
    $rows ? $this->table(['id', 'label'], array_map(fn ($r) => [$r['id'], $r['label']], $rows)) : $this->warn('Nothing found.');
})->purpose('Search RajaOngkir destinations to find the origin id for RAJAONGKIR_ORIGIN');

// Catalog and checkout requests also expire stale orders, so the shop keeps working
// when nothing runs the scheduler; this just keeps stock counts fresh between visits.
Schedule::command('orders:expire')->everyMinute()->withoutOverlapping();
