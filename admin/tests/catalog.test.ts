import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { call, customer, reset, shipping, variant } from "./helpers";
import { GET as categories } from "../src/app/api/categories/route";
import { GET as products } from "../src/app/api/products/route";
import { GET as product } from "../src/app/api/products/[slug]/route";
import { GET as variants } from "../src/app/api/variants/route";
import { sql } from "../src/lib/db";
import { markPaid, place } from "../src/lib/orders";

beforeEach(reset);

test("the catalog hides products and variants that are off sale", async () => {
  const shown = await variant({ name: "Keripik Pisang" });
  await sql("insert into product_variants (product_id, name, price, weight_grams, stock, is_active) values ($1, 'Lama', 9000, 100, 5, false)", [shown.productId]);
  await variant({ name: "Disembunyikan", productActive: false });
  const noVariants = await variant({ name: "Tanpa varian" });
  await sql("update product_variants set is_active = false where product_id = $1", [noVariants.productId]);

  const res = await call(products, "/api/products");
  assert.deepEqual(res.body.data.map((p: { name: string }) => p.name), ["Keripik Pisang"]);
  assert.equal(res.body.data[0].variants.length, 1);
  assert.equal(res.body.meta.total, 1);
  assert.equal((await call(categories, "/api/categories")).body[0].product_count, 1);
  assert.equal((await call(product, "/api/products/keripik-2", { params: { slug: "keripik-2" } })).status, 404);
});

test("the product page gets specs in order, a promo price and its neighbours", async () => {
  const a = await variant({ name: "Abon" });
  const b = await variant({ name: "Bagea", price: 30000 });
  await variant({ name: "Cucur" });
  await sql("update products set specs = $2::jsonb, description = $3 where id = $1", [
    b.productId,
    JSON.stringify([{ label: "Asal", value: "Makassar" }, { label: "Daya tahan", value: "2 bulan" }]),
    "x".repeat(200),
  ]);
  await sql("update product_variants set compare_at_price = 36000 where id = $1", [b.id]);
  const slug = (await sql<{ slug: string }>("select slug from products where id = $1", [b.productId]))[0].slug;

  const res = await call(product, `/api/products/${slug}`, { params: { slug } });
  assert.deepEqual(res.body.specs, [{ label: "Asal", value: "Makassar" }, { label: "Daya tahan", value: "2 bulan" }]);
  assert.equal(res.body.description.length, 200);
  assert.equal(res.body.variants[0].compare_at_price, 36000);
  assert.equal(res.body.previous.name, "Abon");
  assert.equal(res.body.next.name, "Cucur");

  // On the shelf: no specs, description shortened
  const card = (await call(products, "/api/products")).body.data.find((p: { id: number }) => p.id === b.productId);
  assert.deepEqual(card.specs, []);
  assert.ok(card.description.endsWith("...") && card.description.length <= 123);
  assert.equal(a.id > 0, true);
});

test("the cart refreshes prices and stock", async () => {
  const v = await variant({ name: "Kue Lapis", price: 12000, stock: 4 });
  const [{ slug }] = await sql<{ slug: string }>("select slug from products where id = $1", [v.productId]);
  const res = await call(variants, `/api/variants?ids=${v.id},999,abc`);
  assert.equal(res.body.length, 1);
  assert.deepEqual(res.body[0], {
    id: v.id,
    name: "150 g",
    price: 12000,
    stock: 4,
    available: true,
    product: { name: "Kue Lapis", slug, image: null },
  });
});

test("filters, sorts, ranges and counts", async () => {
  const cheap = await variant({ name: "Murah", price: 10000, stock: 0 });
  await variant({ name: "Mahal", price: 90000 });
  const promo = await variant({ name: "Promo", price: 40000 });
  await sql("update product_variants set compare_at_price = 50000 where id = $1", [promo.id]);

  const names = async (qs: string) => (await call(products, `/api/products?${qs}`)).body.data.map((p: { name: string }) => p.name);
  assert.deepEqual(await names("sort=price_asc"), ["Murah", "Promo", "Mahal"]);
  assert.deepEqual(await names("sort=price_desc"), ["Mahal", "Promo", "Murah"]);
  assert.deepEqual(await names("sort=newest"), ["Promo", "Mahal", "Murah"]);
  assert.deepEqual(await names("in_stock=1&sort=name"), ["Mahal", "Promo"]);
  assert.deepEqual(await names("on_sale=1"), ["Promo"]);
  assert.deepEqual(await names("min_price=20000&max_price=60000"), ["Promo"]);
  assert.deepEqual(await names(`exclude=${cheap.productId}&sort=name`), ["Mahal", "Promo"]);

  const meta = (await call(products, "/api/products?per_page=2")).body.meta;
  assert.deepEqual(meta.price_range, { min: 10000, max: 90000 });
  assert.deepEqual(meta.counts, { in_stock: 2, on_sale: 1 });
  assert.deepEqual([meta.current_page, meta.last_page, meta.total], [1, 2, 3]);
});

test("best selling counts only paid orders", async () => {
  const sold = await variant({ name: "Laris", stock: 20 });
  const unpaid = await variant({ name: "Belum dibayar", stock: 20 });
  await variant({ name: "Abon", stock: 20 });
  const paid = await place(customer(), [{ variant_id: sold.id, quantity: 2 }], shipping());
  await markPaid(paid.id);
  await place(customer(), [{ variant_id: unpaid.id, quantity: 5 }], shipping());

  const res = await call(products, "/api/products?sort=best");
  assert.deepEqual(res.body.data.map((p: { name: string }) => p.name), ["Laris", "Abon", "Belum dibayar"]);
});

test("search is case-insensitive and treats % and _ literally", async () => {
  await variant({ name: "Kacang Mete" });
  await variant({ name: "Keripik 100%" });
  const names = async (q: string) => (await call(products, `/api/products?q=${encodeURIComponent(q)}`)).body.data.map((p: { name: string }) => p.name);
  assert.deepEqual(await names("mete"), ["Kacang Mete"]);
  assert.deepEqual(await names("KACANG"), ["Kacang Mete"]);
  assert.deepEqual(await names("%"), ["Keripik 100%"]);
  assert.deepEqual(await names("coklat"), []);
});

test("category filter and tab order", async () => {
  await variant({ name: "Keripik A" });
  await sql("insert into categories (name, slug, sort_order) values ('Minuman', 'minuman', -1)");
  const res = await call(categories, "/api/categories");
  assert.deepEqual(res.body.map((c: { slug: string }) => c.slug), ["minuman", "keripik"]);
  assert.equal((await call(products, "/api/products?category=minuman")).body.meta.total, 0);
  assert.equal((await call(products, "/api/products?category=keripik")).body.meta.total, 1);
});
