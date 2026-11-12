# Masempo Mart: design direction

Chosen by the owner on 2026-11-10: **clean grocery**, with the storefront in **Bahasa Indonesia**.

- White background, one green accent, a dense product grid built for fast scanning and quick add-to-cart.
- Dial: ENERGY 2 / RHYTHM 1 / MOTION 1. The even grid is deliberate (shoppers compare many small items). Motion is hover and press feedback only.

## Decisions under that direction

| Decision | Value | Reason |
|---|---|---|
| Accent | `#0f7a3d` green, hover `#0b5f2f` | The owner's "one green accent". Solid only for the main step on a page (checkout, pay) and a hovered card's add button; price and links on the product page. 5.4:1 on white, so it also works as text. |
| Neutrals | ink `#191a17`, muted `#5c5d57`, line `#e3e3dd`, tile `#f3f3ef` | Warm greys keep the white from feeling clinical; the tile grey sits behind product photos so white packaging still shows an edge. |
| Status colors | sold out `#b42318`, low stock `#8a4600` | Only for real stock states, never decoration. |
| Typeface | Geist Sans, self-hosted via `next/font` | The Karueng Trip site's main font, which the owner asked for (2026-11-10); it replaces Inter. Clean and even at small sizes, with tabular figures for prices. Karueng's Bodoni Moda (hero headlines) is not used; its IBM Plex Mono is used on the printed receipt only. |
| Prices | Small "Rp" before bold tabular digits | The shop's one repeated motif: every price reads the same in the grid, product page, cart and receipt. |
| Radius | 16px on catalog cards, 6px on inputs and buttons, square on the product page | Cards follow the catalog reference; the product page follows its own reference's square buttons. No pills. |
| Shadow | None | Thin lines separate content; only the cart bubble floats, without a shadow. |
| Theme | Light only | The direction is a white grocery shelf, and product photos are shot on white. |
| Logo | None shown: the landing ring's title card is the only place the name appears | No logo was supplied; with no header there is nowhere else for a wordmark. |
| Page width | One width for every page: `container-page` (max 1152px, 16px / 24px side padding). Shelf, product page, cart and checkout share their left and right edges; the scrollbar's room is always reserved (`scrollbar-gutter: stable`) so nothing shifts between short and long pages | The owner found the landing and product page spacing didn't match (2026-11-11). The order page stays a narrow centred column. |
| Section titles | `section-title`: bold, uppercase, widely spaced. 3xl–4xl for page-level titles (OLAHAN BONE, PRODUK TERKAIT, KERANJANG, CHECKOUT), small for side labels (TENTANG PRODUK) | One heading voice across pages, taken from the landing shelf. Playfair is kept only for names: "Mart" and the product name. |
| Lines | Light `#e3e3dd`, 1px, under the shelf's filter row, the product breadcrumb and between product page sections | Same separator everywhere. |

## Landing page

On 2026-11-10 the owner supplied a poster ("Traditional Market menu", a ring of hand-drawn jajanan pasar around a round title card) and asked for it as the landing page. On 2026-11-11 the separate catalog page (`/produk`, with its filter column) was removed at the owner's request: the shelf below the ring (`/#produk`) is now the only place to browse.

