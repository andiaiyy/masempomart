@php($rp = fn (int $n) => 'Rp '.number_format($n, 0, ',', '.'))
<x-mail::message>
# Pesanan baru {{ $order->code }}

Cari transfer **{{ $rp($order->total) }}** di rekening (kode unik {{ $order->unique_code }}), sebelum {{ $order->expires_at->timezone('Asia/Makassar')->locale('id')->translatedFormat('H.i') }} WITA. Setelah masuk, buka pesanan dan klik **Mark paid**.

<x-mail::table>
| Item | Jml | Harga |
|:--|:-:|--:|
@foreach ($order->items as $item)
| {{ $item->name }} · {{ $item->variant_name }} | {{ $item->quantity }} | {{ $rp($item->price * $item->quantity) }} |
@endforeach
| Ongkir{{ $courier ? " ($courier)" : '' }} | | {{ $order->shipping === 0 ? 'Gratis' : $rp($order->shipping) }} |
| Kode unik | | {{ $rp($order->unique_code) }} |
| **Total** | | **{{ $rp($order->total) }}** |
</x-mail::table>

**Kirim ke**<br>
{{ $order->customer_name }} · [{{ $order->phone }}]({{ $buyerWhatsapp }})<br>
{{ $order->address }}<br>
{{ collect([$order->subdistrict, $order->district, $order->city, $order->province])->filter()->implode(', ') }} {{ $order->postal_code }}<br>
Berat paket {{ number_format($order->weight_grams / 1000, 2, ',', '.') }} kg
@if ($order->note)
<br>Catatan: {{ $order->note }}
@endif

<x-mail::button :url="$adminUrl">
Buka di admin
</x-mail::button>
</x-mail::message>
