"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ProductDetail } from "@/lib/types";
import { addToCart, limitFor, useCart } from "@/lib/cart";
import { rupiah, weight } from "@/lib/format";
import { shelfHref } from "@/lib/catalog";
import Price from "./Price";
import ShareRow from "./ShareRow";
import { MinusIcon, PlusIcon } from "./Icons";

type Tab = "deskripsi" | "detail";

/**
 * Right-hand side of the product page, arranged after the owner's reference (2026-11-11):
 * name, category + stock line, Deskripsi / Detail tabs, variants as a radio list, quantity with
 * one wide add button showing the total, and a shipping note.
 * Look stays the shop's own (DESIGN.md).
 */
export default function Purchase({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const { quantityOf } = useCart();
  const firstInStock = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstInStock.id);
  const [quantity, setQuantity] = useState(1);
  const variant = product.variants.find((v) => v.id === variantId) ?? firstInStock;

  const inCart = quantityOf(variant.id);
  // Packs still addable on top of what's already in the cart
  const room = limitFor(variant.stock) - inCart;
  const qty = Math.max(1, Math.min(quantity, room));

  const stock =
    variant.stock <= 0
      ? { text: "Habis", tone: "text-danger" }
      : variant.stock <= 5
        ? { text: `Sisa ${variant.stock}`, tone: "text-warn" }
        : { text: "Tersedia", tone: "text-accent" };

  const details: { label: string; value: React.ReactNode }[] = [
    {
      label: "Kategori",
      value: (
        <Link href={shelfHref({ category: product.category.slug })} prefetch={false} className="underline underline-offset-4 hover:text-accent">
          {product.category.name}
        </Link>
      ),
    },
    { label: "Berat kirim", value: `${weight(variant.weight_grams)} per pak` },
    ...product.specs,
  ];
  const [tab, setTab] = useState<Tab>(product.description ? "deskripsi" : "detail");
  const tabs: { id: Tab; label: string }[] = [
    ...(product.description ? [{ id: "deskripsi" as Tab, label: "Deskripsi" }] : []),
    { id: "detail", label: "Detail" },
  ];

  const add = () =>
    addToCart(
      {
        variantId: variant.id,
        productSlug: product.slug,
        productName: product.name,
        variantName: variant.name,
        price: variant.price,
        image: product.images[0] ?? null,
        stock: variant.stock,
      },
      qty,
    );

  return (
    <div>
      <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">{product.name}</h1>
      <p className="mt-2 flex flex-wrap items-center gap-x-2 text-[15px] text-muted">
        <span>{product.category.name}</span>
        <span aria-hidden>·</span>
        <span className={`font-semibold ${stock.tone}`}>{stock.text}</span>
      </p>

      {/* Deskripsi / Detail, styled like the shelf's filter row */}
      <div role="tablist" aria-label="Informasi produk" className="mt-6 flex gap-6 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            id={`tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => setTab(t.id)}
            onKeyDown={(e) => {
              if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
              const next = tabs[(tabs.findIndex((x) => x.id === t.id) + (e.key === "ArrowRight" ? 1 : tabs.length - 1)) % tabs.length];
              setTab(next.id);
              document.getElementById(`tab-${next.id}`)?.focus();
            }}
            className={`-mb-px flex h-11 items-center border-b text-[13px] uppercase ${tab === t.id ? "border-ink font-semibold text-ink" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div id={`panel-${tab}`} role="tabpanel" aria-labelledby={`tab-${tab}`} className="pt-4">
        {tab === "deskripsi" ? (
          <p className="whitespace-pre-line text-[15px] leading-7">{product.description}</p>
        ) : (
          <dl className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-6 gap-y-2 text-[15px]">
            {details.map((d) => (
              <div key={d.label} className="contents">
                <dt className="text-muted">{d.label}</dt>
                <dd>{d.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      {/* Variants as a radio list, like the reference's purchase options */}
      <fieldset className="mt-7">
        <legend className="sr-only">Pilih varian</legend>
        <div className="space-y-1">
          {product.variants.map((v) => {
            const onSale = v.compare_at_price !== null && v.compare_at_price > v.price;
            return (
              <label key={v.id} className={`flex min-h-11 cursor-pointer items-center gap-3 text-[15px] ${v.stock <= 0 ? "text-muted" : ""}`}>
                <input
                  type="radio"
                  name="variant"
                  value={v.id}
                  checked={v.id === variant.id}
                  onChange={() => {
                    setVariantId(v.id);
                    setQuantity(1);
                  }}
                  className="h-4 w-4 shrink-0 accent-ink"
                />
                <span className={`${v.id === variant.id ? "font-semibold" : ""} ${v.stock <= 0 ? "line-through" : ""}`}>{v.name}</span>
                <span className="ml-auto flex items-baseline gap-2">
                  {onSale && <s className="price text-xs text-muted">{rupiah(v.compare_at_price!)}</s>}
                  {v.stock <= 0 ? <span className="text-sm font-semibold text-danger">Habis</span> : <Price value={v.price} className={onSale ? "text-danger" : ""} />}
                </span>
              </label>
            );
          })}
        </div>
      </fieldset>

      {variant.stock <= 0 ? (
        <p className="mt-5 rounded-md border border-line bg-white px-4 py-3 text-sm text-danger">Varian ini sedang habis. Pilih varian lain atau cek lagi nanti.</p>
      ) : room <= 0 ? (
        <p className="mt-5 rounded-md border border-line bg-white px-4 py-3 text-sm">
          Semua stok varian ini ({variant.stock} pak) sudah ada di keranjangmu.{" "}
          <Link href="/keranjang" className="font-semibold text-accent underline underline-offset-2">
            Lihat keranjang
          </Link>
        </p>
      ) : (
        <>
          <div className="mt-5 flex gap-3">
            <div className="flex h-12 shrink-0 items-center rounded-md border border-ink bg-white">
              <button
                type="button"
                onClick={() => setQuantity(qty - 1)}
                disabled={qty <= 1}
                aria-label="Kurangi jumlah"
                className="flex h-full w-11 items-center justify-center disabled:text-muted"
              >
                <MinusIcon className="h-3.5 w-3.5" />
              </button>
              <span className="price w-6 text-center font-semibold" aria-live="polite">
                <span className="sr-only">Jumlah: </span>
                {qty}
              </span>
              <button
                type="button"
                onClick={() => setQuantity(qty + 1)}
                disabled={qty >= room}
                aria-label={qty >= room ? `Stok tinggal ${room} lagi` : "Tambah jumlah"}
                title={qty >= room ? `Stok tinggal ${room} lagi` : undefined}
                className="flex h-full w-11 items-center justify-center disabled:text-muted"
              >
                <PlusIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <button type="button" onClick={add} className="h-12 min-w-0 flex-1 rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-strong">
              Tambah ke keranjang · <span className="price">{rupiah(variant.price * qty)}</span>
            </button>
          </div>
          <p className="mt-2 text-center text-xs text-muted">Ongkir dihitung di checkout, dari berat paket dan kecamatan tujuan.</p>
          <p className="mt-1 text-center">
            <button
              type="button"
              onClick={() => {
                // Already added with the button above: just go pay, don't add the same packs twice
                if (inCart === 0) add();
                router.push("/checkout");
              }}
              className="inline-flex h-11 items-center text-sm font-semibold underline underline-offset-4 hover:text-accent"
            >
              atau beli sekarang
            </button>
          </p>
        </>
      )}

      {inCart > 0 && (
        <p className="mt-2 text-sm" role="status">
          {inCart} pak {variant.name} ada di keranjang.{" "}
          <Link href="/keranjang" className="font-semibold text-accent underline underline-offset-2">
            Lihat keranjang
          </Link>
        </p>
      )}

      <ShareRow name={product.name} />
    </div>
  );
}
