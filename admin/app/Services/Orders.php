<?php

namespace App\Services;

use App\Models\Order;
use App\Models\ProductVariant;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

/**
 * Order lifecycle and the stock that goes with it.
 *
 * Placing an order takes its packs out of stock straight away, so two shoppers can't buy
 * the last pack. If the order is not paid (failed, expired, cancelled) the packs go back.
 * Every stock change is a conditional UPDATE, and every status change only applies when
 * the order is still in the status it was read in, so concurrent requests and double clicks
 * in the admin can't take or return stock twice.
 */
class Orders
{
    public function __construct(private Shipping $shipping) {}

    /**
     * Prices a cart from the database (prices sent by the browser are never used) and asks
     * RajaOngkir what each courier charges to the destination.
     *
     * @param  list<array{variant_id: int, quantity: int}>  $items
     * @return array{lines: list<array{variant: ProductVariant, quantity: int}>, subtotal: int, weight_grams: int, options: list<array<string, mixed>>}
     */
    public function quote(int $destination, array $items): array
    {
        $wanted = [];
        foreach ($items as $item) {
            $wanted[(int) $item['variant_id']] = ($wanted[(int) $item['variant_id']] ?? 0) + (int) $item['quantity'];
        }

        $variants = ProductVariant::with('product')->whereIn('id', array_keys($wanted))->get()->keyBy('id');
        $lines = [];
        foreach ($wanted as $id => $quantity) {
            $variant = $variants->get($id);
            if (! $variant || ! $variant->is_active || ! $variant->product->is_active) {
                throw ValidationException::withMessages([
                    'items' => 'Ada produk di keranjang yang sudah tidak dijual. Hapus dulu dari keranjang.',
                ]);
            }
            $lines[] = ['variant' => $variant, 'quantity' => $quantity];
        }

        $subtotal = array_sum(array_map(fn ($l) => $l['variant']->price * $l['quantity'], $lines));
        $weight = $this->shipping->weight(array_sum(array_map(fn ($l) => $l['variant']->weight_grams * $l['quantity'], $lines)));

        return [
            'lines' => $lines,
            'subtotal' => $subtotal,
            'weight_grams' => $weight,
            'options' => $this->shipping->options($destination, $weight, $subtotal),
        ];
    }

    /**
     * Creates a pending order and reserves its packs.
     *
     * @param  array<string, string|int|null>  $customer  contact, address and RajaOngkir destination_id
     * @param  list<array{variant_id: int, quantity: int}>  $items
     * @param  array{courier: string, service: string}  $shipping  the courier service the shopper picked
     */
    public function place(array $customer, array $items, array $shipping): Order
    {
        // Packs held by abandoned orders go back on the shelf first
        $this->expireStale();

        // Priced before the transaction: it may call RajaOngkir, and no lock should wait on that
        $quote = $this->quote((int) $customer['destination_id'], $items);
        $chosen = collect($quote['options'])->first(fn (array $o) => $o['courier'] === Str::lower($shipping['courier']) && $o['service'] === $shipping['service']);
        if (! $chosen) {
            throw ValidationException::withMessages([
                'shipping' => 'Layanan pengiriman ini sudah tidak tersedia ke alamatmu. Pilih kurir lain.',
            ]);
        }

        return DB::transaction(function () use ($customer, $quote, $chosen) {

            foreach ($quote['lines'] as ['variant' => $variant, 'quantity' => $quantity]) {
                $taken = ProductVariant::whereKey($variant->id)->where('stock', '>=', $quantity)->decrement('stock', $quantity);
                if (! $taken) {
                    // Throwing rolls back the packs already taken for earlier lines
                    $left = (int) ProductVariant::whereKey($variant->id)->value('stock');
                    throw ValidationException::withMessages([
                        'items' => $left > 0 ? "{$variant->label()} tinggal {$left} pak." : "{$variant->label()} sudah habis.",
                    ]);
                }
            }

            $holdMinutes = config('shop.hold_minutes');
            $order = Order::create([
                'code' => 'MM-'.now()->format('ymd').'-'.Str::upper(Str::random(6)),
                'customer_name' => $customer['name'],
                'email' => $customer['email'],
                'phone' => $customer['phone'],
                'address' => $customer['address'],
                'province' => $customer['province'],
                'city' => $customer['city'],
                'district' => $customer['district'],
                'subdistrict' => $customer['subdistrict'] ?? null,
                'postal_code' => $customer['postal_code'],
                'destination_id' => (int) $customer['destination_id'],
                'note' => $customer['note'] ?? null,
                'weight_grams' => $quote['weight_grams'],
                'subtotal' => $quote['subtotal'],
                'shipping' => $chosen['cost'],
                'shipping_courier' => $chosen['courier'],
                'shipping_service' => $chosen['service'],
                'shipping_etd' => $chosen['etd'] ?: null,
                'unique_code' => $code = $this->uniqueCode($quote['subtotal'] + $chosen['cost']),
                'total' => $quote['subtotal'] + $chosen['cost'] + $code,
                'status' => 'pending',
                'expires_at' => now()->addMinutes($holdMinutes),
            ]);

            $order->items()->createMany(array_map(fn ($line) => [
                'product_id' => $line['variant']->product_id,
                'product_variant_id' => $line['variant']->id,
                'name' => $line['variant']->product->name,
                'variant_name' => $line['variant']->name,
                'image' => $line['variant']->product->images[0] ?? null,
                'price' => $line['variant']->price,
                'weight_grams' => $line['variant']->weight_grams,
                'quantity' => $line['quantity'],
            ], $quote['lines']));

            return $order;
        });
    }

