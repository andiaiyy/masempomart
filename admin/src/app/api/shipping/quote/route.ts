import { NextResponse } from "next/server";
import { parseQuote } from "@/lib/checkout";
import { clientIp, handle, jsonBody, rateLimit } from "@/lib/http";
import { quote } from "@/lib/orders";

/** Subtotal, parcel weight and every courier service to the destination, cheapest first. */
export const POST = (req: Request) =>
  handle(async () => {
    rateLimit(`shipping:${clientIp(req.headers)}`, 90);
    const { destination, items } = parseQuote(await jsonBody(req));
    const q = await quote(destination, items);
    return NextResponse.json({
      subtotal: q.subtotal,
      weight_grams: q.weight_grams,
      options: q.options.map(({ courier, courier_name, service, description, cost, etd }) => ({ courier, courier_name, service, description, cost, etd })),
    });
  });
