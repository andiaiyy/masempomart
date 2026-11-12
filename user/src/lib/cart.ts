"use client";

import { useSyncExternalStore } from "react";

/**
 * The cart lives in the shopper's browser (localStorage); no account needed. Prices here
 * are for display only: the server prices every order again from the database.
 */
export type CartLine = {
  variantId: number;
  productSlug: string;
  productName: string;
  variantName: string;
  price: number;
  image: string | null;
  /** Packs in stock when last checked; caps the quantity */
  stock: number;
  quantity: number;
};

const KEY = "masempo:cart";
/** Same cap as the checkout API */
const MAX_PER_LINE = 50;
const EMPTY: CartLine[] = [];

let cache: CartLine[] | null = null;
const listeners = new Set<() => void>();

const isLine = (l: CartLine) =>
  Number.isInteger(l?.variantId) && typeof l.productName === "string" && Number.isFinite(l.price) && Number.isInteger(l.quantity) && l.quantity > 0;

function read(): CartLine[] {
  if (cache) return cache;
  try {
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    cache = Array.isArray(stored) ? stored.filter(isLine) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(lines: CartLine[]) {
  cache = lines;
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // Storage blocked (private mode): the cart still works until the tab closes
  }
  listeners.forEach((notify) => notify());
}

function subscribe(notify: () => void) {
  listeners.add(notify);
  // Another tab changed the cart
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY) {
      cache = null;
      notify();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(notify);
    window.removeEventListener("storage", onStorage);
  };
}

/** Most packs of one variant a shopper can put in the cart */
export const limitFor = (stock: number) => Math.max(0, Math.min(stock, MAX_PER_LINE));

export function useCart() {
  const lines = useSyncExternalStore(subscribe, read, () => EMPTY);
  return {
    lines,
    count: lines.reduce((n, l) => n + l.quantity, 0),
    subtotal: lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
    quantityOf: (variantId: number) => lines.find((l) => l.variantId === variantId)?.quantity ?? 0,
  };
}

/** False during server render and hydration, so pages don't flash "cart is empty" */
export function useHydrated() {
  return useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
}

export function addToCart(line: Omit<CartLine, "quantity">, quantity = 1) {
  const lines = read();
  const existing = lines.find((l) => l.variantId === line.variantId);
  const wanted = (existing?.quantity ?? 0) + quantity;
  const next = { ...line, quantity: Math.min(wanted, limitFor(line.stock)) };
  if (next.quantity <= 0) return;
  write(existing ? lines.map((l) => (l.variantId === line.variantId ? next : l)) : [...lines, next]);
}

export function setQuantity(variantId: number, quantity: number) {
  const lines = read();
  write(
    quantity <= 0
      ? lines.filter((l) => l.variantId !== variantId)
      : lines.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(quantity, limitFor(l.stock)) } : l)),
  );
}

export const removeLine = (variantId: number) => setQuantity(variantId, 0);

export const clearCart = () => write([]);

export type FreshVariant = {
  id: number;
  name: string;
  price: number;
  stock: number;
  available: boolean;
  product: { name: string; slug: string; image: string | null };
};

/**
 * Brings the cart in line with the server: new prices and stock, quantities capped to what's
 * left, and lines that can't be bought removed. Returns a sentence per change for the shopper.
 */
export function syncCart(fresh: FreshVariant[]): string[] {
  const byId = new Map(fresh.map((v) => [v.id, v]));
  const notes: string[] = [];
  const next: CartLine[] = [];

  for (const line of read()) {
    const v = byId.get(line.variantId);
    const label = `${line.productName} (${line.variantName})`;
    if (!v || !v.available) {
      notes.push(`${label} sudah tidak dijual, jadi kami hapus dari keranjang.`);
      continue;
    }
    if (v.stock <= 0) {
      notes.push(`${label} sedang habis, jadi kami hapus dari keranjang.`);
      continue;
    }
    if (v.price !== line.price) {
      notes.push(`Harga ${label} sekarang Rp${v.price.toLocaleString("id-ID")}.`);
    }
    const quantity = Math.min(line.quantity, limitFor(v.stock));
    if (quantity < line.quantity) {
      notes.push(`${label} tinggal ${v.stock} pak, jumlahnya kami sesuaikan.`);
    }
    next.push({
      ...line,
      productName: v.product.name,
      productSlug: v.product.slug,
      variantName: v.name,
      image: v.product.image,
      price: v.price,
      stock: v.stock,
      quantity,
    });
  }

  write(next);
  return notes;
}
