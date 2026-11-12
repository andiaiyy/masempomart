import { randomInt } from "node:crypto";
import { config } from "./config";
import { sql, tx, type Sql } from "./db";
import { yymmdd } from "./format";
import { validationError } from "./http";
import { costs, type CourierOption } from "./rajaongkir";

/**
 * Order lifecycle and the stock that goes with it.
 *
 * Placing an order takes its packs out of stock straight away, so two shoppers can't buy the last
 * pack. If the order isn't paid (expired, cancelled) the packs go back. Every stock change is a
 * conditional UPDATE, and every status change only applies while the order is still in the status
 * it was read in, so concurrent requests and double clicks in the admin can't move stock twice.
 */

export type OrderStatus = "pending" | "paid" | "shipped" | "completed" | "failed" | "expired" | "cancelled";
export const STATUSES: OrderStatus[] = ["pending", "paid", "shipped", "completed", "expired", "cancelled", "failed"];

export type Order = {
  id: number;
  code: string;
  customer_name: string;
  email: string;
  phone: string;
  address: string;
  province: string;
  city: string;
  district: string;
  subdistrict: string | null;
  postal_code: string;
  destination_id: number | null;
  note: string | null;
  weight_grams: number;
  subtotal: number;
  shipping: number;
  shipping_courier: string | null;
  shipping_service: string | null;
  shipping_etd: string | null;
  unique_code: number;
  total: number;
  status: OrderStatus;
  payment_type: string | null;
  expires_at: Date | null;
  paid_at: Date | null;
  courier: string | null;
  tracking_number: string | null;
  shipped_at: Date | null;
  issue: string | null;
  created_at: Date;
};

export type OrderItem = {
  id: number;
  order_id: number;
  product_id: number | null;
  product_variant_id: number | null;
  name: string;
  variant_name: string;
  image: string | null;
  price: number;
  weight_grams: number;
  quantity: number;
};

export type CartItem = { variant_id: number; quantity: number };

export type Customer = {
  name: string;
  email: string;
  phone: string;
  address: string;
  province: string;
  city: string;
  district: string;
  subdistrict?: string | null;
  postal_code: string;
  destination_id: number;
  note?: string | null;
};

type VariantRow = {
  id: number;
  product_id: number;
  name: string;
  price: number;
  weight_grams: number;
  is_active: boolean;
  product_active: boolean;
  product_name: string;
  images: string[];
};

export type ShippingOption = CourierOption & { /** what the courier charges, also when the shop pays it */ courier_cost: number };

const label = (v: Pick<VariantRow, "product_name" | "name">) => `${v.product_name} (${v.name})`;

/** Parcel weight: the packs plus packaging. */
export const parcelWeight = (packsGrams: number) => packsGrams + config.packagingGrams;

/**
 * Courier services to a destination, cheapest first. Above the free-shipping threshold the shop
 * pays the courier, so every option costs the shopper 0 (courier_cost keeps the price).
 */
export async function shippingOptions(destination: number, grams: number, subtotal: number): Promise<ShippingOption[]> {
  const free = config.freeShippingOver > 0 && subtotal >= config.freeShippingOver;
  return (await costs(destination, grams)).map((o) => ({ ...o, courier_cost: o.cost, cost: free ? 0 : o.cost }));
}

