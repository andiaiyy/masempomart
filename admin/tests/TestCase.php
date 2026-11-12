<?php

namespace Tests;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Foundation\Testing\TestCase as BaseTestCase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;

abstract class TestCase extends BaseTestCase
{
    /** Destination id the fake RajaOngkir knows: Panakkukang, Makassar */
    protected const DESTINATION = 501;

    /** Set to make the fake RajaOngkir answer every request with a 502 */
    protected bool $rajaOngkirDown = false;

    protected function setUp(): void
    {
        parent::setUp();
        config(['shop.rajaongkir' => [
            'key' => 'test-key',
            'base_url' => 'https://rajaongkir.test/api/v1',
            'origin' => 77,
            'couriers' => 'jne:sicepat',
        ]]);
        Http::preventStrayRequests();
        $this->fakeRajaOngkir();
    }

    /**
     * A stand-in for RajaOngkir's Komerce API: one known destination, and per started kilogram
     * JNE REG 10.000, JNE YES 18.000 and SiCepat REG 9.000.
     */
    protected function fakeRajaOngkir(): void
    {
        Http::fake(function (Request $request) {
            if ($this->rajaOngkirDown) {
                return Http::response('Bad gateway', 502);
            }
            if (str_contains($request->url(), 'destination/domestic-destination')) {
                return str_contains(strtolower($request->data()['search'] ?? ''), 'panakkukang')
                    ? Http::response(['meta' => ['code' => 200, 'status' => 'success'], 'data' => [[
                        'id' => self::DESTINATION, 'label' => 'PANAKKUKANG, PANAKKUKANG, MAKASSAR, SULAWESI SELATAN, 90231',
                        'province_name' => 'SULAWESI SELATAN', 'city_name' => 'MAKASSAR', 'district_name' => 'PANAKKUKANG',
                        'subdistrict_name' => 'PANAKKUKANG', 'zip_code' => '90231',
                    ]]])
                    : Http::response(['meta' => ['code' => 404, 'status' => 'error', 'message' => 'Domestic Destinations Data not found'], 'data' => null], 404);
            }
            if (str_contains($request->url(), 'calculate/domestic-cost')) {
                $kg = max(1, (int) ceil($request->data()['weight'] / 1000));
                $rows = [];
                foreach (explode(':', $request->data()['courier']) as $courier) {
                    $rows = [...$rows, ...match ($courier) {
                        'jne' => [
                            ['name' => 'Jalur Nugraha Ekakurir (JNE)', 'code' => 'jne', 'service' => 'REG', 'description' => 'Layanan Reguler', 'cost' => 10000 * $kg, 'etd' => '2-3 day'],
                            ['name' => 'Jalur Nugraha Ekakurir (JNE)', 'code' => 'jne', 'service' => 'YES', 'description' => 'Yakin Esok Sampai', 'cost' => 18000 * $kg, 'etd' => '1 day'],
                        ],
                        'sicepat' => [['name' => 'SiCepat Express', 'code' => 'sicepat', 'service' => 'REG', 'description' => 'Reguler', 'cost' => 9000 * $kg, 'etd' => '2-4']],
                        default => [],
                    }];
                }

                return Http::response(['meta' => ['code' => 200, 'status' => 'success'], 'data' => $rows]);
            }

            return Http::response([], 500);
        });
    }

    protected function variant(int $stock = 10, int $price = 15000, int $grams = 250, array $product = []): ProductVariant
    {
        $category = Category::firstOrCreate(['slug' => 'keripik'], ['name' => 'Keripik']);
        $product = Product::create($product + [
            'category_id' => $category->id,
            'name' => 'Keripik '.uniqid(),
            'slug' => 'keripik-'.uniqid(),
        ]);

        return $product->variants()->create(['name' => '150 g', 'price' => $price, 'weight_grams' => $grams, 'stock' => $stock]);
    }

    protected function customer(array $overrides = []): array
    {
        return $overrides + [
            'name' => 'Andi',
            'email' => 'andi@example.com',
            'phone' => '0812 3456 7890',
            'province' => 'Sulawesi Selatan',
            'city' => 'Makassar',
            'district' => 'Panakkukang',
            'subdistrict' => 'Panakkukang',
            'postal_code' => '90231',
            'destination_id' => self::DESTINATION,
            'address' => 'Jl. Pengayoman No. 1',
        ];
    }

    /** The courier service picked at checkout */
    protected function shipping(string $courier = 'jne', string $service = 'REG'): array
    {
        return ['courier' => $courier, 'service' => $service];
    }
}
