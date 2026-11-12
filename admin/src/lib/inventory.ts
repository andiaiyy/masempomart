import { tx } from "./db";

/**
 * Logs a delivery (positive quantity) or write-off (negative) and moves the stock with it, in one
 * transaction. A write-off can't take stock below zero. Returns the stock left, or an error message.
 */
export async function recordRestock(input: {
  variantId: number;
  quantity: number;
  adminId: number | null;
  costPrice?: number | null;
  expiresOn?: string | null;
  note?: string | null;
}): Promise<{ stock: number } | { error: string }> {
  return tx(async (db) => {
    const changed =
      input.quantity >= 0
        ? await db<{ stock: number }>("update product_variants set stock = stock + $2 where id = $1 returning stock", [input.variantId, input.quantity])
        : await db<{ stock: number }>("update product_variants set stock = stock - $2 where id = $1 and stock >= $2 returning stock", [
            input.variantId,
            -input.quantity,
          ]);

    if (!changed.length) {
      const [row] = await db<{ stock: number }>("select stock from product_variants where id = $1", [input.variantId]);
      if (!row) return { error: "Varian tidak ditemukan." };
      return { error: `Stok tinggal ${row.stock}, jadi paling banyak ${row.stock} yang bisa dikurangi.` };
    }

    await db(
      "insert into restocks (product_variant_id, admin_id, quantity, cost_price, expires_on, note) values ($1, $2, $3, $4, $5, $6)",
      [input.variantId, input.adminId, input.quantity, input.costPrice ?? null, input.expiresOn || null, input.note || null],
    );
    return { stock: changed[0].stock };
  });
}
