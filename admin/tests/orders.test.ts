import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { call, customer, reset, shipping, stockOf, variant } from "./helpers";
import { GET as products } from "../src/app/api/products/route";
import { GET as cron } from "../src/app/api/cron/expire-orders/route";
import { config } from "../src/lib/config";
import { sql } from "../src/lib/db";
import { recordRestock } from "../src/lib/inventory";
import { complete, expireStale, markPaid, orderById, place, release, ship } from "../src/lib/orders";

beforeEach(reset);

const order = (variantId: number, quantity = 2) => place(customer(), [{ variant_id: variantId, quantity }], shipping());
const timeTravel = (orderId: number) => sql("update orders set expires_at = now() - interval '1 minute' where id = $1", [orderId]);

test("abandoned orders expire once and give their packs back", async () => {
  const v = await variant({ stock: 5 });
  const o = await order(v.id);
  assert.equal(await stockOf(v.id), 3);
  await timeTravel(o.id);

  assert.equal(await expireStale(), 1);
  assert.equal(await expireStale(), 0);
  assert.equal((await orderById(o.id))!.status, "expired");
  assert.equal(await stockOf(v.id), 5);
});

test("the catalog frees packs from abandoned orders", async () => {
  const v = await variant({ stock: 2 });
  const o = await order(v.id);
  assert.equal((await call(products, "/api/products")).body.data[0].in_stock, false);
  await timeTravel(o.id);
  assert.equal((await call(products, "/api/products")).body.data[0].variants[0].stock, 2);
});

test("marking paid keeps the packs reserved and counts once", async () => {
  const v = await variant({ stock: 5 });
  const o = await order(v.id);
  assert.equal(await markPaid(o.id), true);
  assert.equal(await markPaid(o.id), false);
  const paid = (await orderById(o.id))!;
  assert.equal(paid.status, "paid");
  assert.equal(paid.payment_type, "bank_transfer");
  assert.ok(paid.paid_at);
  assert.equal(await stockOf(v.id), 3);
});

test("a transfer after expiry takes the packs again", async () => {
  const v = await variant({ stock: 5 });
  const o = await order(v.id);
  await release(o.id, "expired");
  assert.equal(await stockOf(v.id), 5);

  assert.equal(await markPaid(o.id), true);
  const paid = (await orderById(o.id))!;
  assert.equal(paid.status, "paid");
  assert.equal(paid.issue, null);
  assert.equal(await stockOf(v.id), 3);
});

test("a transfer after expiry flags packs that sold out meanwhile", async () => {
  const v = await variant({ stock: 2 });
  const o = await order(v.id);
  await release(o.id, "expired");
  await order(v.id); // someone else bought the two packs

  assert.equal(await markPaid(o.id), true);
  const paid = (await orderById(o.id))!;
  assert.equal(paid.status, "paid");
  assert.match(paid.issue!, /sudah habis/);
  assert.equal(await stockOf(v.id), 0);
});

test("cancel returns packs; shipping needs a paid order; then complete", async () => {
  const v = await variant({ stock: 5 });
  const o = await order(v.id);
  assert.equal(await ship(o.id, "JNE", "RESI1"), false);
  assert.equal(await release(o.id, "cancelled"), true);
  assert.equal(await release(o.id, "cancelled"), false);
  assert.equal(await stockOf(v.id), 5);

  const paid = await order(v.id);
  await markPaid(paid.id);
  assert.equal(await ship(paid.id, "JNE", "RESI1"), true);
  assert.equal(await complete(paid.id), true);
  assert.equal((await orderById(paid.id))!.status, "completed");
});

test("restocks add packs; write-offs can't go below zero", async () => {
  const v = await variant({ stock: 3 });
  assert.deepEqual(await recordRestock({ variantId: v.id, quantity: 10, adminId: null, costPrice: 9000, expiresOn: "2027-01-01" }), { stock: 13 });
  assert.deepEqual(await recordRestock({ variantId: v.id, quantity: -2, adminId: null, note: "Rusak" }), { stock: 11 });
  const tooMany = await recordRestock({ variantId: v.id, quantity: -50, adminId: null, note: "Hilang" });
  assert.ok("error" in tooMany && tooMany.error.includes("11"));
  assert.equal(await stockOf(v.id), 11);
  assert.equal((await sql("select id from restocks")).length, 2);
});

test("the cron expires orders only with the secret", async () => {
  config.cronSecret = "cron-secret";
  const v = await variant({ stock: 5 });
  const o = await order(v.id);
  await timeTravel(o.id);

  assert.equal((await call(cron, "/api/cron/expire-orders")).status, 403);
  assert.equal((await call(cron, "/api/cron/expire-orders", { headers: { Authorization: "Bearer wrong" } })).status, 403);
  assert.equal(await stockOf(v.id), 3);

  const ok = await call(cron, "/api/cron/expire-orders", { headers: { Authorization: "Bearer cron-secret" } });
  assert.equal(ok.status, 200);
  assert.equal(ok.body.expired, 1);
  assert.equal(await stockOf(v.id), 5);

  config.cronSecret = null;
  assert.equal((await call(cron, "/api/cron/expire-orders", { headers: { Authorization: "Bearer " } })).status, 403);
});
