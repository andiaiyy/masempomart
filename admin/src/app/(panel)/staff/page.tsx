import type { Metadata } from "next";
import { ConfirmButton } from "@/components/client";
import { btn, btnDanger, Card, Field, Flash, input, PageHeader } from "@/components/ui";
import { requireAdmin } from "@/lib/auth";
import { sql } from "@/lib/db";
import { dateTime } from "@/lib/format";
import { addAdmin, changePassword, removeAdmin } from "./actions";

export const metadata: Metadata = { title: "Admin" };

export default async function StaffPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const me = await requireAdmin();
  const flash = await searchParams;
  const admins = await sql<{ id: number; name: string; email: string; created_at: Date }>("select id, name, email, created_at from admins order by created_at");

  return (
    <>
      <PageHeader title="Admin" subtitle="Siapa saja yang bisa masuk ke sini." />
      <Flash ok={flash.ok} error={flash.error} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Punya akses">
          <ul className="divide-y divide-line">
            {admins.map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block font-semibold">
                    {a.name} {a.id === me.id && <span className="font-normal text-muted">(kamu)</span>}
                  </span>
                  <span className="block truncate text-muted">
                    {a.email} · sejak {dateTime(a.created_at)}
                  </span>
                </span>
                {a.id !== me.id && (
                  <form action={removeAdmin.bind(null, a.id)}>
                    <ConfirmButton message={`Cabut akses ${a.name}?`} className={btnDanger}>
                      Cabut
                    </ConfirmButton>
                  </form>
                )}
              </li>
            ))}
          </ul>
        </Card>

        <div className="space-y-6">
          <Card title="Tambah admin">
            <form action={addAdmin} className="space-y-3">
              <Field label="Nama">
                <input name="name" required maxLength={80} className={input} />
              </Field>
              <Field label="Email">
                <input name="email" type="email" required className={input} />
              </Field>
              <Field label="Password" hint="Minimal 8 karakter. Berikan ke orangnya langsung.">
                <input name="password" type="password" required minLength={8} autoComplete="new-password" className={input} />
              </Field>
              <button className={btn}>Tambah</button>
            </form>
          </Card>
          <Card title="Ganti passwordmu">
            <form action={changePassword} className="space-y-3">
              <Field label="Password lama">
                <input name="current" type="password" required autoComplete="current-password" className={input} />
              </Field>
              <Field label="Password baru">
                <input name="password" type="password" required minLength={8} autoComplete="new-password" className={input} />
              </Field>
              <button className={btn}>Ganti password</button>
            </form>
          </Card>
        </div>
      </div>
    </>
  );
}
