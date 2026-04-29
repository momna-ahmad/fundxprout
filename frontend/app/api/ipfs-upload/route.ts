//frontend/app/api/ipfs-upload/route.ts
//purpose of this file is to handle the POST request to upload a file to IPFS using Pinata's API. It receives a file and an optional name from the request, uploads the file to Pinata, and returns the CID and URL of the uploaded file. If any errors occur during the process, it returns an appropriate error message.
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File | null;
        const fileName = (formData.get("name") as string) ?? "document";

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const blob = new Blob([bytes], { type: file.type });

        const pinataForm = new FormData();
        pinataForm.append("file", blob, fileName);
        pinataForm.append(
            "pinataMetadata",
            JSON.stringify({ name: `fundxprout-${fileName}` })
        );

        const res = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
            method: "POST",
            headers: {
                Authorization: `Bearer ${process.env.PINATA_JWT}`,
            },
            body: pinataForm,
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(`Pinata error: ${err}`);
        }

        const data = await res.json();
        return NextResponse.json({
            cid: data.IpfsHash,
            url: `https://gateway.pinata.cloud/ipfs/${data.IpfsHash}`,
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
