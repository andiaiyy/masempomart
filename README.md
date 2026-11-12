# Masempo Mart

Online snack shop: produk olahan Bone, dikirim ke seluruh Indonesia. Two Next.js apps with one look:

| Folder | What | Stack |
|---|---|---|
| `user/` | Storefront (Bahasa Indonesia) | Next.js 15, React 19, Tailwind 4 |
| `admin/` | The shop's API under `/api`, and the admin panel at `/` (Bahasa Indonesia) | Next.js 15, React 19, Tailwind 4, Postgres |

Same stack and theme on both sides; the admin is built the way Karueng's is. `DESIGN.md` records the look.

- **Variants:** a product has flavors or pack sizes, each with its own price, shipping weight and stock.
- **No overselling:** placing an order takes its packs out of stock in the same database statement that checks there are enough. Unpaid orders give the packs back when the transfer deadline passes or the order is cancelled.
- **Shipping from RajaOngkir:** at checkout the shopper searches their kecamatan/kelurahan, sees every courier service with its price and delivery estimate for the parcel's weight, and picks one. The server prices the order again, so a tampered price can't get through. Answers are cached (searches a week, prices 12 hours) to spare the API quota.
- **Bank transfer, no gateway fee** (the same way Karueng takes payment): checkout lands on a printed receipt listing the shop's bank accounts. The shopper transfers the exact total and sends the proof on WhatsApp; the admin checks it and clicks **Tandai lunas**, and the receipt turns "Lunas" on its own.
- **Unique transfer code:** every order's total gets 1–999 rupiah added, picked so no two unpaid orders ask for the same amount; each transfer in the bank statement points to one order. The admin finds orders by that amount.
- **Emails through Brevo:** the buyer gets their receipt link with the amount and account; the shop gets a new-order email with what to pack, where it goes, and the amount to look for.

## Run locally

Needs Node 20+. Double-click `start.cmd`, or:

```bash
cd admin
npm install
npm run db:setup     # embedded Postgres in admin/.pglite, demo snacks, admin@masempo.test / password

cd ../user
npm install
npm run dev          # admin + API on :8000, shop on :3000
```

- Shop: http://localhost:3000
- Admin: http://localhost:8000 (admin@masempo.test / password)

No Postgres to install: without `DATABASE_URL` the admin uses an embedded one in `admin/.pglite`.

**In the admin, Pengaturan:** bank accounts for the receipt, WhatsApp (a number or a link), Instagram, the email that hears about new orders, and where parcels ship from (search your kecamatan and pick it).

**Outside services** (all optional locally, set in `admin/.env.local`, see `admin/.env.example`):

| Service | Variables | Without it |
|---|---|---|
| RajaOngkir | `RAJAONGKIR_API_KEY`, `RAJAONGKIR_COURIERS` | Checkout says shipping can't be calculated yet |
| Brevo | `BREVO_API_KEY`, `MAIL_FROM_ADDRESS` | Emails are saved to `admin/.mail/` as HTML instead of sent |
| Vercel Blob | `BLOB_READ_WRITE_TOKEN` | Photos go to `admin/public/uploads` (local only) |

Courier codes are RajaOngkir's (jne, jnt, sicepat, pos, tiki, ninja, lion, ide, sap, wahana, sentral, rex, spx); up to 7 are priced per API call.

## How stock moves

| Event | Stock |
|---|---|
| New variant in the product form | starting stock, set once |
| Stok page, positive number | + packs, logged with cost and best-before date |
| Stok page, negative number (reason required) | − packs, never below zero |
| Shopper places an order | − packs immediately (status "Menunggu transfer") |
| Transfer deadline passes (`SHOP_HOLD_MINUTES`, default 60) / admin cancels | + packs back |
| Admin marks a late transfer paid | packs taken again; if they sold out meanwhile, the order shows "Perlu dicek" |

Expiry runs on every catalog and checkout request, and daily through Vercel Cron.

## Tests

```bash
cd admin && npm test                                  # API and order logic (in-memory Postgres, fake RajaOngkir and Brevo)
cd admin && npm run typecheck && npm run lint
cd user && npm run typecheck && npm run lint
```

## Hosting

Vercel: two projects from this repository (`admin` and `user`), Postgres on Neon, photos on Vercel Blob, email through Brevo. Step by step in [DEPLOY.md](DEPLOY.md).

Not built yet: emails when an order is paid or shipped (the receipt page shows both), booking the courier pickup through an API (the admin types the resi by hand), and a shop logo (the name appears in Lontara in the title card and admin).
