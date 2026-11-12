<?php

namespace App\Models;

use App\Support\Media;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Category extends Model
{
    use HasFactory;

    protected $fillable = ['name', 'slug', 'image', 'sort_order'];

    public function products(): HasMany
    {
        return $this->hasMany(Product::class);
    }

    public function imageUrl(): ?string
    {
        return Media::url($this->image);
    }
}
