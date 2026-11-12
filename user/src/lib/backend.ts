// Server components only: the browser reaches the API through the /api rewrite instead.
const BACKEND_URL = process.env.BACKEND_URL ?? "http://127.0.0.1:8000";

/**
 * GET from the Laravel API during server rendering. Stock changes with every order,
 * so nothing is cached. Returns null on 404; other failures throw and reach error.tsx.
 */
export async function backend<T>(path: string): Promise<T | null> {
  const res = await fetch(`${BACKEND_URL}/api${path}`, {
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`API ${path} answered ${res.status}`);
  return (await res.json()) as T;
}
