import { NextResponse } from "next/server";
import { parseCheckout } from "@/lib/checkout";
import { clientIp, handle, jsonBody, rateLimit } from "@/lib/http";
import { sendOrderEmails } from "@/lib/mail";
import { orderItems, place } from "@/lib/orders";

/**
 * Guest checkout: the order reserves its packs and the shopper lands on its receipt, which lists
 * the bank accounts. They transfer, send the proof on WhatsApp, and an admin marks it paid.
 */
export const POST = (req: Request) =>
  handle(async () => {
    rateLimit(`checkout:${clientIp(req.headers)}`, 10);
    const { customer, items, shipping } = parseCheckout(await jsonBody(req));
    const order = await place(customer, items, shipping);
    // Sent before answering, so it also happens on serverless hosting; failures are only logged
    await sendOrderEmails(order, await orderItems(order.id));
    return NextResponse.json({ code: order.code }, { status: 201 });
  });