    /**
     * A 1–999 rupiah code for the transfer amount, so no two unpaid orders ask for the same total and
     * each transfer in the bank statement matches one order. Random, so codes don't reveal order counts.
     */
    private function uniqueCode(int $amount): int
    {
        $taken = Order::where('status', 'pending')
            ->whereBetween('total', [$amount + 1, $amount + 999])
            ->pluck('total')
            ->map(fn ($total) => $total - $amount)
            ->flip();

        $free = array_values(array_filter(range(1, 999), fn (int $code) => ! isset($taken[$code])));

        // 999 unpaid orders with the same amount won't happen; if it did, the admin still sees the code
        return $free ? $free[random_int(0, count($free) - 1)] : random_int(1, 999);
    }

    /**
     * Ends a pending order without payment and puts its packs back.
     * Returns false when the order had already left "pending".
     */
    public function release(Order $order, string $status): bool
    {
        $released = DB::transaction(function () use ($order, $status) {
            $moved = Order::whereKey($order->id)->where('status', 'pending')->update(['status' => $status, 'updated_at' => now()]);
            if (! $moved) {
                return false;
            }
            foreach ($order->items()->get() as $item) {
                if ($item->product_variant_id) {
                    ProductVariant::whereKey($item->product_variant_id)->increment('stock', $item->quantity);
                }
            }

            return true;
        });
        $order->refresh();

        return $released;
    }

    /**
     * Records a payment an admin has checked. A transfer can still arrive after the order
     * expired or was cancelled; its packs are then taken again, and anything no longer
     * in stock is written to the order's "issue" for an admin to restock or refund.
     */
    public function markPaid(Order $order, string $paymentType = 'bank_transfer'): void
    {
        DB::transaction(function () use ($order, $paymentType) {
            $fields = ['status' => 'paid', 'paid_at' => now(), 'payment_type' => $paymentType, 'updated_at' => now()];

            if (Order::whereKey($order->id)->where('status', 'pending')->update($fields)) {
                return;
            }
            if (! Order::whereKey($order->id)->whereIn('status', ['failed', 'expired', 'cancelled'])->update($fields)) {
                return; // already paid, shipped or completed
            }

            $short = [];
            foreach ($order->items()->get() as $item) {
                $taken = $item->product_variant_id
                    && ProductVariant::whereKey($item->product_variant_id)->where('stock', '>=', $item->quantity)->decrement('stock', $item->quantity);
                if (! $taken) {
                    $short[] = "{$item->name} · {$item->variant_name} × {$item->quantity}";
                }
            }
            if ($short) {
                Order::whereKey($order->id)->update([
                    'issue' => 'Paid after the reservation ended, and these are out of stock: '.implode(', ', $short).'. Restock them or refund the customer.',
                ]);
            }
        });
        $order->refresh();
    }

    /** Expires unpaid orders whose hold has run out. Returns how many were expired. */
    public function expireStale(): int
    {
        return Order::where('status', 'pending')
            ->where('expires_at', '<=', now())
            ->get()
            ->filter(fn (Order $order) => $this->release($order, 'expired'))
            ->count();
    }

    public function ship(Order $order, string $courier, string $trackingNumber): bool
    {
        $moved = Order::whereKey($order->id)->where('status', 'paid')->update([
            'status' => 'shipped',
            'courier' => $courier,
            'tracking_number' => $trackingNumber,
            'shipped_at' => now(),
            'updated_at' => now(),
        ]);
        $order->refresh();

        return (bool) $moved;
    }

    public function complete(Order $order): bool
    {
        $moved = Order::whereKey($order->id)->where('status', 'shipped')->update(['status' => 'completed', 'updated_at' => now()]);
        $order->refresh();

        return (bool) $moved;
    }
}
