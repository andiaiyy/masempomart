import Link from "next/link";
import type { Product } from "@/lib/types";
import QuickAdd from "./QuickAdd";

/**
 * Catalog card, after the owner's reference catalog: white rounded card on the paper ground,
 * a large round photo breaking out of its top edge, name, then price with a bag and a "Beli" button.
 * PROMO / Habis sit on the photo like a sticker, so narrow cards don't need room beside it.
 *
 * Links to server-rendered pages don't prefetch: with 24 cards on screen, prefetching rendered
 * 24 product pages (and their API calls) that the shopper never opened.
 */
export default function ProductCard({ product, eager = false }: { product: Product; eager?: boolean }) {
  const href = `/produk/${product.slug}`;
  const image = product.images[0];
  const onSale = product.variants.some((v) => v.compare_at_price !== null && v.compare_at_price > v.price);

  return (
    <li className="group mt-12 flex flex-col rounded-2xl border border-transparent bg-white px-3 pb-3 transition-colors focus-within:border-accent hover:border-accent sm:mt-14 xl:mt-16">
      {/* The name below is the link for keyboards and screen readers; the photo is a second, larger click target.
          Bigger photo at the owner's request (2026-11-13): 128px on phones up to 176px on wide screens. */}
      <Link
        href={href}
        prefetch={false}
        tabIndex={-1}
        aria-hidden
        className="relative -mt-12 block h-32 w-32 shrink-0 rounded-full bg-tile sm:-mt-14 sm:h-36 sm:w-36 xl:-mt-16 xl:h-44 xl:w-44"
      >
        <span className="block h-full w-full overflow-hidden rounded-full">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element -- photos come from the API's storage
            <img src={image} alt="" loading={eager ? "eager" : "lazy"} className="h-full w-full object-cover" />
          ) : (
            <span className="flex h-full items-center justify-center px-4 text-center text-xs leading-tight text-muted">Foto belum ada</span>
          )}
        </span>
        {!product.in_stock ? (
          <span className="absolute -right-2 bottom-1 rounded bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-danger ring-1 ring-line">Habis</span>
        ) : (
          onSale && <span className="absolute -right-2 bottom-1 rounded bg-danger px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Promo</span>
        )}
      </Link>
      {/* The sticker sits inside an aria-hidden link, so say it again for screen readers */}
      {(!product.in_stock || onSale) && <span className="sr-only">{product.in_stock ? "Promo" : "Habis"}</span>}
      <h3 className="mt-3">
        <Link href={href} prefetch={false} className="line-clamp-2 min-h-[2.75em] text-base font-semibold leading-snug hover:underline sm:text-lg">
          {product.name}
        </Link>
      </h3>
      <QuickAdd product={product} />
    </li>
  );
}
