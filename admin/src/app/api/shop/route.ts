import { NextResponse } from "next/server";
import { handle } from "@/lib/http";
import { instagramHandle, instagramUrl, whatsappUrl } from "@/lib/settings";

/** The shop's contact links for the storefront (WhatsApp and Instagram, from the Pengaturan page). */
export const GET = () =>
  handle(async () => {
    const instagram = await instagramUrl();
    return NextResponse.json({ whatsapp_url: await whatsappUrl(), instagram_url: instagram, instagram_handle: instagramHandle(instagram) });
  });
