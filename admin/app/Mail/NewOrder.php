<?php

namespace App\Mail;

use App\Models\Order;
use App\Services\RajaOngkir;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;

/** To the shop for every new order: what to pack, where it goes, and the exact amount to look for in the bank account. */
class NewOrder extends Mailable
{
    public function __construct(public Order $order) {}

    public function envelope(): Envelope
    {
        $total = number_format($this->order->total, 0, ',', '.');

        return new Envelope(subject: "Pesanan baru {$this->order->code} · Rp {$total}");
    }

    public function content(): Content
    {
        $phone = preg_replace('/\D/', '', $this->order->phone);

        return new Content(markdown: 'emails.new-order', with: [
            'order' => $this->order->loadMissing('items'),
            'adminUrl' => rtrim(config('app.url'), '/').'/orders/'.$this->order->id,
            'courier' => trim(RajaOngkir::courierName($this->order->shipping_courier).' '.$this->order->shipping_service),
            // Chat with the buyer straight from the email
            'buyerWhatsapp' => 'https://wa.me/'.(str_starts_with($phone, '0') ? '62'.substr($phone, 1) : $phone),
        ]);
    }
}