/** Prices a cart from the database (prices sent by the browser are never used) plus the courier options. */
export async function quote(destination: number, items: CartItem[], db: Sql = sql) {
  const wanted = new Map<number, number>();
  for (const item of items) wanted.set(item.variant_id, (wanted.get(item.variant_id) ?? 0) + item.quantity);

  const rows = await db<VariantRow>(
    `select v.id, v.product_id, v.name, v.price, v.weight_grams, v.is_active,
            p.is_active as product_active, p.name as product_name, p.images
       from product_variants v join products p on p.id = v.product_id
      where v.id = any($1::int[])`,
    [[...wanted.keys()]],
  );
  const byId = new Map(rows.map((r) => [r.id, r]));

  const lines: { variant: VariantRow; quantity: number }[] = [];
  for (const [id, quantity] of wanted) {
    const variant = byId.get(id);
    if (!variant || !variant.is_active || !variant.product_active) {
      throw validationError({ items: ["Ada produk di keranjang yang sudah tidak dijual. Hapus dulu dari keranjang."] });
    }
    lines.push({ variant, quantity });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.variant.price * l.quantity, 0);
  const weightGrams = parcelWeight(lines.reduce((sum, l) => sum + l.variant.weight_grams * l.quantity, 0));

  return { lines, subtotal, weight_grams: weightGrams, options: await shippingOptions(destination, weightGrams, subtotal) };
}

/**
 * Creates a pending order and reserves its packs. `shipping` is the courier service the shopper
 * picked; it must still be offered for this address and weight.
 */
