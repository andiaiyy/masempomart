import { NextResponse } from "next/server";
import { config } from "@/lib/config";
import { handle } from "@/lib/http";
import { configured } from "@/lib/rajaongkir";

/** What the checkout form needs before the shopper fills it in. */
export const GET = () =>
  handle(async () =>
    NextResponse.json({
      free_over: config.freeShippingOver || null,
      hold_minutes: config.holdMinutes,
      // Checkout says so up front instead of failing at the address step
      shipping_ready: await configured(),
    }),
  );
