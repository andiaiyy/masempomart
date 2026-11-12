# Masempo Mart

Online snack shop. Built from the Haiyin codebase (Next.js storefront + Laravel/Filament admin), reworked for snacks:

- **Variants:** a product has flavors or pack sizes, each with its own price, shipping weight and stock.
- **No overselling:** placing an order takes its packs out of stock in the same database statement that checks there are enough. Unpaid orders give the packs back when the transfer deadline passes or the order is cancelled.
- **Shipping from RajaOngkir:** at checkout the shopper searches their kecamatan/kelurahan (RajaOngkir's destination list), sees every courier service with its price and delivery estimate for the parcel's weight, and picks one. The server prices the order again from RajaOngkir, so a tampered price can't get through. Answers are cached (searches a week, prices 12 hours) to spare the API quota.
- **Bank transfer, no gateway fee** (the same way Karueng takes payment): guest checkout lands on a printed receipt listing the shop's bank accounts. The shopper transfers the exact total and sends the proof over WhatsApp; an admin checks it and clicks **Mark paid**, and the receipt turns "Lunas" on its own.
- **Unique transfer code:** every order's total gets 1–999 rupiah added, picked so no two unpaid orders ask for the same amount; each transfer in the bank statement points to one order.
- **Emails through Brevo:** the shopper gets their receipt link (so closing the tab doesn't lose it) with the amount and account; the shop gets a new-order email with what to pack, where it goes, and the amount to look for.

| Folder | What | Stack |
|---|---|---|
| `admin/` | REST API under `/api` and the admin panel at `/` | Laravel 12, Filament 3, PHP 8.2 |
| `user/` | Storefront (Bahasa Indonesia) | Next.js 15, React 19, Tailwind 4 |

`DESIGN.md` records the storefront's look (clean grocery, one green accent).

## Run locally

Needs PHP 8.2 with Composer, and Node 20+. Double-click `start.cmd`, or:

```bash
cd admin
cp .env.example .env && php artisan key:generate
touch database/database.sqlite
php artisan migrate --seed       # demo snacks + admin@masempo.test / password
php artisan storage:link

cd ../user
npm install
npm run dev                      # API on :8000, shop on :3000
```

- Shop: http://localhost:3000
- Admin: http://127.0.0.1:8000 (admin@masempo.test / password)

**Shipping (RajaOngkir):** checkout can't price parcels until `admin/.env` has:

```
RAJAONGKIR_API_KEY=your-key-from-the-rajaongkir-dashboard
RAJAONGKIR_ORIGIN=        # destination id parcels ship from, see below
RAJAONGKIR_COURIERS=jne:jnt:sicepat:pos:tiki:ninja:lion
```

Find the origin id with `cd admin && php artisan rajaongkir:search "Tanete Riattang"` (any kecamatan, kelurahan or postal code), then `php artisan config:clear` if you cached config. Courier codes are RajaOngkir's (jne, jnt, sicepat, pos, tiki, ninja, lion, ide, sap, wahana, sentral, rex, spx); up to 7 are priced per API call.

**Shop settings** (admin → **Sales → Shop settings**): bank accounts for the receipt, the WhatsApp contact (a number, or a WhatsApp link), Instagram, and the email that hears about new orders. To confirm a transfer, open the order in the admin and click **Mark paid** (it also works after the deadline passed, as long as the packs are still in stock).

**Email:** locally `MAIL_MAILER=log` writes emails to `admin/storage/logs/laravel.log`. To send for real, put Brevo's SMTP login and key in `admin/.env` (see `admin/.env.example`).

**Speed:** `start.cmd` and `npm run dev` start PHP's built-in server with OPcache switched on for that process (`php -d zend_extension=opcache …`), because without it each API request took 4-6 seconds on the development machine and about 0.2 s with it. `php artisan serve` works too, just slower unless OPcache is on in your `php.ini`. The built-in server handles one request at a time, which is fine locally; production runs PHP-FPM or similar.

## How stock moves

| Event | Stock |
|---|---|
| Admin creates a variant | starting stock set once in the product form |
| Restock (admin → Restocks) | + packs, logged with cost and best-before date |
| Write-off (Restocks, negative number, note required) | − packs, never below zero |
| Shopper places an order | − packs immediately (status `pending`) |
| Transfer deadline passes / admin cancels | + packs back |
| Order unpaid past `SHOP_HOLD_MINUTES` (default 60) | expired, + packs back |
| Admin marks a late transfer paid | packs taken again; if they sold out meanwhile, the order is flagged "Needs attention" in the admin |

Expiry runs on every catalog/checkout request and every minute through the scheduler (`php artisan schedule:work` locally, or a cron / Cloud Scheduler job running `php artisan orders:expire` in production).

## Tests

```bash
cd admin && php artisan test     # checkout, stock, payment confirmation, shipping, admin panel
cd user && npm run typecheck && npm run lint
```

## Production notes

Hosting is on Vercel for now: two projects from this repository (`admin` on the PHP runtime, `user` as Next.js), Postgres on Neon, product photos on Cloudflare R2, email through Brevo. Step by step in [DEPLOY.md](DEPLOY.md).

Not built yet: emails when an order is paid or shipped (the receipt page shows both), booking the courier pickup through an API (the admin types the resi by hand), and a shop logo (the name only appears in the landing page's title card).