| Decision | Value | Reason |
|---|---|---|
| Hero | The poster's food ring, centred, up to 760px wide; a paper-coloured circle in its middle holds the shop's own title card | The poster's composition. The ring was cut out of the poster (`user/src/assets/jajanan-ring.png`) with its background made transparent and its original title, logo and sponsor line removed. |
| **Artwork licence** | **Not verified** | The illustration looks like stock or commissioned art and carried another brand's logo and a sponsor mark. Confirm the licence, or replace the PNG with your own art, before the site goes public. |
| Title card | "ᨆᨔᨛᨇᨚ" (Masempo in Lontara, Noto Sans Buginese) over "Mart" in Playfair, the tagline "Produk olahan Bone, dikirim ke seluruh Indonesia", and a "Lihat semua camilan" button | Started from the poster's layout; the owner then dropped the small lines above and below the name and set the Bone tagline (2026-11-11). The owner asked for the name in Bugis script, a nod to where "masempo" comes from. The font is self-hosted so phones without a Bugis font still show it; the Lontara is hidden from screen readers, which read "Masempo Mart". Sizes in `cqw` so the card scales with the ring; below 512px of ring the tagline and button move under the ring. |
| Motion | The ring turns once every 90 s; the title card stays still. Pause/play button at the ring's lower right. No motion (and no button) when the device asks for reduced motion | **Owner override (2026-11-11):** the motion rule (MOTION 1, no endless loops) is set aside here because the owner asked for the food to circle. Kept slow so it reads as drift, and stoppable as WCAG 2.2.2 requires for anything moving longer than 5 s. |
| Header and footer | None on any page. The cart is a round ink button fixed in the lower right corner (green badge with the pack count, hidden on the cart, checkout and receipt pages); search is a 🔍 button in the shelf's filter row that opens a search box under it | The owner asked for the ring to open the page on its own, then for every header and footer to go, leaving just a cart bubble (2026-11-11). The bubble is the one thing that floats; it has no shadow, the dark circle on paper is contrast enough. Each page keeps its own way back: breadcrumb on the product page, "Lanjut belanja" in the cart. |
| Filter row | Uppercase category tabs (13px, grey; the chosen one dark and underlined) each with a small product count, a ⇅ icon at the end opening Baru / Terlaris, one light line under the whole row. Tabs wrap from 640px up; on phones they swipe and the chosen tab is kept in view | From the owner's third reference (IKKARI catalog, 2026-11-11), replacing the "REAL MEAL" tab line. Counts are real (products on sale per category). |
| Below the ring | "OLAHAN BONE" shelf: spaced uppercase title, the filter row above, then the product cards, 12 at a time (2 / 3 / 4 across) with "Muat lebih banyak". Tab, order and search live in the URL (`/?category=kue-kering&sort=best#produk`); product pages, the search box and the cart link into it | Title, tabs and sort from the owner's second reference ("REAL MEAL"); the owner kept the shop's own cards rather than the reference's loose photos (2026-11-11). Replaces the earlier featured row, category tiles and the catalog page. Terlaris ranks by packs sold in paid orders. The wide-tracked uppercase title is the reference's typography, used once. |
| Note | The art shows kue basah (klepon, dadar gulung, lapis) that the demo catalog doesn't sell | Fine as a mood for Indonesian snacks; worth matching to the real range over time. |

## Product cards

On 2026-11-10 the owner supplied a reference catalog (an organic dried-fruit shop). Its cards are used in the landing shelf; its filter-column catalog page was built and then removed on 2026-11-11 at the owner's request.

| Decision | Value | Reason |
|---|---|---|
| Ground and cards | Paper `#f7f6f2` with white cards, 16px radius, no shadow | From the reference; the same paper as the product page, so the two pages feel like one shop. |
| Card | Round photo breaking out of the card's top edge (112px, 144px on wide screens), name, then "Tambah +" left and price right; 2 / 3 / 4 per row by width; PROMO / Habis as a sticker on the photo | From the reference. The owner asked for smaller cards with bigger photos (2026-11-10): the photo is what sells a snack, and four across shows more of the shelf at once. |
| Card hover | Green border on the card and the "Tambah" button fills green | The reference's hover state, in our accent: the add target lights up only where the pointer is, instead of 24 solid green buttons. |
| Promo | Optional "was price" per variant; card shows a red PROMO label, struck old price and red price | The reference's sale sticker, kept straight. Only appears when the admin sets a was-price. |
| Paging | "Muat lebih banyak" appends the next 12 | From the reference. |
| Left out | Star ratings, bonus, account menu, newsletter, footer link columns | The shop has no reviews, accounts or those pages yet; showing them would be empty promises. |

## Product page

On 2026-11-10 the owner supplied a reference product page (a premium spirits shop) and asked for the product detail page to look like it. Its layout and type are followed; its brand (name, logo, pink accent, photos) is not.

