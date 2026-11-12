<?php

namespace App\Services;

use App\Models\Setting;

/**
 * What the owner sets on the admin "Shop settings" page: where shoppers transfer (bank accounts,
 * printed on every unpaid receipt), the WhatsApp contact, Instagram, and who hears about new orders.
 *
 * Payment works like Karueng's: transfer the exact total, send the proof on WhatsApp, an admin
 * checks it and marks the order paid. No payment gateway, so no fee per order.
 */
class ShopSettings
{
    /** @return list<array{bank: string, account_number: string, account_name: string}> */
    public function accounts(): array
    {
        return array_values(Setting::read('bank_accounts', []));
    }

    /** The WhatsApp contact as saved: a number in 62… form, or a WhatsApp link. */
    public function whatsapp(): ?string
    {
        return Setting::read('payment_whatsapp') ?: null;
    }

    /**
     * A link that opens the shop's WhatsApp chat. With a number (or a wa.me / api.whatsapp.com
     * link carrying one) the message can be pre-filled; other links (wa.link, catalog links) open as they are.
     */
    public function whatsappUrl(?string $text = null): ?string
    {
        $saved = $this->whatsapp();
        if (! $saved) {
            return null;
        }

        $number = ctype_digit($saved) ? $saved : self::numberInLink($saved);
        if ($number) {
            return "https://wa.me/{$number}".($text ? '?text='.rawurlencode($text) : '');
        }

        return $saved;
    }

    public function instagramUrl(): ?string
    {
        return Setting::read('instagram_url') ?: (config('shop.instagram_url') ?: null);
    }

    /** "@masempo.mart" from https://www.instagram.com/masempo.mart */
    public function instagramHandle(): ?string
    {
        $path = trim((string) parse_url((string) $this->instagramUrl(), PHP_URL_PATH), '/');

        return $path === '' ? null : '@'.explode('/', $path)[0];
    }

    /** Who gets an email for each new order */
    public function notifyEmail(): ?string
    {
        return Setting::read('order_notify_email') ?: (config('shop.order_notify_email') ?: null);
    }

    /**
     * What the admin typed for WhatsApp, made consistent: numbers (0812-3456 7890, +62 812…) become
     * 62812…; links stay links. Null for anything else.
     */
    public static function normalizeWhatsapp(?string $value): ?string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }
        if (preg_match('~^https?://~i', $value)) {
            return $value;
        }
        $digits = preg_replace('/\D/', '', $value);
        $digits = str_starts_with($digits, '0') ? '62'.substr($digits, 1) : $digits;

        return preg_match('/^62\d{8,13}$/', $digits) ? $digits : null;
    }

    /** https://www.instagram.com/masempo.mart?igsh=…&utm_source=qr, "@masempo.mart" and "masempo.mart" all become https://www.instagram.com/masempo.mart */
    public static function normalizeInstagram(?string $value): ?string
    {
        $value = trim((string) $value);
        if ($value === '') {
            return null;
        }
        $handle = preg_match('~instagram\.com/([A-Za-z0-9._]+)~i', $value, $m) ? $m[1] : ltrim($value, '@');

        return preg_match('/^[A-Za-z0-9._]{1,30}$/', $handle) ? "https://www.instagram.com/{$handle}" : null;
    }

    private static function numberInLink(string $url): ?string
    {
        if (preg_match('~wa\.me/(\d{8,15})~i', $url, $m)) {
            return $m[1];
        }
        parse_str((string) parse_url($url, PHP_URL_QUERY), $query);

        return isset($query['phone']) && ctype_digit((string) $query['phone']) ? (string) $query['phone'] : null;
    }
}
