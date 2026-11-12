<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Shop-wide values edited in the admin, stored as JSON by key. */
class Setting extends Model
{
    protected $primaryKey = 'key';

    protected $keyType = 'string';

    public $incrementing = false;

    protected $fillable = ['key', 'value'];

    protected $casts = ['value' => 'array'];

    public static function read(string $key, mixed $default = null): mixed
    {
        return static::find($key)?->value ?? $default;
    }

    public static function write(string $key, mixed $value): void
    {
        static::updateOrCreate(['key' => $key], ['value' => $value]);
    }
}
