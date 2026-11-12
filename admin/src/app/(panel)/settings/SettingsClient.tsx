"use client";

import { Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

const input = "h-11 w-full rounded-md border border-line bg-white px-3 text-sm placeholder:text-muted";

type Account = { key: number; bank: string; account_number: string; account_name: string };
let next = 1;

/** Rows of bank accounts; submitted as parallel bank / account_number / account_name fields. */
export function BankRows({ initial }: { initial: Omit<Account, "key">[] }) {
  const [rows, setRows] = useState<Account[]>(() =>
    (initial.length ? initial : [{ bank: "", account_number: "", account_name: "" }]).map((a) => ({ key: next++, ...a })),
  );
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r.key} className="grid gap-2 sm:grid-cols-[8rem_1fr_1.5fr_auto]">
          <input name="bank" defaultValue={r.bank} placeholder="BNI" aria-label={`Bank ${i + 1}`} maxLength={40} className={input} />
          <input name="account_number" defaultValue={r.account_number} placeholder="Nomor rekening" inputMode="numeric" aria-label={`Nomor rekening ${i + 1}`} className={input} />
          <input name="account_name" defaultValue={r.account_name} placeholder="Atas nama" aria-label={`Atas nama ${i + 1}`} maxLength={80} className={input} />
          <button
            type="button"
            onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
            className="flex size-11 items-center justify-center rounded-md text-muted hover:bg-tile hover:text-danger"
            aria-label={`Hapus rekening ${i + 1}`}
          >
            <Trash2 className="size-4" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={() => setRows((rs) => [...rs, { key: next++, bank: "", account_number: "", account_name: "" }])}
        className="inline-flex h-11 items-center gap-1.5 rounded-md border border-dashed border-line px-4 text-sm font-semibold hover:border-ink"
      >
        <Plus className="size-4" /> Tambah rekening
      </button>
    </div>
  );
}

type Place = { id: number; label: string };

/** Searches RajaOngkir's places (the public /api/shipping/destinations) and puts the pick in hidden fields. */
export function OriginPicker({ current }: { current: Place | null }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [status, setStatus] = useState("");
  const [picked, setPicked] = useState<Place | null>(current);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 3) {
      setResults([]);
      setStatus("");
      return;
    }
    let cancelled = false;
    setStatus("Mencari…");
    const timer = setTimeout(() => {
      fetch(`/api/shipping/destinations?search=${encodeURIComponent(q)}`)
        .then(async (res) => (res.ok ? res.json() : Promise.reject(await res.json().catch(() => ({})))))
        .then((body: { data: Place[] }) => {
          if (cancelled) return;
          setResults(body.data);
          setStatus(body.data.length ? "" : "Tidak ditemukan. Coba nama kecamatan atau kode pos.");
        })
        .catch((body) => !cancelled && setStatus(body?.message ?? "Pencarian gagal."));
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  return (
    <div>
      <input type="hidden" name="origin_id" value={picked?.id ?? ""} />
      <input type="hidden" name="origin_label" value={picked?.label ?? ""} />
      <p className="text-sm">
        Sekarang: <strong>{picked ? picked.label : "belum dipilih"}</strong>
      </p>
      <label className="mt-3 block text-sm font-medium" htmlFor="origin-search">
        Cari kecamatan asal
      </label>
      <input id="origin-search" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tanete Riattang, Watampone, 92716…" className={`${input} mt-1 max-w-md`} />
      {status && (
        <p className="mt-1 text-xs text-muted" aria-live="polite">
          {status}
        </p>
      )}
      {results.length > 0 && (
        <ul className="mt-2 max-w-md divide-y divide-line rounded-md border border-line bg-white text-sm">
          {results.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => {
                  setPicked({ id: r.id, label: r.label });
                  setResults([]);
                  setQuery("");
                }}
                className="w-full px-3 py-2 text-left hover:bg-paper"
              >
                {r.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
