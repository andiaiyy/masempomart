import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { handle, HttpError } from "@/lib/http";
import { expireStale } from "@/lib/orders";

const same = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * Vercel Cron (vercel.json) calls this daily with "Authorization: Bearer <CRON_SECRET>". Catalog
 * and checkout requests expire stale orders too; this catches quiet days.
 */
export const GET = (req: Request) =>
  handle(async () => {
    const secret = config.cronSecret;
    if (!secret || !same(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) throw new HttpError(403, "Forbidden");
    return NextResponse.json({ expired: await expireStale() });
  });
