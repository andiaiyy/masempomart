# Deploying to Vercel

Two Vercel projects from this one repository, both Next.js:

| Project | Root Directory | What |
|---|---|---|
| `masempo-admin` | `admin` | The shop's API (`/api`) and the admin panel |
| `masempo` | `user` | The storefront. Calls the admin for everything (`BACKEND_URL`) |

> **Vercel's free Hobby plan is for non-commercial use only.** Fine for a test run; a shop taking orders should be on Pro.

## 1. Admin project (`admin`)

1. Vercel → Add New → Project → import `andiaiyy/masempomart` → Root Directory **`admin`** (Framework: Next.js).
2. Before the first deploy, in the project's **Storage** tab:
   - **Create a Neon Postgres database** and connect it. It sets `DATABASE_URL`.
   - **Create a Blob store** and connect it. It sets `BLOB_READ_WRITE_TOKEN` (product photos).
3. Environment variables:

```
SESSION_SECRET=           # any long random string (signs the admin login)
CRON_SECRET=              # any long random string (Vercel Cron sends it)
ADMIN_EMAIL=you@example.com
ADMIN_PASSWORD=           # the first admin login, created on the first deploy
STOREFRONT_URL=https://masempo.vercel.app

RAJAONGKIR_API_KEY=
RAJAONGKIR_COURIERS=jne:jnt:sicepat:pos:tiki:ninja:lion

BREVO_API_KEY=            # Brevo > SMTP & API > API keys
MAIL_FROM_ADDRESS=        # a sender verified in Brevo
MAIL_FROM_NAME=Masempo Mart

SHOP_ORDER_NOTIFY_EMAIL=  # optional; can also be set in the admin
```

4. Deploy. Every build first runs `scripts/setup-db.mjs` (see `vercel.json`): it creates any missing tables, loads the demo snacks into an empty database, and creates the `ADMIN_EMAIL` login if it doesn't exist. Re-running never deletes anything.

`vercel.json` also schedules `/api/cron/expire-orders` once a day (Hobby plans allow one a day); orders expire on every catalog and checkout request anyway.

## 2. Storefront project (`user`)

Add New → Project → the same repository → Root Directory **`user`** (Framework: Next.js). One variable:

```
BACKEND_URL=https://masempo-admin.vercel.app
```

Deploy. If its address isn't the `STOREFRONT_URL` you set on the admin, update that and redeploy the admin (receipt links in emails use it).

## 3. In the admin

Log in at the admin's address → **Pengaturan**:

- Rekening tujuan transfer (bank, number, name).
- Kontak: WhatsApp (number or link), Instagram, email pesanan baru.
- Asal pengiriman: search your kecamatan (e.g. "Tanete Riattang") and pick it. Shipping is priced from here.
- "Sambungan" at the bottom shows whether RajaOngkir, Brevo and Blob are connected.

Then delete the demo products (Produk), add the real ones with photos, and place a test order on the storefront: you should get the new-order email, the buyer the receipt link.

## When something breaks

- Errors: Vercel → project → Logs.
- No shipping prices: `RAJAONGKIR_API_KEY`, and an origin picked in Pengaturan. With only one courier priced, check `RAJAONGKIR_COURIERS` (several are sent as `jne:jnt:…`, up to 7 per call).
- No emails: Brevo → Transactional → Logs; the sender must be verified. A sender on your own domain lands in inboxes far more reliably than `@gmail.com`.
- Rate limits count per server instance (as in Karueng); fine for a small shop.
