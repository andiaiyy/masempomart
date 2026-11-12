@php($rp = fn (int $n) => 'Rp '.number_format($n, 0, ',', '.'))
<x-mail::message>
# Pesananmu sudah kami terima

Halo {{ $order->customer_name }}, terima kasih sudah belanja di Masempo Mart. Stok pesananmu kami tahan sampai **{{ $order->expires_at->timezone('Asia/Makassar')->locale('id')->translatedFormat('H.i') }} WITA, {{ $order->expires_at->timezone('Asia/Makassar')->locale('id')->translatedFormat('j F Y') }}**.

<x-mail::table>
| Item | Jml | Harga |
|:--|:-:|--:|
@foreach ($order->items as $item)
| {{ $item->name }} · {{ $item->variant_name }} | {{ $item->quantity }} | {{ $rp($item->price * $item->quantity) }} |
@endforeach
| Ongkir{{ $courier ? " ($courier)" : '' }} | | {{ $order->shipping === 0 ? 'Gratis' : $rp($order->shipping) }} |
@if ($order->unique_code)
| Kode unik | | {{ $rp($order->unique_code) }} |
@endif
| **Total transfer** | | **{{ $rp($order->total) }}** |
</x-mail::table>

@if (count($accounts))
**Transfer tepat {{ $rp($order->total) }}** ke:

@foreach ($accounts as $account)
- **{{ $account['bank'] }} {{ $account['account_number'] }}** a.n. {{ $account['account_name'] }}
@endforeach

Angka terakhirnya kode unik, supaya transfermu langsung ketemu pesanan ini. Tanpa biaya admin.
@endif

Setelah transfer, kirim bukti transfernya lewat WhatsApp. Struk berubah jadi lunas setelah kami cek.

<x-mail::button :url="$receiptUrl">
Lihat struk
</x-mail::button>

@if ($whatsappUrl)
Sudah transfer? [Kirim bukti transfer via WhatsApp]({{ $whatsappUrl }})
@endif

Salam,<br>
Masempo Mart
</x-mail::message>
