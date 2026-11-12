import type { Metadata } from "next";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import { ConfirmButton } from "@/components/client";
import { btn, btnGhost, btnIcon, Card, Empty, Flash, input, PageHeader } from "@/components/ui";
import { sql } from "@/lib/db";
import { deleteCategory, moveCategory, saveCategory } from "./actions";

export const metadata: Metadata = { title: "Kategori" };

export default async function CategoriesPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const flash = await searchParams;
  const categories = await sql<{ id: number; name: string; slug: string; products: number }>(
    "select c.id, c.name, c.slug, (select count(*) from products p where p.category_id = c.id) as products from categories c order by c.sort_order, c.name",
  );

  return (
    <>
      <PageHeader title="Kategori" subtitle="Tab di rak toko, dari kiri ke kanan sesuai urutan di sini." />
      <Flash ok={flash.ok} error={flash.error} />

      <Card title="Tambah kategori" className="mb-6">
        <form action={saveCategory.bind(null, null)} className="flex flex-wrap gap-2">
          <label className="sr-only" htmlFor="new-name">
            Nama kategori
          </label>
          <input id="new-name" name="name" required maxLength={60} placeholder="Contoh: Kue Kering" className={`${input} max-w-sm`} />
          <button className={btn}>Tambah</button>
        </form>
      </Card>

      {categories.length === 0 ? (
        <Empty>Belum ada kategori.</Empty>
      ) : (
        <ol className="divide-y divide-line rounded-2xl border border-line bg-white">
          {categories.map((c, i) => (
            <li key={c.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
              <div className="flex">
                <form action={moveCategory.bind(null, c.id, -1)}>
                  <button className={btnIcon} disabled={i === 0} aria-label={`Geser ${c.name} ke kiri`}>
                    <ArrowUp className="size-4" />
                  </button>
                </form>
                <form action={moveCategory.bind(null, c.id, 1)}>
                  <button className={btnIcon} disabled={i === categories.length - 1} aria-label={`Geser ${c.name} ke kanan`}>
                    <ArrowDown className="size-4" />
                  </button>
                </form>
              </div>
              <form action={saveCategory.bind(null, c.id)} className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`name-${c.id}`}>
                  Nama
                </label>
                <input id={`name-${c.id}`} name="name" defaultValue={c.name} required maxLength={60} className={`${input} max-w-xs`} />
                <label className="sr-only" htmlFor={`slug-${c.id}`}>
                  Alamat
                </label>
                <input id={`slug-${c.id}`} name="slug" defaultValue={c.slug} maxLength={60} className={`${input} max-w-[14rem] text-muted`} title="Bagian link: /?category=…" />
                <button className={btnGhost}>Simpan</button>
              </form>
              <span className="price text-sm text-muted">{c.products} produk</span>
              <form action={deleteCategory.bind(null, c.id)}>
                <ConfirmButton message={`Hapus kategori ${c.name}?`} className={`${btnIcon} hover:text-danger`} aria-label={`Hapus ${c.name}`}>
                  <Trash2 className="size-4" />
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
