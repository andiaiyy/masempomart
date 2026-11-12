<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Orders;
use App\Services\RajaOngkir;
use Illuminate\Http\Request;

class ShippingController extends Controller
{
    /** What the checkout form needs before the shopper fills it in. */
    public function options(RajaOngkir $rajaOngkir)
    {
        return response()->json([
            'free_over' => config('shop.shipping.free_over') ?: null,
            'hold_minutes' => config('shop.hold_minutes'),
            // Checkout says so up front instead of failing at the address step
            'shipping_ready' => $rajaOngkir->configured(),
        ]);
    }

    /** Kecamatan / kelurahan for the address field, from RajaOngkir. */
    public function destinations(Request $request, RajaOngkir $rajaOngkir)
    {
        $data = $request->validate(['search' => 'required|string|min:3|max:60']);

        return response()->json(['data' => $rajaOngkir->destinations($data['search'])]);
    }

    /** Subtotal, parcel weight and every courier service to the destination. */
    public function quote(Request $request, Orders $orders)
    {
        $data = $request->validate([
            'destination_id' => 'required|integer|min:1',
            'items' => 'required|array|min:1|max:50',
            'items.*.variant_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1|max:50',
        ]);

        $quote = $orders->quote((int) $data['destination_id'], $data['items']);

        return response()->json([
            'subtotal' => $quote['subtotal'],
            'weight_grams' => $quote['weight_grams'],
            'options' => array_map(fn (array $o) => [
                'courier' => $o['courier'],
                'courier_name' => $o['courier_name'],
                'service' => $o['service'],
                'description' => $o['description'],
                'cost' => $o['cost'],
                'etd' => $o['etd'],
            ], $quote['options']),
        ]);
    }
}
