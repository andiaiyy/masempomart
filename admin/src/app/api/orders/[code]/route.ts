import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { digits } from "@/lib/format";
import { clientIp, handle, notFound, rateLimit } from "@/lib/http";
import { orderByCode, release } from "@/lib/orders";
import { courierName } from "@/lib/rajaongkir";
import { bankAccounts, whatsappUrl } from "@/lib/settings";

/** The shopper's receipt. The code is the key: it shows the status, never the address or phone. */
export const GET = (req: Request, { params }: { params: Promise<{ code: string }> }) =>
  handle(async () => {
    rateLimit(`receipt:${clientIp(req.headers)}`, 60);
    let order = await orderByCode((await params).code);
    if (!order) throw notFound("Pesanan tidak ditemukan.");

    if (order.status === "pending" && order.expires_at && order.expires_at <= new Date()) {
      await release(order.id, "expired");
      order = (await orderByCode(order.code))!;
    }

    const items = await sql<{ name: string; variant_name: string; image: string | null; product_slug: string | null; price: number; quantity: number }>(
      `select i.name, i.variant_name, i.image, p.slug as product_slug, i.price, i.quantity
         from order_items i left join products p on p.id = i.product_id where i.order_id = $1 order by i.id`,
      [order.id],
    );

    return NextResponse.json({
      code: order.code,
      status: order.status,
      // Where to transfer, only while the order can still be paid
      payment:
        order.status === "pending"
          ? {
              bank_accounts: await bankAccounts(),
              // Opens the shop's chat with the proof message filled in
              whatsapp_url: await whatsappUrl(`Halo Masempo Mart, ini bukti transfer untuk pesanan ${order.code} (Rp ${digits(order.total)}).`),
              pay_before: order.expires_at,
            }
          : null,
      payment_type: order.payment_type,
      customer_name: order.customer_name,
      city: order.city,
      subtotal: order.subtotal,
      shipping: order.shipping,
      shipping_courier: courierName(order.shipping_courier),
      shipping_service: order.shipping_service,
      shipping_etd: order.shipping_etd,
      unique_code: order.unique_code,
      total: order.total,
      weight_grams: order.weight_grams,
      created_at: order.created_at,
      expires_at: order.expires_at,
      paid_at: order.paid_at,
      courier: order.courier,
      tracking_number: order.tracking_number,
      shipped_at: order.shipped_at,
      items,
    });
  });
