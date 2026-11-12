"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { isUniqueViolation, sql, tx } from "@/lib/db";
import { back, slugify } from "@/lib/forms";

export type FormState = { error?: string; fields?: Record<string, string> } | null;

type SpecInput = { label: string; value: string };
type VariantInput = {
  id: number | null;
  name: string;
  price: string;
  compare_at_price: string;
  weight_grams: string;
  stock: string;
  is_active: boolean;
};

const whole = (value: string) => {
  const v = value.replace(/[.\s]/g, "");
  return /^\d+$/.test(v) ? Number(v) : null;
};

/** Creates (id null) or updates a product with its specs and variants, in one transaction. */
export async function saveProduct(id: number | null, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const fields: Record<string, string> = {};

  const name = String(fd.get("name") ?? "").trim();
  const slug = slugify(String(fd.get("slug") ?? "").trim() || name);
  const categoryId = Number(fd.get("category_id"));
  const description = String(fd.get("description") ?? "").trim();
  const isActive = fd.get("is_active") === "on";
  const images = fd.getAll("images").map(String).filter((u) => /^(https?:\/\/|\/)/.test(u));
  let specs: SpecInput[] = [];
  let variants: VariantInput[] = [];
  try {
    specs = JSON.parse(String(fd.get("specs") ?? "[]"));
    variants = JSON.parse(String(fd.get("variants") ?? "[]"));
  } catch {
    return { error: "Formulir tidak terbaca. Muat ulang halamannya." };
  }

  if (!name) fields.name = "Nama produk wajib diisi.";
  else if (name.length > 120) fields.name = "Maksimal 120 karakter.";
  if (!slug) fields.slug = "Alamat halaman wajib diisi.";
  if (!categoryId) fields.category_id = "Pilih kategori.";
  if (description.length > 2000) fields.description = "Maksimal 2.000 karakter.";

  const cleanSpecs = specs
    .map((s) => ({ label: String(s.label ?? "").trim(), value: String(s.value ?? "").trim() }))
    .filter((s) => s.label || s.value);
  cleanSpecs.forEach((s, i) => {
    if (!s.label || !s.value) fields[`spec-${i}`] = "Isi label dan isinya, atau hapus barisnya.";
  });

  const cleanVariants = variants.map((v, i) => {
    const price = whole(String(v.price ?? ""));
    const compare = String(v.compare_at_price ?? "").trim() ? whole(String(v.compare_at_price)) : null;
    const grams = whole(String(v.weight_grams ?? ""));
    const stock = v.id ? null : whole(String(v.stock ?? "") || "0");
    const nameV = String(v.name ?? "").trim();
    if (!nameV) fields[`variant-${i}-name`] = "Nama varian wajib diisi.";
    if (price === null) fields[`variant-${i}-price`] = "Harga wajib diisi (angka).";
    if (String(v.compare_at_price ?? "").trim() && (compare === null || price === null || compare <= price)) {
      fields[`variant-${i}-compare`] = "Harga coret harus lebih tinggi dari harga.";
    }
    if (!grams) fields[`variant-${i}-weight`] = "Berat wajib diisi (gram).";
    if (!v.id && stock === null) fields[`variant-${i}-stock`] = "Stok awal harus angka.";
    return { id: v.id, name: nameV, price: price ?? 0, compare, grams: grams ?? 0, stock: stock ?? 0, isActive: Boolean(v.is_active), sort: i };
  });
  if (!cleanVariants.length) fields.variants = "Tambahkan minimal satu varian (rasa atau ukuran).";

  if (Object.keys(fields).length) return { error: "Ada isian yang perlu diperbaiki.", fields };

  let savedId: number;
  try {
    savedId = await tx(async (db) => {
      const [row] = id
        ? await db<{ id: number }>(
            `update products set category_id = $2, name = $3, slug = $4, description = $5, images = $6::jsonb, specs = $7::jsonb,
                    is_active = $8, updated_at = now() where id = $1 returning id`,
            [id, categoryId, name, slug, description || null, JSON.stringify(images), JSON.stringify(cleanSpecs), isActive],
          )
        : await db<{ id: number }>(
            `insert into products (category_id, name, slug, description, images, specs, is_active)
             values ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7) returning id`,
            [categoryId, name, slug, description || null, JSON.stringify(images), JSON.stringify(cleanSpecs), isActive],
          );
      if (!row) throw new Error("Produk tidak ditemukan.");

      // Variants left out of the form are removed; past orders keep their own copy of name and price
      const kept = cleanVariants.filter((v) => v.id).map((v) => v.id);
      await db("delete from product_variants where product_id = $1 and not (id = any($2::int[]))", [row.id, kept]);
      for (const v of cleanVariants) {
        if (v.id) {
          await db(
            `update product_variants set name = $3, price = $4, compare_at_price = $5, weight_grams = $6, is_active = $7, sort_order = $8
              where id = $1 and product_id = $2`,
            [v.id, row.id, v.name, v.price, v.compare, v.grams, v.isActive, v.sort],
          );
        } else {
          await db(
            `insert into product_variants (product_id, name, price, compare_at_price, weight_grams, stock, is_active, sort_order)
             values ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [row.id, v.name, v.price, v.compare, v.grams, v.stock, v.isActive, v.sort],
          );
        }
      }
      return row.id;
    });
  } catch (err) {
    if (isUniqueViolation(err)) return { error: "Ada isian yang perlu diperbaiki.", fields: { slug: "Alamat halaman ini sudah dipakai produk lain." } };
    throw err;
  }

  revalidatePath("/products");
  redirect(`/products/${savedId}?ok=${encodeURIComponent(id ? "Produk disimpan." : "Produk dibuat.")}`);
}

export async function deleteProduct(id: number) {
  await requireAdmin();
  await sql("delete from products where id = $1", [id]);
  back("/products", { ok: "Produk dihapus. Pesanan lama tetap menyimpan nama dan harganya." });
}
