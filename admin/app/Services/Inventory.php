<?php

namespace App\Services;

use App\Models\ProductVariant;
use App\Models\Restock;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class Inventory
{
    /**
     * Logs a delivery (positive quantity) or write-off (negative) and moves the stock with it.
     *
     * @param  array{cost_price?: int|null, expires_on?: string|null, note?: string|null}  $details
     */
    public function record(int $variantId, int $quantity, array $details = [], ?int $userId = null): Restock
    {
        return DB::transaction(function () use ($variantId, $quantity, $details, $userId) {
            $changed = $quantity >= 0
                ? ProductVariant::whereKey($variantId)->increment('stock', $quantity)
                : ProductVariant::whereKey($variantId)->where('stock', '>=', -$quantity)->decrement('stock', -$quantity);

            if (! $changed) {
                $left = (int) ProductVariant::whereKey($variantId)->value('stock');
                throw ValidationException::withMessages([
                    'data.quantity' => "Only {$left} in stock, so you can write off at most {$left}.",
                ]);
            }

            return Restock::create([
                'product_variant_id' => $variantId,
                'user_id' => $userId,
                'quantity' => $quantity,
                'cost_price' => $details['cost_price'] ?? null,
                'expires_on' => $details['expires_on'] ?? null,
                'note' => $details['note'] ?? null,
            ]);
        });
    }
}
