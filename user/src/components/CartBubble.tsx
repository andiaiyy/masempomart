"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCart } from "@/lib/cart";
import { BagIcon } from "./Icons";

/**
 * The shop has no header or footer (owner's request, 2026-11-11): the cart is this round button
 * in the lower right corner of every page, with the number of packs in a green badge.
 * Hidden on the cart and checkout pages, where it would only point at the page you're on, and on
 * the receipt, where it covered the receipt's text on phones and the cart has just been emptied.
 */
export default function CartBubble() {
  const { count } = useCart();
  const path = usePathname();
  if (path === "/keranjang" || path === "/checkout" || path.startsWith("/pesanan/")) return null;

  return (
    <Link
      href="/keranjang"
      aria-label={count ? `Keranjang, ${count} barang` : "Keranjang, kosong"}
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-ink text-white hover:bg-accent sm:bottom-6 sm:right-6"
    >
      <BagIcon className="h-6 w-6" />
      {count > 0 && (
        <span
          aria-hidden
          className="price absolute -right-1 -top-1 flex h-6 min-w-6 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-bold ring-2 ring-paper"
        >
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
