"use server";

import { hashPassword, requireAdmin, verifyPassword } from "@/lib/auth";
import { isUniqueViolation, sql } from "@/lib/db";
import { back, text } from "@/lib/forms";

export async function addAdmin(fd: FormData) {
  await requireAdmin();
  const name = text(fd, "name");
  const email = text(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) back("/staff", { error: "Isi nama dan email yang valid." });
  if (password.length < 8) back("/staff", { error: "Password minimal 8 karakter." });
  try {
    await sql("insert into admins (name, email, password_hash) values ($1, $2, $3)", [name.slice(0, 80), email, await hashPassword(password)]);
  } catch (err) {
    if (isUniqueViolation(err)) back("/staff", { error: "Email itu sudah punya akses admin." });
    throw err;
  }
  back("/staff", { ok: `${name} bisa masuk sekarang dengan ${email}.` });
}

export async function changePassword(fd: FormData) {
  const me = await requireAdmin();
  const [row] = await sql<{ password_hash: string }>("select password_hash from admins where id = $1", [me.id]);
  if (!(await verifyPassword(String(fd.get("current") ?? ""), row.password_hash))) back("/staff", { error: "Password lama salah." });
  const password = String(fd.get("password") ?? "");
  if (password.length < 8) back("/staff", { error: "Password baru minimal 8 karakter." });
  await sql("update admins set password_hash = $2 where id = $1", [me.id, await hashPassword(password)]);
  back("/staff", { ok: "Password diganti." });
}

export async function removeAdmin(id: number) {
  const me = await requireAdmin();
  if (id === me.id) back("/staff", { error: "Kamu tidak bisa menghapus akunmu sendiri." });
  await sql("delete from admins where id = $1", [id]);
  back("/staff", { ok: "Akses admin dicabut." });
}
