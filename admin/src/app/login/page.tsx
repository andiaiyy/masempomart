import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Brand from "@/components/Brand";
import { btn, Flash, input } from "@/components/ui";
import { currentAdmin } from "@/lib/auth";
import { login } from "./actions";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  if (await currentAdmin()) redirect("/");
  const { error } = await searchParams;

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Brand size="lg" />
          <p className="section-title mt-4 text-xs text-muted">Admin</p>
        </div>
        <Flash error={error} />
        <form action={login} className="space-y-4 rounded-2xl border border-line bg-white p-6">
          <label className="block text-sm font-medium">
            Email
            <input name="email" type="email" required autoComplete="email" autoFocus className={`${input} mt-1`} />
          </label>
          <label className="block text-sm font-medium">
            Password
            <input name="password" type="password" required autoComplete="current-password" className={`${input} mt-1`} />
          </label>
          <button className={`${btn} w-full`}>Masuk</button>
        </form>
      </div>
    </main>
  );
}
