import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Empty, link, PageHeader } from "@/components/ui";
import { sql } from "@/lib/db";
import { uploadMode } from "@/lib/forms";
import ProductForm from "../ProductForm";

export const metadata: Metadata = { title: "Produk baru" };

export default async function NewProductPage() {
  const categories = await sql<{ id: number; name: string }>("select id, name from categories order by sort_order, name");

  return (
    <>
      <Link href="/products" className="mb-4 inline-flex h-9 items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Semua produk
      </Link>
      <PageHeader title="Produk baru" />
      {categories.length === 0 ? (
        <Empty>
          Buat kategori dulu di{" "}
          <Link href="/categories" className={link}>
            Kategori
          </Link>
          , lalu kembali ke sini.
        </Empty>
      ) : (
        <ProductForm
          uploadMode={uploadMode()}
          categories={categories}
          product={{ id: null, name: "", slug: "", category_id: null, description: "", images: [], is_active: true, specs: [], variants: [] }}
        />
      )}
    </>
  );
}
