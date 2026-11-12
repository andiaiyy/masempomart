import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "./config";
import { clock, digits, esc, longDate } from "./format";
import type { Order, OrderItem } from "./orders";
import { courierName } from "./rajaongkir";
import { bankAccounts, notifyEmail, phoneToWa, whatsappUrl } from "./settings";

/**
 * Emails through Brevo's transactional API (one HTTPS call, which suits serverless better than SMTP).
 * Without BREVO_API_KEY they're written to .mail/ as HTML files instead, to look at locally.
 */

type Mail = { to: string; toName?: string; subject: string; html: string; text: string };

export async function sendMail(mail: Mail) {
  if (!config.mail.brevoKey) {
    if (process.env.VERCEL) {
      console.warn(`Email not sent (BREVO_API_KEY not set): ${mail.subject} -> ${mail.to}`);
      return;
    }
    const dir = path.join(process.cwd(), ".mail");
    await mkdir(dir, { recursive: true });
    const file = `${new Date().toISOString().replace(/[:.]/g, "-")}-${mail.subject.replace(/[^\w]+/g, "-").slice(0, 60)}.html`;
    await writeFile(path.join(dir, file), `<!-- To: ${esc(mail.to)} -->\n${mail.html}`);
    console.info(`Email saved to .mail/${file} (BREVO_API_KEY not set)`);
    return;
  }

  const res = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": config.mail.brevoKey, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender: { email: config.mail.fromAddress, name: config.mail.fromName },
      to: [{ email: mail.to, ...(mail.toName ? { name: mail.toName } : {}) }],
      subject: mail.subject,
      htmlContent: mail.html,
      textContent: mail.text,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Brevo ${res.status}: ${await res.text().catch(() => "")}`);
}

/**
 * After checkout: the receipt link to the shopper (so closing the tab doesn't lose it) and a heads-up
 * to the shop. A mail failure is logged and never undoes the order.
 */
export async function sendOrderEmails(order: Order, items: OrderItem[]) {
  try {
    await sendMail(await receiptEmail(order, items));
  } catch (err) {
    console.error("Receipt email failed", err);
  }
  const to = await notifyEmail();
  if (!to) return;
  try {
    await sendMail({ ...newOrderEmail(order, items), to });
  } catch (err) {
    console.error("New-order email failed", err);
  }
}

const rp = (n: number) => `Rp ${digits(n)}`;
const courier = (o: Order) => [courierName(o.shipping_courier), o.shipping_service].filter(Boolean).join(" ");
const deadline = (o: Order) => (o.expires_at ? `${clock(o.expires_at)} WITA, ${longDate(o.expires_at)}` : "");

export async function receiptEmail(order: Order, items: OrderItem[]): Promise<Mail> {
  const receiptUrl = `${config.storefrontUrl}/pesanan/${order.code}`;
  const accounts = await bankAccounts();
  const wa = await whatsappUrl(`Halo Masempo Mart, ini bukti transfer untuk pesanan ${order.code} (Rp ${digits(order.total)}).`);

  const html = layout(`
    <h1 style="${H1}">Pesananmu sudah kami terima</h1>
    <p style="${P}">Halo ${esc(order.customer_name)}, terima kasih sudah belanja di Masempo Mart. Stok pesananmu kami tahan sampai <strong>${esc(deadline(order))}</strong>.</p>
    ${itemsTable(order, items, "Total transfer")}
    ${
      accounts.length
        ? `<p style="${P}"><strong>Transfer tepat ${rp(order.total)}</strong> ke:</p>
           <ul style="margin:0 0 16px;padding-left:20px;${TEXT}">${accounts
             .map((a) => `<li><strong>${esc(a.bank)} ${esc(a.account_number)}</strong> a.n. ${esc(a.account_name)}</li>`)
             .join("")}</ul>
           <p style="${P}">Angka terakhirnya kode unik, supaya transfermu langsung ketemu pesanan ini. Tanpa biaya admin.</p>`
        : ""
    }
    <p style="${P}">Setelah transfer, kirim bukti transfernya lewat WhatsApp. Struk berubah jadi lunas setelah kami cek.</p>
    ${button(receiptUrl, "Lihat struk")}
    ${wa ? `<p style="${P}">Sudah transfer? <a href="${esc(wa)}" style="color:#0f7a3d">Kirim bukti transfer via WhatsApp</a></p>` : ""}
    <p style="${P}">Salam,<br>Masempo Mart</p>`);

  const text = [
    `Pesananmu sudah kami terima (${order.code}).`,
    `Transfer tepat ${rp(order.total)} sebelum ${deadline(order)}.`,
    ...accounts.map((a) => `${a.bank} ${a.account_number} a.n. ${a.account_name}`),
    `Struk: ${receiptUrl}`,
    wa ? `Kirim bukti transfer: ${wa}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { to: order.email, toName: order.customer_name, subject: `Struk pesanan ${order.code} · Masempo Mart`, html, text };
}

