import { NextResponse } from "next/server";
import { variantsByIds } from "@/lib/catalog";
import { handle } from "@/lib/http";
import { expireStale } from "@/lib/orders";

/** Current price and stock of the variants in a shopper's cart: ?ids=3,7,12 */
export const GET = (req: Request) =>
  handle(async () => {
    await expireStale();
    const raw = (new URL(req.url).searchParams.get("ids") ?? "").split(",").map((id) => Number(id));
    const ids = [...new Set(raw.filter((id) => Number.isInteger(id) && id > 0))].slice(0, 50);
    return NextResponse.json(ids.length ? await variantsByIds(ids) : []);
  });
