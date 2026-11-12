import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <h1 className="text-xl font-extrabold">Halaman tidak ditemukan</h1>
      <p className="mt-3 text-sm text-muted">Produknya mungkin sudah tidak dijual, atau tautannya salah ketik.</p>
      <Link href="/#produk" prefetch={false} className="mt-6 inline-flex h-11 items-center rounded-lg border border-line px-5 text-sm font-semibold hover:bg-tile">
        Lihat semua camilan
      </Link>
    </div>
  );
}
