import { config } from "./config";
import { sql } from "./db";
import { HttpError } from "./http";
import { readSetting } from "./settings";

/**
 * Courier rates from RajaOngkir's Komerce API v1 (rajaongkir.komerce.id).
 *
 * Shoppers pick their kecamatan/kelurahan from destination search; its id plus the parcel weight
 * gives every courier's services and prices. Answers are cached in the database (searches a week,
 * prices half a day) so a shopper going back and forth in checkout doesn't use up the API quota.
 */

/** Short names for the receipt and admin; RajaOngkir's own names are the companies' full names. */
export const COURIERS: Record<string, string> = {
  jne: "JNE",
  jnt: "J&T Express",
  sicepat: "SiCepat",
  pos: "POS Indonesia",
  tiki: "TIKI",
  ninja: "Ninja Xpress",
  lion: "Lion Parcel",
  ide: "ID Express",
  sap: "SAP Express",
  wahana: "Wahana",
  sentral: "Sentral Cargo",
  rex: "REX",
  spx: "SPX Express",
};

export const courierName = (code: string | null) => (code === null ? null : (COURIERS[code] ?? code.toUpperCase()));

export type Destination = {
  id: number;
  label: string;
  province: string;
  city: string;
  district: string;
  subdistrict: string;
  postal_code: string;
};

export type CourierOption = {
  courier: string;
  courier_name: string;
  service: string;
  description: string;
  cost: number;
  etd: string;
};

/** Where parcels ship from: picked on the Pengaturan page, or RAJAONGKIR_ORIGIN. */
export async function origin(): Promise<{ id: number; label: string } | null> {
  const saved = await readSetting<{ id: number; label: string }>("shipping_origin");
  if (saved?.id) return saved;
  return config.rajaongkir.origin > 0 ? { id: config.rajaongkir.origin, label: `ID ${config.rajaongkir.origin}` } : null;
}

/** Shipping can be priced: an API key and an origin. */
export const configured = async () => Boolean(config.rajaongkir.key) && (await origin()) !== null;

const DOWN = "Ongkir belum bisa dihitung. Coba lagi sebentar lagi.";
const NOT_SET_UP = "Ongkir belum bisa dihitung: toko belum menyambungkan RajaOngkir.";

/** Kecamatan / kelurahan matching a name or postal code. Needs only the API key (also used to pick the origin). */
export async function destinations(search: string): Promise<Destination[]> {
  if (!config.rajaongkir.key) throw new HttpError(503, NOT_SET_UP);
  const q = search.replace(/\s+/g, " ").trim().toLowerCase().slice(0, 60);
  return cached(`destinations:${q}`, 7 * 24 * 3600, async () => {
    const body = await call(`destination/domestic-destination?${new URLSearchParams({ search: q, limit: "10", offset: "0" })}`);
    return ((body?.data as Record<string, unknown>[] | undefined) ?? []).map((d) => ({
      id: Number(d.id),
      label: String(d.label ?? ""),
      province: String(d.province_name ?? ""),
      city: String(d.city_name ?? ""),
      district: String(d.district_name ?? ""),
      subdistrict: String(d.subdistrict_name ?? ""),
      postal_code: /^\d{5}$/.test(String(d.zip_code ?? "")) ? String(d.zip_code) : "",
    }));
  });
}

/** Every configured courier's services from the shop to a destination, cheapest first. */
export async function costs(destination: number, grams: number): Promise<CourierOption[]> {
  const from = await origin();
  if (!config.rajaongkir.key || !from) throw new HttpError(503, NOT_SET_UP);
  const couriers = config.rajaongkir.couriers
    .split(":")
    .map((c) => c.trim())
    .filter(Boolean);

  return cached(`costs:${from.id}:${destination}:${grams}:${couriers.join(":")}`, 12 * 3600, async () => {
    const options: CourierOption[] = [];
    // The API takes up to 7 couriers per request, joined with ":"
    for (let i = 0; i < couriers.length; i += 7) {
      const body = await call("calculate/domestic-cost", {
        origin: String(from.id),
        destination: String(destination),
        weight: String(grams),
        courier: couriers.slice(i, i + 7).join(":"),
      });
      for (const row of (body?.data as Record<string, unknown>[] | undefined) ?? []) {
        const cost = Number(row.cost ?? 0);
        if (!(cost > 0) || !row.service) continue;
        const code = String(row.code ?? "").toLowerCase();
        options.push({
          courier: code,
          courier_name: courierName(code)!,
          service: String(row.service),
          description: String(row.description ?? ""),
          cost,
          etd: etd(String(row.etd ?? "")),
        });
      }
    }
    return options.sort((a, b) => a.cost - b.cost);
  });
}

/** "2-3 day", "2-3", "1-2 HARI" all become "2-3 hari"; empty stays empty. */
export function etd(value: string) {
  const v = value.replace(/\b(days?|hari)\b/gi, "").trim();
  return v ? `${v} hari` : "";
}

/**
 * Calls the API; null when RajaOngkir answers "not found" (no such place, or no courier serves
 * that route). A form body makes it a POST.
 */
async function call(path: string, form?: Record<string, string>): Promise<Record<string, unknown> | null> {
  let res: Response;
  try {
    res = await fetch(`${config.rajaongkir.baseUrl}/${path}`, {
      method: form ? "POST" : "GET",
      headers: {
        key: config.rajaongkir.key!,
        Accept: "application/json",
        ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {}),
      },
      body: form ? new URLSearchParams(form) : undefined,
      signal: AbortSignal.timeout(15_000),
      cache: "no-store",
    });
  } catch (err) {
    console.error("RajaOngkir unreachable", err);
    throw new HttpError(503, DOWN);
  }

  if (res.status === 400 || res.status === 404) return null;
  if (!res.ok) {
    console.error("RajaOngkir", res.status, await res.text().catch(() => ""));
    throw new HttpError(503, DOWN);
  }
  return (await res.json()) as Record<string, unknown>;
}

/** Answer from the cache, or compute and keep it. Failures (thrown) are never cached. */
async function cached<T>(key: string, seconds: number, compute: () => Promise<T>): Promise<T> {
  const [hit] = await sql<{ value: T }>("select value from api_cache where key = $1 and expires_at > now()", [key]);
  if (hit) return hit.value;
  const value = await compute();
  await sql(
    `insert into api_cache (key, value, expires_at) values ($1, $2::jsonb, now() + make_interval(secs => $3))
     on conflict (key) do update set value = excluded.value, expires_at = excluded.expires_at`,
    [key, JSON.stringify(value), seconds],
  );
  return value;
}
