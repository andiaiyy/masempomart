import Link from "next/link";
import { Card, Empty, link, Money, PageHeader } from "@/components/ui";
import { config } from "@/lib/config";
import { sql } from "@/lib/db";
import { clock, dateTime } from "@/lib/format";

export default async function Dashboard() {
  const [stats] = await sql<{ waiting: number; to_ship: number; sales: number; low: number }>(
    `select
       (select count(*) from orders where status = 'pending') as waiting,
       (select count(*) from orders where status = 'paid') as to_ship,
       (select coalesce(sum(total), 0) from orders where status in ('paid', 'shipped', 'completed')
          and paid_at >= date_trunc('month', now() at time zone $1) at time zone $1) as sales,
       (select count(*) from product_variants v join products p on p.id = v.product_id
          where v.is_active and p.is_active and v.stock <= $2) as low`,
    [config.timezone, config.lowStock],
  );

  const waiting = await sql<{ id: number; code: string; customer_name: string; total: number; unique_code: number; expires_at: Date }>(
    "select id, code, customer_name, total, unique_code, expires_at from orders where status = 'pending' order by expires_at limit 10",
  );
  const toShip = await sql<{ id: number; code: string; customer_name: string; city: string; paid_at: Date; shipping_courier: string | null; shipping_service: string | null }>(
    "select id, code, customer_name, city, paid_at, shipping_courier, shipping_service from orders where status = 'paid' order by paid_at limit 10",
  );
  const lowStock = await sql<{ id: number; product_id: number; product: string; variant: string; stock: number }>(
    `select v.id, p.id as product_id, p.name as product, v.name as variant, v.stock
       from product_variants v join products p on p.id = v.product_id
      where v.is_active and p.is_active and v.stock <= $1 order by v.stock, p.name limit 10`,
    [config.lowStock],
  );

  return (
    <>
      <PageHeader title="Ringkasan" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Menunggu transfer" value={stats.waiting} note="Stok ditahan sampai lunas atau lewat batas" href="/orders?status=pending" />
        <Stat label="Perlu dikirim" value={stats.to_ship} note="Lunas, tinggal dikemas" href="/orders?status=paid" />
        <Stat label="Penjualan bulan ini" value={<Money value={stats.sales} />} note="Pesanan yang sudah lunas" />
        <Stat label="Stok menipis" value={stats.low} note={`Varian dengan ${config.lowStock} pak atau kurang`} href="/restocks" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Card title="Transfer yang ditunggu" description="Cocokkan jumlahnya dengan mutasi rekening; tiga angka terakhir adalah kode unik.">
          {waiting.length === 0 ? (
            <Empty>Tidak ada transfer yang ditunggu.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {waiting.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className="flex items-center justify-between gap-4 py-3 hover:bg-paper">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">{o.customer_name}</span>
                      <span className="price block text-xs text-muted">
                        {o.code} · sampai {clock(o.expires_at)} WITA
                      </span>
                    </span>
                    <Money value={o.total} className="text-lg" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Perlu dikirim" description="Sudah lunas. Kemas, kirim, lalu isi nomor resinya.">
          {toShip.length === 0 ? (
            <Empty>Semua pesanan lunas sudah dikirim.</Empty>
          ) : (
            <ul className="divide-y divide-line">
              {toShip.map((o) => (
                <li key={o.id}>
                  <Link href={`/orders/${o.id}`} className="flex items-center justify-between gap-4 py-3 hover:bg-paper">
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-semibold">
                        {o.customer_name} · {o.city}
                      </span>
                      <span className="price block text-xs text-muted">
                        {o.code} · lunas {dateTime(o.paid_at)}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold uppercase">{[o.shipping_courier, o.shipping_service].filter(Boolean).join(" ")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card title="Stok menipis" className="mt-6">
        {lowStock.length === 0 ? (
          <Empty>Stok semua varian masih aman.</Empty>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="py-2 font-semibold">Produk</th>
                <th className="py-2 font-semibold">Varian</th>
                <th className="py-2 text-right font-semibold">Stok</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lowStock.map((v) => (
                <tr key={v.id}>
                  <td className="py-2.5">
                    <Link href={`/products/${v.product_id}`} className="font-medium hover:underline">
                      {v.product}
                    </Link>
                  </td>
                  <td className="py-2.5 text-muted">{v.variant}</td>
                  <td className={`price py-2.5 text-right font-semibold ${v.stock === 0 ? "text-danger" : "text-warn"}`}>{v.stock}</td>
                  <td className="py-2.5 text-right">
                    <Link href={`/restocks?variant=${v.id}`} className={link}>
                      Tambah stok
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

function Stat({ label, value, note, href }: { label: string; value: React.ReactNode; note: string; href?: string }) {
  const body = (
    <>
      <p className="eyebrow text-muted">{label}</p>
      <p className="price mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs text-muted">{note}</p>
    </>
  );
  const box = "block rounded-2xl border border-line bg-white p-4 sm:p-5";
  return href ? (
    <Link href={href} className={`${box} hover:border-ink`}>
      {body}
    </Link>
  ) : (
    <div className={box}>{body}</div>
  );
}
