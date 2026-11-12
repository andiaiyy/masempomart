# Deploying to Vercel

Two Vercel projects from this one repository:

| Project | Root Directory | What |
|---|---|---|
| `masempo-admin` | `admin` | Laravel API + Filament admin, on the community PHP runtime (`vercel-php@0.7.4`, PHP 8.3) |
| `masempo` | `user` | The Next.js storefront. Calls the admin project for everything (`BACKEND_URL`) |

Vercel keeps nothing on disk between requests, so the admin needs three outside services: a Postgres database, a bucket for product photos, and an email relay.

> **Vercel's free Hobby plan is for non-commercial use only.** Fine for a test run; a shop taking orders should be on Pro.

## 1. Outside services

1. **Database: Neon Postgres (free).** In Vercel: Storage → Create Database → Neon. Connect it to the `masempo-admin` project later; it sets `DATABASE_URL`, which the admin reads. Keep the connection string (with `sslmode=require`) at hand for step 3.
2. **Photos: Cloudflare R2 bucket.** Create a bucket, turn on public access (the `r2.dev` URL or your own domain), and create an API token with read/write on it. Under the bucket's CORS policy allow `PUT` and `GET` from your admin URL (photo uploads in the product form go straight to the bucket):
   ```json
   [{ "AllowedOrigins": ["https://masempo-admin.vercel.app"], "AllowedMethods": ["GET", "PUT"], "AllowedHeaders": ["*"] }]
   ```
3. **Email: Brevo.** Senders & IP → verify the address emails come from. SMTP & API → SMTP: note the login and create an SMTP key. A sender on your own domain lands in inboxes far more reliably than a `@gmail.com` one.
4. **RajaOngkir:** API key from the RajaOngkir dashboard, and the origin id (`php artisan rajaongkir:search "Tanete Riattang"`, see README).

## 2. Admin project (`admin`)

Vercel → Add New → Project → import `andiaiyy/masempomart` → Root Directory **`admin`**, Framework Preset **Other**. `admin/vercel.json` does the rest (PHP runtime, static files, daily cron).

Environment variables:

```
APP_NAME="Masempo Mart"
APP_ENV=production
APP_DEBUG=false
APP_KEY=                      # cd admin && php artisan key:generate --show
APP_URL=https://masempo-admin.vercel.app
APP_TIMEZONE=Asia/Makassar
TRUSTED_PROXIES=*

DB_CONNECTION=pgsql
# DATABASE_URL comes from the Neon integration (or set DB_URL yourself)
SESSION_DRIVER=database
SESSION_SECURE_COOKIE=true
CACHE_STORE=database
QUEUE_CONNECTION=sync
LOG_CHANNEL=stderr

SHOP_MEDIA_DISK=s3
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=auto
AWS_BUCKET=
AWS_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
AWS_URL=https://pub-<id>.r2.dev
AWS_USE_PATH_STYLE_ENDPOINT=true

RAJAONGKIR_API_KEY=
RAJAONGKIR_ORIGIN=
RAJAONGKIR_COURIERS=jne:jnt:sicepat:pos:tiki:ninja:lion

MAIL_MAILER=smtp
MAIL_HOST=smtp-relay.brevo.com
MAIL_PORT=587
MAIL_USERNAME=                # Brevo SMTP login
MAIL_PASSWORD=                # Brevo SMTP key
MAIL_FROM_ADDRESS=            # the sender verified in Brevo
MAIL_FROM_NAME="Masempo Mart"

STOREFRONT_URL=https://masempo.vercel.app
CRON_SECRET=                  # any long random string; Vercel Cron sends it
```

Deploy. The first deploy has no tables yet; that's the next step.

## 3. Create the tables and the admin login

From your computer, against the Neon database (Git Bash, in `admin/`). Your PHP has the Postgres driver; `-d extension=pdo_pgsql` switches it on for the command:

```bash
export DB_CONNECTION=pgsql DB_URL="postgresql://…neon.tech/neondb?sslmode=require"
php -d extension=pdo_pgsql artisan migrate --force
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' php -d extension=pdo_pgsql artisan db:seed --force
```

`db:seed` creates that admin login and the 14 demo products (delete them once the real ones are in). Run `migrate` again after every update that adds a migration.

## 4. Storefront project (`user`)

Add New → Project → the same repository → Root Directory **`user`**, Framework Preset **Next.js**. One variable:

```
BACKEND_URL=https://masempo-admin.vercel.app
```

Deploy, then put the storefront's address in the admin project's `STOREFRONT_URL` (receipt links in emails) and redeploy the admin.

## 5. In the admin

Log in at the admin URL → **Sales → Shop settings**: bank account, WhatsApp (number or link), Instagram, and the email that hears about new orders. Then place a test order on the storefront: you should get the new-order email, the buyer the receipt link.

## When something breaks

- Admin errors: Vercel → `masempo-admin` → Logs (Laravel logs to stderr there).
- Photos don't upload: the bucket's CORS policy (step 1.2) and `AWS_*` values.
- No emails: Brevo → Transactional → Logs; check the sender is verified.
- Orders expire on every catalog and checkout request; the daily cron (`/api/cron/expire-orders`, Hobby plans allow one a day) only catches quiet days.
