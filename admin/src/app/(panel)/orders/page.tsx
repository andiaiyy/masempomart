import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { btnGhost, Empty, input, Money, PageHeader, Pagination, query, StatusBadge } from "@/components/ui";
import { sql } from "@/lib/db";
import { dateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Pesanan" };

const PER_PAGE = 25;

/** Tabs like the storefront's shelf; "Batal" groups the orders that ended without payment. */
const TABS: { key: string; label: string; statuses: string[] | null }[] = [
  { key: "", label: "Semua", statuses: null },
  { key: "pending", label: "Menunggu transfer", statuses: ["pending"] },
  { key: "paid", label: "Perlu dikirim", statuses: ["paid"] },
  { key: "shipped", label: "Dikirim", statuses: ["shipped"] },
  { key: "completed", label: "Selesai", statuses: ["completed"] },
  { key: "ended", label: "Batal / lewat batas", statuses: ["expired", "cancelled", "failed"] },
];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === (sp.status ?? "")) ?? TABS[0];
  const q = (sp.q ?? "").trim();
  const page = Math.max(1, Number(sp.page) || 1);

  const where: string[] = [];
  const params: unknown[] = [];
  const param = (v: unknown) => `$${params.push(v)}`;
  if (tab.statuses) where.push(`status = any(${param(tab.statuses)}::text[])`);
  if (q) {
    // An amount from the bank statement ("74.071", "Rp74071") finds the order by its total
    const amount = q.replace(/^rp\s*/i, "").replace(/[.\s]/g, "");
    const text = param(`%${q.replace(/[\\%_]/g, (m) => `\\${m}`)}%`);
    where.push(
      /^\d+$/.test(amount)
        ? `(total = ${param(Number(amount))} or code ilike ${text} or phone ilike ${text})`
        : `(code ilike ${text} or customer_name ilike ${text} or phone ilike ${text} or email ilike ${text})`,
    );
  }
  const clause = where.length ? `where ${where.join(" and ")}` : "";

  const [{ total }] = await sql<{ total: number }>(`select count(*) as total from orders ${clause}`, params);
  const orders = await sql<{
    id: number;
    code: string;
    customer_name: string;
    city: string;
    total: number;
    unique_code: number;
    status: string;
    issue: string | null;
    created_at: Date;
  }>(
    `select id, code, customer_name, city, total, unique_code, status, issue, created_at from orders ${clause}
      order by created_at desc limit ${PER_PAGE} offset ${(page - 1) * PER_PAGE}`,
    params,
  );
  const counts = Object.fromEntries(
    (await sql<{ status: string; n: number }>("select status, count(*) as n from orders group by status")).map((r) => [r.status, r.n]),
  );
  const countOf = (t: (typeof TABS)[number]) => (t.statuses ?? Object.keys(counts)).reduce((n, s) => n + (counts[s] ?? 0), 0);

  return (
    <>
      <PageHeader title="Pesanan" subtitle="Pesanan dari toko. Cari dengan kode, nama, nomor WhatsApp, atau jumlah transfer dari mutasi rekening." />

      <div className="flex flex-wrap items-end gap-x-5 gap-y-1 border-b border-line">
        {TABS.map((t) => {
          const active = t === tab;
          return (
            <Link
              key={t.key || "semua"}
              href={`/orders${query({ status: t.key, q })}`}
              aria-current={active ? "page" : undefined}
              className={`-mb-px flex h-11 items-center border-b text-[13px] uppercase ${active ? "border-ink font-semibold text-ink" : "border-transparent text-muted hover:text-ink"}`}
            >
              {t.label}
              <sup className="price ml-0.5 text-[9px] font-normal text-muted">{countOf(t)}</sup>
            </Link>
          );
        })}
      </div>

      <form className="mt-5 flex max-w-lg gap-2" role="search">
        {tab.key && <input type="hidden" name="status" value={tab.key} />}
        <label className="sr-only" htmlFor="q">
          Cari pesanan
        </label>
        <input id="q" name="q" defaultValue={q} placeholder="MM-…, nama, 0812…, atau 74.071" className={input} />
        <button className={btnGhost} aria-label="Cari">
          <Search className="size-4" />
        </button>
      </form>

      <div className="mt-5">
        {orders.length === 0 ? (
          <Empty>{q ? `Tidak ada pesanan yang cocok dengan “${q}”.` : "Belum ada pesanan di sini."}</Empty>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-line bg-white">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-4 py-3 font-semibold">Pesanan</th>
                  <th className="px-4 py-3 font-semibold">Pembeli</th>
                  <th className="px-4 py-3 text-right font-semibold">Total transfer</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-paper">
                    <td className="px-4 py-3">
                      <Link href={`/orders/${o.id}`} className="price font-semibold hover:underline">
                        {o.code}
                      </Link>
                      <span className="block text-xs text-muted">{dateTime(o.created_at)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {o.customer_name}
                      <span className="block text-xs text-muted">{o.city}</span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Money value={o.total} />
                      <span className="price block text-xs text-muted">kode unik {String(o.unique_code).padStart(3, "0")}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={o.status} />
                      {o.issue && <span className="mt-1 block text-xs font-semibold text-danger">Perlu dicek</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={page} pages={Math.ceil(total / PER_PAGE)} href={(p) => `/orders${query({ status: tab.key, q, page: p })}`} />
      </div>
    </>
  );
}
