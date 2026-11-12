import { Boxes, ExternalLink, LayoutDashboard, LogOut, Package, ReceiptText, Settings, Tags, Users } from "lucide-react";
import Brand from "@/components/Brand";
import { NavLink } from "@/components/client";
import { requireAdmin } from "@/lib/auth";
import { config } from "@/lib/config";
import { sql } from "@/lib/db";
import { expireStale } from "@/lib/orders";
import { logout } from "../login/actions";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  await expireStale();
  const [{ waiting, to_ship }] = await sql<{ waiting: number; to_ship: number }>(
    "select count(*) filter (where status = 'pending') as waiting, count(*) filter (where status = 'paid') as to_ship from orders",
  );

  return (
    <div className="lg:flex">
      <aside className="border-b border-line lg:sticky lg:top-0 lg:flex lg:h-dvh lg:w-64 lg:shrink-0 lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex items-end justify-between px-5 pb-4 pt-5 lg:pb-6 lg:pt-8">
          <Brand />
          <span className="section-title text-[11px] text-muted">Admin</span>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-3 pb-3 lg:flex-1 lg:flex-col lg:overflow-visible" aria-label="Menu">
          <NavLink href="/">
            <LayoutDashboard className="size-4" /> Ringkasan
          </NavLink>
          <NavLink href="/orders">
            <ReceiptText className="size-4" /> Pesanan
            {waiting + to_ship > 0 && (
              <span className="ml-auto flex gap-1">
                {waiting > 0 && (
                  <span className="price rounded bg-[#fbf1e3] px-1.5 text-xs font-semibold text-warn" title="Menunggu transfer">
                    {waiting}
                  </span>
                )}
                {to_ship > 0 && (
                  <span className="price rounded bg-accent-soft px-1.5 text-xs font-semibold text-accent-strong" title="Lunas, perlu dikirim">
                    {to_ship}
                  </span>
                )}
              </span>
            )}
          </NavLink>
          <NavLink href="/products">
            <Package className="size-4" /> Produk
          </NavLink>
          <NavLink href="/categories">
            <Tags className="size-4" /> Kategori
          </NavLink>
          <NavLink href="/restocks">
            <Boxes className="size-4" /> Stok
          </NavLink>
          <NavLink href="/settings">
            <Settings className="size-4" /> Pengaturan
          </NavLink>
          <NavLink href="/staff">
            <Users className="size-4" /> Admin
          </NavLink>
        </nav>
        <div className="hidden border-t border-line p-4 lg:block">
          <p className="truncate text-sm font-semibold">{admin.name}</p>
          <p className="truncate text-xs text-muted">{admin.email}</p>
          <div className="mt-3 flex gap-3">
            <a href={config.storefrontUrl} target="_blank" rel="noreferrer" className="flex h-8 items-center gap-1 text-xs text-muted hover:text-ink">
              <ExternalLink className="size-3.5" /> Lihat toko
            </a>
            <form action={logout} className="ml-auto">
              <button className="flex h-8 items-center gap-1 text-xs text-muted hover:text-danger">
                <LogOut className="size-3.5" /> Keluar
              </button>
            </form>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 pb-16 pt-8 sm:px-6 lg:px-10 lg:pt-12">
        <div className="mx-auto max-w-6xl">{children}</div>
        <div className="mt-12 flex justify-center gap-6 text-sm lg:hidden">
          <a href={config.storefrontUrl} target="_blank" rel="noreferrer" className="text-muted hover:text-ink">
            Lihat toko
          </a>
          <form action={logout}>
            <button className="text-muted hover:text-danger">Keluar ({admin.email})</button>
          </form>
        </div>
      </main>
    </div>
  );
}
