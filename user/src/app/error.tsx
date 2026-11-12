"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-xl font-extrabold">Toko belum bisa dimuat</h1>
      <p className="mt-3 text-sm text-muted">Server toko tidak menjawab. Coba lagi sebentar lagi; isi keranjangmu tetap tersimpan.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-6 inline-flex h-11 items-center rounded-lg bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-strong"
      >
        Muat ulang
      </button>
    </div>
  );
}
