import { randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth";

const TYPES: Record<string, string> = { "image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp" };

// Local stand-in for Vercel Blob when BLOB_READ_WRITE_TOKEN is not set: saves to public/uploads.
// Only `next dev` serves files added to public/ after the build; production needs Blob.
export async function POST(req: Request) {
  if (process.env.VERCEL || process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ message: "Use Vercel Blob." }, { status: 404 });
  }
  if (!(await currentAdmin())) return NextResponse.json({ message: "Silakan masuk dulu." }, { status: 401 });

  const ext = TYPES[req.headers.get("content-type") ?? ""];
  if (!ext) return NextResponse.json({ message: "Format foto harus JPG, PNG atau WebP." }, { status: 415 });

  const name = `${Date.now()}-${randomBytes(4).toString("hex")}${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads");
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await req.arrayBuffer()));

  // Absolute URL: the storefront shows these photos from its own origin
  return NextResponse.json({ url: `${new URL(req.url).origin}/uploads/${name}` });
}
