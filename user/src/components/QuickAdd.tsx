"use client";

import { useState } from "react";
import type { Product } from "@/lib/types";
import { addToCart, limitFor, setQuantity, useCart } from "@/lib/cart";
import { rupiah } from "@/lib/format";
import Price from "./Price";
import QuantityStepper from "./QuantityStepper";
import { PlusIcon } from "./Icons";

/** Low enough that "Sisa 3" is worth showing on the card */
const FEW_LEFT = 5;

/**
 * Bottom of a catalog card: variant choice (when there are several), then "Tambah +" on the
 * left and the price on the right. Once in the cart the button becomes a − / + stepper.
 * The button fills green while the card is hovered, so the add target is obvious.
 */
export default function QuickAdd({ product }: { product: Product }) {
  const { quantityOf } = useCart();
  const firstInStock = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [variantId, setVariantId] = useState(firstInStock?.id);
  const variant = product.variants.find((v) => v.id === variantId) ?? firstInStock;
  if (!variant) return null;

  const inCart = quantityOf(variant.id);
  const label = `${product.name} ${variant.name}`;
  const onSale = variant.compare_at_price !== null && variant.compare_at_price > variant.price;
  const add = () =>
    addToCart({
      variantId: variant.id,
      productSlug: product.slug,
      productName: product.name,
      variantName: variant.name,
      price: variant.price,
      image: product.images[0] ?? null,
      stock: variant.stock,
    });

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

      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
        {variant.stock <= 0 ? (
          <button type="button" disabled className="h-11 rounded-md bg-tile px-3 text-sm font-semibold text-muted sm:h-9">
            Habis
          </button>
        ) : inCart > 0 ? (
          <QuantityStepper value={inCart} max={limitFor(variant.stock)} onChange={(n) => setQuantity(variant.id, n)} label={label} canRemove compact />
        ) : (
          <button
            type="button"
            onClick={add}
            className="inline-flex h-11 items-center gap-1.5 rounded-md border border-line px-3 text-sm font-semibold transition-colors group-hover:border-accent group-hover:bg-accent group-hover:text-white sm:h-9"
          >
            Tambah
            <PlusIcon className="h-3.5 w-3.5" />
            <span className="sr-only"> {label} ke keranjang</span>
          </button>
        )}

        <div className="ml-auto text-right leading-tight">
          {onSale && <s className="price block text-[11px] text-muted">{rupiah(variant.compare_at_price!)}</s>}
          <Price value={variant.price} className={`text-[15px] ${onSale ? "text-danger" : ""}`} />
          <span className="block text-[11px] text-muted">
            {variant.stock > 0 && variant.stock <= FEW_LEFT && <span className="font-semibold text-warn">Sisa {variant.stock}</span>}
            {variant.stock > 0 && variant.stock <= FEW_LEFT && product.variants.length === 1 && " · "}
            {product.variants.length === 1 && `/ ${variant.name}`}
          </span>
        </div>
      </div>
    </div>
  );
}
