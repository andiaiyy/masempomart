<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use App\Services\Orders;
use App\Mail\NewOrder;
use App\Mail\OrderReceipt;
use App\Services\ShopSettings;
use App\Services\RajaOngkir;
use App\Support\Media;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;

/**
 * Guest checkout: the order reserves its packs and the shopper lands on its receipt, which lists the
 * shop's bank accounts. They transfer, send the proof over WhatsApp, and an admin marks it paid.
 */
class CheckoutController extends Controller
{
    public function store(Request $request, Orders $orders, ShopSettings $settings)
    {
        $data = $request->validate([
            'customer.name' => 'required|string|max:100',
            'customer.email' => 'required|email|max:150',
            'customer.phone' => ['required', 'string', 'max:30', 'regex:/^\+?[0-9\s\-]{8,20}$/'],
            // The kecamatan/kelurahan picked from RajaOngkir's search; its names fill the address
            'customer.destination_id' => 'required|integer|min:1',
            'customer.province' => 'required|string|max:100',
            'customer.city' => 'required|string|max:100',
            'customer.district' => 'required|string|max:100',
            'customer.subdistrict' => 'nullable|string|max:100',
            'customer.postal_code' => 'required|digits:5',
            'customer.address' => 'required|string|max:500',
            'customer.note' => 'nullable|string|max:200',
            'items' => 'required|array|min:1|max:50',
            'items.*.variant_id' => 'required|integer',
            'items.*.quantity' => 'required|integer|min:1|max:50',
            'shipping.courier' => 'required|string|max:20',
            'shipping.service' => 'required|string|max:60',
        ], [
            'customer.phone.regex' => 'Nomor WhatsApp tidak valid.',
            'customer.postal_code.digits' => 'Kode pos harus 5 angka.',
            'customer.destination_id.required' => 'Pilih kecamatan tujuan dari daftar.',
            'customer.province.required' => 'Pilih kecamatan tujuan dari daftar.',
            'shipping.courier.required' => 'Pilih kurir pengiriman.',
            'shipping.service.required' => 'Pilih kurir pengiriman.',
        ]);

        $order = $orders->place($data['customer'], $data['items'], $data['shipping']);
        $this->sendEmails($order, $settings);

        return response()->json(['code' => $order->code], 201);
    }

    /** The order's receipt. The code is the key: anyone holding it sees the status, never the address or phone. */
    public function show(string $code, Orders $orders, ShopSettings $settings)
    {
        $order = Order::with('items.product')->where('code', $code)->first();
        if (! $order) {
            return response()->json(['message' => 'Pesanan tidak ditemukan.'], 404);
        }

        if ($order->status === 'pending' && $order->expires_at?->isPast()) {
            $orders->release($order, 'expired');
        }

        $payable = $order->status === 'pending';

        return response()->json([
            'code' => $order->code,
            'status' => $order->status,
            // Where to transfer, only while the order can still be paid
            'payment' => $payable ? [
                'bank_accounts' => $settings->accounts(),
                // Opens the shop's chat with the proof message filled in
                'whatsapp_url' => $settings->whatsappUrl("Halo Masempo Mart, ini bukti transfer untuk pesanan {$order->code} (Rp ".number_format($order->total, 0, ',', '.').')'),
                'pay_before' => $order->expires_at,
            ] : null,
            'payment_type' => $order->payment_type,
            'customer_name' => $order->customer_name,
            'city' => $order->city,
            'subtotal' => $order->subtotal,
            'shipping' => $order->shipping,
            'shipping_courier' => RajaOngkir::courierName($order->shipping_courier),
            'shipping_service' => $order->shipping_service,
            'shipping_etd' => $order->shipping_etd,
            'unique_code' => $order->unique_code,
            'total' => $order->total,
            'weight_grams' => $order->weight_grams,
            'created_at' => $order->created_at,
            'expires_at' => $order->expires_at,
            'paid_at' => $order->paid_at,
            'courier' => $order->courier,
            'tracking_number' => $order->tracking_number,
            'shipped_at' => $order->shipped_at,
            'items' => $order->items->map(fn (OrderItem $item) => [
                'name' => $item->name,
                'variant_name' => $item->variant_name,
                'image' => Media::url($item->image),
                'product_slug' => $item->product?->slug,
                'price' => $item->price,
                'quantity' => $item->quantity,
            ]),
        ]);
    }

    /**
     * The receipt link to the shopper and a heads-up to the shop. Sent before answering so it also
     * works on serverless hosting; a mail failure is logged and never undoes the order.
     */
    private function sendEmails(Order $order, ShopSettings $settings): void
    {
        try {
            Mail::to($order->email, $order->customer_name)->send(new OrderReceipt($order));
        } catch (\Throwable $e) {
            report($e);
        }

        if ($to = $settings->notifyEmail()) {
            try {
                Mail::to($to)->send(new NewOrder($order));
            } catch (\Throwable $e) {
                report($e);
            }
        }
    }
}
