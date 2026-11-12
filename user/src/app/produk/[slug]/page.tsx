import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { backend } from "@/lib/backend";
import type { ProductDetail, ProductPage } from "@/lib/types";
import ProductCard from "@/components/ProductCard";
import Purchase from "@/components/Purchase";
import { shelfHref } from "@/lib/catalog";
import Showcase from "@/components/Showcase";
import { ChevronIcon } from "@/components/Icons";

type Params = Promise<{ slug: string }>;

const load = (slug: string) => backend<ProductDetail>(`/products/${encodeURIComponent(slug)}`);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const product = await load((await params).slug);
  return product ? { title: product.name, description: product.description ?? undefined } : {};
}

/** Layout follows the owner's reference product page (DESIGN.md, "Product page"). */
export default async function ProductPageView({ params }: { params: Params }) {
  const product = await load((await params).slug);
  if (!product) notFound();

  const related = await backend<ProductPage>(`/products?category=${product.category.slug}&exclude=${product.id}&per_page=4`);

  return (
    // Same page width, line colour, title style and cards as the landing shelf, so the two read as one shop
    <div className="container-page">
      <div className="flex items-center justify-between gap-4 border-b border-line py-3">
        <nav aria-label="Lokasi halaman" className="min-w-0">
          <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] uppercase">
            <li>
              <Link href="/" prefetch={false} className="text-muted hover:text-ink hover:underline">
                Beranda
              </Link>
            </li>
            <li aria-hidden className="text-muted">
              /
            </li>
            <li>
              <Link href={shelfHref({ category: product.category.slug })} prefetch={false} className="text-muted hover:text-ink hover:underline">
                {product.category.name}
              </Link>
            </li>
            <li aria-hidden className="text-muted">
              /
            </li>
            <li aria-current="page" className="font-semibold text-ink">
              {product.name}
            </li>
          </ol>
        </nav>
        <div className="flex shrink-0">
          <Neighbour to={product.previous} direction="left" />
          <Neighbour to={product.next} direction="right" />
        </div>
      </div>

      {/* Arranged after the owner's reference: photos left, everything about buying on the right */}
      <div className="grid gap-10 pb-14 pt-10 md:grid-cols-2 md:gap-14 md:pb-16 md:pt-12">
        <Showcase images={product.images} name={product.name} soldOut={!product.in_stock} />
        <Purchase product={product} />
      </div>

      {related && related.data.length > 0 && (
        <section aria-labelledby="terkait" className="border-t border-line pb-24 pt-12">
          <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <h2 id="terkait" className="section-title text-2xl sm:text-3xl">
              Produk Terkait
            </h2>
            <Link
              href={shelfHref({ category: product.category.slug })}
              prefetch={false}
              className="inline-flex h-11 items-center text-[13px] uppercase text-muted underline decoration-1 underline-offset-[5px] hover:text-ink"
            >
              Lihat semua {product.category.name}
            </Link>
          </div>
          {/* The landing shelf's cards and grid */}
          <ul className="mt-6 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4">
            {related.data.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function Neighbour({ to, direction }: { to: ProductDetail["previous"]; direction: "left" | "right" }) {
  const label = direction === "left" ? "Produk sebelumnya" : "Produk berikutnya";
  if (!to) {
    return (
      <span aria-hidden className="flex h-11 w-11 items-center justify-center text-line">
        <ChevronIcon direction={direction} />
      </span>
    );
  }
  return (
    <Link href={`/produk/${to.slug}`} prefetch={false} aria-label={`${label}: ${to.name}`} title={to.name} className="flex h-11 w-11 items-center justify-center text-muted hover:text-ink">
      <ChevronIcon direction={direction} />
    </Link>
  );
}
