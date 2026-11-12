"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { clearCart, useCart, useHydrated } from "@/lib/cart";
import { rupiah, weight } from "@/lib/format";
import type { Destination, ShippingOption } from "@/lib/types";
import Price from "@/components/Price";
import DestinationPicker from "@/components/DestinationPicker";

type Options = { free_over: number | null; hold_minutes: number; shipping_ready: boolean };
type Quote = { subtotal: number; weight_grams: number; options: ShippingOption[] };
type Load<T> = { state: "idle" | "loading" } | { state: "failed"; message?: string } | { state: "ready"; data: T };

const input = "mt-1 h-11 w-full rounded-md border border-line bg-white px-3 text-sm placeholder:text-muted aria-[invalid=true]:border-danger";

/** First message per field from the API's 422, keyed without the "customer." prefix */
function fieldErrors(errors: Record<string, string[]> | undefined) {
  return Object.fromEntries(Object.entries(errors ?? {}).map(([key, messages]) => [key.replace(/^customer\./, ""), messages[0]]));
}

/** Clears one field's error once the shopper fixes it */
const dropError = (key: string) => (errors: Record<string, string>) => {
  const next = { ...errors };
  delete next[key];
  return next;
};

const keyOf = (o: Pick<ShippingOption, "courier" | "service">) => `${o.courier}|${o.service}`;

