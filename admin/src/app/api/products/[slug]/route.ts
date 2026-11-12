import { NextResponse } from "next/server";
import { productBySlug } from "@/lib/catalog";
import { handle, notFound } from "@/lib/http";
import { expireStale } from "@/lib/orders";

/** One product with specs, variants and its neighbours in the category. */
export const GET = (_req: Request, { params }: { params: Promise<{ slug: string }> }) =>
  handle(async () => {
    await expireStale();
    const product = await productBySlug((await params).slug);
    if (!product) throw notFound("Produk tidak ditemukan.");
    return NextResponse.json(product);
  });
