"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { limitFor, removeLine, setQuantity, syncCart, useCart, useHydrated, type FreshVariant } from "@/lib/cart";
import Price from "@/components/Price";
import ProductImage from "@/components/ProductImage";
import QuantityStepper from "@/components/QuantityStepper";
import { CrossIcon } from "@/components/Icons";

type Check = "checking" | "done" | "failed";

export default function CartPage() {
  const hydrated = useHydrated();
  const { lines, count, subtotal } = useCart();
  const [check, setCheck] = useState<Check>("checking");
  const [notes, setNotes] = useState<string[]>([]);
  const checked = useRef(false);

  // Prices and stock may have changed since the packs went into the cart
  useEffect(() => {
    if (!hydrated || checked.current) return;
    checked.current = true;
    if (lines.length === 0) {
      setCheck("done");
      return;
    }
    fetch(`/api/variants?ids=${lines.map((l) => l.variantId).join(",")}`, { headers: { Accept: "application/json" } })
      .then((res) => (res.ok ? (res.json() as Promise<FreshVariant[]>) : Promise.reject(res.status)))
      .then((fresh) => {
        setNotes(syncCart(fresh));
        setCheck("done");
      })
      .catch(() => setCheck("failed"));
  }, [hydrated, lines]);

  if (!hydrated) {
    return <Shell><p className="text-sm text-muted" role="status">Membuka keranjang…</p></Shell>;
  }

  if (lines.length === 0) {
    return (
      <Shell>
        {notes.length > 0 && <Notes notes={notes} />}
        <div className="rounded-md border border-line px-6 py-16 text-center">
          <p className="font-semibold">Keranjangmu masih kosong</p>
          <p className="mt-2 text-sm text-muted">Tekan “Tambah” di produk mana pun, nanti muncul di sini.</p>
          <Link href="/#produk" prefetch={false} className="mt-6 inline-flex h-11 items-center rounded-lg bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong">
            Lihat semua camilan
          </Link>
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      {check === "checking" && (
        <p className="mb-4 text-sm text-muted" role="status">
          Memeriksa harga dan stok terbaru…
        </p>
      )}
      {check === "failed" && (
        <p className="mb-4 rounded-md bg-tile px-4 py-3 text-sm" role="alert">
          Harga dan stok terbaru belum bisa dicek. Kamu tetap bisa lanjut; totalnya dihitung ulang saat checkout.
        </p>
      )}
      {notes.length > 0 && <Notes notes={notes} />}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
        <ul className="divide-y divide-line border-y border-line">
          {lines.map((line) => {
            const label = `${line.productName} ${line.variantName}`;
            return (
              <li key={line.variantId} className="flex gap-4 py-4">
                <Link href={`/produk/${line.productSlug}`} prefetch={false}className="w-20 shrink-0 sm:w-24">
                  <ProductImage src={line.image} alt={line.productName} />
                </Link>
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <Link href={`/produk/${line.productSlug}`} prefetch={false}className="text-sm font-semibold hover:underline">
                        {line.productName}
                      </Link>
                      <p className="text-sm text-muted">{line.variantName}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeLine(line.variantId)}
                      aria-label={`Hapus ${label} dari keranjang`}
                      className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted hover:bg-tile hover:text-ink"
                    >
                      <CrossIcon />
                    </button>
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-3">
                    <QuantityStepper
                      value={line.quantity}
                      max={limitFor(line.stock)}
                      onChange={(n) => setQuantity(line.variantId, n)}
                      label={label}
                      canRemove
                      className="w-36"
                    />
                    <div className="text-right">
                      <Price value={line.price * line.quantity} className="text-base" />
                      {line.quantity > 1 && (
                        <p className="price text-xs text-muted">
                          {line.quantity} × Rp{line.price.toLocaleString("id-ID")}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>

        <aside className="h-fit rounded-md border border-line p-5">
          <h2 className="font-extrabold">Ringkasan</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Subtotal ({count} pak)</dt>
              <dd>
                <Price value={subtotal} />
              </dd>
            </div>
            <div className="flex justify-between gap-4 text-muted">
              <dt>Ongkir</dt>
              <dd>Dihitung di checkout</dd>
            </div>
          </dl>
          <p className="mt-3 text-xs text-muted">Ongkir dihitung di checkout dari berat paket dan kecamatan tujuan, dengan tarif kurir dari RajaOngkir.</p>
          <Link
            href="/checkout"
            className="mt-5 flex h-12 items-center justify-center rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent-strong"
          >
            Lanjut ke checkout
          </Link>
          <Link href="/#produk" prefetch={false} className="mt-2 flex h-11 items-center justify-center rounded-lg text-sm font-semibold hover:bg-tile">
            Tambah camilan lain
          </Link>
        </aside>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page pb-24 pt-10">
      <h1 className="section-title mb-8 text-2xl sm:text-3xl">Keranjang</h1>
      {children}
    </div>
  );
}

function Notes({ notes }: { notes: string[] }) {
  return (
    <ul className="mb-4 space-y-1 rounded-md bg-tile px-4 py-3 text-sm" role="status">
      {notes.map((n) => (
        <li key={n}>{n}</li>
      ))}
    </ul>
  );
}
