"use server";

import { requireAdmin } from "@/lib/auth";
import { back, int, text } from "@/lib/forms";
import { recordRestock } from "@/lib/inventory";

/** A delivery (positive) or a write-off (negative, with a reason). */
export async function addRestock(fd: FormData) {
  const admin = await requireAdmin();
  const variantId = int(fd, "variant_id");
  const quantity = int(fd, "quantity");
  const note = text(fd, "note");
  const here = `/restocks${variantId ? `?variant=${variantId}` : ""}`;

  if (!variantId) back(here, { error: "Pilih varian." });
  if (!quantity) back(here, { error: "Isi jumlah: positif untuk barang masuk, negatif untuk barang rusak atau hilang." });
  if (quantity < 0 && !note) back(here, { error: "Tulis alasannya untuk pengurangan stok (rusak, kedaluwarsa, hilang…)." });

  const result = await recordRestock({
    variantId,
    quantity,
    adminId: admin.id,
    costPrice: int(fd, "cost_price"),
    expiresOn: text(fd, "expires_on") || null,
    note: note || null,
  });
  if ("error" in result) back(here, { error: result.error });
  back(here, { ok: `${quantity > 0 ? `+${quantity}` : quantity} pak dicatat. Stok sekarang ${result.stock}.` });
}
