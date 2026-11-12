# Masempo Mart: API and admin

Laravel 12 + Filament 3. See the project README one folder up for setup.

- `app/Services/Orders.php`: placing orders, reserving and returning stock, payment and shipping status changes.
- `app/Services/ShopSettings.php`: bank accounts, WhatsApp, Instagram and the new-order email from the admin's **Shop settings** page.
- `app/Mail/`: the receipt-link email to the shopper and the new-order email to the shop (Brevo SMTP).
- `app/Services/RajaOngkir.php`: destination search and courier prices from RajaOngkir's Komerce API v1 (cached).
- `app/Services/Shipping.php`: parcel weight (packs + packaging) and the courier options, free above `SHOP_FREE_SHIPPING_OVER`.
- `app/Services/Inventory.php`: restocks and write-offs.
- `app/Http/Controllers/Api`: the public API the storefront calls.
- `app/Filament`: the admin panel (products with variants, categories, restocks, orders, staff, dashboard).

## API

| Method | Path | |
|---|---|---|
| GET | `/api/categories` | categories with product counts |
| GET | `/api/products?category=&q=&min_price=&max_price=&in_stock=1&on_sale=1&sort=&page=&per_page=` | products on sale, with variants. `sort`: `price_asc`, `price_desc`, `name`, `newest` (default: featured first). `meta` also carries `price_range` and `counts` (in stock / on promo) for the filter column |
| GET | `/api/products/{slug}` | one product, with its specifications and the previous / next product in its category |
| GET | `/api/variants?ids=1,2,3` | current price and stock for cart lines |
| GET | `/api/shop` | WhatsApp and Instagram links for the storefront |
| GET | `/api/shipping/options` | free-shipping threshold, hold minutes, whether RajaOngkir is set up |
| GET | `/api/shipping/destinations?search=` | kecamatan/kelurahan matching a name or postal code (RajaOngkir) |
| POST | `/api/shipping/quote` | `{destination_id, items: [{variant_id, quantity}]}` → subtotal, weight, courier options (cheapest first) |
| POST | `/api/checkout` | `{customer: {...}, items: [...]}` plus `shipping: {courier, service}` → order code (packs reserved, receipt waits for the transfer) |
| GET | `/api/orders/{code}` | the shopper's receipt: status, items, and while unpaid the bank accounts, WhatsApp number and deadline (no address or phone) |

On Vercel, `api/index.php` is the entry point (caches and storage under `/tmp`) and `vercel.json` routes everything else to it; `/api/cron/expire-orders` runs daily with `CRON_SECRET`. See [../DEPLOY.md](../DEPLOY.md).
