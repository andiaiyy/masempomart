import { NextResponse } from "next/server";

/** An error the client should see, answered as { message, errors? } (the shape the storefront reads). */
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
  }
}

export const notFound = (message = "Not Found") => new HttpError(404, message);

/** 422 with field errors; the message is the first error, like the checkout form expects. */
export function validationError(errors: Record<string, string[]>) {
  return new HttpError(422, Object.values(errors)[0][0], errors);
}

/** Runs a route body and turns HttpErrors into JSON responses. */
export async function handle(fn: () => Promise<Response>): Promise<Response> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) {
      return NextResponse.json({ message: err.message, errors: err.errors }, { status: err.status });
    }
    console.error(err);
    return NextResponse.json({ message: "Server Error" }, { status: 500 });
  }
}

export const clientIp = (headers: Headers) => headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";

const hits = new Map<string, number[]>();

/**
 * Requests per minute per key. Each group (checkout, shipping, receipt) has its own key, so a
 * shopper searching addresses never uses up the checkout limit.
 * Counts live in this server instance's memory: on serverless each instance has its own budget
 * (as in Karueng); move to a shared store if an endpoint gets abused.
 */
export function rateLimit(key: string, perMinute: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  if (recent.length >= perMinute) throw new HttpError(429, "Terlalu banyak permintaan. Coba lagi sebentar.");
  recent.push(now);
  hits.set(key, recent);
}

/** For tests: forget every count. */
export const resetRateLimits = () => hits.clear();

/** Reads a JSON body; anything unparsable becomes an empty object so validation reports it. */
export async function jsonBody(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    return body && typeof body === "object" && !Array.isArray(body) ? body : {};
  } catch {
    return {};
  }
}
