"use server";

import { requireAdmin } from "@/lib/auth";
import { back, text } from "@/lib/forms";
import { complete, markPaid, release, ship } from "@/lib/orders";

const changed = "Pesanan ini sudah berubah di tempat lain. Muat ulang halamannya.";

export async function markPaidAction(id: number) {
  await requireAdmin();
  const ok = await markPaid(id);
  back(`/orders/${id}`, ok ? { ok: "Ditandai lunas. Struk pembeli sekarang berubah jadi lunas." } : { error: changed });
}

export async function shipAction(id: number, fd: FormData) {
  await requireAdmin();
  const courier = text(fd, "courier");
  const resi = text(fd, "tracking_number");
  if (!courier || !resi) back(`/orders/${id}`, { error: "Isi kurir dan nomor resi." });
  const ok = await ship(id, courier.slice(0, 40), resi.slice(0, 60));
  back(`/orders/${id}`, ok ? { ok: "Ditandai dikirim. Nomor resi muncul di struk pembeli." } : { error: changed });
}

export async function completeAction(id: number) {
  await requireAdmin();
  const ok = await complete(id);
  back(`/orders/${id}`, ok ? { ok: "Pesanan selesai." } : { error: changed });
}

export async function cancelAction(id: number) {
  await requireAdmin();
  const ok = await release(id, "cancelled");
  back(`/orders/${id}`, ok ? { ok: "Pesanan dibatalkan, stoknya kembali." } : { error: changed });
}
