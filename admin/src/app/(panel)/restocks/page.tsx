import type { Metadata } from "next";
import Link from "next/link";
import { btn, Card, Empty, Field, Flash, input, Money, PageHeader } from "@/components/ui";
import { sql } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { addRestock } from "./actions";

export const metadata: Metadata = { title: "Stok" };

export default async function RestocksPage({ searchParams }: { searchParams: Promise<{ variant?: string; ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const selected = Number(sp.variant) || null;

  const variants = await sql<{ id: number; label: string; stock: number }>(
    `select v.id, p.name || ' · ' || v.name as label, v.stock from product_variants v join products p on p.id = v.product_id
      order by p.name, v.sort_order, v.id`,
  );
  const log = await sql<{
    id: number;
    quantity: number;
    cost_price: number | null;
    expires_on: string | null;
    note: string | null;
    created_at: Date;
    label: string;
    product_id: number;
    admin: string | null;
  }>(
    `select r.id, r.quantity, r.cost_price, r.expires_on, r.note, r.created_at, p.name || ' · ' || v.name as label, p.id as product_id, a.name as admin
       from restocks r join product_variants v on v.id = r.product_variant_id join products p on p.id = v.product_id
       left join admins a on a.id = r.admin_id
      ${selected ? "where r.product_variant_id = $1" : ""}
      order by r.created_at desc limit 100`,
    selected ? [selected] : [],
  );
  const current = variants.find((v) => v.id === selected);

  return (
    <>
      <PageHeader title="Stok" subtitle="Setiap barang masuk dan keluar dicatat di sini. Pesanan mengurangi stok sendiri; ini untuk kiriman baru dan barang rusak." />
      <Flash ok={sp.ok} error={sp.error} />

      <Card title="Catat stok" description="Positif untuk barang masuk (misalnya 24). Negatif untuk barang rusak, kedaluwarsa atau hilang (misalnya -2), dengan alasannya." className="mb-6">
        <form action={addRestock} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
          <Field label="Varian" hint={current ? `Stok sekarang ${current.stock} pak.` : undefined}>
            <select name="variant_id" defaultValue={selected ?? ""} required className={input}>
              <option value="" disabled>
                Pilih varian
              </option>
              {variants.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.label} (stok {v.stock})
                </option>
              ))}
            </select>
          </Field>
          <Field label="Jumlah (pak)">
            <input name="quantity" required inputMode="numeric" pattern="-?\d+" placeholder="24" className={input} />
          </Field>
          <Field label="Harga modal / pak" hint="Opsional.">
            <input name="cost_price" inputMode="numeric" placeholder="9000" className={input} />
          </Field>
          <Field label="Kedaluwarsa" hint="Opsional.">
            <input name="expires_on" type="date" className={input} />
          </Field>
          <Field label="Catatan" hint="Wajib untuk pengurangan." className="sm:col-span-2 lg:col-span-3">
            <input name="note" maxLength={200} placeholder="Kiriman dari dapur / 2 pak bocor" className={input} />
          </Field>
          <div className="flex items-end">
            <button className={`${btn} w-full`}>Simpan</button>
          </div>
        </form>
      </Card>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-bold">{current ? `Riwayat ${current.label}` : "Riwayat terbaru"}</h2>
        {current && (
          <Link href="/restocks" className="text-sm text-muted hover:text-ink">
            Semua varian
          </Link>
        )}
      </div>
      {log.length === 0 ? (
        <Empty>Belum ada catatan stok.</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Waktu</th>
                <th className="px-4 py-3 font-semibold">Varian</th>
                <th className="px-4 py-3 text-right font-semibold">Jumlah</th>
                <th className="px-4 py-3 font-semibold">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {log.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-muted">
                    {dateTime(r.created_at)}
                    {r.admin && <span className="block text-xs">{r.admin}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/products/${r.product_id}`} className="hover:underline">
                      {r.label}
                    </Link>
                  </td>
                  <td className={`price px-4 py-3 text-right font-semibold ${r.quantity < 0 ? "text-danger" : "text-accent"}`}>
                    {r.quantity > 0 ? `+${r.quantity}` : r.quantity}
                  </td>
                  <td className="px-4 py-3 text-muted">
                    {[r.note, r.cost_price ? <span key="c">modal <Money value={r.cost_price} /></span> : null, r.expires_on ? `exp. ${r.expires_on}` : null]
                      .filter(Boolean)
                      .map((part, i) => (
                        <span key={i}>
                          {i > 0 && " · "}
                          {part}
                        </span>
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
