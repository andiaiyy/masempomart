<?php

namespace App\Exceptions;

use RuntimeException;

/** RajaOngkir isn't set up, or didn't answer. Checkout can't price the parcel, so it stops here. */
class ShippingUnavailable extends RuntimeException
{
    public function render()
    {
        return response()->json(['message' => $this->getMessage()], 503);
    }
}
