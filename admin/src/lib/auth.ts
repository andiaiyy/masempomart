import { createHmac, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sql } from "./db";

const scryptAsync = promisify(scrypt) as (password: string, salt: string, length: number) => Promise<Buffer>;

/** "scrypt:<salt>:<hash>", the same format scripts/setup-db.mjs writes. */
export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${(await scryptAsync(password, salt, 64)).toString("hex")}`;
}

export async function verifyPassword(password: string, stored: string) {
  const [kind, salt, hash] = stored.split(":");
  if (kind !== "scrypt" || !salt || !hash) return false;
  return timingSafeEqual(await scryptAsync(password, salt, 64), Buffer.from(hash, "hex"));
}

const COOKIE = "masempo_admin";
const MAX_AGE = 7 * 24 * 3600; // seconds

function secret() {
  const value = process.env.SESSION_SECRET;
  if (!value && process.env.NODE_ENV === "production") throw new Error("SESSION_SECRET is not set");
  return value ?? "local-dev-only-secret";
}

const sign = (value: string) => createHmac("sha256", secret()).update(value).digest("base64url");
const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

export async function startSession(adminId: number) {
  const value = `${adminId}.${Date.now() + MAX_AGE * 1000}`;
  (await cookies()).set(COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE,
    path: "/",
  });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

export type Admin = { id: number; name: string; email: string };

/** The signed-in admin, or null. A deleted admin's cookie stops working immediately. */
export async function currentAdmin(): Promise<Admin | null> {
  const [id, expires, signature] = ((await cookies()).get(COOKIE)?.value ?? "").split(".");
  if (!signature || !same(signature, sign(`${id}.${expires}`)) || Number(expires) < Date.now()) return null;
  const [admin] = await sql<Admin>("select id, name, email from admins where id = $1", [Number(id)]);
  return admin ?? null;
}

/** For pages and server actions: every server action is a public endpoint, so each one calls this. */
export async function requireAdmin(): Promise<Admin> {
  const admin = await currentAdmin();
  if (!admin) redirect("/login");
  return admin;
}
