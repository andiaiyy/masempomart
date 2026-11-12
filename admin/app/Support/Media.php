<?php

namespace App\Support;

use Illuminate\Support\Facades\Storage;

class Media
{
    /** Public URL of an uploaded file on the media disk. */
    public static function url(?string $path): ?string
    {
        if (! $path) {
            return null;
        }
        if (str_starts_with($path, 'http://') || str_starts_with($path, 'https://')) {
            return $path;
        }

        return Storage::disk(config('shop.media_disk'))->url($path);
    }
}
