"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { endSession, startSession, verifyPassword } from "@/lib/auth";
import { sql } from "@/lib/db";
import { back, text } from "@/lib/forms";
import { HttpError, clientIp, rateLimit } from "@/lib/http";

export async function login(fd: FormData) {
  try {
    // Slows down password guessing
    rateLimit(`login:${clientIp(await headers())}`, 5);
  } catch (err) {
    if (err instanceof HttpError) back("/login", { error: err.message });
    throw err;
  }

  const [admin] = await sql<{ id: number; password_hash: string }>("select id, password_hash from admins where email = $1", [
    text(fd, "email").toLowerCase(),
  ]);
  if (!admin || !(await verifyPassword(String(fd.get("password") ?? ""), admin.password_hash))) {
    back("/login", { error: "Email atau password salah." });
  }
  await startSession(admin.id);
  redirect("/");
}

export async function logout() {
  await endSession();
  redirect("/login");
}
