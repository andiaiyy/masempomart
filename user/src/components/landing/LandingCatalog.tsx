"use client";

import { useEffect, useRef, useState } from "react";
import { shelfApiQuery, shelfHref, SHELF_SORTS, type ShelfParams } from "@/lib/catalog";
import type { Category, Product, ProductPage } from "@/lib/types";
import ProductCard from "../ProductCard";
import { CrossIcon, SearchIcon, SortIcon } from "../Icons";

type Status = "ready" | "loading" | "failed" | "more" | "moreFailed";

/**
 * The shop's product shelf, on the landing page and the only place to browse: spaced title and
 * category tabs with Baru / Terlaris (after the owner's "REAL MEAL" reference), the shop's product
 * cards, and "Muat lebih banyak". Tab, order and search swap the cards in place and are written
 * into the URL (/?category=…#produk), so links into the shelf and page refreshes keep them.
 */
export default function LandingCatalog({ categories, initial, params }: { categories: Category[]; initial: ProductPage; params: ShelfParams }) {
  const [category, setCategory] = useState(params.category ?? "");
  const [sort, setSort] = useState(params.sort ?? "newest");
  const [q, setQ] = useState(params.q ?? "");
  const [searching, setSearching] = useState(false);
  const [items, setItems] = useState<Product[]>(initial.data);
  const [meta, setMeta] = useState(initial.meta);
  const [status, setStatus] = useState<Status>("ready");
  const [attempt, setAttempt] = useState(0);
  const firstRender = useRef(true);
  const section = useRef<HTMLElement>(null);
  const tabRow = useRef<HTMLDivElement>(null);

  // On a phone's swipeable tab line, keep the chosen tab in view (e.g. a link that opens on "Minuman")
  useEffect(() => {
    const row = tabRow.current;
    const chosen = row?.querySelector<HTMLElement>("button[aria-pressed=true]");
    if (!row || !chosen || row.scrollWidth <= row.clientWidth) return;
    if (chosen.offsetLeft < row.scrollLeft || chosen.offsetLeft + chosen.offsetWidth > row.scrollLeft + row.clientWidth) {
      row.scrollLeft = chosen.offsetLeft - 16;
    }
  }, [category]);

  // Links like /?category=…#produk from other pages: Next.js shows the loading screen first and
  // loses the jump to #produk, so the shelf brings itself into view once it is on the page.
  useEffect(() => {
    if (window.location.hash === "#produk") section.current?.scrollIntoView();
  }, []);

  const view: ShelfParams = { category: category || undefined, sort, q: q || undefined };

  useEffect(() => {
    // The server already rendered the first view
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    const current = { category: category || undefined, sort, q: q || undefined };
    window.history.replaceState(null, "", shelfHref(current));
    let cancelled = false;
    setStatus("loading");
    fetch(`/api/products?${shelfApiQuery(current)}`, { headers: { Accept: "application/json" } })
      .then((res) => (res.ok ? (res.json() as Promise<ProductPage>) : Promise.reject(res.status)))
      .then((page) => {
        if (cancelled) return;
        setItems(page.data);
        setMeta(page.meta);
        setStatus("ready");
      })
      .catch(() => !cancelled && setStatus("failed"));
    return () => {
      cancelled = true;
    };
  }, [category, sort, q, attempt]);

  const loadMore = async () => {
    setStatus("more");
    try {
      const res = await fetch(`/api/products?${shelfApiQuery(view, meta.current_page + 1)}`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(String(res.status));
      const page = (await res.json()) as ProductPage;
      setItems((shown) => [...shown, ...page.data.filter((p) => !shown.some((s) => s.id === p.id))]);
      setMeta(page.meta);
      setStatus("ready");
    } catch {
      setStatus("moreFailed");
    }
  };

  const tabs = [
    { slug: "", name: "Semua", count: categories.reduce((n, c) => n + c.product_count, 0) },
    ...categories.map((c) => ({ slug: c.slug, name: c.name, count: c.product_count })),
  ];
  const current = categories.find((c) => c.slug === category);

  return (
    <section ref={section} id="produk" aria-labelledby="olahan" className="container-page scroll-mt-6 pb-24 pt-6">
      <h2 id="olahan" className="section-title text-3xl sm:text-4xl">
        Olahan Bone
      </h2>

      {/* Filter row after the owner's IKKARI reference: uppercase tabs with a small product count,
          the chosen one underlined, a sort icon at the end, one light line under the whole row. */}
      <div className="mt-8 flex items-start gap-4 border-b border-line pb-3">
        {/* Phones: one swipeable line (scrollbar hidden; the cut-off last tab shows there are more).
            From the sm breakpoint the tabs wrap instead, so a mouse never has to scroll sideways. */}
        <div
          ref={tabRow}
          role="group"
          aria-label="Kategori"
          className="relative flex min-w-0 flex-1 gap-x-5 overflow-x-auto [scrollbar-width:none] sm:flex-wrap sm:overflow-visible [&::-webkit-scrollbar]:hidden"
        >
          {tabs.map((tab) => {
            const active = tab.slug === category;
            return (
              <button
                key={tab.slug || "semua"}
                type="button"
                aria-pressed={active}
                onClick={() => setCategory(tab.slug)}
                // relative: anchors the sr-only count inside the scrolling row, or it would widen the page on phones
                className={`relative flex h-11 shrink-0 items-center text-[13px] uppercase ${active ? "font-semibold text-ink" : "text-muted hover:text-ink"}`}
              >
                <span className={active ? "underline decoration-1 underline-offset-[5px]" : ""}>{tab.name}</span>
                {/* inline-block keeps the underline off the count */}
                <sup aria-hidden className="price ml-0.5 inline-block -translate-y-1 text-[9px] font-normal text-muted">
                  {tab.count}
                </sup>
                <span className="sr-only">, {tab.count} produk</span>
              </button>
            );
          })}
        </div>
        <div className="flex shrink-0">
          <button
            type="button"
            aria-expanded={searching}
            aria-controls="cari"
            aria-label="Cari produk"
            title="Cari produk"
            onClick={() => setSearching((s) => !s)}
            className={`flex h-11 w-11 items-center justify-center rounded-md hover:bg-white ${searching ? "bg-white" : ""}`}
          >
            <SearchIcon className="h-[18px] w-[18px]" />
          </button>
          <SortMenu value={sort} onChange={setSort} />
        </div>
      </div>

      {/* The shop's only search box, now that there is no header: opens under the filter row */}
      {searching && (
        <form
          id="cari"
          role="search"
          onSubmit={(e) => {
            e.preventDefault();
            setQ(String(new FormData(e.currentTarget).get("q") ?? "").trim());
            setSearching(false);
          }}
          className="mt-4 flex max-w-md gap-2"
        >
          <label htmlFor="q" className="sr-only">
            Cari camilan
          </label>
          <input
            id="q"
            name="q"
            type="search"
            defaultValue={q}
            autoFocus
            onKeyDown={(e) => e.key === "Escape" && setSearching(false)}
            placeholder="Cari keripik, kue, kacang…"
            className="h-11 min-w-0 flex-1 rounded-md border border-line bg-white px-3 text-sm placeholder:text-muted"
          />
          <button type="submit" className="h-11 shrink-0 rounded-md bg-ink px-5 text-sm font-semibold text-white hover:bg-accent">
            Cari
          </button>
        </form>
      )}

      {q && (
        <p className="mt-8 flex flex-wrap items-center gap-x-3 text-sm">
          <span>
            Hasil pencarian <span className="font-semibold">“{q}”</span>
            {status !== "loading" && <span className="price text-muted"> · {meta.total} produk</span>}
          </span>
          <button type="button" onClick={() => setQ("")} className="inline-flex h-11 items-center gap-1.5 font-semibold underline-offset-2 hover:underline">
            <CrossIcon className="h-3.5 w-3.5" />
            Hapus pencarian
          </button>
        </p>
      )}

      <p role="status" className="sr-only">
        {status === "loading" ? "Memuat produk…" : status === "ready" ? `${meta.total} produk${current ? ` di ${current.name}` : ""}` : ""}
      </p>

      {status === "failed" ? (
        <div className="py-16 text-center">
          <p className="font-semibold">Produk belum bisa dimuat.</p>
          <button type="button" onClick={() => setAttempt((n) => n + 1)} className="mt-4 h-11 rounded-md border border-line bg-white px-5 text-sm font-semibold hover:border-ink">
            Coba lagi
          </button>
        </div>
      ) : items.length === 0 && status !== "loading" ? (
        <p className="py-16 text-center font-semibold">
          {q ? `Tidak ada produk yang cocok dengan “${q}”${current ? ` di ${current.name}` : ""}.` : "Belum ada produk di kategori ini."}
        </p>
      ) : (
        <ul className={`mt-6 grid grid-cols-2 gap-x-3 gap-y-6 transition-opacity sm:grid-cols-3 sm:gap-x-4 lg:grid-cols-4 ${status === "loading" ? "opacity-40" : ""}`}>
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </ul>
      )}

      {meta.current_page < meta.last_page && (status === "ready" || status === "more" || status === "moreFailed") && (
        <div className="mt-14 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={loadMore}
            disabled={status === "more"}
            className="h-11 rounded-md border border-ink px-8 text-sm font-semibold hover:bg-ink hover:text-white disabled:opacity-60"
          >
            {status === "more" ? "Memuat…" : "Muat lebih banyak"}
          </button>
          {status === "moreFailed" && (
            <p role="alert" className="text-sm text-danger">
              Produk berikutnya belum bisa dimuat. Coba lagi.
            </p>
          )}
          <p className="price text-xs text-muted">
            {items.length} dari {meta.total} produk
          </p>
        </div>
      )}
    </section>
  );
}

/** The ⇅ button at the end of the filter row; opens Baru / Terlaris. Escape or a click outside closes it. */
function SortMenu({ value, onChange }: { value: string; onChange: (sort: string) => void }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const current = SHELF_SORTS.find((s) => s.value === value) ?? SHELF_SORTS[0];

  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("mousedown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  return (
    <div ref={box} className="relative shrink-0">
      <button
        ref={trigger}
        type="button"
        aria-expanded={open}
        aria-controls="urutkan"
        aria-label={`Urutkan: ${current.label}`}
        title={`Urutkan: ${current.label}`}
        onClick={() => setOpen((o) => !o)}
        className="flex h-11 w-11 items-center justify-center rounded-md hover:bg-white"
      >
        <SortIcon />
      </button>
      {open && (
        <div id="urutkan" role="group" aria-label="Urutkan" className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md border border-line bg-white py-1">
          {SHELF_SORTS.map((s) => {
            const active = s.value === value;
            return (
              <button
                key={s.value}
                type="button"
                aria-pressed={active}
                onClick={() => {
                  onChange(s.value);
                  setOpen(false);
                  trigger.current?.focus();
                }}
                className={`flex h-11 w-full items-center gap-2 px-4 text-left text-[13px] uppercase hover:bg-paper ${active ? "font-semibold text-ink" : "text-muted"}`}
              >
                <span className={active ? "underline decoration-1 underline-offset-[5px]" : ""}>{s.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
