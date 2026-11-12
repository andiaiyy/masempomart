"use server";

import { requireAdmin } from "@/lib/auth";
import { isUniqueViolation, sql, tx } from "@/lib/db";
import { back, slugify, text } from "@/lib/forms";

export async function saveCategory(id: number | null, fd: FormData) {
  await requireAdmin();
  const name = text(fd, "name");
  const slug = slugify(text(fd, "slug") || name);
  if (!name || !slug) back("/categories", { error: "Isi nama kategori." });
  try {
    if (id) await sql("update categories set name = $2, slug = $3 where id = $1", [id, name, slug]);
    else await sql("insert into categories (name, slug, sort_order) values ($1, $2, (select coalesce(max(sort_order), -1) + 1 from categories))", [name, slug]);
  } catch (err) {
    if (isUniqueViolation(err)) back("/categories", { error: `Alamat "${slug}" sudah dipakai kategori lain.` });
    throw err;
  }
  back("/categories", { ok: id ? "Kategori disimpan." : "Kategori ditambahkan." });
}

/** Swaps a category with its neighbour; the order is the order of the tabs on the storefront's shelf. */
export async function moveCategory(id: number, direction: -1 | 1) {
  await requireAdmin();
  await tx(async (db) => {
    const rows = await db<{ id: number }>("select id from categories order by sort_order, name");
    const at = rows.findIndex((r) => r.id === id);
    const to = at + direction;
    if (at < 0 || to < 0 || to >= rows.length) return;
    [rows[at], rows[to]] = [rows[to], rows[at]];
    for (const [i, row] of rows.entries()) await db("update categories set sort_order = $2 where id = $1", [row.id, i]);
  });
  back("/categories", {});
}

export async function deleteCategory(id: number) {
  await requireAdmin();
  const [{ n }] = await sql<{ n: number }>("select count(*) as n from products where category_id = $1", [id]);
  if (n > 0) back("/categories", { error: `Kategori ini masih punya ${n} produk. Pindahkan atau hapus produknya dulu.` });
  await sql("delete from categories where id = $1", [id]);
  back("/categories", { ok: "Kategori dihapus." });
}
