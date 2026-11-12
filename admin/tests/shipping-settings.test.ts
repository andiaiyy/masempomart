import assert from "node:assert/strict";
import { beforeEach, test } from "node:test";
import { call, DESTINATION, fake, reset, variant } from "./helpers";
import { GET as options } from "../src/app/api/shipping/options/route";
import { GET as destinations } from "../src/app/api/shipping/destinations/route";
import { POST as quote } from "../src/app/api/shipping/quote/route";
import { GET as shop } from "../src/app/api/shop/route";
import { config } from "../src/lib/config";
import { shippingOptions } from "../src/lib/orders";
import { configured, origin } from "../src/lib/rajaongkir";
import { normalizeInstagram, normalizeWhatsapp, whatsappUrl, writeSetting } from "../src/lib/settings";

beforeEach(reset);

test("courier options come from RajaOngkir, cheapest first, in one cached request", async () => {
  const opts = await shippingOptions(DESTINATION, 1001, 50000);
  // 1.001 g bills as 2 kg; SiCepat REG is cheapest
  assert.deepEqual(opts.map((o) => `${o.courier} ${o.service} ${o.cost}`), ["sicepat REG 18000", "jne REG 20000", "jne YES 36000"]);
  assert.deepEqual([opts[0].courier_name, opts[0].etd], ["SiCepat", "2-4 hari"]);

  assert.equal(fake.rajaOngkirCalls.length, 1);
  const sent = fake.rajaOngkirCalls[0];
  assert.ok(sent.url.endsWith("/calculate/domestic-cost"));
  assert.deepEqual(Object.fromEntries(sent.form!), { origin: "77", destination: String(DESTINATION), weight: "1001", courier: "jne:sicepat" });
  assert.equal(sent.headers.get("key"), "test-key");

  // Asked again: answered from the cache
  await shippingOptions(DESTINATION, 1001, 50000);
  assert.equal(fake.rajaOngkirCalls.length, 1);

  config.freeShippingOver = 50000;
  const free = await shippingOptions(DESTINATION, 1001, 50000);
  assert.deepEqual([free[0].cost, free[0].courier_cost], [0, 18000]);
});

test("more than 7 couriers are split over requests", async () => {
  config.rajaongkir.couriers = "jne:jnt:sicepat:pos:tiki:ninja:lion:sap";
  await shippingOptions(DESTINATION, 500, 10000);
  assert.deepEqual(
    fake.rajaOngkirCalls.map((c) => c.form!.get("courier")),
    ["jne:jnt:sicepat:pos:tiki:ninja:lion", "sap"],
  );
});

test("the quote endpoint lists courier services for the cart", async () => {
  const v = await variant({ price: 20000, grams: 950 });
  const res = await call(quote, "/api/shipping/quote", { body: { destination_id: DESTINATION, items: [{ variant_id: v.id, quantity: 1 }] } });
  assert.equal(res.status, 200);
  assert.equal(res.body.subtotal, 20000);
  assert.equal(res.body.weight_grams, 1050);
  assert.deepEqual(res.body.options[0], { courier: "sicepat", courier_name: "SiCepat", service: "REG", description: "Reguler", cost: 18000, etd: "2-4 hari" });
  assert.equal(res.body.options.length, 3);
});

test("destination search, not found, and missing setup", async () => {
  const found = await call(destinations, "/api/shipping/destinations?search=Panakkukang");
  assert.equal(found.body.data[0].id, DESTINATION);
  assert.equal(found.body.data[0].city, "MAKASSAR");
  assert.equal(found.body.data[0].postal_code, "90231");
  assert.deepEqual((await call(destinations, "/api/shipping/destinations?search=Narnia")).body.data, []);
  assert.equal((await call(destinations, "/api/shipping/destinations?search=ab")).status, 422);

  config.rajaongkir.key = null;
  assert.equal((await call(options, "/api/shipping/options")).body.shipping_ready, false);
  const down = await call(destinations, "/api/shipping/destinations?search=Tamalanrea");
  assert.equal(down.status, 503);
  assert.equal(down.body.message, "Ongkir belum bisa dihitung: toko belum menyambungkan RajaOngkir.");
});

test("the origin picked in the admin wins over the env fallback", async () => {
  assert.deepEqual(await origin(), { id: 77, label: "ID 77" });
  await writeSetting("shipping_origin", { id: 9001, label: "TANETE RIATTANG, BONE" });
  assert.equal((await origin())!.id, 9001);
  await shippingOptions(DESTINATION, 500, 10000);
  assert.equal(fake.rajaOngkirCalls[0].form!.get("origin"), "9001");

  config.rajaongkir.origin = 0;
  await writeSetting("shipping_origin", null);
  assert.equal(await configured(), false);
});

test("WhatsApp takes a number or a link", async () => {
  assert.equal(normalizeWhatsapp("0812-3456 7890"), "6281234567890");
  assert.equal(normalizeWhatsapp("+62 812 3456 7890"), "6281234567890");
  assert.equal(normalizeWhatsapp(" https://wa.link/abc123 "), "https://wa.link/abc123");
  assert.equal(normalizeWhatsapp("call me"), null);

  await writeSetting("payment_whatsapp", "6281234567890");
  assert.equal(await whatsappUrl("Halo toko"), "https://wa.me/6281234567890?text=Halo%20toko");
  // A wa.me link still gets the message; other links open as they are
  await writeSetting("payment_whatsapp", "https://wa.me/6281234567890");
  assert.equal(await whatsappUrl("Halo"), "https://wa.me/6281234567890?text=Halo");
  await writeSetting("payment_whatsapp", "https://api.whatsapp.com/send?phone=6281234567890");
  assert.equal(await whatsappUrl(), "https://wa.me/6281234567890");
  await writeSetting("payment_whatsapp", "https://wa.link/abc123");
  assert.equal(await whatsappUrl("Halo"), "https://wa.link/abc123");
});

test("Instagram links lose their tracking; the storefront gets the contact links", async () => {
  const clean = "https://www.instagram.com/masempo.mart";
  assert.equal(normalizeInstagram("https://www.instagram.com/masempo.mart?obrf=MWg5d3d1Z2Fyem9yNA%3D%3D&utm_source=qr"), clean);
  assert.equal(normalizeInstagram("@masempo.mart"), clean);
  assert.equal(normalizeInstagram("instagram.com/masempo.mart/"), clean);
  assert.equal(normalizeInstagram("not a profile!"), null);

  await writeSetting("payment_whatsapp", "6281234567890");
  assert.deepEqual((await call(shop, "/api/shop")).body, {
    whatsapp_url: "https://wa.me/6281234567890",
    instagram_url: clean,
    instagram_handle: "@masempo.mart",
  });
});
