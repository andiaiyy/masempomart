import { config } from "./config";

/** "15.000" */
export const digits = (n: number) => n.toLocaleString("id-ID");

/** "Rp15.000", the way the storefront writes prices */
export const rupiah = (n: number) => `Rp${digits(n)}`;

/** "250 g", "1,2 kg" */
export const weight = (grams: number) =>
  grams >= 1000 ? `${(grams / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg` : `${grams} g`;

const dateTimeFmt = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: config.timezone,
});
const timeFmt = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: config.timezone });
const dateFmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric", timeZone: config.timezone });

/** "12 Nov 2026, 14.05" in WITA */
export const dateTime = (at: Date | string | null) => (at ? dateTimeFmt.format(new Date(at)) : "-");
/** "14.05" in WITA */
export const clock = (at: Date | string) => timeFmt.format(new Date(at));
/** "12 November 2026" in WITA */
export const longDate = (at: Date | string) => dateFmt.format(new Date(at));

/** "260112" for order codes, by the shop's calendar day */
export function yymmdd(at = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { year: "2-digit", month: "2-digit", day: "2-digit", timeZone: config.timezone })
      .formatToParts(at)
      .map((p) => [p.type, p.value]),
  );
  return `${parts.year}${parts.month}${parts.day}`;
}

/** Escapes text for HTML emails (customer names and addresses are typed by strangers). */
export const esc = (value: unknown) =>
  String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
