import Link from "next/link";
import { CircleAlert, CircleCheck } from "lucide-react";

/*
 * The admin's building blocks, in the storefront's look (DESIGN.md): paper ground, white cards with
 * a 16px radius and a thin line, no shadows, green only for the main action, spaced capitals for titles.
 */

export const input =
  "h-11 w-full rounded-md border border-line bg-white px-3 text-sm placeholder:text-muted disabled:bg-tile aria-[invalid=true]:border-danger";
export const textarea = "w-full rounded-md border border-line bg-white px-3 py-2.5 text-sm placeholder:text-muted";
export const btn =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-accent px-4 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60";
export const btnGhost =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-line bg-white px-4 text-sm font-semibold hover:border-ink disabled:opacity-60";
export const btnDanger =
  "inline-flex h-11 items-center justify-center gap-1.5 rounded-md border border-line bg-white px-4 text-sm font-semibold text-danger hover:border-danger";
export const btnIcon = "inline-flex size-9 items-center justify-center rounded-md text-muted hover:bg-tile hover:text-ink disabled:opacity-30";
export const link = "font-semibold text-accent underline underline-offset-2 hover:text-accent-strong";

export function PageHeader({ title, subtitle, children }: { title: string; subtitle?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="section-title text-2xl sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-2 text-sm text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}

export function Card({
  title,
  description,
  actions,
  id,
  className = "",
  children,
}: {
  title?: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  id?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className={`scroll-mt-6 rounded-2xl border border-line bg-white p-5 sm:p-6 ${className}`}>
      {(title || actions) && (
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            {title && <h2 className="font-bold">{title}</h2>}
            {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Field({ label, hint, className = "", children }: { label: string; hint?: React.ReactNode; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="text-sm font-medium">{label}</span>
      <span className="mt-1 block">{children}</span>
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

/** Shows ?ok= / ?error= set by back() after a form action. */
export function Flash({ ok, error }: { ok?: string; error?: string }) {
  if (!ok && !error) return null;
  return (
    <div
      role={error ? "alert" : "status"}
      className={`mb-6 flex items-start gap-2 rounded-md border px-4 py-3 text-sm ${
        error ? "border-danger/30 bg-white text-danger" : "border-accent/30 bg-accent-soft text-accent-strong"
      }`}
    >
      {error ? <CircleAlert className="mt-0.5 size-4 shrink-0" /> : <CircleCheck className="mt-0.5 size-4 shrink-0" />}
      {error ?? ok}
    </div>
  );
}

const TONES = {
  gray: "bg-tile text-muted",
  green: "bg-accent-soft text-accent-strong",
  amber: "bg-[#fbf1e3] text-warn",
  red: "bg-[#fbeaea] text-danger",
  ink: "bg-ink text-white",
};
export type Tone = keyof typeof TONES;

export function Badge({ tone = "gray", children }: { tone?: Tone; children: React.ReactNode }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;
}

export const STATUS: Record<string, [string, Tone]> = {
  pending: ["Menunggu transfer", "amber"],
  paid: ["Lunas, perlu dikirim", "green"],
  shipped: ["Dikirim", "ink"],
  completed: ["Selesai", "gray"],
  expired: ["Kedaluwarsa", "red"],
  cancelled: ["Dibatalkan", "red"],
  failed: ["Gagal", "red"],
};

export const StatusBadge = ({ status }: { status: string }) => {
  const [label, tone] = STATUS[status] ?? [status, "gray"];
  return <Badge tone={tone}>{label}</Badge>;
};

/** "Rp" small, digits bold and tabular: how the storefront writes prices */
export function Money({ value, className = "" }: { value: number; className?: string }) {
  return (
    <span className={`price whitespace-nowrap font-semibold ${className}`}>
      <span className="mr-0.5 text-[0.75em] font-medium">Rp</span>
      {value.toLocaleString("id-ID")}
    </span>
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="rounded-2xl border border-dashed border-line bg-white px-4 py-10 text-center text-sm text-muted">{children}</p>;
}

/** Prev/next links that keep the other query params. */
export function Pagination({ page, pages, href }: { page: number; pages: number; href: (page: number) => string }) {
  if (pages <= 1) return null;
  return (
    <nav className="mt-4 flex items-center justify-between text-sm text-muted" aria-label="Halaman">
      <span>
        Halaman {page} dari {pages}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link className={btnGhost} href={href(page - 1)}>
            Sebelumnya
          </Link>
        )}
        {page < pages && (
          <Link className={btnGhost} href={href(page + 1)}>
            Berikutnya
          </Link>
        )}
      </div>
    </nav>
  );
}

/** Builds "?a=1&b=2" from params, skipping empty values. */
export const query = (params: Record<string, string | number | undefined | null>) => {
  const qs = new URLSearchParams(
    Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => [k, String(v)]),
  ).toString();
  return qs ? `?${qs}` : "";
};
