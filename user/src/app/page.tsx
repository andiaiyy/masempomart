import { lontara } from "@/lib/fonts";
import { backend } from "@/lib/backend";
import { pick, shelfApiQuery } from "@/lib/catalog";
import type { Category, ProductPage } from "@/lib/types";
import LandingCatalog from "@/components/landing/LandingCatalog";
import SpinningRing from "@/components/landing/SpinningRing";

const TAGLINE = "Produk olahan Bone, dikirim ke seluruh Indonesia";

/**
 * Landing page, after the owner's "Traditional Market menu" poster: a ring of jajanan pasar
 * around a round title card. The illustration is the poster's artwork with its own title,
 * logo and sponsor line cut away (src/assets/jajanan-ring.png; see DESIGN.md about its licence).
 * The ring turns slowly (SpinningRing); the title card on top of it stays still.
 * The shop has no header or footer (only the cart bubble); below the ring sits the product shelf,
 * the only place to browse products (#produk).
 * Text sizes in the ring use cqw so the title card scales with the ring on any screen.
 */

export default async function LandingPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // ?category= / ?sort= / ?q= open the shelf on that tab, order or search (links from product pages and the cart)
  const params = pick(await searchParams);
  const [products, categories] = await Promise.all([
    backend<ProductPage>(`/products?${shelfApiQuery(params)}`),
    backend<Category[]>("/categories"),
  ]);
  const showShelf = products && (products.meta.total > 0 || params.category || params.q);

  return (
    <>
      <section aria-labelledby="judul" className="px-4 pb-14 pt-8 sm:px-6 sm:pt-12">
        <div className="@container mx-auto w-full max-w-[760px]">
          <div className="relative">
            <SpinningRing />

            {/* Fills the ring's centre (54.4% of the artwork) and stays still while the ring turns */}
            <div className="absolute left-1/2 top-1/2 flex aspect-square w-[55%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-paper px-[6cqw] text-center">
              <h1 id="judul" className="font-display text-[9.5cqw] leading-[0.95] tracking-tight">
                {/* "Masempo" in Lontara (Bugis script); screen readers and search engines get the Latin name */}
                <span lang="bug" aria-hidden="true" className={`${lontara.className} block text-[10cqw] leading-[1.15] tracking-normal`}>
                  ᨆᨔᨛᨇᨚ
                </span>
                <span className="sr-only">Masempo </span>
                Mart
              </h1>
              <p className="mt-[3.5cqw] hidden max-w-[36cqw] font-display text-[2.6cqw] italic leading-snug @lg:block">{TAGLINE}</p>
              <a
                href="#produk"
                className="mt-[3cqw] hidden h-11 items-center rounded-md bg-ink px-6 text-sm font-semibold text-white hover:bg-black @lg:inline-flex"
              >
                Lihat semua camilan
              </a>
            </div>
          </div>

          {/* Too little room inside the circle on narrow screens: tagline and button sit under the ring */}
          <div className="mt-6 flex flex-col items-center gap-4 text-center @lg:hidden">
            <p className="font-display text-lg italic">{TAGLINE}</p>
            <a href="#produk" className="inline-flex h-11 items-center rounded-md bg-ink px-6 text-sm font-semibold text-white hover:bg-black">
              Lihat semua camilan
            </a>
          </div>
        </div>
      </section>

      {showShelf && (
        // Keyed so a link to another tab or search (same page, new params) starts the shelf fresh
        <LandingCatalog key={`${params.category}|${params.sort}|${params.q}`} categories={categories ?? []} initial={products} params={params} />
      )}
    </>
  );
}
