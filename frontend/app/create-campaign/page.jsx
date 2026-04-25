// frontend/app/create-campaign/page.js
"use client";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useActionState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { launchBusinessCampaign } from "@/lib/launchCampaign";
import { saveDraftCampaign } from "@/lib/action";
import {
  Upload, Target, Calendar, DollarSign,
  Loader2, CheckCircle, FileText, AlertCircle,
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
    image: "null",
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

// ── Single document upload widget ──────────────────────────────────────────
export function DocUpload({ docKey, label, hint, accept, required, onUploaded }) {
  const [cid, setCid] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    setError("");
    setCid("");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", `${docKey}-${file.name}`);

      const res = await fetch("/api/ipfs-upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      setCid(json.cid);
      onUploaded(docKey, json.cid);   // notify parent
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-300 mb-1 uppercase tracking-wider">
        {label}
      </label>
      <p className="text-xs text-gray-500 mb-2">{hint}</p>

      <div className="border-2 border-dashed border-white/10 rounded-xl p-5 text-center hover:border-[#6f42c1]/50 transition bg-[#0d1117]">
        {uploading ? (
          <div className="flex flex-col items-center gap-1">
            <Loader2 className="h-6 w-6 text-[#a78bfa] animate-spin" />
            <p className="text-xs text-gray-400">Uploading to IPFS…</p>
          </div>
        ) : cid ? (
          <div className="flex flex-col items-center gap-1">
            <CheckCircle className="h-6 w-6 text-green-400" />
            <p className="text-xs text-green-400 font-medium">Stored on IPFS</p>
            <p className="text-[10px] text-gray-600 font-mono break-all">{cid}</p>
            <label
              htmlFor={`doc-${docKey}`}
              className="text-xs text-[#a78bfa] cursor-pointer mt-1"
            >
              Replace file
            </label>
          </div>
        ) : (
          <label htmlFor={`doc-${docKey}`} className="cursor-pointer">
            <FileText className="h-7 w-7 text-gray-600 mx-auto mb-2" />
            <span className="text-[#a78bfa] text-sm font-semibold hover:text-white transition">
              Click to upload
            </span>
            <p className="text-xs text-gray-600 mt-1">
              {accept.replace(/,/g, " / ").replace(/image\/\*/g, "images")}
            </p>
          </label>
        )}

        <input
          data-testid="file-input"
          id={`doc-${docKey}`}
          type="file"
          accept={accept}
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {error && (
        <p className="flex items-center gap-1 text-xs text-red-400 mt-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}

      {/* Hidden input so FormData picks up the CID */}
      <input type="hidden" name={docKey} value={cid} />
    </div>
  );
}

export function CreateCampaignForm() {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(
    launchBusinessCampaign,
    null
  );

  const searchParams = useSearchParams();

  const draftCampaign = useMemo(() => {
  const isEditMode = searchParams.get("idedit") === "true";
  const campaignId = searchParams.get("campaignId");

  if (!isEditMode || !campaignId) return null;

  return {
    id: campaignId,
    title: searchParams.get("title") ?? "",
    description: searchParams.get("description") ?? "",
    funding_goal: searchParams.get("goal") ?? "",
    duration: searchParams.get("duration") ?? "",
    category: searchParams.get("category") ?? "",
    image_url: searchParams.get("image_url") ?? "",
  };
}, [searchParams]);

  const [formData, setFormData] = useState(() =>
    getInitialFormState(draftCampaign),
  );

  // Track CIDs from each doc widget
  const [docCids, setDocCids] = useState({
    pitch_deck_cid: "",
    business_plan_cid: "",
    financials_cid: "",
    use_of_funds_cid: "",
    product_demo_cid: "",
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
      if (!formData.goal) throw new Error("Funding goal is required");
      if (!formData.duration) throw new Error("Campaign duration is required");
      if (!formData.category) throw new Error("Category is required");
      if (!imageUrl) throw new Error("Campaign cover image is required");

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

  const categories = [
    "Technology", "Art", "Music", "Film", "Games",
    "Food", "Fashion", "Education", "Environment", "Health",
  ];

  const inputClass =
    "w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6f42c1] focus:border-transparent transition text-sm";

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
                    placeholder="0.00" step="0.01" min="0" required />
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
                  <DocUpload
                    key={doc.key}
                    docKey={doc.key}
                    label={doc.label}
                    hint={doc.hint}
                    accept={doc.accept}
                    required={doc.required}
                    onUploaded={handleDocUploaded}
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

            {/* ── Submit ─────────────────────────────────────── */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending || imageUploading || requiredDocsMissing.length > 0}
                className="flex-1 bg-[#6f42c1] hover:bg-[#5a3599] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-full transition flex items-center justify-center gap-2 text-sm"
              >
                <Target className="h-4 w-4" />
                {isPending ? "Creating on Blockchain…" : "Launch Campaign"}
              </button>
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
