const int = (value: string | undefined, fallback: number) => (value && /^\d+$/.test(value) ? Number(value) : fallback);
const trimSlash = (url: string) => url.replace(/\/+$/, "");

const vercelUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : null;

/**
 * Shop configuration from the environment (see .env.example). A plain object so tests can adjust it.
 * Things the owner changes day to day (bank accounts, WhatsApp, Instagram, new-order email) live
 * in the database instead, on the admin's Pengaturan page.
 */
export const config = {
  /** Minutes an unpaid order keeps its packs while the shopper makes the transfer */
  holdMinutes: int(process.env.SHOP_HOLD_MINUTES, 60),
  /** Variants at or below this many packs show under "Stok menipis" */
  lowStock: int(process.env.SHOP_LOW_STOCK, 5),
  /** Parcel weight = packs + this */
  packagingGrams: int(process.env.SHOP_PACKAGING_GRAMS, 100),
  /** Free shipping from this subtotal (0 = never); the shop then pays the courier */
  freeShippingOver: int(process.env.SHOP_FREE_SHIPPING_OVER, 0),

  timezone: "Asia/Makassar",
  /** The storefront, for receipt links in emails and "Lihat di toko" */
  storefrontUrl: trimSlash(process.env.STOREFRONT_URL ?? "http://localhost:3000"),
  /** This admin, for the link in the new-order email */
  adminUrl: trimSlash(process.env.ADMIN_URL ?? vercelUrl ?? "http://localhost:8000"),

  /** Defaults until something is saved on the Pengaturan page */
  instagramUrl: process.env.SHOP_INSTAGRAM_URL ?? "https://www.instagram.com/masempo.mart",
  orderNotifyEmail: process.env.SHOP_ORDER_NOTIFY_EMAIL || null,

  /** Vercel Cron sends it as a bearer token to /api/cron/expire-orders */
  cronSecret: process.env.CRON_SECRET || null,

  rajaongkir: {
    key: process.env.RAJAONGKIR_API_KEY || null,
    baseUrl: trimSlash(process.env.RAJAONGKIR_BASE_URL ?? "https://rajaongkir.komerce.id/api/v1"),
    /** Fallback for where parcels ship from; normally picked on the Pengaturan page */
    origin: int(process.env.RAJAONGKIR_ORIGIN, 0),
    /** Courier codes joined with ":" */
    couriers: process.env.RAJAONGKIR_COURIERS ?? "jne:jnt:sicepat:pos:tiki:ninja:lion",
  },

  mail: {
    /** Brevo > SMTP & API > API keys. Without it emails are saved to .mail/ locally instead of sent */
    brevoKey: process.env.BREVO_API_KEY || null,
    fromAddress: process.env.MAIL_FROM_ADDRESS || null,
    fromName: process.env.MAIL_FROM_NAME ?? "Masempo Mart",
  },
};
