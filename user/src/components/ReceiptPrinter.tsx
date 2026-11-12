"use client";

import { useState } from "react";
import Link from "next/link";
import type { Order, OrderStatus } from "@/lib/types";
import { digits, weight } from "@/lib/format";
import { lontara, plexMono } from "@/lib/fonts";

const STATUS: Record<OrderStatus, { label: string; dot: string }> = {
  pending: { label: "Menunggu pembayaran", dot: "bg-amber-400" },
  paid: { label: "Lunas", dot: "bg-emerald-400" },
  shipped: { label: "Dikirim", dot: "bg-sky-400" },
  completed: { label: "Selesai", dot: "bg-sky-400" },
  failed: { label: "Gagal", dot: "bg-red-400" },
  expired: { label: "Kedaluwarsa", dot: "bg-red-400" },
  cancelled: { label: "Dibatalkan", dot: "bg-red-400" },
};

/** What happens next, under the status badge */
const NEXT: Partial<Record<OrderStatus, string>> = {
  paid: "Pembayaran diterima. Pesananmu sedang kami kemas; nomor resi muncul di struk ini begitu dikirim.",
  shipped: "Paketmu sudah di kurir. Lacak dengan nomor resi di atas.",
  completed: "Terima kasih sudah belanja di Masempo Mart.",
  expired: "Batas waktu transfer sudah lewat dan stoknya sudah kami lepas. Sudah terlanjur transfer? Hubungi kami lewat WhatsApp.",
  cancelled: "Pesanan ini dibatalkan toko. Hubungi kami kalau kamu sudah transfer.",
  failed: "Pesanan ini tidak berhasil. Kamu bisa memesan ulang kapan saja.",
};

const date = (iso: string) => new Date(iso).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" });
/** "14.30 WITA", in the shopper's own time zone */
const time = (iso: string) => new Date(iso).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZoneName: "short" });

/**
 * The order's receipt being "printed": the paper slides slowly out of the printer slot above it,
 * the same as the Karueng Trip booking receipt. While unpaid it lists the shop's bank accounts and
 * a button to send the transfer proof on WhatsApp; the order page re-checks the status, so the
 * badge turns "Lunas" as soon as an admin marks it paid.
 */
