<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class ProductVariant extends Model
{
    use HasFactory;

    protected $fillable = ['product_id', 'name', 'price', 'compare_at_price', 'weight_grams', 'stock', 'is_active', 'sort_order'];

    protected $casts = [
        'price' => 'integer',
        'compare_at_price' => 'integer',
        'weight_grams' => 'integer',
        'stock' => 'integer',
        'is_active' => 'boolean',
    ];

    public function product(): BelongsTo
    {
        return $this->belongsTo(Product::class);
    }

    public function restocks(): HasMany
    {
        return $this->hasMany(Restock::class);
    }

    /** "Keripik Pisang · Original 250 g" */
    public function label(): string
    {
        return "{$this->product->name} · {$this->name}";
    }
}
