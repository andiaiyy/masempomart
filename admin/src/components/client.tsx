"use client";

import { upload } from "@vercel/blob/client";
import { ArrowLeft, ArrowRight, Loader2, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

/** Submit button that asks first; cancelling stops the form. */
export function ConfirmButton({ message, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { message: string }) {
  return <button type="submit" {...props} onClick={(e) => !confirm(message) && e.preventDefault()} />;
}

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = href === "/" ? path === "/" : path.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`flex h-11 shrink-0 items-center gap-2.5 rounded-md px-3 text-sm ${
        active ? "bg-white font-semibold text-ink ring-1 ring-line" : "text-muted hover:text-ink"
      }`}
    >
      {children}
    </Link>
  );
}

/**
 * Product photos: uploads right away (to Vercel Blob, or public/uploads locally) and submits the
 * resulting URLs as hidden fields named `name`, in order. The first photo is the one on the card.
 */
export function PhotoField({ name, mode, defaultValue = [] }: { name: string; mode: "blob" | "local"; defaultValue?: string[] }) {
  const [urls, setUrls] = useState<string[]>(defaultValue);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function send(file: File) {
    if (mode === "blob") {
      return (await upload(`produk/${file.name}`, file, { access: "public", handleUploadUrl: "/api/upload" })).url;
    }
    const res = await fetch("/api/upload-local", { method: "POST", headers: { "Content-Type": file.type }, body: file });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(body.message ?? "Upload gagal.");
    return body.url as string;
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!files.length) return;
    setBusy(true);
    setError("");
    try {
      const uploaded: string[] = [];
      for (const file of files) uploaded.push(await send(file));
      setUrls((prev) => [...prev, ...uploaded]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload gagal.");
    } finally {
      setBusy(false);
    }
  }

  const move = (from: number, to: number) =>
    setUrls((prev) => {
      const next = [...prev];
      [next[from], next[to]] = [next[to], next[from]];
      return next;
    });

  return (
    <div className="space-y-3">
      {urls.length > 0 && (
        <ul className="flex flex-wrap gap-3">
          {urls.map((url, i) => (
            <li key={url} className="w-28">
              <input type="hidden" name={name} value={url} />
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element -- uploaded photo */}
                <img src={url} alt="" className="aspect-square w-28 rounded-xl border border-line bg-tile object-cover" />
                {i === 0 && <span className="absolute left-1.5 top-1.5 rounded bg-ink px-1.5 py-0.5 text-[10px] font-semibold text-white">Foto kartu</span>}
                <button
                  type="button"
                  onClick={() => setUrls((prev) => prev.filter((u) => u !== url))}
                  className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full border border-line bg-white text-muted hover:text-danger"
                  aria-label={`Hapus foto ${i + 1}`}
                >
                  <X className="size-3.5" />
                </button>
              </div>
              <div className="mt-1 flex justify-center gap-1">
                <button type="button" disabled={i === 0} onClick={() => move(i, i - 1)} className="flex size-8 items-center justify-center rounded text-muted hover:bg-tile hover:text-ink disabled:opacity-30" aria-label={`Geser foto ${i + 1} ke kiri`}>
                  <ArrowLeft className="size-4" />
                </button>
                <button type="button" disabled={i === urls.length - 1} onClick={() => move(i, i + 1)} className="flex size-8 items-center justify-center rounded text-muted hover:bg-tile hover:text-ink disabled:opacity-30" aria-label={`Geser foto ${i + 1} ke kanan`}>
                  <ArrowRight className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed border-line bg-white px-4 text-sm font-semibold hover:border-ink">
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        {busy ? "Mengunggah…" : "Tambah foto"}
        <input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={onChange} disabled={busy} className="sr-only" />
      </label>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
