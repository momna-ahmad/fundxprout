// frontend/app/create-campaign/page.js
"use client";
import { Suspense, useEffect, useState } from "react";
import { useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { launchBusinessCampaign } from "@/lib/launchCampaign";
import { saveDraftCampaign } from "@/lib/action";
import CampaignStatusButton from "@/components/campaign-status-button";
import CampaignDocUpload from "@/components/campaign-doc-upload";
import { getMyProfile } from "@/utils/supabase/getProfile";
import { getCampaignById } from "@/utils/supabase/getCampaigns";
import {
  Upload, Calendar, DollarSign,
  Loader2, CheckCircle, Coins
} from "lucide-react";
import Image from "next/image";

function getInitialFormState(draftCampaign) {
  return {
    title: draftCampaign?.title ?? "",
    description: draftCampaign?.description ?? "",
    goal:
      draftCampaign?.goal ??
      draftCampaign?.funding_goal ??
      "",
    duration: draftCampaign?.duration ?? "",
    category: draftCampaign?.category ?? "",
    tokenSymbol:  draftCampaign?.token_symbol ?? draftCampaign?.tokenSymbol ?? "",
    pricePerToken: draftCampaign?.price_per_token ?? draftCampaign?.pricePerToken ?? "",
    valuation: draftCampaign?.valuation ?? "",

  };
}

// ── Document upload field config (international standard) ──────────────────
const CAMPAIGN_DOCS = [
  {
    key: "pitch_deck_cid",
    label: "Pitch Deck *",
    hint: "Your core investor presentation (required)",
    accept: ".pdf",
    required: true,
  },
  {
    key: "business_plan_cid",
    label: "Business Plan *",
    hint: "Detailed strategy, operations, and market analysis (required)",
    accept: ".pdf",
    required: true,
  },
  {
    key: "financials_cid",
    label: "Financial Projections (3–5 Years) *",
    hint: "Revenue model, cost structure, and ROI projections (required)",
    accept: ".pdf",
    required: true,
  },
  {
    key: "use_of_funds_cid",
    label: "Use of Funds Breakdown *",
    hint: "How exactly the raised capital will be spent (required)",
    accept: ".pdf",
    required: true,
  },
  {
    key: "product_demo_cid",
    label: "Product / Service Demo",
    hint: "Screenshots, prototype images, or supporting media (optional)",
    accept: ".pdf,image/*",
    required: false,
  },
];

export { default as DocUpload } from "@/components/campaign-doc-upload";

export function CreateCampaignForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    launchBusinessCampaign,
    null
  );

  const searchParams = useSearchParams();
  const campaignId = searchParams.get("campaignId");

  const [checkingKyb, setCheckingKyb] = useState(true);
  const [draftCampaign, setDraftCampaign] = useState(null);
  const [campaignLoading, setCampaignLoading] = useState(Boolean(campaignId));

  useEffect(() => {
    async function checkBusinessVerification() {
      const profile = await getMyProfile();
      // If no business or business is not KYB verified, block them
      if (!profile?.businesses?.[0]?.kyb_verified) {
        alert("You must verify your business with Didit on the Profile page before creating a campaign.");
        router.push("/profile");
      } else {
        setCheckingKyb(false);
      }
    }
    checkBusinessVerification();
  }, [router]);

  useEffect(() => {
    if (!campaignId) {
      setDraftCampaign(null);
      setCampaignLoading(false);
      return;
    }

    let cancelled = false;

    async function loadCampaign() {
      setCampaignLoading(true);
      const campaign = await getCampaignById(campaignId);

      if (cancelled) return;

      if (!campaign) {
        alert("Campaign could not be found.");
        router.push("/dashboard");
        return;
      }

      setDraftCampaign(campaign);
      setCampaignLoading(false);
    }

    loadCampaign();

    return () => {
      cancelled = true;
    };
  }, [campaignId, router]);

  const [formData, setFormData] = useState(() =>
    getInitialFormState(draftCampaign),
  );

  // Track CIDs from each doc widget
  const [docCids, setDocCids] = useState({
    pitch_deck_cid: draftCampaign?.pitch_deck_cid ?? "",
    business_plan_cid: draftCampaign?.business_plan_cid ?? "",
    financials_cid: draftCampaign?.financials_cid ?? "",
    use_of_funds_cid: draftCampaign?.use_of_funds_cid ?? "",
    product_demo_cid: draftCampaign?.product_demo_cid ?? "",
  });

  // Campaign cover image (Cloudinary — unchanged from before)
  const [imageUrl, setImageUrl] = useState(draftCampaign?.image_url ?? "");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");
  const [draftSaving, setDraftSaving] = useState(false);
  const [draftMessage, setDraftMessage] = useState("");

  useEffect(() => {
    setFormData(getInitialFormState(draftCampaign));
    setImageUrl(draftCampaign?.image_url ?? "");
    setDocCids({
      pitch_deck_cid: draftCampaign?.pitch_deck_cid ?? "",
      business_plan_cid: draftCampaign?.business_plan_cid ?? "",
      financials_cid: draftCampaign?.financials_cid ?? "",
      use_of_funds_cid: draftCampaign?.use_of_funds_cid ?? "",
      product_demo_cid: draftCampaign?.product_demo_cid ?? "",
    });
  }, [draftCampaign]);

  useEffect(() => {
    if (state?.success) {
      router.push("/dashboard");
    }
  }, [state, router]);

  useEffect(() => {
    if (state?.error) {
      alert(state.error);
    }
  }, [state]);

  const handleDocUploaded = (key, cid) =>
    setDocCids((prev) => ({ ...prev, [key]: cid }));

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageUploading(true);
    setImageUploadError("");
    setImageUrl("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setImageUrl(json.url);
    } catch (err) {
      setImageUploadError(err.message);
    } finally {
      setImageUploading(false);
    }
  };

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    setDraftSaving(true);
    setDraftMessage("");

    try {
      // Validate required fields
      if (!formData.title.trim()) throw new Error("Campaign title is required");
      if (!formData.description.trim()) throw new Error("Campaign description is required");
      if (!formData.goal || Number(formData.goal) <= 0) {
        throw new Error("Funding goal must be greater than zero");
      }
      if (!formData.duration) throw new Error("Campaign duration is required");
      if (!formData.category) throw new Error("Category is required");
      if (!imageUrl) throw new Error("Campaign cover image is required");
      if (!formData.tokenSymbol.trim()) throw new Error("Token Symbol is required");
      if (!formData.pricePerToken) throw new Error("Price per token is required");

      // Call server action to save draft
      const result = await saveDraftCampaign({
        campaignId: draftCampaign?.id,
        title: formData.title,
        description: formData.description,
        goal: formData.goal,
        duration: formData.duration,
        category: formData.category,
        imageUrl: imageUrl,
        pitchDeckCid: docCids.pitch_deck_cid,
        businessPlanCid: docCids.business_plan_cid,
        financialsCid: docCids.financials_cid,
        useOfFundsCid: docCids.use_of_funds_cid,
        productDemoCid: docCids.product_demo_cid,
        tokenSymbol: formData.tokenSymbol,
        pricePerToken: formData.pricePerToken,
        valuation: formData.valuation,
      });

      if (result.error) {
        throw new Error(result.error);
      }

      router.push("/dashboard");
      return;
    } catch (err) {
      setDraftMessage({ type: "error", text: err.message });
    } finally {
      setDraftSaving(false);
    }
  };

  // Check all required docs are uploaded before allowing submit
  const requiredDocsMissing = CAMPAIGN_DOCS.filter(
    (d) => d.required && !docCids[d.key]
  );

  const requiredCampaignFields = [
    formData.title,
    formData.description,
    formData.goal,
    formData.duration,
    formData.category,
    formData.tokenSymbol,
    formData.pricePerToken,
    formData.valuation,
    imageUrl,
    ...CAMPAIGN_DOCS.filter((doc) => doc.required).map((doc) => docCids[doc.key]),
  ];
  const completedFields = requiredCampaignFields.filter(
    (value) => value !== null && value !== undefined && String(value).trim() !== "",
  ).length;
  const campaignCompletion = Math.round(
    (completedFields / requiredCampaignFields.length) * 100,
  );
  const isCampaignComplete = campaignCompletion === 100;

  const categories = [
    "Technology", "Art", "Music", "Film", "Games",
    "Food", "Fashion", "Education", "Environment", "Health",
  ];

  const inputClass =
    "w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6f42c1] focus:border-transparent transition text-sm";

  if (checkingKyb || campaignLoading) {
    return (
      <div className="min-h-screen bg-[#181A2A] py-8 pt-24 flex flex-col items-center justify-center text-gray-400">
        <Loader2 className="h-8 w-8 animate-spin mb-4 text-[#a78bfa]" />
        <p>{campaignLoading ? "Loading Campaign..." : "Checking Business Verification Status..."}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#181A2A] py-8 pt-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#1a2030] rounded-3xl border border-white/5 p-8 space-y-8">

          {draftMessage && (
            <div className={`p-4 rounded-xl text-sm ${
              draftMessage.type === "success"
                ? "bg-green-500/10 border border-green-500/20 text-green-400"
                : "bg-red-500/10 border border-red-500/20 text-red-400"
            }`}>
              {draftMessage.text}
            </div>
          )}

          <div>
            <h1 className="text-3xl font-black text-white mb-1">Create Your Campaign</h1>
            <p className="text-gray-400 text-sm">
              All documents are stored on IPFS for transparent, tamper-proof investor access.
            </p>
          </div>

          <form action={formAction} className="space-y-6">
            {draftCampaign?.id && (
              <input type="hidden" name="campaign_id" value={draftCampaign.id} />
            )}

            {/* ── Basic Info ─────────────────────────────────── */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                Campaign Title *
              </label>
              <input type="text" name="title" value={formData.title}
                onChange={handleInputChange} className={inputClass}
                placeholder="Give your campaign a compelling title" required />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                Campaign Description *
              </label>
              <textarea name="description" value={formData.description}
                onChange={handleInputChange} rows={5}
                className={inputClass + " resize-none"}
                placeholder="Brief summary shown to investors on the campaign card"
                required />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                  Funding Goal (ETH) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input type="number" name="goal" value={formData.goal}
                    onChange={handleInputChange} className={inputClass + " pl-10"}
                    placeholder="0.00" step="any" required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                  Duration (days) *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input type="number" name="duration" value={formData.duration}
                    onChange={handleInputChange} className={inputClass + " pl-10"}
                    placeholder="30" min="1" max="90" required />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                Pre-launch Business Valuation (ETH) *
              </label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                <input type="number" name="valuation" value={formData.valuation || ""}
                  onChange={handleInputChange} className={inputClass + " pl-10"}
                  placeholder="e.g. 25" step="any" min="0" required />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                Category *
              </label>
              <select name="category" value={formData.category}
                onChange={handleInputChange} className={inputClass} required>
                <option value="" className="bg-[#1a2030]">Select a category</option>
                {categories.map((c) => (
                  <option key={c} value={c.toLowerCase()} className="bg-[#1a2030]">{c}</option>
                ))}
              </select>
            </div>

            {/* ── Token Mechanics (New Sections) ────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                  Equity Token Ticker Symbol *
                </label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input type="text" name="tokenSymbol" value={formData.tokenSymbol || ""}
                    onChange={handleInputChange} className={inputClass + " pl-10"}
                    placeholder="e.g. RON" maxLength={5} minLength={3} required />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                  Price Per Equity Token (ETH) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input type="number" name="pricePerToken" value={formData.pricePerToken || ""}
                    onChange={handleInputChange} className={inputClass + " pl-10"}
                    placeholder="e.g. 0.1" step="0.0001" min="0.0001" required />
                </div>
              </div>
            </div>

            {/* ── Cover Image (Cloudinary) ───────────────────── */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                Campaign Cover Image *
              </label>
              <div className="border-2 border-dashed border-white/10 rounded-xl p-6 text-center bg-[#0d1117]">
                {imageUrl && (
                  <div className="mb-3 relative w-full aspect-video rounded-lg overflow-hidden">
                    <Image src={imageUrl} alt="Campaign preview" fill className="object-cover" />
                  </div>
                )}
                {imageUploading ? (
                  <div className="flex flex-col items-center gap-1">
                    <Loader2 className="h-6 w-6 text-[#a78bfa] animate-spin" />
                    <p className="text-xs text-gray-400">Uploading…</p>
                  </div>
                ) : imageUrl ? (
                  <div className="flex flex-col items-center gap-1">
                    <CheckCircle className="h-6 w-6 text-green-400" />
                    <p className="text-xs text-green-400">Image uploaded</p>
                    <label htmlFor="image-upload" className="text-xs text-[#a78bfa] cursor-pointer">Replace</label>
                  </div>
                ) : (
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <Upload className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                    <span className="text-[#a78bfa] text-sm font-semibold">Click to upload</span>
                    <p className="text-xs text-gray-600 mt-1">PNG, JPG up to 10 MB</p>
                  </label>
                )}
                <input id="image-upload" type="file" accept="image/*"
                  className="hidden" onChange={handleImageUpload} />
                {imageUploadError && (
                  <p className="text-xs text-red-400 mt-1">{imageUploadError}</p>
                )}
              </div>
              <input type="hidden" name="image_url" value={imageUrl} />
            </div>

            {/* ── IPFS Documents Section ─────────────────────── */}
            <div>
              <h2 className="text-base font-bold text-white mb-1">
                Campaign Documents
              </h2>
              <p className="text-xs text-gray-500 mb-4">
                All documents are encrypted and stored on IPFS. Investors can verify
                authenticity via the content hash. Required fields are marked *.
              </p>

              <div className="space-y-5">
                {CAMPAIGN_DOCS.map((doc) => (
                  <CampaignDocUpload
                    key={doc.key}
                    docKey={doc.key}
                    label={doc.label}
                    hint={doc.hint}
                    accept={doc.accept}
                    required={doc.required}
                    onUploaded={handleDocUploaded}
                    formData={docCids}
                  />
                ))}
              </div>
            </div>

            {/* ── Required docs warning ──────────────────────── */}
            {requiredDocsMissing.length > 0 && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-400">
                ⚠️ Still required: {requiredDocsMissing.map((d) => d.label.replace(" *", "")).join(", ")}
              </div>
            )}

            {draftCampaign?.status === "draft" && (
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-gray-400">
                  <span>Campaign information complete</span>
                  <span>{campaignCompletion}%</span>
                </div>
                <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                  <div className="h-full bg-[#037dd6] transition-all" style={{ width: `${campaignCompletion}%` }} />
                </div>
              </div>
            )}

            {/* ── Submit ─────────────────────────────────────── */}
            <div className="flex gap-3 pt-2">
              <CampaignStatusButton
                status={draftCampaign?.status}
                campaignId={draftCampaign?.id}
                isComplete={!imageUploading && isCampaignComplete}
                isPending={isPending}
              />
              <button
                type="button"
                onClick={handleSaveDraft}
                disabled={draftSaving || imageUploading}
                className="px-6 py-3 border border-white/10 text-gray-300 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed rounded-full transition text-sm font-semibold flex items-center gap-2"
              >
                {draftSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Draft…
                  </>
                ) : (
                  "Save as Draft"
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// Default route page render (create flow)
export default function CreateCampaignPage() {

  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#181A2A] flex items-center justify-center text-white">
        Loading Form...
      </div>
    }>
      <CreateCampaignForm />
    </Suspense>
  );
}
