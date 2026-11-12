import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { call, customer, DESTINATION, fake, reset, shipping, stockOf, variant } from "./helpers";
import { POST as checkout } from "../src/app/api/checkout/route";
import { GET as receipt } from "../src/app/api/orders/[code]/route";
import { GET as destinations } from "../src/app/api/shipping/destinations/route";
import { POST as quoteRoute } from "../src/app/api/shipping/quote/route";
import { config } from "../src/lib/config";
import { sql } from "../src/lib/db";
import { markPaid, place, type Order } from "../src/lib/orders";
import { writeSetting } from "../src/lib/settings";

beforeEach(reset);

const order = (items: { variant_id: number; quantity: number }[], customerOverrides = {}, ship = shipping(), ip?: string) =>
  call(checkout, "/api/checkout", { body: { customer: customer(customerOverrides), items, shipping: ship }, ip });
const onlyOrder = async () => {
  const rows = await sql<Order>("select * from orders");
  assert.equal(rows.length, 1);
  return rows[0];
};

test("an order reserves stock and is priced from the database", async () => {
  const v = await variant({ stock: 10, price: 15000, grams: 450 });

  // A price sent by the browser is ignored
  const res = await order([{ variant_id: v.id, quantity: 2, price: 1 } as never]);
  assert.equal(res.status, 201);
  assert.match(res.body.code, /^MM-\d{6}-[A-Z2-9]{6}$/);

  const o = await onlyOrder();
  assert.equal(o.status, "pending");
  assert.equal(o.subtotal, 30000);
  // 2 × 450 g + 100 g packaging = 1 kg, JNE REG from the fake RajaOngkir
  assert.equal(o.weight_grams, 1000);
  assert.equal(o.shipping, 10000);
  assert.deepEqual([o.shipping_courier, o.shipping_service, o.shipping_etd, o.destination_id], ["jne", "REG", "2-3 hari", DESTINATION]);
  assert.ok(o.unique_code >= 1 && o.unique_code <= 999);
  assert.equal(o.total, 40000 + o.unique_code);
  assert.equal(await stockOf(v.id), 8);
  assert.ok(o.expires_at! > new Date());
});

test("cannot order more packs than in stock", async () => {
  const v = await variant({ stock: 2 });
  const res = await order([{ variant_id: v.id, quantity: 3 }]);
  assert.equal(res.status, 422);
  assert.equal(res.body.errors.items[0], `${v.label} tinggal 2 pak.`);
  assert.equal(await stockOf(v.id), 2);
  assert.equal((await sql("select id from orders")).length, 0);
});

test("the last pack goes to one order only", async () => {
  const v = await variant({ stock: 1 });
  assert.equal((await order([{ variant_id: v.id, quantity: 1 }])).status, 201);
  const second = await order([{ variant_id: v.id, quantity: 1 }]);
  assert.equal(second.status, 422);
  assert.equal(second.body.errors.items[0], `${v.label} sudah habis.`);
  assert.equal(await stockOf(v.id), 0);
});

