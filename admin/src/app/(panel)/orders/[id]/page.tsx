import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ConfirmButton } from "@/components/client";
import { btn, btnDanger, btnGhost, Card, Field, Flash, input, link, Money, PageHeader, StatusBadge } from "@/components/ui";
import { config } from "@/lib/config";
import { dateTime, weight } from "@/lib/format";
import { orderById, orderItems } from "@/lib/orders";
import { COURIERS, courierName } from "@/lib/rajaongkir";
import { phoneToWa } from "@/lib/settings";
import { cancelAction, completeAction, markPaidAction, shipAction } from "./actions";

export const metadata: Metadata = { title: "Pesanan" };

export default async function OrderPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const order = await orderById(Number((await params).id));
  if (!order) notFound();
  const items = await orderItems(order.id);
  const flash = await searchParams;
  const chosen = [courierName(order.shipping_courier), order.shipping_service].filter(Boolean).join(" ");
  const late = ["expired", "cancelled", "failed"].includes(order.status);

  return (
    <>
      <Link href="/orders" className="mb-4 inline-flex h-9 items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Semua pesanan
      </Link>
      <PageHeader
        title={order.code}
        subtitle={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} /> Dipesan {dateTime(order.created_at)}
          </span>
        }
      >
        <a href={`${config.storefrontUrl}/pesanan/${order.code}`} target="_blank" rel="noreferrer" className={btnGhost}>
          <ExternalLink className="size-4" /> Lihat struk
        </a>
      </PageHeader>

      <Flash ok={flash.ok} error={flash.error} />
      {order.issue && (
        <div role="alert" className="mb-6 rounded-md border border-danger/30 bg-white px-4 py-3 text-sm text-danger">
          <strong>Perlu dicek:</strong> {order.issue}
        </div>
      )}

      {/* The one thing to do next */}
      {(order.status === "pending" || late) && (
        <Card title="Transfer sudah masuk?" className="mb-6">
          <p className="text-sm">
            Cek mutasi rekening: harus ada transfer tepat <Money value={order.total} /> (kode unik {String(order.unique_code).padStart(3, "0")}).
            {late && " Pesanan ini sudah lewat batas atau dibatalkan, jadi stoknya diambil lagi saat ditandai lunas. Yang sudah habis akan ditandai untuk dicek."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <form action={markPaidAction.bind(null, order.id)}>
              <ConfirmButton message={`Transfer Rp${order.total.toLocaleString("id-ID")} sudah masuk ke rekening?`} className={btn}>
                Tandai lunas
              </ConfirmButton>
            </form>
            {order.status === "pending" && (
              <form action={cancelAction.bind(null, order.id)}>
                <ConfirmButton message="Batalkan pesanan ini? Stoknya kembali ke rak." className={btnDanger}>
                  Batalkan pesanan
                </ConfirmButton>
              </form>
            )}
          </div>
        </Card>
      )}
      {order.status === "paid" && (
        <Card title="Kirim paket" description={`Pembeli memilih ${chosen || "kurir"}. Setelah paket diserahkan ke kurir, isi nomor resinya.`} className="mb-6">
          <form action={shipAction.bind(null, order.id)} className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
            <Field label="Kurir">
              <select name="courier" defaultValue={courierName(order.shipping_courier) ?? ""} required className={input}>
                <option value="" disabled>
                  Pilih kurir
                </option>
                {[...Object.values(COURIERS), "Lainnya"].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Nomor resi">
              <input name="tracking_number" required maxLength={60} className={input} />
            </Field>
            <button className={btn}>Tandai dikirim</button>
          </form>
        </Card>
      )}
      {order.status === "shipped" && (
        <Card title="Sudah sampai?" className="mb-6">
          <form action={completeAction.bind(null, order.id)}>
            <ConfirmButton message="Tandai pesanan ini selesai?" className={btn}>
              Tandai selesai
            </ConfirmButton>
          </form>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        <Card title="Barang">
          <ul className="divide-y divide-line">
            {items.map((item) => (
              <li key={item.id} className="flex items-center gap-4 py-3 text-sm">
                <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-tile">
                  {item.image && (
                    // eslint-disable-next-line @next/next/no-img-element -- product photo
                    <img src={item.image} alt="" className="size-full object-cover" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {item.product_id ? (
                    <Link href={`/products/${item.product_id}`} className="font-semibold hover:underline">
                      {item.name}
                    </Link>
                  ) : (
                    <span className="font-semibold">{item.name}</span>
                  )}
                  <span className="block text-muted">
                    {item.variant_name} × {item.quantity}
                  </span>
                </div>
                <Money value={item.price * item.quantity} />
              </li>
            ))}
          </ul>
          <dl className="mt-2 space-y-2 border-t border-line pt-3 text-sm">
            <Row label="Subtotal" value={<Money value={order.subtotal} />} />
            <Row label={`Ongkir${chosen ? ` (${chosen})` : ""}`} value={order.shipping === 0 ? "Gratis" : <Money value={order.shipping} />} />
            <Row label="Kode unik" value={<Money value={order.unique_code} />} />
            <Row label={<strong>Total transfer</strong>} value={<Money value={order.total} className="text-lg" />} />
          </dl>
        </Card>

        <div className="space-y-6">
          <Card title="Kirim ke">
            <p className="text-sm leading-relaxed">
              <strong>{order.customer_name}</strong>
              <br />
              <a href={`https://wa.me/${phoneToWa(order.phone)}`} target="_blank" rel="noreferrer" className={link}>
                {order.phone}
              </a>{" "}
              · {order.email}
              <br />
              {order.address}
              <br />
              {[order.subdistrict, order.district, order.city, order.province].filter(Boolean).join(", ")} {order.postal_code}
            </p>
            {order.note && <p className="mt-3 rounded-md bg-paper px-3 py-2 text-sm">Catatan: {order.note}</p>}
          </Card>
          <Card title="Detail">
            <dl className="space-y-2 text-sm">
              <Row label="Kurir pilihan" value={[chosen, order.shipping_etd].filter(Boolean).join(" · ") || "-"} />
              <Row label="Berat paket" value={weight(order.weight_grams)} />
              {order.status === "pending" && <Row label="Batas transfer" value={`${dateTime(order.expires_at)} WITA`} />}
              <Row label="Lunas" value={order.paid_at ? `${dateTime(order.paid_at)} WITA` : "-"} />
              <Row label="Dikirim" value={order.shipped_at ? `${order.courier} · ${order.tracking_number}` : "-"} />
            </dl>
          </Card>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: React.ReactNode; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}
