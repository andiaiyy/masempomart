<?php

namespace App\Models;

use App\Support\Media;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Product extends Model
{
    use HasFactory;

    protected $fillable = ['category_id', 'name', 'slug', 'description', 'images', 'specs', 'is_active', 'is_featured'];

    protected $casts = [
        'images' => 'array',
        'specs' => 'array',
        'is_active' => 'boolean',
        'is_featured' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(Category::class);
    }

    public function variants(): HasMany
    {
        return $this->hasMany(ProductVariant::class);
    }

    /** Products shoppers can see: switched on, with at least one variant on sale. */
    public function scopeListed(Builder $query): Builder
    {
        return $query->where('is_active', true)->whereHas('variants', fn ($q) => $q->where('is_active', true));
    }

    /** @return list<string> */
    public function imageUrls(): array
    {
        return collect($this->images ?? [])->map(fn ($path) => Media::url($path))->filter()->values()->all();
    }
}
