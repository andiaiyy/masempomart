<?php

namespace App\Services;

use App\Models\Setting;

/**
 * Bank transfer, the same way Karueng takes payment: the receipt lists the shop's accounts, the
 * shopper transfers the exact total and sends the proof over WhatsApp, and an admin checks it and
 * marks the order paid. No payment gateway, so no fee per order.
 */
class Payments
{
    /** @return list<array{bank: string, account_number: string, account_name: string}> */
    public function accounts(): array
    {
        return array_values(Setting::read('bank_accounts', []));
    }

    /** WhatsApp number in 62… form, or null when none is set. */
    public function whatsapp(): ?string
    {
        return Setting::read('payment_whatsapp') ?: null;
    }

    /** 0812-3456 7890, +62 812…, 62812… all become 62812…; anything else stays as typed digits. */
    public static function normalizePhone(?string $phone): string
    {
        $digits = preg_replace('/\D/', '', (string) $phone);

        return str_starts_with($digits, '0') ? '62'.substr($digits, 1) : $digits;
    }
}