| Decision | Value | Reason |
|---|---|---|
| Ground | Paper `#f7f6f2` on every page of the shop | From both references. Pack photos shot on white melt into it on the product page (`mix-blend-multiply`), so they stand free like packshots. |
| Display type | Playfair Display for the product name only, self-hosted via `next/font` | The reference's serif, matching "Mart" on the landing. Section headings use the shared `section-title` (2026-11-11). |
| Breadcrumb | 13px uppercase, grey links, current page dark and semibold, light line underneath | Matches the shelf's filter row (2026-11-11). |
| Labels | Small spaced capitals (`.eyebrow`) for fact labels and the two buttons | From the reference; labels sit behind their values on a spec sheet. |
| Price | Large, in the shop green | The reference puts its brand color on the price; ours is green. |
| Buttons | Quantity box joined to an outlined "Tambah ke keranjang", then solid ink "Beli sekarang" | From the reference. "Beli sekarang" adds to the cart and opens checkout. |
| Arrangement (2026-11-11) | Thumbnails in a column beside one large rounded photo; on the right: name (Playfair bold), "Kategori · Tersedia" line, Deskripsi / Detail tabs, variants as a radio list with prices, quantity + one wide green "Tambah ke keranjang · Rp total", shipping note, "atau beli sekarang" link, share (the "Cocok dengan …" box was removed at the owner's request) | The owner asked for the information arranged like a fourth reference (Golde) while keeping this theme. Stars, reviews and the legal warning are left out (no such data). Supersedes the fact grid, the square buttons and the Tentang Produk / Info Tambahan sections below. |
| Detail tab | Kategori, Berat kirim, then every product specification | Real data only: specs are typed in the admin (Products → Specifications). No SKU line because the shop has no SKUs. |
| Separators | A short rule (not a dash character) between variant name and stock state | The reference's "—" separator, drawn as a line. |
| Share | WhatsApp, Facebook, copy link, as text buttons | WhatsApp is how Indonesian shoppers share; text instead of brand icons. |
| Related | "PRODUK TERKAIT": up to four of the shop's product cards, same grid as the shelf, "Lihat semua …" opening the shelf on that category | Same cards as the landing (2026-11-11), replacing the reference's plain photo row. |

## Receipt (order page)

On 2026-11-11 the owner dropped Midtrans (no gateway fee) for Karueng's way of taking payment, and asked for Karueng's printed receipt, the same.

| Decision | Value | Reason |
|---|---|---|
| Payment | Bank transfer to the accounts set in the admin (Pengaturan), proof sent on WhatsApp, an admin clicks **Tandai lunas** | Karueng's flow. No fee per order; the cost is a manual check per order. Stock is held for `SHOP_HOLD_MINUTES` (60) and the receipt shows that deadline in the shopper's own time zone. |
| Receipt | Karueng's receipt: dark printer slot, white paper that slides out of it once (2.6 s, none with reduced motion), IBM Plex Mono, dashed rules, item / qty / price table, total, status badge with a coloured dot, torn zigzag bottom edge (drawn with a conic gradient: Karueng's two-gradient version fills solid, so its edge is flat). Header is the Lontara ᨆᨔᨛᨇᨚ with "MASEMPO MART" under it | The owner asked for it to match Karueng's. The Lontara name ties it to the landing title card. |
| While unpaid | "Transfer ke" boxes with a Salin (copy) button per account, the exact total and deadline, and a green "Kirim bukti transfer via WhatsApp" button with the order code in the message | Karueng's. The WhatsApp button's text is near-black instead of Karueng's white: white on WhatsApp green is under 2:1 contrast. |
| After payment | Badge turns "Lunas" without a reload (the page re-checks every 5 s); the transfer box is replaced by a barcode drawn from the order code; courier and tracking number appear once shipped | Karueng's. The barcode is decoration only. |
| Shadows | The printer slot and paper keep Karueng's shadows | **Owner override:** the shop otherwise has no shadows; the receipt was asked for as Karueng's, and the shadow is what makes the paper read as coming out of the slot. |
| Not copied | Karueng's automatic WhatsApp receipt (Fonnte) | Needs a paid Fonnte account and token; the receipt link works without it. |

