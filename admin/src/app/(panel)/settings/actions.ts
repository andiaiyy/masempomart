"use server";

import { requireAdmin } from "@/lib/auth";
import { back, text } from "@/lib/forms";
import { normalizeInstagram, normalizeWhatsapp, writeSetting, type BankAccount } from "@/lib/settings";

export async function saveBankAccounts(fd: FormData) {
  await requireAdmin();
  const banks = fd.getAll("bank").map((v) => String(v).trim());
  const numbers = fd.getAll("account_number").map((v) => String(v).replace(/[\s.-]/g, ""));
  const names = fd.getAll("account_name").map((v) => String(v).trim());

  const accounts: BankAccount[] = [];
  for (let i = 0; i < banks.length; i++) {
    if (!banks[i] && !numbers[i] && !names[i]) continue;
    if (!banks[i] || !names[i] || !/^\d{5,20}$/.test(numbers[i])) {
      back("/settings#rekening", { error: "Isi nama bank, nomor rekening (angka saja) dan nama pemilik di setiap baris." });
    }
    accounts.push({ bank: banks[i].slice(0, 40), account_number: numbers[i], account_name: names[i].slice(0, 80) });
  }
  await writeSetting("bank_accounts", accounts);
  back("/settings#rekening", { ok: "Rekening disimpan. Struk pesanan yang belum dibayar langsung memakai yang baru." });
}

export async function saveContact(fd: FormData) {
  await requireAdmin();
  const wa = text(fd, "payment_whatsapp");
  const ig = text(fd, "instagram_url");
  const email = text(fd, "order_notify_email");

  const whatsapp = normalizeWhatsapp(wa);
  if (wa && !whatsapp) back("/settings#kontak", { error: "WhatsApp: pakai nomor Indonesia (0812 3456 7890) atau link yang diawali https://" });
  const instagram = normalizeInstagram(ig);
  if (ig && !instagram) back("/settings#kontak", { error: "Instagram: tempel link profilnya atau @nama." });
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back("/settings#kontak", { error: "Email pemberitahuan tidak valid." });

  await writeSetting("payment_whatsapp", whatsapp);
  await writeSetting("instagram_url", instagram);
  await writeSetting("order_notify_email", email || null);
  back("/settings#kontak", { ok: "Kontak disimpan." });
}

export async function saveOrigin(fd: FormData) {
  await requireAdmin();
  const id = Number(text(fd, "origin_id"));
  const label = text(fd, "origin_label");
  if (!id || !label) back("/settings#ongkir", { error: "Cari lalu pilih kecamatan asal pengiriman dari daftar." });
  await writeSetting("shipping_origin", { id, label: label.slice(0, 200) });
  back("/settings#ongkir", { ok: "Asal pengiriman disimpan. Ongkir dihitung dari sini." });
}