export async function place(customer: Customer, items: CartItem[], shipping: { courier: string; service: string }): Promise<Order> {
  // Packs held by abandoned orders go back on the shelf first
  await expireStale();

  // Priced before the transaction: it may call RajaOngkir, and no lock should wait on that
  const q = await quote(customer.destination_id, items);
  const chosen = q.options.find((o) => o.courier === shipping.courier.toLowerCase() && o.service === shipping.service);
  if (!chosen) {
    throw validationError({ shipping: ["Layanan pengiriman ini sudah tidak tersedia ke alamatmu. Pilih kurir lain."] });
  }

  return tx(async (db) => {
    for (const { variant, quantity } of q.lines) {
      const taken = await db("update product_variants set stock = stock - $2 where id = $1 and stock >= $2 returning id", [variant.id, quantity]);
      if (!taken.length) {
        // Throwing rolls back the packs already taken for earlier lines
        const [{ stock }] = await db<{ stock: number }>("select stock from product_variants where id = $1", [variant.id]);
        throw validationError({ items: [stock > 0 ? `${label(variant)} tinggal ${stock} pak.` : `${label(variant)} sudah habis.`] });
      }
    }

    const base = q.subtotal + chosen.cost;
    const uniqueCode = await pickUniqueCode(db, base);
    const [order] = await db<Order>(
      `insert into orders (code, customer_name, email, phone, address, province, city, district, subdistrict, postal_code,
                           destination_id, note, weight_grams, subtotal, shipping, shipping_courier, shipping_service, shipping_etd,
                           unique_code, total, status, expires_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'pending',
               now() + make_interval(mins => $21))
       returning *`,
      [
        newOrderCode(),
        customer.name,
        customer.email,
        customer.phone,
        customer.address,
        customer.province,
        customer.city,
        customer.district,
        customer.subdistrict || null,
        customer.postal_code,
        customer.destination_id,
        customer.note || null,
        q.weight_grams,
        q.subtotal,
        chosen.cost,
        chosen.courier,
        chosen.service,
        chosen.etd || null,
        uniqueCode,
        base + uniqueCode,
        config.holdMinutes,
      ],
    );

    for (const { variant, quantity } of q.lines) {
      await db(
        `insert into order_items (order_id, product_id, product_variant_id, name, variant_name, image, price, weight_grams, quantity)
         values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [order.id, variant.product_id, variant.id, variant.product_name, variant.name, variant.images[0] ?? null, variant.price, variant.weight_grams, quantity],
      );
    }
    return order;
  });
}

/** "MM-261112-K3COUZ": the shop's date plus 6 random characters without look-alikes (0/O, 1/I). */
function newOrderCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let random = "";
  for (let i = 0; i < 6; i++) random += alphabet[randomInt(alphabet.length)];
  return `MM-${yymmdd()}-${random}`;
}

/**
 * A 1–999 rupiah code for the transfer amount, so no two unpaid orders ask for the same total and
 * each transfer in the bank statement matches one order. Random, so codes don't reveal order counts.
 */
async function pickUniqueCode(db: Sql, amount: number) {
  const rows = await db<{ total: number }>("select total from orders where status = 'pending' and total between $1 and $2", [amount + 1, amount + 999]);
  const taken = new Set(rows.map((r) => r.total - amount));
  const free: number[] = [];
  for (let code = 1; code <= 999; code++) if (!taken.has(code)) free.push(code);
  // 999 unpaid orders with the same amount won't happen; if it did, the admin still sees the code
  return free.length ? free[randomInt(free.length)] : randomInt(1, 1000);
}

/** Ends a pending order without payment and puts its packs back. False when it had already left "pending". */
export async function release(orderId: number, status: "expired" | "cancelled" | "failed"): Promise<boolean> {
  return tx(async (db) => {
    const moved = await db("update orders set status = $2, updated_at = now() where id = $1 and status = 'pending' returning id", [orderId, status]);
    if (!moved.length) return false;
    await db(
      `update product_variants v set stock = v.stock + i.quantity
         from order_items i where i.order_id = $1 and i.product_variant_id = v.id`,
      [orderId],
    );
    return true;
  });
}

/**
 * Records a transfer an admin has checked. It can arrive after the order expired or was cancelled;
 * its packs are then taken again, and anything no longer in stock is written to the order's issue
 * for the admin to restock or refund. False when the order was already paid or further along.
 */
export async function markPaid(orderId: number, paymentType = "bank_transfer"): Promise<boolean> {
  return tx(async (db) => {
    const set = "status = 'paid', paid_at = now(), payment_type = $2, updated_at = now()";
    if ((await db(`update orders set ${set} where id = $1 and status = 'pending' returning id`, [orderId, paymentType])).length) return true;
    if (!(await db(`update orders set ${set} where id = $1 and status in ('failed', 'expired', 'cancelled') returning id`, [orderId, paymentType])).length) {
      return false;
    }

    const short: string[] = [];
    for (const item of await db<OrderItem>("select * from order_items where order_id = $1 order by id", [orderId])) {
      const taken = item.product_variant_id
        ? await db("update product_variants set stock = stock - $2 where id = $1 and stock >= $2 returning id", [item.product_variant_id, item.quantity])
        : [];
      if (!taken.length) short.push(`${item.name} · ${item.variant_name} × ${item.quantity}`);
    }
    if (short.length) {
      await db("update orders set issue = $2 where id = $1", [
        orderId,
        `Dibayar setelah batas waktu, dan ini sudah habis: ${short.join(", ")}. Tambah stok atau kembalikan uangnya.`,
      ]);
    }
    return true;
  });
}

/** Expires unpaid orders whose hold has run out. Returns how many were expired. */
export async function expireStale(): Promise<number> {
  const stale = await sql<{ id: number }>("select id from orders where status = 'pending' and expires_at <= now()");
  let expired = 0;
  for (const { id } of stale) if (await release(id, "expired")) expired++;
  return expired;
}

export async function ship(orderId: number, courier: string, trackingNumber: string): Promise<boolean> {
  const moved = await sql(
    `update orders set status = 'shipped', courier = $2, tracking_number = $3, shipped_at = now(), updated_at = now()
      where id = $1 and status = 'paid' returning id`,
    [orderId, courier, trackingNumber],
  );
  return moved.length > 0;
}

export async function complete(orderId: number): Promise<boolean> {
  return (await sql("update orders set status = 'completed', updated_at = now() where id = $1 and status = 'shipped' returning id", [orderId])).length > 0;
}

export const orderByCode = async (code: string) => (await sql<Order>("select * from orders where code = $1", [code]))[0] ?? null;
export const orderById = async (id: number) => (await sql<Order>("select * from orders where id = $1", [id]))[0] ?? null;
export const orderItems = (orderId: number) => sql<OrderItem>("select * from order_items where order_id = $1 order by id", [orderId]);
