<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\ShopSettings;

class ShopController extends Controller
{
    /** The shop's contact links for the storefront (WhatsApp and Instagram, from the admin's Shop settings). */
    public function contact(ShopSettings $settings)
    {
        return response()->json([
            'whatsapp_url' => $settings->whatsappUrl(),
            'instagram_url' => $settings->instagramUrl(),
            'instagram_handle' => $settings->instagramHandle(),
        ]);
    }
}
