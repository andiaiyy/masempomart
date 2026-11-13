# Masempo Mart: storefront

Next.js 15 (App Router), React 19, Tailwind 4. Text is in Bahasa Indonesia; the look is described in `../DESIGN.md`.

| Route | |
|---|---|
| `/` | landing: the turning jajanan ring and title card, then the product shelf (`#produk`): category tabs, Baru / Terlaris, search results (`?q=`), numbered pages. `?category=` / `?sort=` / `?q=` / `?page=` open it on that view |
| `/produk/[slug]` | product page: photos, variant picker, quantity, bag button (add to cart) and "Beli sekarang" |
| `/keranjang` | cart, re-checked against current prices and stock when opened |
| `/checkout` | address form with kecamatan search, courier services and prices from RajaOngkir, places the order |
| `/pesanan/[code]` | the receipt, printed out of a printer slot (after Karueng's): bank accounts and a WhatsApp proof button while unpaid, "Lunas" once an admin confirms, courier and tracking number once shipped |

The browser calls `/api/*` on this site and Next.js forwards it to the admin app in `../admin` (`BACKEND_URL`, default `http://127.0.0.1:8000`). Server components fetch the same API directly. The cart is kept in `localStorage` under `masempo:cart`.

```bash
npm run dev        # admin + API (:8000) and this site (:3000) together
npm run dev:web    # this site only
npm run build && npm start
npm run typecheck && npm run lint
```
