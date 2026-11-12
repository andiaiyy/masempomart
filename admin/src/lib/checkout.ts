import { validationError } from "./http";
import type { CartItem, Customer } from "./orders";

/**
 * Validates request bodies for /api/shipping/quote and /api/checkout. Error keys are the ones the
 * storefront's checkout form reads ("customer.name", "items", "shipping.courier"…).
 */

type Errors = Record<string, string[]>;
const add = (errors: Errors, key: string, message: string) => (errors[key] ??= []).push(message);
const str = (value: unknown) => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");
const isInt = (value: unknown) => Number.isInteger(typeof value === "string" && /^\d+$/.test(value) ? Number(value) : value);

export function parseItems(raw: unknown, errors: Errors): CartItem[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    add(errors, "items", "Keranjangmu kosong.");
    return [];
  }
  if (raw.length > 50) add(errors, "items", "Terlalu banyak barang dalam satu pesanan.");
  const items: CartItem[] = [];
  for (const item of raw.slice(0, 50)) {
    const variantId = (item as Record<string, unknown>)?.variant_id;
    const quantity = (item as Record<string, unknown>)?.quantity;
    if (!isInt(variantId) || !isInt(quantity) || Number(quantity) < 1 || Number(quantity) > 50) {
      add(errors, "items", "Ada jumlah barang yang tidak valid. Periksa keranjangmu.");
      continue;
    }
    items.push({ variant_id: Number(variantId), quantity: Number(quantity) });
  }
  return items;
}

export function parseQuote(body: Record<string, unknown>) {
  const errors: Errors = {};
  const destination = body.destination_id;
  if (!isInt(destination) || Number(destination) < 1) add(errors, "destination_id", "Pilih kecamatan tujuan dari daftar.");
  const items = parseItems(body.items, errors);
  if (Object.keys(errors).length) throw validationError(errors);
  return { destination: Number(destination), items };
}

export function parseCheckout(body: Record<string, unknown>) {
  const errors: Errors = {};
  const c = (body.customer ?? {}) as Record<string, unknown>;
  const field = (key: string, max: number, required: string | null) => {
    const value = str(c[key]);
    if (!value && required) add(errors, `customer.${key}`, required);
    else if (value.length > max) add(errors, `customer.${key}`, `Maksimal ${max} karakter.`);
    return value;
  };

  const customer: Customer = {
    name: field("name", 100, "Nama wajib diisi."),
    email: field("email", 150, "Email wajib diisi."),
    phone: field("phone", 30, "Nomor WhatsApp wajib diisi."),
    address: field("address", 500, "Alamat wajib diisi."),
    // The kecamatan/kelurahan picked from RajaOngkir's search; its names fill the address
    province: field("province", 100, "Pilih kecamatan tujuan dari daftar."),
    city: field("city", 100, "Pilih kecamatan tujuan dari daftar."),
    district: field("district", 100, "Pilih kecamatan tujuan dari daftar."),
    subdistrict: field("subdistrict", 100, null) || null,
    postal_code: field("postal_code", 5, "Kode pos harus 5 angka."),
    destination_id: Number(c.destination_id),
    note: field("note", 200, null) || null,
  };

  if (customer.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) add(errors, "customer.email", "Email tidak valid.");
  if (customer.phone && !/^\+?[0-9\s-]{8,20}$/.test(customer.phone)) add(errors, "customer.phone", "Nomor WhatsApp tidak valid.");
  if (customer.postal_code && !/^\d{5}$/.test(customer.postal_code)) add(errors, "customer.postal_code", "Kode pos harus 5 angka.");
  if (!isInt(c.destination_id) || customer.destination_id < 1) add(errors, "customer.destination_id", "Pilih kecamatan tujuan dari daftar.");

  const items = parseItems(body.items, errors);

  const s = (body.shipping ?? {}) as Record<string, unknown>;
  const shipping = { courier: str(s.courier).slice(0, 20), service: str(s.service).slice(0, 60) };
  if (!shipping.courier) add(errors, "shipping.courier", "Pilih kurir pengiriman.");
  if (!shipping.service) add(errors, "shipping.service", "Pilih kurir pengiriman.");

  if (Object.keys(errors).length) throw validationError(errors);
  return { customer, items, shipping };
}