test("two shoppers racing for the last pack: exactly one wins", async () => {
  const v = await variant({ stock: 1 });
  const results = await Promise.allSettled([
    place(customer(), [{ variant_id: v.id, quantity: 1 }], shipping()),
    place(customer(), [{ variant_id: v.id, quantity: 1 }], shipping()),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(await stockOf(v.id), 0);
});

test("split lines of one variant are counted together", async () => {
  const v = await variant({ stock: 1 });
  const res = await order([{ variant_id: v.id, quantity: 1 }, { variant_id: v.id, quantity: 1 }]);
  assert.equal(res.status, 422);
  assert.equal(await stockOf(v.id), 1);
});

test("a failing line puts back packs taken for earlier lines", async () => {
  const plenty = await variant({ stock: 5 });
  const scarce = await variant({ stock: 0 });
  const res = await order([{ variant_id: plenty.id, quantity: 2 }, { variant_id: scarce.id, quantity: 1 }]);
  assert.equal(res.status, 422);
  assert.equal(await stockOf(plenty.id), 5);
});

test("products taken off sale cannot be ordered", async () => {
  const v = await variant({ productActive: false });
  const res = await order([{ variant_id: v.id, quantity: 1 }]);
  assert.equal(res.status, 422);
  assert.ok(res.body.errors.items);
});

test("destination and courier must be picked, fields are checked", async () => {
  const v = await variant();
  const res = await order([{ variant_id: v.id, quantity: 1 }], { destination_id: null, email: "nope", postal_code: "123" }, { courier: "", service: "" });
  assert.equal(res.status, 422);
  for (const key of ["customer.destination_id", "customer.email", "customer.postal_code", "shipping.courier", "shipping.service"]) {
    assert.ok(res.body.errors[key], `missing error for ${key}`);
  }
  assert.equal(res.body.errors["customer.postal_code"][0], "Kode pos harus 5 angka.");
});

test("a courier service that doesn't serve the address is refused", async () => {
  const v = await variant({ stock: 3 });
  const res = await order([{ variant_id: v.id, quantity: 1 }], {}, { courier: "jne", service: "FREE" });
  assert.equal(res.status, 422);
  assert.ok(res.body.errors.shipping);
  assert.equal(await stockOf(v.id), 3);
  assert.equal((await sql("select id from orders")).length, 0);
});

test("no order when RajaOngkir is down", async () => {
  fake.rajaOngkirDown = true;
  const v = await variant({ stock: 3 });
  const res = await order([{ variant_id: v.id, quantity: 1 }]);
  assert.equal(res.status, 503);
  assert.equal(res.body.message, "Ongkir belum bisa dihitung. Coba lagi sebentar lagi.");
  assert.equal(await stockOf(v.id), 3);
});

test("the shop pays shipping above the free-shipping threshold", async () => {
  config.freeShippingOver = 50000;
  const v = await variant({ price: 25000 });
  assert.equal((await order([{ variant_id: v.id, quantity: 2 }])).status, 201);
  const o = await onlyOrder();
  assert.equal(o.shipping, 0);
  assert.equal(o.total, 50000 + o.unique_code);
});

test("unpaid orders with the same amount get different unique codes", async () => {
  const v = await variant({ stock: 50 });
  for (let i = 0; i < 20; i++) await place(customer(), [{ variant_id: v.id, quantity: 1 }], shipping());
  const orders = await sql<Order>("select * from orders");
  assert.equal(new Set(orders.map((o) => o.total)).size, 20, "two unpaid orders ask for the same amount");
  for (const o of orders) assert.equal(o.total, o.subtotal + o.shipping + o.unique_code);
});

test("the receipt lists where to transfer until the order is paid, never the address", async () => {
  await writeSetting("bank_accounts", [{ bank: "BNI", account_number: "1234567890", account_name: "Pemilik Toko" }]);
  await writeSetting("payment_whatsapp", "6281234567890");
  const v = await variant();
  const { code } = (await order([{ variant_id: v.id, quantity: 1 }])).body;

  const before = await call(receipt, `/api/orders/${code}`, { params: { code } });
  assert.equal(before.status, 200);
  assert.equal(before.body.status, "pending");
  assert.equal(before.body.payment.bank_accounts[0].account_number, "1234567890");
  assert.match(before.body.payment.whatsapp_url, /^https:\/\/wa\.me\/6281234567890\?text=/);
  assert.ok(decodeURIComponent(before.body.payment.whatsapp_url).includes(code));
  assert.equal(before.body.shipping_courier, "JNE");
  assert.equal(before.body.address, undefined);
  assert.equal(before.body.phone, undefined);
  assert.ok(Math.abs(new Date(before.body.payment.pay_before).getTime() - (Date.now() + 60 * 60_000)) < 10_000);

  await markPaid((await onlyOrder()).id);
  const after = await call(receipt, `/api/orders/${code}`, { params: { code } });
  assert.equal(after.body.status, "paid");
  assert.equal(after.body.payment, null);

  assert.equal((await call(receipt, "/api/orders/MM-NOPE", { params: { code: "MM-NOPE" } })).status, 404);
});

test("checkout emails the receipt link to the buyer and tells the shop", async () => {
  await writeSetting("bank_accounts", [{ bank: "BNI", account_number: "1234567890", account_name: "Pemilik Toko" }]);
  await writeSetting("order_notify_email", "toko@example.com");
  const v = await variant();
  const { code } = (await order([{ variant_id: v.id, quantity: 1 }])).body;
  const o = await onlyOrder();

  const toBuyer = fake.emails.find((m) => m.to === "andi@example.com")!;
  assert.ok(toBuyer.html.includes(`https://masempo.test/pesanan/${code}`));
  assert.ok(toBuyer.html.includes("1234567890"));
  assert.ok(toBuyer.html.includes(o.total.toLocaleString("id-ID")));
  const toShop = fake.emails.find((m) => m.to === "toko@example.com")!;
  assert.ok(toShop.html.includes(`https://admin.masempo.test/orders/${o.id}`));
  assert.equal(toShop.subject, `Pesanan baru ${code} · Rp ${o.total.toLocaleString("id-ID")}`);
});

test("a name typed into the order can't inject HTML into the shop's email", async () => {
  await writeSetting("order_notify_email", "toko@example.com");
  const v = await variant();
  await order([{ variant_id: v.id, quantity: 1 }], { name: '<img src=x onerror="alert(1)">' });
  const toShop = fake.emails.find((m) => m.to === "toko@example.com")!;
  assert.ok(!toShop.html.includes("<img src=x"));
  assert.ok(toShop.html.includes("&lt;img src=x"));
});

test("a failing mail service never loses the order", async () => {
  fake.brevoFails = true;
  const v = await variant();
  assert.equal((await order([{ variant_id: v.id, quantity: 1 }])).status, 201);
  assert.equal((await sql("select id from orders")).length, 1);
});

test("searching and quoting don't use up the checkout limit", async () => {
  const v = await variant({ stock: 30 });
  // A shopper trying a dozen kecamatan and couriers
  for (let i = 0; i < 15; i++) {
    assert.equal((await call(destinations, "/api/shipping/destinations?search=panakkukang")).status, 200);
    assert.equal((await call(quoteRoute, "/api/shipping/quote", { body: { destination_id: DESTINATION, items: [{ variant_id: v.id, quantity: 1 }] } })).status, 200);
  }
  for (let i = 0; i < 10; i++) assert.equal((await order([{ variant_id: v.id, quantity: 1 }])).status, 201);
  // Checkout keeps its own limit of 10 a minute per shopper; another shopper isn't affected
  assert.equal((await order([{ variant_id: v.id, quantity: 1 }])).status, 429);
  assert.equal((await order([{ variant_id: v.id, quantity: 1 }], {}, shipping(), "198.51.100.9")).status, 201);
});
