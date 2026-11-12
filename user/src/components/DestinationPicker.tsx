"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Destination } from "@/lib/types";

const KEEP_UPPER = new Set(["DKI", "DI", "NTB", "NTT"]);

/** RajaOngkir labels come in capitals: "PANAKKUKANG, MAKASSAR" becomes "Panakkukang, Makassar" */
export function titleCase(text: string) {
  return text
    .split(/(\s+|,|-)/)
    .map((word) => (KEEP_UPPER.has(word) ? word : word.charAt(0) + word.slice(1).toLowerCase()))
    .join("");
}

type Search = { state: "idle" | "loading" } | { state: "failed"; message: string } | { state: "ready"; results: Destination[] };

/**
 * The address's kecamatan/kelurahan, searched in RajaOngkir's list as the shopper types (name or
 * postal code). Its id is what couriers are priced to. A combobox: arrow keys move through the
 * results, Enter picks, Escape closes. Once picked it shows as text with an "Ubah" button.
 */
export default function DestinationPicker({
  value,
  onChange,
  error,
  disabled,
}: {
  value: Destination | null;
  onChange: (destination: Destination | null) => void;
  error?: string;
  disabled?: boolean;
}) {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState<Search>({ state: "idle" });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const refocus = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const id = useId();

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setSearch({ state: "idle" });
      return;
    }
    let cancelled = false;
    setSearch({ state: "loading" });
    // Wait for a pause in typing so each keystroke doesn't cost an API call
    const timer = setTimeout(() => {
      fetch(`/api/shipping/destinations?search=${encodeURIComponent(q)}`, { headers: { Accept: "application/json" } })
        .then(async (res) => (res.ok ? res.json() : Promise.reject(await res.json().catch(() => ({})))))
        .then((body: { data: Destination[] }) => {
          if (cancelled) return;
          setSearch({ state: "ready", results: body.data });
          setActive(0);
        })
        .catch((body) => !cancelled && setSearch({ state: "failed", message: body?.message ?? "Pencarian alamat gagal. Coba lagi." }));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  // Back to searching after "Ubah": put the cursor in the box that just reappeared
  useEffect(() => {
    if (!value && refocus.current) {
      refocus.current = false;
      input.current?.focus();
    }
  }, [value]);

  const choose = (destination: Destination) => {
    onChange(destination);
    setOpen(false);
    setQuery("");
  };

  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  if (value) {
    return (
      <div className="mt-1">
        <div className="flex items-start justify-between gap-3 rounded-md border border-line bg-white px-3 py-2 text-sm">
          <span className="py-1">{titleCase(value.label)}</span>
          <button
            type="button"
            onClick={() => {
              refocus.current = true;
              onChange(null);
            }}
            className="inline-flex h-8 shrink-0 items-center font-semibold text-accent underline underline-offset-2"
          >
            Ubah
          </button>
        </div>
      </div>
    );
  }

  const results = search.state === "ready" ? search.results : [];
  const expanded = open && results.length > 0;

  return (
    <div className="relative mt-1">
      <input
        ref={input}
        id={`${id}-input`}
        type="search"
        role="combobox"
        aria-label="Kecamatan atau kelurahan tujuan"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={`${id}-list`}
        aria-activedescendant={expanded ? `${id}-option-${active}` : undefined}
        aria-invalid={!!error}
        aria-describedby={`${hintId}${error ? ` ${errorId}` : ""}`}
        autoComplete="off"
        disabled={disabled}
        value={query}
        placeholder="Ketik kecamatan, kelurahan, atau kode pos"
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" && results.length) {
            e.preventDefault();
            setOpen(true);
            setActive((i) => (i + 1) % results.length);
          } else if (e.key === "ArrowUp" && results.length) {
            e.preventDefault();
            setActive((i) => (i - 1 + results.length) % results.length);
          } else if (e.key === "Enter") {
            // Never submits the checkout form from this box
            e.preventDefault();
            if (expanded && results[active]) choose(results[active]);
          } else if (e.key === "Escape") {
            setOpen(false);
          }
        }}
        className="h-11 w-full rounded-md border border-line bg-white px-3 text-sm placeholder:text-muted disabled:bg-tile aria-[invalid=true]:border-danger"
      />

      {expanded && (
        <ul id={`${id}-list`} role="listbox" aria-label="Hasil pencarian alamat" className="absolute inset-x-0 top-12 z-20 max-h-72 overflow-y-auto rounded-md border border-line bg-white py-1 text-sm">
          {results.map((d, i) => (
            <li
              key={d.id}
              id={`${id}-option-${i}`}
              role="option"
              aria-selected={i === active}
              // mousedown, not click: picking must happen before the input's blur closes the list
              onMouseDown={(e) => {
                e.preventDefault();
                choose(d);
              }}
              onMouseEnter={() => setActive(i)}
              className={`cursor-pointer px-3 py-2 ${i === active ? "bg-paper" : ""}`}
            >
              <span className="block font-medium">{titleCase([d.subdistrict, d.district].filter(Boolean).join(", "))}</span>
              <span className="block text-xs text-muted">
                {titleCase([d.city, d.province].filter(Boolean).join(", "))}
                {d.postal_code && ` · ${d.postal_code}`}
              </span>
            </li>
          ))}
        </ul>
      )}

      <p id={hintId} className="mt-1 text-xs text-muted" aria-live="polite">
        {search.state === "loading"
          ? "Mencari…"
          : search.state === "failed"
            ? search.message
            : search.state === "ready" && results.length === 0
              ? `Tidak ada yang cocok dengan “${query.trim()}”. Coba nama kecamatan atau kode pos.`
              : search.state === "ready"
                ? `${results.length} hasil. Pilih alamatmu dari daftar.`
                : "Minimal 3 huruf. Ongkir dihitung dari kecamatan ini."}
      </p>
      {error && (
        <p id={errorId} className="mt-1 text-xs text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
