import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, Plus, Search } from "lucide-react";
import { Badge, btn, btnGhost, Empty, Flash, input, Money, PageHeader } from "@/components/ui";
import { config } from "@/lib/config";
import { sql } from "@/lib/db";

export const metadata: Metadata = { title: "Produk" };

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ q?: string; category?: string; ok?: string; error?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const category = Number(sp.category) || null;

  const params: unknown[] = [];
  const where: string[] = [];
  if (q) where.push(`p.name ilike $${params.push(`%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`)}`);
  if (category) where.push(`p.category_id = $${params.push(category)}`);

  const products = await sql<{
    id: number;
    slug: string;
    name: string;
    images: string[];
    is_active: boolean;
    category: string;
    variants: number;
    price_from: number | null;
    stock: number;
    low: boolean;
  }>(
    `select p.id, p.slug, p.name, p.images, p.is_active, c.name as category,
            count(v.id) filter (where v.is_active) as variants,
            min(v.price) filter (where v.is_active) as price_from,
            coalesce(sum(v.stock) filter (where v.is_active), 0) as stock,
            coalesce(bool_or(v.is_active and v.stock <= ${config.lowStock}), false) as low
       from products p join categories c on c.id = p.category_id left join product_variants v on v.product_id = p.id
      ${where.length ? `where ${where.join(" and ")}` : ""}
      group by p.id, c.name, c.sort_order order by c.sort_order, p.name`,
    params,
  );
  const categories = await sql<{ id: number; name: string }>("select id, name from categories order by sort_order, name");

  return (
    <>
      <PageHeader title="Produk" subtitle="Yang tampil di rak toko. Klik nama produk untuk mengubah harga, foto, varian dan detailnya.">
        <Link href="/products/new" className={btn}>
          <Plus className="size-4" /> Produk baru
        </Link>
      </PageHeader>
      <Flash ok={sp.ok} error={sp.error} />

      <form className="mb-5 flex flex-wrap gap-2" role="search">
        <label className="sr-only" htmlFor="q">
          Cari produk
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="Cari produk" className={`${input} max-w-xs`} />
        <label className="sr-only" htmlFor="category">
          Kategori
        </label>
        <select id="category" name="category" defaultValue={category ?? ""} className={`${input} w-auto`}>
          <option value="">Semua kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <button className={btnGhost} aria-label="Cari">
          <Search className="size-4" />
        </button>
      </form>

      {products.length === 0 ? (
        <Empty>{q || category ? "Tidak ada produk yang cocok." : "Belum ada produk. Buat yang pertama."}</Empty>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-line bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3 font-semibold">Produk</th>
                <th className="px-4 py-3 font-semibold">Kategori</th>
                <th className="px-4 py-3 text-right font-semibold">Mulai</th>
                <th className="px-4 py-3 text-right font-semibold">Stok</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((p) => (
                <tr key={p.id} className="hover:bg-paper">
                  <td className="px-4 py-3">
                    <Link href={`/products/${p.id}`} className="flex items-center gap-3">
                      <span className="size-11 shrink-0 overflow-hidden rounded-full bg-tile">
                        {p.images[0] && (
                          // eslint-disable-next-line @next/next/no-img-element -- product photo
                          <img src={p.images[0]} alt="" className="size-full object-cover" />
                        )}
                      </span>
                      <span>
                        <span className="font-semibold hover:underline">{p.name}</span>
                        <span className="block text-xs text-muted">
                          {p.variants} varian {!p.is_active && <Badge>Disembunyikan</Badge>}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-muted">{p.category}</td>
                  <td className="px-4 py-3 text-right">{p.price_from !== null ? <Money value={p.price_from} /> : "-"}</td>
                  <td className={`price px-4 py-3 text-right font-semibold ${p.stock === 0 ? "text-danger" : p.low ? "text-warn" : ""}`}>{p.stock}</td>
                  <td className="px-4 py-3 text-right">
                    <a
                      href={`${config.storefrontUrl}/produk/${p.slug}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-tile hover:text-ink"
                      aria-label={`Lihat ${p.name} di toko`}
                      title="Lihat di toko"
                    >
                      <ExternalLink className="size-4" />
                    </a>
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
