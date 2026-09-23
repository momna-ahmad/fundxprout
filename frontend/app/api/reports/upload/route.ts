import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: "Unauthorized. Please sign in." },
        { status: 401 }
      );
    }

    // 2. Parse incoming FormData
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const campaignIdRaw = formData.get("campaign_id") as string | null;
    const fiscalYearRaw = formData.get("fiscalYear") as string | null;
    const periodLabel = formData.get("periodLabel") as string | null;

    const grossRevenueRaw = formData.get("grossRevenue") as string | null;
    const operatingExpensesRaw = formData.get("operatingExpenses") as string | null;
    const netIncomeRaw = formData.get("netIncome") as string | null;
    const beginningCashRaw = formData.get("beginningCash") as string | null;
    const operatingCashFlowRaw = formData.get("operatingCashFlow") as string | null;
    const endingCashRaw = formData.get("endingCash") as string | null;

    const officerName = formData.get("officerName") as string | null;
    const officerTitle = formData.get("officerTitle") as string | null;
    const isAudited = formData.get("isAudited") === "true";
    const certifiedAccurate = formData.get("certifiedAccurate") === "true";

    // 3. Input Validation
    if (!campaignIdRaw || isNaN(Number(campaignIdRaw))) {
      return NextResponse.json(
        { error: "A valid campaign ID is required." },
        { status: 400 }
      );
    }
    const campaignId = Number(campaignIdRaw);

    if (!file || file.type !== "application/pdf") {
      return NextResponse.json(
        { error: "A valid PDF file is required." },
        { status: 400 }
      );
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File size exceeds the 25MB limit." },
        { status: 400 }
      );
    }

    if (!certifiedAccurate || !officerName?.trim() || !officerTitle?.trim()) {
      return NextResponse.json(
        { error: "Officer attestation and certification are required." },
        { status: 400 }
      );
    }

    // Parse numeric fields
    const fiscalYear = parseInt(fiscalYearRaw || "", 10);
    const grossRevenue = parseFloat(grossRevenueRaw || "");
    const operatingExpenses = parseFloat(operatingExpensesRaw || "");
    const netIncome = parseFloat(netIncomeRaw || "");
    const beginningCash = parseFloat(beginningCashRaw || "");
    const operatingCashFlow = parseFloat(operatingCashFlowRaw || "");
    const endingCash = parseFloat(endingCashRaw || "");

    const numericFields = [
      fiscalYear,
      grossRevenue,
      operatingExpenses,
      netIncome,
      beginningCash,
      operatingCashFlow,
      endingCash,
    ];

    if (numericFields.some((val) => isNaN(val))) {
      return NextResponse.json(
        { error: "All financial metric inputs must be valid numbers." },
        { status: 400 }
      );
    }

    if (endingCash < 0) {
      return NextResponse.json(
        { error: "Ending cash balance cannot be negative." },
        { status: 400 }
      );
    }

    // 4. Verify ownership & campaign state in Supabase
    const { data: campaign, error: campaignError } = await supabase
      .from("campaigns")
      .select("id, owner, status")
      .eq("id", campaignId)
      .maybeSingle();

    if (campaignError || !campaign) {
      return NextResponse.json(
        { error: "Campaign not found." },
        { status: 404 }
      );
    }

    const campaignOwner = campaign.owner ;
    if (campaignOwner !== user.id) {
      return NextResponse.json(
        { error: "You are not authorized to upload filings for this campaign." },
        { status: 403 }
      );
    }

    // 5. Read file buffer & verify PDF magic bytes + SHA-256 hash
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Verify first 4 bytes are %PDF
    const isRealPdf = buffer.slice(0, 4).toString() === "%PDF";
    if (!isRealPdf) {
      return NextResponse.json(
        { error: "Corrupted or invalid file format. Must be a genuine PDF." },
        { status: 400 }
      );
    }

    // Calculate SHA-256 checksum for tamper-proofing
    const sha256Hash = crypto.createHash("sha256").update(buffer).digest("hex");

    // 6. Upload PDF to Supabase Storage
    const sanitizedPeriod = (periodLabel || "report").replace(/[^a-zA-Z0-9_-]/g, "_");
    const storagePath = `${user.id}/${campaignId}/${fiscalYear}_${sanitizedPeriod}_${Date.now()}.pdf`;

    const { error: storageError } = await supabase.storage
      .from("financial-reports")
      .upload(storagePath, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (storageError) {
      console.error("[Storage Upload Error]:", storageError.message);
      return NextResponse.json(
        { error: "Failed to store report file: " + storageError.message },
        { status: 500 }
      );
    }

    // 7. Insert metadata into public.campaign_financial_reports
    const { data: reportRecord, error: dbError } = await supabase
      .from("campaign_financial_reports")
      .insert({
        campaign_id: campaignId,
        fiscal_year: fiscalYear,
        period_label: periodLabel,
        file_url: storagePath,
        storage_path: storagePath,
        file_hash_sha256: sha256Hash,
        gross_revenue: grossRevenue,
        burn_rate: operatingExpenses,
        net_income_loss: netIncome,
        beginning_cash: beginningCash,
        operating_cash_flow: operatingCashFlow,
        ending_cash: endingCash,
        is_audited: isAudited,
        submitted_by: user.id,
        status: "pending_review",
      })
      .select()
      .maybeSingle();

    if (dbError) {
      console.error("[Database Insert Error]:", dbError.message);
      // Clean up orphaned storage file if DB write fails
      await supabase.storage.from("financial-reports").remove([storagePath]);

      return NextResponse.json(
        { error: "Failed to create financial report entry: " + dbError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        reportId: reportRecord?.id,
        message: "Financial disclosure successfully submitted for verification.",
      },
      { status: 201 }
    );
  } catch (err: any) {
    console.error("[API Upload Error]:", err);
    return NextResponse.json(
      { error: err.message || "Internal server error." },
      { status: 500 }
    );
  }
}