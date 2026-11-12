<?php

namespace App\Mail;

use App\Models\Order;
use App\Services\RajaOngkir;
use App\Services\ShopSettings;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/**
 * To the shopper right after checkout: the link to their receipt (so closing the tab doesn't lose
 * it), the exact amount with its unique code, where to transfer, and the deadline.
 */
class OrderReceipt extends Mailable
{
    public function __construct(public Order $order) {}

    public function envelope(): Envelope
    {
        return new Envelope(subject: "Struk pesanan {$this->order->code} · Masempo Mart");
    }

    public function content(): Content
    {
        $settings = app(ShopSettings::class);
        $total = number_format($this->order->total, 0, ',', '.');

        return new Content(markdown: 'emails.order-receipt', with: [
            'order' => $this->order->loadMissing('items'),
            'receiptUrl' => config('shop.storefront_url').'/pesanan/'.$this->order->code,
            'accounts' => $settings->accounts(),
            'whatsappUrl' => $settings->whatsappUrl("Halo Masempo Mart, ini bukti transfer untuk pesanan {$this->order->code} (Rp {$total})."),
            'courier' => trim(RajaOngkir::courierName($this->order->shipping_courier).' '.$this->order->shipping_service),
        ]);
    }
}
