"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import type { Order } from "@/lib/types";
import ReceiptPrinter from "@/components/ReceiptPrinter";

// While waiting for payment, check again every few seconds
const POLL_MS = 5000;

type Load = { state: "loading" } | { state: "missing" } | { state: "failed" } | { state: "ready"; order: Order };

export default function OrderPage() {
  const { code } = useParams<{ code: string }>();
  const [load, setLoad] = useState<Load>({ state: "loading" });

  const fetchOrder = useCallback(
    () =>
      fetch(`/api/orders/${encodeURIComponent(code)}`, { headers: { Accept: "application/json" } }).then(async (res) => {
        if (res.status === 404) return setLoad({ state: "missing" });
        if (!res.ok) throw new Error(String(res.status));
        setLoad({ state: "ready", order: await res.json() });
      }),
    [code],
  );

  const status = load.state === "ready" ? load.order.status : null;
  useEffect(() => {
    if (status && status !== "pending") return;
    let timer: ReturnType<typeof setTimeout>;
    let stopped = false;
    const tick = () =>
      fetchOrder()
        .catch(() => !stopped && setLoad((l) => (l.state === "ready" ? l : { state: "failed" })))
        .finally(() => {
          if (!stopped) timer = setTimeout(tick, POLL_MS);
        });
    tick();
    return () => {
      stopped = true;
      clearTimeout(timer);
    };
  }, [fetchOrder, status]);

  if (load.state === "loading") {
    return <Shell><p className="text-sm text-muted" role="status">Memuat pesanan…</p></Shell>;
  }
  if (load.state === "missing") {
    return (
      <Shell>
        <h1 className="text-xl font-extrabold">Pesanan tidak ditemukan</h1>
        <p className="mt-3 text-sm text-muted">Periksa lagi tautannya. Kode pesanan diawali “MM-”.</p>
      </Shell>
    );
  }
  if (load.state === "failed") {
    return (
      <Shell>
        <h1 className="text-xl font-extrabold">Status pesanan belum bisa dimuat</h1>
        <p className="mt-3 text-sm text-muted">Server toko tidak menjawab. Kami coba lagi otomatis setiap beberapa detik.</p>
      </Shell>
    );
  }

  // The receipt mounts once and keeps its place while the status is re-checked
  return (
    <div className="px-4 pb-24 pt-8 sm:pt-12">
      <ReceiptPrinter order={load.order} />
      <div className="mt-8 flex justify-center">
        <Link href="/#produk" prefetch={false} className="inline-flex h-11 items-center text-sm text-muted underline underline-offset-4 hover:text-ink">
          Belanja lagi
        </Link>
      </div>
    </div>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">{children}</div>;
}
