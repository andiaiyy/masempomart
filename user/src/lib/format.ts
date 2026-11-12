/** "15.000" */
export const digits = (n: number) => n.toLocaleString("id-ID");

/** "Rp15.000", for places that need plain text (aria labels, button text) */
export const rupiah = (n: number) => `Rp${digits(n)}`;

/** "250 g", "1,2 kg" */
export const weight = (grams: number) =>
  grams >= 1000 ? `${(grams / 1000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} kg` : `${grams} g`;

/** "14.30" in the shopper's local time */
export const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });
