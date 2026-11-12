<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Order extends Model
{
    public const STATUSES = ['pending', 'paid', 'shipped', 'completed', 'failed', 'expired', 'cancelled'];

    /** Statuses where the customer's packs are taken out of stock. */
    public const HOLDING = ['pending', 'paid', 'shipped', 'completed'];

    protected $fillable = [
        'code', 'customer_name', 'email', 'phone', 'address', 'province', 'city', 'district',
        'subdistrict', 'postal_code', 'destination_id', 'note', 'weight_grams', 'subtotal', 'shipping',
        'shipping_courier', 'shipping_service', 'shipping_etd', 'unique_code', 'total', 'status',
        'payment_type', 'expires_at', 'paid_at', 'courier', 'tracking_number',
        'shipped_at', 'issue',
    ];

    protected $casts = [
        'weight_grams' => 'integer',
        'subtotal' => 'integer',
        'shipping' => 'integer',
        'total' => 'integer',
        'expires_at' => 'datetime',
        'paid_at' => 'datetime',
        'shipped_at' => 'datetime',
    ];


    public function items(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }
}
