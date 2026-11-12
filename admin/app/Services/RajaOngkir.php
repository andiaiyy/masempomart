<?php

namespace App\Services;

use App\Exceptions\ShippingUnavailable;
use Illuminate\Http\Client\PendingRequest;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * Courier rates from RajaOngkir's Komerce API v1 (rajaongkir.komerce.id).
 *
 * Shoppers pick their kecamatan/kelurahan from destination search; its id plus the parcel weight
 * gives every courier's services and prices. Answers are cached (searches a week, prices half a
 * day) so a shopper going back and forth in checkout doesn't use up the API quota.
 */
class RajaOngkir
{
    /** Short names for the receipt and admin; RajaOngkir's own names are the companies' full names. */
    public const COURIERS = [
        'jne' => 'JNE', 'jnt' => 'J&T Express', 'sicepat' => 'SiCepat', 'pos' => 'POS Indonesia',
        'tiki' => 'TIKI', 'ninja' => 'Ninja Xpress', 'lion' => 'Lion Parcel', 'ide' => 'ID Express',
        'sap' => 'SAP Express', 'wahana' => 'Wahana', 'sentral' => 'Sentral Cargo', 'rex' => 'REX',
        'spx' => 'SPX Express',
    ];

    public static function courierName(?string $code): ?string
    {
        return $code === null ? null : (self::COURIERS[$code] ?? Str::upper($code));
    }

    public function configured(): bool
    {
        return filled(config('shop.rajaongkir.key')) && config('shop.rajaongkir.origin') > 0;
    }

    /**
     * Kecamatan / kelurahan matching a name or postal code.
     *
     * @return list<array{id: int, label: string, province: string, city: string, district: string, subdistrict: string, postal_code: string}>
     */
    public function destinations(string $search): array
    {
        $search = Str::of($search)->squish()->lower()->limit(60, '')->value();

        return Cache::remember('rajaongkir:destinations:'.md5($search), now()->addWeek(), function () use ($search) {
            $response = $this->call(fn () => $this->http()->get('destination/domestic-destination', ['search' => $search, 'limit' => 10, 'offset' => 0]));
            if ($response === null) {
                return []; // nothing found
            }

            return collect($response['data'] ?? [])->map(fn (array $d) => [
                'id' => (int) $d['id'],
                'label' => (string) ($d['label'] ?? ''),
                'province' => (string) ($d['province_name'] ?? ''),
                'city' => (string) ($d['city_name'] ?? ''),
                'district' => (string) ($d['district_name'] ?? ''),
                'subdistrict' => (string) ($d['subdistrict_name'] ?? ''),
                'postal_code' => preg_match('/^\d{5}$/', (string) ($d['zip_code'] ?? '')) ? (string) $d['zip_code'] : '',
            ])->values()->all();
        });
    }

    /**
     * Every configured courier's services from the shop to a destination, cheapest first.
     *
     * @return list<array{courier: string, courier_name: string, service: string, description: string, cost: int, etd: string}>
     */
    public function costs(int $destination, int $grams): array
    {
        $origin = (int) config('shop.rajaongkir.origin');
        $couriers = array_values(array_filter(array_map('trim', explode(':', (string) config('shop.rajaongkir.couriers')))));
        $key = "rajaongkir:costs:{$origin}:{$destination}:{$grams}:".implode(':', $couriers);

        return Cache::remember($key, now()->addHours(12), function () use ($origin, $destination, $grams, $couriers) {
            $options = [];
            // The API takes up to 7 couriers per request, joined with ":"
            foreach (array_chunk($couriers, 7) as $chunk) {
                $response = $this->call(fn () => $this->http()->asForm()->post('calculate/domestic-cost', [
                    'origin' => $origin,
                    'destination' => $destination,
                    'weight' => $grams,
                    'courier' => implode(':', $chunk),
                ]));
                foreach ($response['data'] ?? [] as $row) {
                    $cost = (int) ($row['cost'] ?? 0);
                    if ($cost <= 0 || empty($row['service'])) {
                        continue;
                    }
                    $code = Str::lower((string) ($row['code'] ?? ''));
                    $options[] = [
                        'courier' => $code,
                        'courier_name' => self::courierName($code),
                        'service' => (string) $row['service'],
                        'description' => (string) ($row['description'] ?? ''),
                        'cost' => $cost,
                        'etd' => self::etd((string) ($row['etd'] ?? '')),
                    ];
                }
            }
            usort($options, fn ($a, $b) => $a['cost'] <=> $b['cost']);

            return $options;
        });
    }

    /** "2-3 day", "2-3", "1-2 HARI" all become "2-3 hari"; empty stays empty. */
    public static function etd(string $etd): string
    {
        $etd = trim(preg_replace('/\b(days?|hari)\b/i', '', $etd));

        return $etd === '' ? '' : "{$etd} hari";
    }

    /**
     * Runs a request; null when RajaOngkir answers "not found" (no such place, or no courier
     * serves that route), the JSON body otherwise.
     */
    private function call(callable $request): ?array
    {
        if (! $this->configured()) {
            throw new ShippingUnavailable('Ongkir belum bisa dihitung: toko belum menyambungkan RajaOngkir.');
        }

        try {
            $response = $request();
        } catch (\Throwable $e) {
            report($e);
            throw new ShippingUnavailable('Ongkir belum bisa dihitung. Coba lagi sebentar lagi.');
        }

        if (in_array($response->status(), [400, 404], true)) {
            return null;
        }
        if ($response->failed()) {
            report(new RequestException($response));
            throw new ShippingUnavailable('Ongkir belum bisa dihitung. Coba lagi sebentar lagi.');
        }

        return $response->json();
    }

    private function http(): PendingRequest
    {
        return Http::baseUrl(rtrim((string) config('shop.rajaongkir.base_url'), '/').'/')
            ->withHeaders(['key' => (string) config('shop.rajaongkir.key')])
            ->acceptJson()
            ->connectTimeout(5)
            ->timeout(15);
    }
}