export default function CheckoutPage() {
  const router = useRouter();
  const hydrated = useHydrated();
  const { lines, count } = useCart();
  const [options, setOptions] = useState<Load<Options>>({ state: "loading" });
  const [destination, setDestination] = useState<Destination | null>(null);
  const [quote, setQuote] = useState<Load<Quote>>({ state: "idle" });
  const [choice, setChoice] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const items = lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity }));
  const itemsKey = JSON.stringify(items);

  const loadOptions = () => {
    setOptions({ state: "loading" });
    fetch("/api/shipping/options")
      .then((res) => (res.ok ? res.json() : Promise.reject(res.status)))
      .then((data: Options) => setOptions({ state: "ready", data }))
      .catch(() => setOptions({ state: "failed" }));
  };
  useEffect(loadOptions, []);

  // Courier prices depend on the destination and the parcel weight, so ask again when either changes
  const destinationId = destination?.id ?? null;
  useEffect(() => {
    if (!destinationId || itemsKey === "[]") {
      setQuote({ state: "idle" });
      return;
    }
    let cancelled = false;
    setQuote({ state: "loading" });
    fetch("/api/shipping/quote", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ destination_id: destinationId, items: JSON.parse(itemsKey) }),
    })
      .then(async (res) => (res.ok ? res.json() : Promise.reject(await res.json().catch(() => ({})))))
      .then((data: Quote) => {
        if (cancelled) return;
        setQuote({ state: "ready", data });
        // Keep the shopper's pick if it's still offered, otherwise start on the cheapest
        setChoice((current) => (data.options.some((o) => keyOf(o) === current) ? current : data.options[0] ? keyOf(data.options[0]) : null));
      })
      .catch((body) => {
        if (cancelled) return;
        setQuote({ state: "failed", message: body?.message });
        if (body?.errors?.items) setFormError(body.errors.items[0]);
      });
    return () => {
      cancelled = true;
    };
  }, [destinationId, itemsKey, attempt]);

  const selected = quote.state === "ready" ? quote.data.options.find((o) => keyOf(o) === choice) ?? null : null;
  const subtotal = quote.state === "ready" ? quote.data.subtotal : lines.reduce((s, l) => s + l.price * l.quantity, 0);

  const submit = async (form: HTMLFormElement) => {
    setErrors({});
    setFormError(null);
    if (!destination) {
      setErrors({ destination_id: "Pilih kecamatan tujuan dari daftar." });
      setFormError("Ada isian yang perlu diperbaiki.");
      return;
    }
    if (!selected) {
      setErrors({ shipping: "Pilih kurir pengiriman." });
      setFormError("Ada isian yang perlu diperbaiki.");
      return;
    }
    setBusy(true);
    const customer = Object.fromEntries([...new FormData(form)].filter(([name]) => name !== "shipping_option")) as Record<string, string>;
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ customer, items, shipping: { courier: selected.courier, service: selected.service } }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const byField = fieldErrors(data.errors);
        setErrors(byField);
        setFormError(byField.items ?? byField.shipping ?? (data.errors ? "Ada isian yang perlu diperbaiki." : data.message ?? "Pesanan belum bisa dibuat. Coba lagi."));
        // The courier dropped this service: get fresh prices so the shopper can pick again
        if (byField.shipping) setAttempt((n) => n + 1);
        setBusy(false);
        return;
      }
      // The order exists and its packs are reserved; its receipt (with the bank accounts) takes over
      clearCart();
      router.push(`/pesanan/${data.code}`);
    } catch {
      setFormError("Koneksi terputus. Periksa internet lalu coba lagi.");
      setBusy(false);
    }
  };

  if (!hydrated) {
    return <Shell><p className="text-sm text-muted" role="status">Membuka checkout…</p></Shell>;
  }
  if (lines.length === 0 && !busy) {
    return (
      <Shell>
        <div className="rounded-md border border-line px-6 py-16 text-center">
          <p className="font-semibold">Keranjangmu kosong</p>
          <p className="mt-2 text-sm text-muted">Masukkan camilan ke keranjang dulu sebelum checkout.</p>
          <Link href="/#produk" prefetch={false} className="mt-6 inline-flex h-11 items-center rounded-lg bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong">
            Lihat semua camilan
          </Link>
        </div>
      </Shell>
    );
  }

  const field = (name: string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}, optional = false) => (
    <label className="block text-sm font-medium">
      {label}
      {optional && <span className="font-normal text-muted"> (opsional)</span>}
      <input name={name} required={!optional} aria-invalid={!!errors[name]} aria-describedby={errors[name] ? `${name}-error` : undefined} className={input} {...props} />
      {errors[name] && (
        <span id={`${name}-error`} className="mt-1 block text-xs text-danger">
          {errors[name]}
        </span>
      )}
    </label>
  );

  const notReady = options.state === "ready" && !options.data.shipping_ready;
  const shippingError = errors.shipping ?? errors["shipping.courier"] ?? errors["shipping.service"];

  return (
    <Shell>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
        <form
          id="checkout"
          onSubmit={(e) => {
            e.preventDefault();
            submit(e.currentTarget);
          }}
          className="space-y-8"
        >
          <fieldset className="space-y-4">
            <legend className="mb-3 font-extrabold">Kontak</legend>
            {field("name", "Nama lengkap", { autoComplete: "name", maxLength: 100 })}
            <div className="grid gap-4 sm:grid-cols-2">
              {field("email", "Email", { type: "email", autoComplete: "email", maxLength: 150 })}
              {field("phone", "Nomor WhatsApp", { type: "tel", autoComplete: "tel", inputMode: "tel", placeholder: "08…", pattern: "\\+?[0-9\\s\\-]{8,20}", maxLength: 30 })}
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="mb-3 font-extrabold">Alamat pengiriman</legend>
            <div className="text-sm font-medium">
              <span>Kecamatan / kelurahan</span>
              {notReady ? (
                <p className="mt-1 rounded-md border border-line bg-white px-3 py-3 text-sm font-normal text-danger">
                  Ongkir belum bisa dihitung: toko belum menyambungkan RajaOngkir. Hubungi toko untuk memesan.
                </p>
              ) : (
                <DestinationPicker
                  value={destination}
                  onChange={(d) => {
                    setDestination(d);
                    setErrors(dropError("destination_id"));
                  }}
                  error={errors.destination_id ?? errors.province}
                  disabled={options.state !== "ready"}
                />
              )}
            </div>
            {/* The picked place fills the address; the server prices shipping by its id */}
            {destination && (
              <>
                <input type="hidden" name="destination_id" value={destination.id} />
                <input type="hidden" name="province" value={destination.province} />
                <input type="hidden" name="city" value={destination.city} />
                <input type="hidden" name="district" value={destination.district} />
                <input type="hidden" name="subdistrict" value={destination.subdistrict} />
              </>
            )}
            {/* Keyed by the place, so picking another one refills the postal code */}
            <div key={destination?.id ?? "none"} className="grid gap-4 sm:grid-cols-[1fr_2fr]">
              {field("postal_code", "Kode pos", {
                defaultValue: destination?.postal_code ?? "",
                autoComplete: "postal-code",
                inputMode: "numeric",
                pattern: "[0-9]{5}",
                maxLength: 5,
              })}
            </div>
            {field("address", "Alamat lengkap", { autoComplete: "street-address", placeholder: "Nama jalan, nomor rumah, RT/RW", maxLength: 500 })}
            {field("note", "Catatan untuk kurir", { placeholder: "Contoh: pagar hijau sebelah warung", maxLength: 200 }, true)}
          </fieldset>

          <fieldset aria-describedby={shippingError ? "kurir-error" : undefined}>
            <legend className="mb-3 font-extrabold">Kurir</legend>
            {!destination ? (
              <p className="text-sm text-muted">Pilih kecamatan dulu, lalu tarif setiap kurir muncul di sini.</p>
            ) : quote.state === "loading" ? (
              <p className="text-sm text-muted" role="status">
                Mencari tarif kurir…
              </p>
            ) : quote.state === "failed" ? (
              <p className="text-sm text-danger" role="alert">
                {quote.message ?? "Tarif kurir belum bisa dimuat."}{" "}
                <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold underline underline-offset-2">
                  Coba lagi
                </button>
              </p>
            ) : quote.state === "ready" && quote.data.options.length === 0 ? (
              <p className="text-sm text-danger">Belum ada kurir yang melayani alamat ini. Coba kecamatan terdekat atau hubungi toko.</p>
            ) : quote.state === "ready" ? (
              <div className="divide-y divide-line rounded-md border border-line bg-white">
                {quote.data.options.map((o) => {
                  const key = keyOf(o);
                  return (
                    <label key={key} className="flex min-h-14 cursor-pointer items-center gap-3 px-4 py-3 text-sm has-[:checked]:bg-paper">
                      <input
                        type="radio"
                        name="shipping_option"
                        value={key}
                        checked={choice === key}
                        onChange={() => {
                          setChoice(key);
                          setErrors(dropError("shipping"));
                        }}
                        className="h-4 w-4 shrink-0 accent-ink"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="font-semibold">
                          {o.courier_name} {o.service}
                        </span>
                        <span className="block text-xs text-muted">
                          {[o.description !== o.service ? o.description : "", o.etd && `Estimasi ${o.etd}`].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {o.cost === 0 ? <span className="font-bold text-accent">Gratis</span> : <Price value={o.cost} className="shrink-0" />}
                    </label>
                  );
                })}
              </div>
            ) : null}
            {shippingError && (
              <p id="kurir-error" className="mt-2 text-xs text-danger">
                {shippingError}
              </p>
            )}
          </fieldset>
        </form>

        <aside className="h-fit rounded-md border border-line p-5">
          <h2 className="font-extrabold">Pesananmu</h2>
          <ul className="mt-4 divide-y divide-line text-sm">
            {lines.map((l) => (
              <li key={l.variantId} className="flex justify-between gap-3 py-2">
                <span className="min-w-0">
                  {l.productName} <span className="text-muted">· {l.variantName} × {l.quantity}</span>
                </span>
                <Price value={l.price * l.quantity} className="shrink-0" />
              </li>
            ))}
          </ul>

          <dl className="mt-3 space-y-2 border-t border-line pt-3 text-sm">
            <div className="flex justify-between gap-4">
              <dt>Subtotal ({count} pak)</dt>
              <dd>
                <Price value={subtotal} />
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>
                Ongkir
                {selected && (
                  <span className="block text-xs text-muted">
                    {selected.courier_name} {selected.service}
                    {quote.state === "ready" && ` · ${weight(quote.data.weight_grams)}`}
                  </span>
                )}
              </dt>
              <dd className="text-right">
                {selected ? (
                  selected.cost === 0 ? <span className="font-bold text-accent">Gratis</span> : <Price value={selected.cost} />
                ) : quote.state === "loading" ? (
                  <span className="text-muted">Menghitung…</span>
                ) : (
                  <span className="text-muted">{destination ? "Pilih kurir" : "Pilih alamat"}</span>
                )}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-line pt-2 text-base">
              <dt className="font-extrabold">Total</dt>
              <dd>{selected ? <Price value={subtotal + selected.cost} className="text-lg" /> : <span className="text-sm text-muted">Setelah ongkir</span>}</dd>
            </div>
          </dl>

          <button
            type="submit"
            form="checkout"
            disabled={busy || notReady}
            className="mt-5 h-12 w-full rounded-lg bg-accent text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60"
          >
            {busy ? "Membuat pesanan…" : selected ? `Pesan · ${rupiah(subtotal + selected.cost)}` : "Pesan sekarang"}
          </button>
          {formError && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {formError}{" "}
              {errors.items && (
                <Link href="/keranjang" className="font-semibold underline underline-offset-2">
                  Ubah keranjang
                </Link>
              )}
            </p>
          )}
          {options.state === "ready" && (
            <p className="mt-3 text-xs text-muted">
              Bayar lewat transfer bank, tanpa biaya admin. Setelah memesan, struk menunjukkan nomor rekening dan total transfer dengan kode unik
              (tambahan Rp1–999 supaya transfermu langsung ketemu pesananmu). Linknya juga kami kirim ke emailmu, dan stok pesananmu kami tahan {options.data.hold_minutes} menit.
            </p>
          )}
          {options.state === "failed" && (
            <p className="mt-3 text-xs text-danger">
              Pengaturan checkout gagal dimuat.{" "}
              <button type="button" onClick={loadOptions} className="font-semibold underline underline-offset-2">
                Coba lagi
              </button>
            </p>
          )}
        </aside>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="container-page pb-24 pt-10">
      <h1 className="section-title mb-8 text-2xl sm:text-3xl">Checkout</h1>
      {children}
    </div>
  );
}
