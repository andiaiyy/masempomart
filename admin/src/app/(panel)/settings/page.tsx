import type { Metadata } from "next";
import { btn, Card, Field, Flash, input, PageHeader } from "@/components/ui";
import { config } from "@/lib/config";
import { origin } from "@/lib/rajaongkir";
import { bankAccounts, instagramUrl, notifyEmail, whatsapp } from "@/lib/settings";
import { saveBankAccounts, saveContact, saveOrigin } from "./actions";
import { BankRows, OriginPicker } from "./SettingsClient";

export const metadata: Metadata = { title: "Pengaturan" };

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ ok?: string; error?: string }> }) {
  const flash = await searchParams;
  const [accounts, wa, ig, email, from] = await Promise.all([bankAccounts(), whatsapp(), instagramUrl(), notifyEmail(), origin()]);

  const connections: [string, boolean, string][] = [
    ["RajaOngkir", Boolean(config.rajaongkir.key), "RAJAONGKIR_API_KEY"],
    ["Email (Brevo)", Boolean(config.mail.brevoKey && config.mail.fromAddress), "BREVO_API_KEY, MAIL_FROM_ADDRESS"],
    ["Foto (Vercel Blob)", Boolean(process.env.BLOB_READ_WRITE_TOKEN), "BLOB_READ_WRITE_TOKEN"],
  ];

  return (
    <>
      <PageHeader title="Pengaturan" subtitle="Rekening, kontak dan ongkir toko. Perubahan langsung dipakai toko." />
      <Flash ok={flash.ok} error={flash.error} />

      <div className="space-y-6">
        <Card id="rekening" title="Rekening tujuan transfer" description="Tampil di struk setiap pesanan yang belum dibayar dan di email struk.">
          <form action={saveBankAccounts} className="space-y-4">
            <BankRows initial={accounts} />
            <button className={btn}>Simpan rekening</button>
          </form>
        </Card>

        <Card id="kontak" title="Kontak">
          <form action={saveContact} className="grid gap-4 sm:grid-cols-2">
            <Field label="WhatsApp" hint="Nomor (0812…) atau link WhatsApp. Dengan nomor, pesan bukti transfer langsung terisi untuk pembeli.">
              <input name="payment_whatsapp" defaultValue={wa ?? ""} placeholder="0812 3456 7890 atau https://wa.me/…" className={input} />
            </Field>
            <Field label="Instagram" hint="Link profil atau @nama. Tampil di bawah halaman toko.">
              <input name="instagram_url" defaultValue={ig ?? ""} placeholder="https://www.instagram.com/masempo.mart" className={input} />
            </Field>
            <Field label="Email pesanan baru" hint="Dapat email untuk setiap pesanan: isi pesanan, alamat, dan jumlah transfer yang harus dicari." className="sm:col-span-2">
              <input name="order_notify_email" type="email" defaultValue={email ?? ""} placeholder="toko@contoh.com" className={`${input} max-w-md`} />
            </Field>
            <div>
              <button className={btn}>Simpan kontak</button>
            </div>
          </form>
        </Card>

        <Card id="ongkir" title="Asal pengiriman" description="Ongkir dihitung RajaOngkir dari kecamatan ini ke alamat pembeli.">
          {config.rajaongkir.key ? (
            <form action={saveOrigin} className="space-y-4">
              <OriginPicker current={from} />
              <button className={btn}>Simpan asal pengiriman</button>
            </form>
          ) : (
            <p className="text-sm text-danger">Isi RAJAONGKIR_API_KEY di environment dulu, lalu pilih asal pengiriman di sini.</p>
          )}
        </Card>

        <Card title="Sambungan" description="Diatur di environment (Vercel → Settings → Environment Variables), bukan di sini.">
          <ul className="divide-y divide-line text-sm">
            {connections.map(([name, ok, env]) => (
              <li key={name} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="font-medium">{name}</span>
                <span className={ok ? "font-semibold text-accent" : "text-muted"}>{ok ? "Tersambung" : `Belum: isi ${env}`}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
