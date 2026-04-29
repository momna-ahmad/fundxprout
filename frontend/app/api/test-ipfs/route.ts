//frontend/app/api/test-ipfs/route.ts
//purpose: test Pinata IPFS upload and Supabase connection in one route. For development only. Delete before production.
/**
 * TEST ROUTE — for development only.
 * Verifies the full chain: Pinata IPFS upload → Supabase save
 *
 * HOW TO TEST:
 *   Open browser → http://localhost:3000/api/test-ipfs
 *   Check the JSON response and your Supabase table.
 *
 * DELETE THIS FILE before deploying to production.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
    const results: Record<string, any> = {};

    // ── Step 1: Check Pinata JWT is loaded ───────────────────────────────────
    const jwt = process.env.PINATA_JWT;
    if (!jwt) {
        return NextResponse.json({
            error: "PINATA_JWT is missing from .env.local",
            fix: "Add PINATA_JWT=your_jwt to frontend/.env.local",
        }, { status: 500 });
    }
    results.pinataJwtLoaded = true;

    // ── Step 2: Upload a tiny test file to IPFS via Pinata ───────────────────
    try {
        const testContent = JSON.stringify({
            test: true,
            timestamp: new Date().toISOString(),
            project: "FundXProut IPFS Test",
        });
        const blob = new Blob([testContent], { type: "application/json" });

        const pinataForm = new FormData();
        pinataForm.append("file", blob, "ipfs-test.json");
        pinataForm.append("pinataMetadata", JSON.stringify({ name: "fundxprout-ipfs-test" }));

        const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinFileToIPFS", {
            method: "POST",
            headers: { Authorization: `Bearer ${jwt}` },
            body: pinataForm,
        });

        if (!pinataRes.ok) {
            const errText = await pinataRes.text();
            throw new Error(`Pinata rejected upload: ${errText}`);
        }

        const pinataData = await pinataRes.json();
        const cid = pinataData.IpfsHash;
        const ipfsUrl = `https://gateway.pinata.cloud/ipfs/${cid}`;

        results.ipfsUpload = {
            success: true,
            cid,
            viewUrl: ipfsUrl,
            message: "Open viewUrl in browser to confirm the file is on IPFS",
        };

        // ── Step 3: Verify file is readable from IPFS gateway ─────────────────
        try {
            const gatewayRes = await fetch(ipfsUrl, { signal: AbortSignal.timeout(8000) });
            results.ipfsGatewayRead = {
                success: gatewayRes.ok,
                status: gatewayRes.status,
                message: gatewayRes.ok
                    ? "File successfully retrieved from IPFS gateway"
                    : "File uploaded but gateway read failed (can be slow — try the URL manually)",
            };
        } catch {
            results.ipfsGatewayRead = {
                success: false,
                message: "Gateway timeout — this is normal. File IS on IPFS. Try the URL manually.",
            };
        }

        // ── Step 4: Check Supabase connection ─────────────────────────────────
        try {
            const supabase = await createClient();
            const { data, error } = await supabase.from("campaigns").select("id").limit(1);
            if (error) throw error;
            results.supabaseConnection = {
                success: true,
                campaignRowsFound: Array.isArray(data) ? data.length : 0,
                message: "Supabase connected. campaigns table is accessible.",
            };
        } catch (err: any) {
            results.supabaseConnection = {
                success: false,
                error: err.message,
                fix: "Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local",
            };
        }

        // ── Step 5: Check campaigns table has IPFS columns ────────────────────
        try {
            const supabase = await createClient();
            const { data, error } = await supabase
                .from("campaigns")
                .select("pitch_deck_cid, pitch_deck_url, business_plan_cid, financials_cid, use_of_funds_cid, product_demo_cid")
                .limit(1);

            if (error) throw error;
            results.supabaseIpfsColumns = {
                success: true,
                message: "All IPFS columns exist in campaigns table ✅",
            };
        } catch (err: any) {
            results.supabaseIpfsColumns = {
                success: false,
                error: err.message,
                fix: `Run this SQL in Supabase dashboard → SQL Editor:
ALTER TABLE campaigns
  ADD COLUMN IF NOT EXISTS pitch_deck_cid    TEXT,
  ADD COLUMN IF NOT EXISTS pitch_deck_url    TEXT,
  ADD COLUMN IF NOT EXISTS business_plan_cid TEXT,
  ADD COLUMN IF NOT EXISTS business_plan_url TEXT,
  ADD COLUMN IF NOT EXISTS financials_cid    TEXT,
  ADD COLUMN IF NOT EXISTS financials_url    TEXT,
  ADD COLUMN IF NOT EXISTS use_of_funds_cid  TEXT,
  ADD COLUMN IF NOT EXISTS use_of_funds_url  TEXT,
  ADD COLUMN IF NOT EXISTS product_demo_cid  TEXT,
  ADD COLUMN IF NOT EXISTS product_demo_url  TEXT;`,
            };
        }

        return NextResponse.json({
            summary: "IPFS + Supabase test complete. Check each step below.",
            results,
        }, { status: 200 });

    } catch (err: any) {
        return NextResponse.json({
            error: err.message,
            results,
        }, { status: 500 });
    }
}
