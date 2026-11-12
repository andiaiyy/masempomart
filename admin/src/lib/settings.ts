import { config } from "./config";
import { sql } from "./db";

/**
 * What the owner sets on the admin's Pengaturan page: where shoppers transfer (bank accounts, on
 * every unpaid receipt), the WhatsApp contact, Instagram, and who hears about new orders.
 *
 * Payment works like Karueng's: transfer the exact total, send the proof on WhatsApp, an admin
 * checks it and marks the order paid. No payment gateway, so no fee per order.
 */

export type BankAccount = { bank: string; account_number: string; account_name: string };

export async function readSetting<T>(key: string): Promise<T | null> {
  const [row] = await sql<{ value: T | null }>("select value from settings where key = $1", [key]);
  return row?.value ?? null;
}

export async function writeSetting(key: string, value: unknown) {
  await sql(
    `insert into settings (key, value, updated_at) values ($1, $2::jsonb, now())
     on conflict (key) do update set value = excluded.value, updated_at = now()`,
    [key, JSON.stringify(value ?? null)],
  );
}

export async function bankAccounts(): Promise<BankAccount[]> {
  return (await readSetting<BankAccount[]>("bank_accounts")) ?? [];
}

/** The WhatsApp contact as saved: a number in 62… form, or a WhatsApp link. */
export const whatsapp = () => readSetting<string>("payment_whatsapp");

/**
 * A link that opens the shop's WhatsApp chat. With a number (or a wa.me / api.whatsapp.com link
 * carrying one) the message can be filled in; other links (wa.link, catalog links) open as they are.
 */
export async function whatsappUrl(text?: string): Promise<string | null> {
  const saved = await whatsapp();
  if (!saved) return null;
  const number = /^\d+$/.test(saved) ? saved : numberInLink(saved);
  if (number) return `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
  return saved;
}

export async function instagramUrl(): Promise<string | null> {
  return (await readSetting<string>("instagram_url")) || config.instagramUrl || null;
}

/** "@masempo.mart" from https://www.instagram.com/masempo.mart */
export function instagramHandle(url: string | null): string | null {
  if (!url) return null;
  const path = new URL(url).pathname.replace(/^\/+|\/+$/g, "");
  return path ? `@${path.split("/")[0]}` : null;
}

/** Who gets an email for each new order */
export async function notifyEmail(): Promise<string | null> {
  return (await readSetting<string>("order_notify_email")) || config.orderNotifyEmail;
}

/**
 * What the admin typed for WhatsApp, made consistent: numbers (0812-3456 7890, +62 812…) become
 * 62812…; links stay links. Null for anything else.
 */
export function normalizeWhatsapp(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  if (/^https?:\/\//i.test(v)) return v;
  let d = v.replace(/\D/g, "");
  if (d.startsWith("0")) d = `62${d.slice(1)}`;
  return /^62\d{8,13}$/.test(d) ? d : null;
}

/** instagram.com/masempo.mart?igsh=…&utm_source=qr, "@masempo.mart" and "masempo.mart" all become https://www.instagram.com/masempo.mart */
export function normalizeInstagram(value: string | null | undefined): string | null {
  const v = (value ?? "").trim();
  if (!v) return null;
  const handle = v.match(/instagram\.com\/([A-Za-z0-9._]+)/i)?.[1] ?? v.replace(/^@/, "");
  return /^[A-Za-z0-9._]{1,30}$/.test(handle) ? `https://www.instagram.com/${handle}` : null;
}

/** 0812-3456 7890 -> 6281234567890 (for wa.me links to buyers) */
export function phoneToWa(phone: string) {
  const d = phone.replace(/\D/g, "");
  return d.startsWith("0") ? `62${d.slice(1)}` : d;
}

function numberInLink(url: string): string | null {
  const wa = url.match(/wa\.me\/(\d{8,15})/i)?.[1];
  if (wa) return wa;
  try {
    const phone = new URL(url).searchParams.get("phone");
    return phone && /^\d+$/.test(phone) ? phone : null;
  } catch {
    return null;
  }
}
