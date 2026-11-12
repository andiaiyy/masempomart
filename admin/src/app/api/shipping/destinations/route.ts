import { NextResponse } from "next/server";
import { clientIp, handle, rateLimit, validationError } from "@/lib/http";
import { destinations } from "@/lib/rajaongkir";

/** Kecamatan / kelurahan for the address field, from RajaOngkir: ?search= (3+ letters or a postal code) */
export const GET = (req: Request) =>
  handle(async () => {
    rateLimit(`shipping:${clientIp(req.headers)}`, 90);
    const search = (new URL(req.url).searchParams.get("search") ?? "").trim();
    if (search.length < 3 || search.length > 60) throw validationError({ search: ["Ketik minimal 3 huruf."] });
    return NextResponse.json({ data: await destinations(search) });
  });
