// Shared setup: an in-memory Postgres (PGlite), a fake RajaOngkir and a fake Brevo.
// Each test file runs in its own process (node --test), so each has its own database.
process.env.PGLITE_DIR = "memory://";

import { readFileSync } from "node:fs";
import { config } from "../src/lib/config";
import { exec, sql } from "../src/lib/db";
import { resetRateLimits } from "../src/lib/http";

/** Destination id the fake RajaOngkir knows: Panakkukang, Makassar */
export const DESTINATION = 501;

export const fake = {
  rajaOngkirDown: false,
  rajaOngkirCalls: [] as { url: string; headers: Headers; form: URLSearchParams | null }[],
  brevoFails: false,
  emails: [] as { to: string; subject: string; html: string }[],
};

const realFetch = globalThis.fetch;
globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

  if (url.startsWith("https://rajaongkir.test/")) {
    const form = init?.body instanceof URLSearchParams ? init.body : null;
    fake.rajaOngkirCalls.push({ url, headers: new Headers(init?.headers), form });
    if (fake.rajaOngkirDown) return new Response("Bad gateway", { status: 502 });

    if (url.includes("destination/domestic-destination")) {
      const search = new URL(url).searchParams.get("search") ?? "";
      return search.includes("panakkukang")
        ? json({
            meta: { code: 200, status: "success" },
            data: [
              {
                id: DESTINATION,
                label: "PANAKKUKANG, PANAKKUKANG, MAKASSAR, SULAWESI SELATAN, 90231",
                province_name: "SULAWESI SELATAN",
                city_name: "MAKASSAR",
                district_name: "PANAKKUKANG",
                subdistrict_name: "PANAKKUKANG",
                zip_code: "90231",
              },
            ],
          })
        : json({ meta: { code: 404, status: "error", message: "Domestic Destinations Data not found" }, data: null }, 404);
    }
    if (url.includes("calculate/domestic-cost")) {
      const kg = Math.max(1, Math.ceil(Number(form!.get("weight")) / 1000));
      const rows = form!
        .get("courier")!
        .split(":")
        .flatMap((c) =>
          c === "jne"
            ? [
                { name: "Jalur Nugraha Ekakurir (JNE)", code: "jne", service: "REG", description: "Layanan Reguler", cost: 10000 * kg, etd: "2-3 day" },
                { name: "Jalur Nugraha Ekakurir (JNE)", code: "jne", service: "YES", description: "Yakin Esok Sampai", cost: 18000 * kg, etd: "1 day" },
              ]
            : c === "sicepat"
              ? [{ name: "SiCepat Express", code: "sicepat", service: "REG", description: "Reguler", cost: 9000 * kg, etd: "2-4" }]
              : [],
        );
      return json({ meta: { code: 200, status: "success" }, data: rows });
    }
  }

  if (url.startsWith("https://api.brevo.com/")) {
    if (fake.brevoFails) return new Response("Server error", { status: 500 });
    const body = JSON.parse(String(init?.body));
    fake.emails.push({ to: body.to[0].email, subject: body.subject, html: body.htmlContent });
    return json({ messageId: "test" }, 201);
  }

  return realFetch(input, init);
}) as typeof fetch;

let schemaReady = false;

/** Empty tables, test configuration, fresh fakes and rate limits. */
export async function reset() {
  if (!schemaReady) {
    await exec(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
    schemaReady = true;
  }
  await exec(
    "truncate admins, categories, products, product_variants, restocks, orders, order_items, settings, api_cache restart identity cascade",
  );
  config.rajaongkir = { key: "test-key", baseUrl: "https://rajaongkir.test/api/v1", origin: 77, couriers: "jne:sicepat" };
  config.freeShippingOver = 0;
  config.holdMinutes = 60;
  config.storefrontUrl = "https://masempo.test";
  config.adminUrl = "https://admin.masempo.test";
  config.mail = { brevoKey: "test-brevo", fromAddress: "halo@masempo.test", fromName: "Masempo Mart" };
  config.cronSecret = null;
  fake.rajaOngkirDown = false;
  fake.rajaOngkirCalls = [];
  fake.brevoFails = false;
  fake.emails = [];
  resetRateLimits();
}

let n = 0;

/** A product with one variant, in category "Keripik". */
export async function variant(opts: { stock?: number; price?: number; grams?: number; productActive?: boolean; name?: string } = {}) {
  const [category] = await sql<{ id: number }>(
    "insert into categories (name, slug) values ('Keripik', 'keripik') on conflict (slug) do update set name = excluded.name returning id",
  );
  n++;
  const name = opts.name ?? `Keripik ${n}`;
  const [product] = await sql<{ id: number }>(
    "insert into products (category_id, name, slug, is_active) values ($1, $2, $3, $4) returning id",
    [category.id, name, `keripik-${n}`, opts.productActive ?? true],
  );
  const [v] = await sql<{ id: number }>(
    "insert into product_variants (product_id, name, price, weight_grams, stock) values ($1, '150 g', $2, $3, $4) returning id",
    [product.id, opts.price ?? 15000, opts.grams ?? 250, opts.stock ?? 10],
  );
  return { id: v.id, productId: product.id, label: `${name} (150 g)` };
}

export const stockOf = async (variantId: number) =>
  (await sql<{ stock: number }>("select stock from product_variants where id = $1", [variantId]))[0].stock;

export const customer = (overrides: Record<string, unknown> = {}) => ({
  name: "Andi",
  email: "andi@example.com",
  phone: "0812 3456 7890",
  province: "SULAWESI SELATAN",
  city: "MAKASSAR",
  district: "PANAKKUKANG",
  subdistrict: "PANAKKUKANG",
  postal_code: "90231",
  destination_id: DESTINATION,
  address: "Jl. Pengayoman No. 1",
  ...overrides,
});

export const shipping = (courier = "jne", service = "REG") => ({ courier, service });

/** Calls a route handler like the storefront would, from one shopper's IP. */
export async function call(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- each route types its own params
  handler: (req: Request, ctx: { params: Promise<any> }) => Promise<Response>,
  path: string,
  opts: { body?: unknown; params?: Record<string, string>; headers?: Record<string, string>; ip?: string } = {},
) {
  const res = await handler(
    new Request(`http://admin.test${path}`, {
      method: opts.body === undefined ? "GET" : "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": opts.ip ?? "203.0.113.7", ...opts.headers },
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    }),
    { params: Promise.resolve(opts.params ?? {}) },
  );
  return { status: res.status, body: (await res.json().catch(() => null)) as Record<string, any> };
}
