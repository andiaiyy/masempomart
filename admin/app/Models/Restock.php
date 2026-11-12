<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Restock extends Model
{
    protected $fillable = ['product_variant_id', 'user_id', 'quantity', 'cost_price', 'expires_on', 'note'];

    protected $casts = [
        'quantity' => 'integer',
        'cost_price' => 'integer',
        'expires_on' => 'date',
    ];

    public function variant(): BelongsTo
    {
        return $this->belongsTo(ProductVariant::class, 'product_variant_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