export function newOrderEmail(order: Order, items: OrderItem[]): Omit<Mail, "to"> {
  const adminUrl = `${config.adminUrl}/orders/${order.id}`;
  const place = [order.subdistrict, order.district, order.city, order.province].filter(Boolean).join(", ");

  const html = layout(`
    <h1 style="${H1}">Pesanan baru ${esc(order.code)}</h1>
    <p style="${P}">Cari transfer <strong>${rp(order.total)}</strong> di rekening (kode unik ${order.unique_code}), sebelum ${esc(order.expires_at ? clock(order.expires_at) : "")} WITA. Setelah masuk, buka pesanan dan klik <strong>Tandai lunas</strong>.</p>
    ${itemsTable(order, items, "Total")}
    <p style="${P}"><strong>Kirim ke</strong><br>
      ${esc(order.customer_name)} · <a href="https://wa.me/${esc(phoneToWa(order.phone))}" style="color:#0f7a3d">${esc(order.phone)}</a><br>
      ${esc(order.address)}<br>${esc(place)} ${esc(order.postal_code)}<br>
      Berat paket ${(order.weight_grams / 1000).toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kg
      ${order.note ? `<br>Catatan: ${esc(order.note)}` : ""}</p>
    ${button(adminUrl, "Buka di admin")}`);

  const text = [`Pesanan baru ${order.code}: transfer ${rp(order.total)} (kode unik ${order.unique_code}).`, `${order.customer_name}, ${place}`, adminUrl].join("\n");
  return { subject: `Pesanan baru ${order.code} · ${rp(order.total)}`, html, text };
}

// Inline styles: mail apps ignore stylesheets. Colours and type follow the storefront.
const TEXT = "font-family:Helvetica,Arial,sans-serif;font-size:15px;line-height:1.6;color:#191a17";
const P = `margin:0 0 16px;${TEXT}`;
const H1 = "margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;font-size:20px;color:#191a17";
const TD = `padding:8px 0;border-bottom:1px solid #e3e3dd;${TEXT}`;

function itemsTable(order: Order, items: OrderItem[], totalLabel: string) {
  const row = (label: string, qty: string, amount: string, strong = false) =>
    `<tr><td style="${TD}">${strong ? `<strong>${label}</strong>` : label}</td><td style="${TD};text-align:center">${qty}</td><td style="${TD};text-align:right">${strong ? `<strong>${amount}</strong>` : amount}</td></tr>`;
  const ship = courier(order);
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse">
    <tr><th align="left" style="${TD};font-weight:700">Item</th><th style="${TD};font-weight:700">Jml</th><th align="right" style="${TD};font-weight:700">Harga</th></tr>
    ${items.map((i) => row(`${esc(i.name)} · ${esc(i.variant_name)}`, String(i.quantity), rp(i.price * i.quantity))).join("")}
    ${row(`Ongkir${ship ? ` (${esc(ship)})` : ""}`, "", order.shipping === 0 ? "Gratis" : rp(order.shipping))}
    ${order.unique_code ? row("Kode unik", "", rp(order.unique_code)) : ""}
    ${row(totalLabel, "", rp(order.total), true)}
  </table>`;
}

const button = (href: string, label: string) =>
  `<p style="margin:8px 0 24px;text-align:center"><a href="${esc(href)}" style="display:inline-block;background:#0f7a3d;color:#ffffff;text-decoration:none;font-family:Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;padding:12px 24px;border-radius:6px">${esc(label)}</a></p>`;

const layout = (body: string) => `<!doctype html><html lang="id"><body style="margin:0;padding:24px 12px;background:#f7f6f2">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
      <tr><td style="padding:8px 0 20px;text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:13px;font-weight:700;letter-spacing:0.28em;color:#191a17">
        <a href="${esc(config.storefrontUrl)}" style="color:#191a17;text-decoration:none">MASEMPO MART</a></td></tr>
      <tr><td style="background:#ffffff;border:1px solid #e3e3dd;border-radius:16px;padding:28px">${body}</td></tr>
      <tr><td style="padding:20px 0;text-align:center;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:#5c5d57">© ${new Date().getFullYear()} Masempo Mart · Produk olahan Bone</td></tr>
    </table>
  </td></tr></table>
</body></html>`;
