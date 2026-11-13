"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { addToCart, limitFor, useCart } from "@/lib/cart";
import { rupiah } from "@/lib/format";
import Price from "./Price";
import { BagPlusIcon, CheckIcon } from "./Icons";

/** Low enough that "Sisa 3" is worth showing on the card */
const FEW_LEFT = 5;

/**
 * Bottom of a catalog card (owner, 2026-11-13): variant choice when there are several, then the
 * price on the left and two buttons on the right: a bag (add one to the cart; a green count shows
 * how many are in it) and "Beli" (straight to checkout). "Beli" fills green while the card is
 * hovered, so the shelf isn't a wall of green buttons.
 */
export default function QuickAdd({ product }: { product: Product }) {
  const router = useRouter();
  const { quantityOf } = useCart();
  const firstInStock = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstInStock?.id);
  const [justAdded, setJustAdded] = useState(false);
  const variant = product.variants.find((v) => v.id === variantId) ?? firstInStock;
  if (!variant) return null;

  const inCart = quantityOf(variant.id);
  const room = limitFor(variant.stock) - inCart;
  const label = `${product.name} ${variant.name}`;
  const onSale = variant.compare_at_price !== null && variant.compare_at_price > variant.price;
  const addOne = () =>
    addToCart({
      variantId: variant.id,
      productSlug: product.slug,
      productName: product.name,
      variantName: variant.name,
      price: variant.price,
      image: product.images[0] ?? null,
      stock: variant.stock,
    });
  const add = () => {
    addOne();
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 1200);
  };
  // Already in the cart: just go pay, don't add the same pack again
  const buy = () => {
    if (inCart === 0) addOne();
    router.push("/checkout");
  };

  return (
    <div className="mt-auto pt-2">
      {product.variants.length > 1 && (
        <select
          value={variant.id}
          onChange={(e) => setVariantId(Number(e.target.value))}
          aria-label={`Pilih varian ${product.name}`}
          className="h-11 w-full rounded-md border border-line bg-white px-2 text-xs sm:h-9"
        >
          {product.variants.map((v) => (
            <option key={v.id} value={v.id}>
              {v.name}
              {v.stock <= 0 ? " (habis)" : ""}
            </option>
          ))}
        </select>
      )}

      {/* Narrow cards (two across on phones): the buttons drop under the price */}
      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        <div className="leading-tight">
          {onSale && <s className="price block text-[11px] text-muted">{rupiah(variant.compare_at_price!)}</s>}
          <Price value={variant.price} className={`text-base ${onSale ? "text-danger" : ""}`} />
          <span className="block text-[11px] text-muted">
            {variant.stock > 0 && variant.stock <= FEW_LEFT && <span className="font-semibold text-warn">Sisa {variant.stock}</span>}
            {variant.stock > 0 && variant.stock <= FEW_LEFT && product.variants.length === 1 && " · "}
            {product.variants.length === 1 && `/ ${variant.name}`}
          </span>
        </div>

        {variant.stock <= 0 ? (
          <span className="ml-auto inline-flex h-11 items-center rounded-md bg-tile px-3 text-sm font-semibold text-muted sm:h-10">Habis</span>
        ) : (
          <div className="ml-auto flex gap-1.5">
            <button
              type="button"
              onClick={add}
              disabled={room <= 0}
              aria-label={inCart > 0 ? `Tambah 1 lagi ${label} ke keranjang, sudah ${inCart}` : `Tambah ${label} ke keranjang`}
              title={room <= 0 ? "Semua stok sudah di keranjang" : "Tambah ke keranjang"}
              className={`relative flex h-11 w-11 items-center justify-center rounded-md border border-line hover:border-ink disabled:opacity-40 sm:h-10 sm:w-10 ${justAdded ? "text-accent" : ""}`}
            >
              {justAdded ? <CheckIcon className="h-5 w-5" /> : <BagPlusIcon className="h-5 w-5" />}
              {inCart > 0 && (
                <span aria-hidden className="price absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
                  {inCart}
                </span>
              )}
            </button>
            <button
              type="button"
              onClick={buy}
              className="inline-flex h-11 items-center rounded-md border border-line px-3.5 text-sm font-semibold transition-colors group-hover:border-accent group-hover:bg-accent group-hover:text-white sm:h-10"
            >
              Beli<span className="sr-only"> {label} sekarang</span>
            </button>
          </div>
        )}
      </div>
      <span role="status" className="sr-only">
        {justAdded ? `${label} masuk keranjang.` : ""}
      </span>
    </div>
  );
}
