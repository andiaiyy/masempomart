<?php

namespace App\Services;

/** Parcel weight and the courier options for it, priced by RajaOngkir. */
class Shipping
{
    public function __construct(private RajaOngkir $rajaOngkir) {}

    /** Parcel weight: the packs plus packaging. */
    public function weight(int $packsGrams): int
    {
        return $packsGrams + config('shop.shipping.packaging_grams');
    }

    /**
     * Courier services to a destination, cheapest first. Above the free-shipping threshold the
     * shop pays the courier, so the shopper sees every option at 0 (`courier_cost` keeps the price).
     *
     * @return list<array{courier: string, courier_name: string, service: string, description: string, cost: int, courier_cost: int, etd: string}>
     */
    public function options(int $destination, int $weightGrams, int $subtotal): array
    {
        $freeOver = config('shop.shipping.free_over');
        $free = $freeOver > 0 && $subtotal >= $freeOver;

        return array_map(fn (array $o) => ['cost' => $free ? 0 : $o['cost'], 'courier_cost' => $o['cost']] + $o,
            $this->rajaOngkir->costs($destination, $weightGrams));
    }
}
