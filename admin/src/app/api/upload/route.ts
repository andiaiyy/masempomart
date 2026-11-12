import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { currentAdmin } from "@/lib/auth";

// Hands the browser a short-lived token to upload a product photo straight to Vercel Blob, which
// avoids Vercel's 4.5 MB request limit. Only signed-in admins get a token. (As in Karueng.)
export async function POST(req: Request) {
  try {
    const result = await handleUpload({
      body: (await req.json()) as HandleUploadBody,
      request: req,
      onBeforeGenerateToken: async () => {
        if (!(await currentAdmin())) throw new Error("Silakan masuk dulu.");
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
          maximumSizeInBytes: 10 * 1024 * 1024,
          addRandomSuffix: true,
        };
      },
      onUploadCompleted: async () => {},
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ message: (err as Error).message }, { status: 400 });
  }
}
