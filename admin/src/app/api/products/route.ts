import { NextResponse } from "next/server";
import { listProducts } from "@/lib/catalog";
import { handle } from "@/lib/http";
import { expireStale } from "@/lib/orders";

const num = (value: string | null) => (value && /^\d+$/.test(value) ? Number(value) : null);
const yes = (value: string | null) => value === "1" || value === "true";

/** The shelf: ?category=&q=&sort=newest|best|price_asc|price_desc|name&page=&per_page=&exclude= */
export const GET = (req: Request) =>
  handle(async () => {
    // Without a scheduler running, abandoned orders would hold their packs forever
    await expireStale();
    const p = new URL(req.url).searchParams;
    return NextResponse.json(
      await listProducts({
        category: p.get("category"),
        q: p.get("q"),
        exclude: num(p.get("exclude")),
        sort: p.get("sort"),
        page: num(p.get("page")) ?? 1,
        perPage: num(p.get("per_page")) ?? 24,
        minPrice: num(p.get("min_price")),
        maxPrice: num(p.get("max_price")),
        inStock: yes(p.get("in_stock")),
        onSale: yes(p.get("on_sale")),
      }),
    );
  });
