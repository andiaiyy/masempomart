"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import { PhotoField } from "@/components/client";
import { saveProduct, type FormState } from "./actions";

type Spec = { key: number; label: string; value: string };
type Variant = {
  key: number;
  id: number | null;
  name: string;
  price: string;
  compare_at_price: string;
  weight_grams: string;
  stock: string;
  is_active: boolean;
};

export type ProductFormData = {
  id: number | null;
  name: string;
  slug: string;
  category_id: number | null;
  description: string;
  images: string[];
  is_active: boolean;
  specs: { label: string; value: string }[];
  variants: { id: number; name: string; price: number; compare_at_price: number | null; weight_grams: number; stock: number; is_active: boolean }[];
};

const input = "h-11 w-full rounded-md border border-line bg-white px-3 text-sm placeholder:text-muted aria-[invalid=true]:border-danger";
const icon = "flex size-9 items-center justify-center rounded-md text-muted hover:bg-tile hover:text-ink disabled:opacity-30";

let nextKey = 1;
const key = () => nextKey++;

/**
 * Everything about a product on one page: details, photos (first = card photo), the specs shown in
 * the storefront's Detail tab, and the variants shoppers pick from. Stock of existing variants only
 * changes on the Stok page, so every change is logged.
 */
export default function ProductForm({
  product,
  categories,
  uploadMode,
}: {
  product: ProductFormData;
  categories: { id: number; name: string }[];
  uploadMode: "blob" | "local";
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveProduct.bind(null, product.id), null);
  const [specs, setSpecs] = useState<Spec[]>(() => product.specs.map((s) => ({ key: key(), ...s })));
  const [variants, setVariants] = useState<Variant[]>(() =>
    product.variants.length
      ? product.variants.map((v) => ({
          key: key(),
          id: v.id,
          name: v.name,
          price: String(v.price),
          compare_at_price: v.compare_at_price ? String(v.compare_at_price) : "",
          weight_grams: String(v.weight_grams),
          stock: String(v.stock),
          is_active: v.is_active,
        }))
      : [{ key: key(), id: null, name: "", price: "", compare_at_price: "", weight_grams: "", stock: "0", is_active: true }],
  );
  const err = (name: string) => state?.fields?.[name];

  const move = <T,>(list: T[], from: number, to: number) => {
    const next = [...list];
    [next[from], next[to]] = [next[to], next[from]];
    return next;
  };
  const setVariant = (k: number, patch: Partial<Variant>) => setVariants((vs) => vs.map((v) => (v.key === k ? { ...v, ...patch } : v)));

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="specs" value={JSON.stringify(specs.map(({ label, value }) => ({ label, value })))} />
      <input
        type="hidden"
        name="variants"
        value={JSON.stringify(variants.map(({ id, name, price, compare_at_price, weight_grams, stock, is_active }) => ({ id, name, price, compare_at_price, weight_grams, stock, is_active })))}
      />

      {state?.error && (
        <p role="alert" className="rounded-md border border-danger/30 bg-white px-4 py-3 text-sm text-danger">
          {state.error}
        </p>
      )}

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="font-bold">Produk</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Label text="Nama" error={err("name")}>
            <input name="name" defaultValue={product.name} required maxLength={120} aria-invalid={!!err("name")} className={input} />
          </Label>
          <Label text="Alamat halaman" hint="Bagian akhir link produk di toko. Kosongkan untuk dibuat dari nama." error={err("slug")}>
            <input name="slug" defaultValue={product.slug} placeholder="keripik-pisang-lumer" aria-invalid={!!err("slug")} className={input} />
          </Label>
          <Label text="Kategori" hint="Tab di rak toko." error={err("category_id")}>
            <select name="category_id" defaultValue={product.category_id ?? ""} required aria-invalid={!!err("category_id")} className={input}>
              <option value="" disabled>
                Pilih kategori
              </option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </Label>
          <label className="flex min-h-11 items-center gap-3 self-end text-sm font-medium">
            <input type="checkbox" name="is_active" defaultChecked={product.is_active} className="size-4 accent-accent" />
            Dijual di toko
          </label>
        </div>
        <Label text="Deskripsi" hint="Tab Deskripsi di halaman produk. Rasa, bahan, alergen, nomor halal." error={err("description")} className="mt-4">
          <textarea name="description" defaultValue={product.description} rows={4} maxLength={2000} className="w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm" />
        </Label>
        <div className="mt-4">
          <p className="text-sm font-medium">Foto</p>
          <p className="mb-2 text-xs text-muted">Foto pertama tampil di kartu produk. Geser dengan panah untuk mengubah urutan.</p>
          <PhotoField name="images" mode={uploadMode} defaultValue={product.images} />
        </div>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="font-bold">Varian</h2>
        <p className="mt-0.5 text-sm text-muted">Satu baris per rasa atau ukuran. Pembeli memilih salah satunya.</p>
        {err("variants") && <p className="mt-2 text-sm text-danger">{err("variants")}</p>}
        <ol className="mt-4 space-y-3">
          {variants.map((v, i) => (
            <li key={v.key} className="rounded-xl border border-line p-4">
              <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_1fr]">
                <Label text="Nama varian" error={err(`variant-${i}-name`)}>
                  <input value={v.name} onChange={(e) => setVariant(v.key, { name: e.target.value })} placeholder="Original · 150 g" aria-invalid={!!err(`variant-${i}-name`)} className={input} />
                </Label>
                <Label text="Harga (Rp)" error={err(`variant-${i}-price`)}>
                  <input value={v.price} onChange={(e) => setVariant(v.key, { price: e.target.value })} inputMode="numeric" placeholder="15000" aria-invalid={!!err(`variant-${i}-price`)} className={input} />
                </Label>
                <Label text="Harga coret (Rp)" hint="Hanya saat promo." error={err(`variant-${i}-compare`)}>
                  <input value={v.compare_at_price} onChange={(e) => setVariant(v.key, { compare_at_price: e.target.value })} inputMode="numeric" aria-invalid={!!err(`variant-${i}-compare`)} className={input} />
                </Label>
                <Label text="Berat (g)" hint="Sudah dikemas, untuk ongkir." error={err(`variant-${i}-weight`)}>
                  <input value={v.weight_grams} onChange={(e) => setVariant(v.key, { weight_grams: e.target.value })} inputMode="numeric" aria-invalid={!!err(`variant-${i}-weight`)} className={input} />
                </Label>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
                {v.id ? (
                  <p className="text-sm">
                    Stok <strong className="price">{v.stock}</strong> pak ·{" "}
                    <Link href={`/restocks?variant=${v.id}`} className="font-semibold text-accent underline underline-offset-2">
                      Tambah atau kurangi
                    </Link>
                  </p>
                ) : (
                  <label className="flex items-center gap-2 text-sm">
                    Stok awal
                    <input value={v.stock} onChange={(e) => setVariant(v.key, { stock: e.target.value })} inputMode="numeric" aria-invalid={!!err(`variant-${i}-stock`)} className={`${input} w-24`} />
                  </label>
                )}
                <label className="flex min-h-9 items-center gap-2 text-sm">
                  <input type="checkbox" checked={v.is_active} onChange={(e) => setVariant(v.key, { is_active: e.target.checked })} className="size-4 accent-accent" />
                  Dijual
                </label>
                <div className="ml-auto flex">
                  <button type="button" className={icon} disabled={i === 0} onClick={() => setVariants((vs) => move(vs, i, i - 1))} aria-label={`Naikkan varian ${i + 1}`}>
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" className={icon} disabled={i === variants.length - 1} onClick={() => setVariants((vs) => move(vs, i, i + 1))} aria-label={`Turunkan varian ${i + 1}`}>
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    className={`${icon} hover:text-danger`}
                    onClick={() => (!v.id || confirm("Hapus varian ini? Pesanan lama tetap menyimpan nama dan harganya.")) && setVariants((vs) => vs.filter((x) => x.key !== v.key))}
                    aria-label={`Hapus varian ${i + 1}`}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => setVariants((vs) => [...vs, { key: key(), id: null, name: "", price: "", compare_at_price: "", weight_grams: vs.at(-1)?.weight_grams ?? "", stock: "0", is_active: true }])}
          className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-md border border-dashed border-line px-4 text-sm font-semibold hover:border-ink"
        >
          <Plus className="size-4" /> Tambah varian
        </button>
      </section>

      <section className="rounded-2xl border border-line bg-white p-5 sm:p-6">
        <h2 className="font-bold">Detail</h2>
        <p className="mt-0.5 text-sm text-muted">Fakta di tab Detail halaman produk, berurutan. Contoh: Asal · Makassar, Daya tahan · 3 bulan.</p>
        <ol className="mt-4 space-y-2">
          {specs.map((s, i) => (
            <li key={s.key}>
              <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                <input
                  value={s.label}
                  onChange={(e) => setSpecs((ss) => ss.map((x) => (x.key === s.key ? { ...x, label: e.target.value } : x)))}
                  placeholder="Label"
                  aria-label={`Label detail ${i + 1}`}
                  aria-invalid={!!err(`spec-${i}`)}
                  maxLength={60}
                  className={`${input} sm:w-56`}
                />
                <input
                  value={s.value}
                  onChange={(e) => setSpecs((ss) => ss.map((x) => (x.key === s.key ? { ...x, value: e.target.value } : x)))}
                  placeholder="Isi"
                  aria-label={`Isi detail ${i + 1}`}
                  aria-invalid={!!err(`spec-${i}`)}
                  maxLength={200}
                  className={input}
                />
                <div className="flex shrink-0">
                  <button type="button" className={icon} disabled={i === 0} onClick={() => setSpecs((ss) => move(ss, i, i - 1))} aria-label={`Naikkan detail ${i + 1}`}>
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" className={icon} disabled={i === specs.length - 1} onClick={() => setSpecs((ss) => move(ss, i, i + 1))} aria-label={`Turunkan detail ${i + 1}`}>
                    <ArrowDown className="size-4" />
                  </button>
                  <button type="button" className={`${icon} hover:text-danger`} onClick={() => setSpecs((ss) => ss.filter((x) => x.key !== s.key))} aria-label={`Hapus detail ${i + 1}`}>
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </div>
              {err(`spec-${i}`) && <p className="mt-1 text-xs text-danger">{err(`spec-${i}`)}</p>}
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => setSpecs((ss) => [...ss, { key: key(), label: "", value: "" }])}
          className="mt-3 inline-flex h-11 items-center gap-1.5 rounded-md border border-dashed border-line px-4 text-sm font-semibold hover:border-ink"
        >
          <Plus className="size-4" /> Tambah detail
        </button>
      </section>

      <div className="flex gap-2">
        <button disabled={pending} className="inline-flex h-11 items-center rounded-md bg-accent px-6 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60">
          {pending ? "Menyimpan…" : product.id ? "Simpan perubahan" : "Buat produk"}
        </button>
        <Link href="/products" className="inline-flex h-11 items-center rounded-md border border-line bg-white px-5 text-sm font-semibold hover:border-ink">
          Batal
        </Link>
      </div>
    </form>
  );
}

function Label({ text, hint, error, className = "", children }: { text: string; hint?: string; error?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium">{text}</span>
      <span className="mt-1 block">{children}</span>
      {error ? <span className="mt-1 block text-xs text-danger">{error}</span> : hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}
