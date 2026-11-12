# Masempo Mart admin

Next.js app with the shop's API (`/api`, read by the storefront in `../user`) and the admin panel (`/`).
Same stack and look as the storefront; built the way Karueng's admin is (plain Postgres, embedded
Postgres locally, Vercel Blob for photos, its own login).

## Run locally

```bash
npm install
npm run db:setup     # embedded Postgres in .pglite/, demo snacks, admin@masempo.test / password
npm run dev          # http://localhost:8000
npm test             # API and order logic against an in-memory Postgres, fake RajaOngkir and Brevo
```

Only one process can open `.pglite/` at a time: stop `npm run dev` before running `npm run db:setup`.

## Where things are

| Path | What |
|---|---|
| `db/schema.sql` | All tables. Safe to re-run; `scripts/setup-db.mjs` applies it (also before every Vercel build) |
| `src/lib/orders.ts` | Placing orders, reserving and returning stock (conditional updates in one transaction), unique transfer code, mark paid, expiry, shipping |
| `src/lib/catalog.ts` | The public catalog the storefront reads |
| `src/lib/rajaongkir.ts` | Destination search and courier prices (RajaOngkir Komerce API v1), cached in `api_cache` |
| `src/lib/settings.ts` | Bank accounts, WhatsApp, Instagram, new-order email (admin's Pengaturan page) |
| `src/lib/mail.ts` | Receipt-link email to the buyer and new-order email to the shop, through Brevo's API |
| `src/lib/inventory.ts` | Restocks and write-offs |
| `src/app/api/` | The API (below) |
| `src/app/(panel)/` | Admin pages: Ringkasan, Pesanan, Produk, Kategori, Stok, Pengaturan, Admin |

## API

| Method | Path | What |
|---|---|---|
| GET | `/api/categories` | Shelf tabs with product counts |
| GET | `/api/products` | `?category=&q=&sort=newest\|best\|price_asc\|price_desc\|name&page=&per_page=&exclude=` |
| GET | `/api/products/{slug}` | Product with specs, variants and its neighbours |
| GET | `/api/variants?ids=` | Current price and stock for the cart |
| GET | `/api/shop` | WhatsApp and Instagram links |
| GET | `/api/shipping/options` | Hold minutes, free-shipping threshold, whether RajaOngkir is set up |
| GET | `/api/shipping/destinations?search=` | Kecamatan/kelurahan from RajaOngkir |
| POST | `/api/shipping/quote` | `{destination_id, items}` → subtotal, weight, courier options |
| POST | `/api/checkout` | `{customer, items, shipping: {courier, service}}` → order code |
| GET | `/api/orders/{code}` | The buyer's receipt (no address or phone) |
| GET | `/api/cron/expire-orders` | Daily Vercel Cron, with `Authorization: Bearer $CRON_SECRET` |

Errors come back as `{message, errors?}` with status 422 (validation), 429 (too many requests),
503 (RajaOngkir not set up or down) or 404.