export default function ReceiptPrinter({ order }: { order: Order }) {
  const status = STATUS[order.status];
  const rows: [string, string][] = [
    ["Pemesan", order.customer_name],
    ["Kirim ke", order.city],
    ...(order.shipping_courier
      ? ([["Pengiriman", [`${order.shipping_courier} ${order.shipping_service ?? ""}`.trim(), order.shipping_etd].filter(Boolean).join(" · ")]] as [string, string][])
      : []),
    ["Berat paket", weight(order.weight_grams)],
    ...(order.paid_at ? ([["Dibayar", `${date(order.paid_at)} · ${time(order.paid_at)}`]] as [string, string][]) : []),
    // The admin can ship with another courier than the one picked; only then is it named again
    ...(order.tracking_number && order.courier && order.courier !== order.shipping_courier ? ([["Kurir", order.courier]] as [string, string][]) : []),
    ...(order.tracking_number ? ([["No. resi", order.tracking_number]] as [string, string][]) : []),
  ];

  return (
    <div className={`${plexMono.className} relative mx-auto w-full max-w-[380px]`}>
      {/* Printer slot */}
      <div className="relative z-20 h-10 rounded-full bg-[linear-gradient(180deg,#3b3b3f_0%,#151517_100%)] shadow-[0_10px_24px_-8px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.12)]">
        <div className="absolute inset-x-5 bottom-2 h-2 rounded-full bg-black shadow-[inset_0_2px_3px_rgba(0,0,0,0.9)]" />
      </div>

      {/* Paper, clipped under the slot so it looks like it comes out of the printer */}
      <div className="relative -mt-4 overflow-hidden px-3 pb-2">
        <div className="pointer-events-none absolute inset-x-3 top-0 z-10 h-6 bg-gradient-to-b from-black/25 to-transparent" />
        <div className="receipt-print relative bg-[#fdfdfb] px-4 pb-4 pt-12 text-[12.5px] uppercase leading-relaxed text-neutral-900 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.35)] min-[360px]:px-6">
          <div className="flex flex-col items-center text-center">
            <span lang="bug" aria-hidden className={`${lontara.className} text-[34px] leading-none`}>
              ᨆᨔᨛᨇᨚ
            </span>
            <p className="mt-2 text-[11px] tracking-[0.35em] text-neutral-500">Masempo Mart</p>
            <h1 className="mt-4 text-xl font-bold tracking-wider">Struk Belanja</h1>
            <div className="mt-4 space-y-0.5 text-neutral-700">
              <p>Order:{order.code}</p>
              <p>{date(order.created_at)}</p>
            </div>
          </div>

          <Dashed />
          <div className="grid grid-cols-[minmax(0,1fr)_2rem_5.5rem] gap-x-3 font-semibold">
            <span>Item</span>
            <span className="text-right">Jml</span>
            <span className="text-right">Harga</span>
          </div>
          <Dashed />

          <div className="space-y-2.5">
            {order.items.map((item, i) => (
              <div key={i} className="grid grid-cols-[minmax(0,1fr)_2rem_5.5rem] gap-x-3">
                <span>
                  {item.product_slug ? (
                    <Link href={`/produk/${item.product_slug}`} prefetch={false} className="hover:underline">
                      {item.name}
                    </Link>
                  ) : (
                    item.name
                  )}
                  <span className="block text-[11px] text-neutral-500">{item.variant_name}</span>
                </span>
                <span className="text-right">{item.quantity}</span>
                <span className="text-right tabular-nums">{digits(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <Dashed />
          <div className="space-y-2.5">
            <div className="flex justify-between gap-3">
              <span>Subtotal</span>
              <span className="tabular-nums">{digits(order.subtotal)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span>Ongkir</span>
              <span className="tabular-nums">{order.shipping === 0 ? "Gratis" : digits(order.shipping)}</span>
            </div>
          </div>

          <Dashed />
          <div className="flex items-baseline justify-between text-[15px] font-bold">
            <span>Total</span>
            <span className="tabular-nums">Rp {digits(order.total)}</span>
          </div>
          <Dashed />

          <dl className="space-y-2">
            {rows.map(([label, value]) => (
              <div key={label} className="flex justify-between gap-4">
                <dt className="shrink-0 text-neutral-500">{label}</dt>
                <dd className={`text-right ${label === "No. resi" ? "select-all font-semibold normal-case" : ""}`}>{value}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 flex justify-center" role="status">
            <span className="inline-flex items-center gap-2 rounded bg-neutral-900 px-2.5 py-1 text-[11px] font-semibold text-white">
              <span aria-hidden className={`h-2 w-2 rounded-full ${status.dot}`} />
              {status.label}
            </span>
          </div>
          {NEXT[order.status] && <p className="mt-3 text-center text-[11px] normal-case text-neutral-600">{NEXT[order.status]}</p>}

          {order.status === "pending" ? (
            <PaymentInfo order={order} />
          ) : (
            <>
              <Barcode value={order.code} />
              <p className="mt-1 text-center text-[11px] tracking-[0.3em] text-neutral-500">{order.code}</p>
            </>
          )}

          <p className="mt-4 text-center text-[11px] normal-case text-neutral-500">Simpan link halaman ini untuk melihat struk lagi.</p>

          {/* Torn, zigzag bottom edge like a receipt ripped off the roll: one downward tooth per 10px.
              (Karueng's two-linear-gradient version fills solid, so its edge comes out flat.) */}
          <div
            aria-hidden
            className="absolute inset-x-0 -bottom-[5px] h-[5px]"
            style={{ background: "conic-gradient(from -45deg at bottom, #fdfdfb 90deg, transparent 0) 0 0 / 10px 100% repeat-x" }}
          />
        </div>
      </div>
    </div>
  );
}

function Dashed() {
  return <div className="my-4 border-t border-dashed border-neutral-300" />;
}

/** Where to transfer, and the button that sends the transfer proof on WhatsApp. */
function PaymentInfo({ order }: { order: Order }) {
  const [copied, setCopied] = useState<string | null>(null);
  const payment = order.payment;

  // The API only sends payment details while the order can still be paid
  if (!payment) return <p className="mt-6 text-center text-[11px] normal-case text-neutral-500">Batas waktu transfer sudah lewat.</p>;

  const total = digits(order.total);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(text);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      // The browser can refuse clipboard access; the number can still be copied by hand
    }
  }

  return (
    <div className="mt-6 text-center">
      {payment.bank_accounts.length === 0 ? (
        <p className="text-[11px] normal-case text-neutral-500">Info rekening belum tersedia. Silakan hubungi kami lewat WhatsApp.</p>
      ) : (
        <>
          <p className="text-[11px] font-semibold tracking-[0.2em]">Transfer ke</p>
          <ul className="mt-3 space-y-2">
            {payment.bank_accounts.map((a) => (
              <li key={`${a.bank}-${a.account_number}`} className="rounded border border-dashed border-neutral-300 px-3 py-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-left">
                    <span className="block text-[11px] text-neutral-500">{a.bank}</span>
                    <span className="block text-[15px] font-bold normal-case tracking-wider tabular-nums">{a.account_number}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => copy(a.account_number)}
                    aria-label={`Salin nomor rekening ${a.bank}`}
                    className="min-h-9 shrink-0 rounded border border-neutral-300 px-2.5 text-[10px] font-semibold hover:bg-neutral-100"
                  >
                    {copied === a.account_number ? "Tersalin" : "Salin"}
                  </button>
                </div>
                <span className="mt-0.5 block text-left text-[11px] text-neutral-600">a.n. {a.account_name}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] normal-case text-neutral-600">
            Transfer tepat Rp {total} sebelum pukul {time(payment.pay_before)}, lalu kirim bukti transfernya. Struk ini berubah jadi lunas
            setelah kami cek. Tanpa biaya admin.
          </p>
        </>
      )}

      {payment.whatsapp ? (
        <a
          href={`https://wa.me/${payment.whatsapp}?text=${encodeURIComponent(`Halo Masempo Mart, ini bukti transfer untuk pesanan ${order.code} (Rp ${total}).`)}`}
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded bg-[#25D366] px-3 text-[11px] font-semibold normal-case text-neutral-950 hover:bg-[#1ebe5b]"
        >
          Kirim bukti transfer via WhatsApp
        </a>
      ) : (
        <p className="mt-3 text-[11px] normal-case text-neutral-500">Nomor WhatsApp toko belum diatur. Simpan struk ini dan hubungi toko untuk mengirim bukti transfer.</p>
      )}
      <p className="mt-3 text-[11px] tracking-[0.3em] text-neutral-500">{order.code}</p>
    </div>
  );
}

/** Decorative barcode whose bar widths come from the order code. */
function Barcode({ value }: { value: string }) {
  const bars = Array.from(value.repeat(3)).map((char, i) => ((char.charCodeAt(0) + i * 7) % 3) + 1);

  return (
    <div aria-hidden className="mx-auto mt-6 flex h-12 w-fit items-stretch gap-[2px]">
      {bars.map((width, i) => (
        <span key={i} className={i % 2 === 0 ? "bg-neutral-900" : "bg-transparent"} style={{ width }} />
      ))}
    </div>
  );
}
