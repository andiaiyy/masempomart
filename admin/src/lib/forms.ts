import { redirect } from "next/navigation";

export const text = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();

/** Whole number from a form field (dots and spaces allowed: "55.000"); null when empty or not a number. */
export function int(fd: FormData, key: string): number | null {
  const value = text(fd, key).replace(/[.\s]/g, "");
  return value === "" || !/^-?\d+$/.test(value) ? null : Number(value);
}

export const checked = (fd: FormData, key: string) => fd.get(key) === "on";

/** Redirects back to a page with a message that <Flash> shows. */
export function back(path: string, message: { ok?: string; error?: string }): never {
  const [base, hash] = path.split("#");
  const url = new URL(base, "http://local");
  for (const [k, v] of Object.entries(message)) if (v) url.searchParams.set(k, v);
  redirect(`${url.pathname}${url.search}${hash ? `#${hash}` : ""}`);
}

/** Where uploads go: Vercel Blob when configured, otherwise public/uploads for local dev. */
export const uploadMode = (): "blob" | "local" => (process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local");

export const slugify = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
