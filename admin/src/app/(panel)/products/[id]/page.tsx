import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ConfirmButton } from "@/components/client";
import { btnDanger, btnGhost, Flash, PageHeader } from "@/components/ui";
import { config } from "@/lib/config";
import { sql } from "@/lib/db";
import { uploadMode } from "@/lib/forms";
import { deleteProduct } from "../actions";
import ProductForm, { type ProductFormData } from "../ProductForm";

export const metadata: Metadata = { title: "Ubah produk" };

export default async function EditProductPage({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ ok?: string; error?: string }> }) {
  const id = Number((await params).id);
  const [product] = await sql<Omit<ProductFormData, "variants">>(
    "select id, name, slug, category_id, coalesce(description, '') as description, images, is_active, specs from products where id = $1",
    [id],
  );
  if (!product) notFound();
  const variants = await sql<ProductFormData["variants"][number]>(
    "select id, name, price, compare_at_price, weight_grams, stock, is_active from product_variants where product_id = $1 order by sort_order, id",
    [id],
  );
  const categories = await sql<{ id: number; name: string }>("select id, name from categories order by sort_order, name");
  const flash = await searchParams;

  return (
    <>
      <Link href="/products" className="mb-4 inline-flex h-9 items-center gap-1 text-sm text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Semua produk
      </Link>
      <PageHeader title={product.name}>
        <a href={`${config.storefrontUrl}/produk/${product.slug}`} target="_blank" rel="noreferrer" className={btnGhost}>
          <ExternalLink className="size-4" /> Lihat di toko
        </a>
        <form action={deleteProduct.bind(null, id)}>
          <ConfirmButton message={`Hapus ${product.name}? Pesanan lama tetap menyimpan nama dan harganya.`} className={btnDanger}>
            Hapus
          </ConfirmButton>
        </form>
      </PageHeader>
      <Flash ok={flash.ok} error={flash.error} />
      <ProductForm key={JSON.stringify(variants)} uploadMode={uploadMode()} categories={categories} product={{ ...product, variants }} />
    </>
  );
}
