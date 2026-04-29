//frontend/app/api/upload/route.ts
//purpose: handle image uploads to Cloudinary from the frontend campaign form. Returns the uploaded image URL and public ID for database storage.
import { v2 as cloudinary } from "cloudinary";
import { NextRequest, NextResponse } from "next/server";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Convert the File to a Buffer
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Upload buffer to Cloudinary
    const result = await new Promise<{ secure_url: string; public_id: string }>(
      (resolve, reject) => {
        cloudinary.uploader
          .upload_stream(
            {
              folder: "fundxprout/campaigns",
              resource_type: "image",
              // Optional: auto-generate a unique filename
              use_filename: true,
              unique_filename: true,
            },
            (error, result) => {
              if (error || !result) reject(error ?? new Error("Upload failed"));
              else resolve(result as { secure_url: string; public_id: string });
            },
          )
          .end(buffer);
      },
    );

    return NextResponse.json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (error: any) {
    console.error("Cloudinary upload error:", error);
    return NextResponse.json(
      { error: error.message ?? "Upload failed" },
      { status: 500 },
    );
  }
}