## Checkout shipping (RajaOngkir)

On 2026-11-12 the owner switched shipping from flat per-kilogram rates to RajaOngkir.

| Decision | Value | Reason |
|---|---|---|
| Address | One "Kecamatan / kelurahan" search box replaces the province list and the city and kecamatan fields. Results show "Kelurahan, Kecamatan" over "Kota, Provinsi · kode pos"; the pick shows as text with an "Ubah" link and fills the postal code | Couriers price to RajaOngkir's place ids, so the shopper has to pick from that list. One box also means fewer fields to type. |
| Couriers | Their own "Kurir" section under the address: a radio list, cheapest first and preselected, each with service name, description, delivery estimate and price | Shoppers compare price against speed; the cheapest is what most pick. The order summary shows the picked service and updates the total. |
| Search box | A combobox: arrow keys and Enter pick, Escape closes, results announced by a polite live hint | Keyboard and screen reader use. Enter in the box never submits the checkout. |
| Receipt | A "Pengiriman" row: courier, service and estimate | The shopper sees what they paid for; the admin's "Mark shipped" form starts on that courier. |
| Not set up | Until `RAJAONGKIR_API_KEY` and `RAJAONGKIR_ORIGIN` are set, checkout says shipping can't be calculated and the order button is off | Better than letting the shopper fill the whole form first. |

## Contact and transfer code (2026-11-12)

| Decision | Value | Reason |
|---|---|---|
| Contact | One small block at the very end of the landing page: "TANYA-TANYA DULU?", a line of text, then "WhatsApp" and "Instagram @masempo.mart" as underlined uppercase links | With no header or footer the shop had no contact anywhere. The owner wanted WhatsApp as a link, not a printed number. Same link style as the shelf's filter row. |
| Unique code | A "Kode unik" line on the receipt above the total, and a sentence saying the last digits are the code | So the shopper understands why the total isn't round, and transfers the exact amount. |
| Emails | One white card on the paper ground, spaced MASEMPO MART header linking to the storefront, item table, buttons in the shop green, Indonesian dates in WITA | Plain and readable in every mail app; the receipt itself is on the web. |

## Admin (2026-11-12)

The owner dropped Laravel/Filament: "use the same stack and theme as user side". The admin is now a Next.js app (folder `admin/`), built the way Karueng's admin is, in the storefront's look.

| Decision | Value | Reason |
|---|---|---|
| Look | The storefront's tokens (paper ground, ink, one green accent, warm greys), Geist, white cards with a 16px radius and a thin line, no shadows, page titles in the shelf's spaced capitals ("PESANAN") | One shop, two sides. Filament's orange, dark mode and default font made it feel like another brand. |
| Brand | Sidebar and login show the landing title card in small: ᨆᨔᨛᨇᨚ in Lontara over "Mart" in Playfair | The owner's name for the shop, as on the landing page. |
| Language | Bahasa Indonesia: Ringkasan, Pesanan, Produk, Kategori, Stok, Pengaturan, Admin; actions "Tandai lunas", "Tandai dikirim", "Tandai selesai" | Same language as the shop and the owner. |
| Green | Only on the one action that moves an order or saves a form | Same rule as the storefront: solid green for the main step only. |
| Order list | Tabs styled like the shelf's filter row (uppercase, count in superscript, underline), search by code, name, phone or the transfer amount from the bank statement | Matching a BNI transfer to an order is the daily job; the unique code makes the amount unique. |
| Ringkasan | Transfers waiting (with exact amounts), orders to ship, low stock with "Tambah stok" | What needs doing today, in that order. |
| Products | One page: details, photos (first = card photo, reorder with arrows), variants, the Detail-tab facts; "Lihat di toko" on every product | Every field maps to something on the storefront; fields that did nothing (Featured, category image) are gone. |
| Stock | Existing variants' stock only changes on the Stok page (positive in, negative out with a reason), logged | The log stays honest; orders change stock by themselves. |

