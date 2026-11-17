import { NextRequest, NextResponse } from "next/server";

import {
  validateServerFileSignature,
  isServerDocumentKind,
} from "@/utils/serverDocumentValidation";

export const runtime = "nodejs";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get("file");
    const fileName = formData.get("name");
    const docKey = formData.get("docKey");

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "No valid file provided." },
        { status: 400 },
      );
    }

    if (file.size === 0) {
      return NextResponse.json(
        { error: "The uploaded file is empty." },
        { status: 400 },
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: "File exceeds the 20 MB limit." },
        { status: 413 },
      );
    }

    const normalizedDocKey = typeof docKey === "string" && docKey.trim() ? docKey.trim() : "document";

    if (!isServerDocumentKind(normalizedDocKey)) {
      return NextResponse.json(
        { error: "Invalid document type." },
        { status: 400 },
      );
    }

    const signatureValidation = await validateServerFileSignature(file);

    if (!signatureValidation.valid) {
      return NextResponse.json(
        { error: signatureValidation.error },
        { status: 400 },
      );
    }

    const safeFileName =
      typeof fileName === "string" && fileName.trim()
        ? fileName
        : `${normalizedDocKey}-${file.name}`;

    const pinataJwt = process.env.PINATA_JWT;

    if (!pinataJwt) {
      throw new Error("Pinata credentials are not configured.");
    }

    const pinataForm = new FormData();

    pinataForm.append("file", file, safeFileName);

    pinataForm.append(
      "pinataMetadata",
      JSON.stringify({
        name: `fundxprout-${safeFileName}`,
      }),
    );

    const response = await fetch(
      "https://api.pinata.cloud/pinning/pinFileToIPFS",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${pinataJwt}`,
        },
        body: pinataForm,
      },
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error("Pinata upload failed:", {
        status: response.status,
        response: errorText,
      });

      return NextResponse.json(
        { error: "IPFS provider rejected the upload." },
        { status: 502 },
      );
    }

    const data = await response.json();

    return NextResponse.json({
      cid: data.IpfsHash,
      url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
    });
  } catch (error) {
    console.error("IPFS upload error:", error);

    return NextResponse.json(
      { error: "An internal error occurred during IPFS upload." },
      { status: 500 },
    );
  }
}
