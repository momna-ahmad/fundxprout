"use client";
// shafqaat — Creator Profile page: KYC/KYB document upload + basic info
// Route: /profile — meets international standards (Kickstarter, GoFundMe, SECP, FBR)
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User, FileText, CheckCircle, Loader2,
  AlertCircle, Camera, Building2, ArrowLeft, Save, ShieldCheck,
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { saveCreatorProfile } from "@/lib/action";
import { getMyProfile, calcProfileCompletion } from "@/utils/supabase/getProfile";

// shafqaat — IPFS document upload widget (reused from create-campaign pattern)
function DocUpload({ fieldKey, label, hint, accept, currentUrl, onUploaded, required = false }) {
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(!!currentUrl);
  const [cid, setCid] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => { if (currentUrl) setUploaded(true); }, [currentUrl]);

  const handleChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true); setErr("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("name", `profile-${fieldKey}-${file.name}`);
      const res = await fetch("/api/ipfs-upload", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Upload failed");
      setCid(json.cid);
      setUploaded(true);
      onUploaded(fieldKey, json.cid);
    } catch (e) { setErr(e.message); }
    finally { setUploading(false); }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-gray-300 mb-1 uppercase tracking-wider">
        {label} {required && <span className="text-[#a78bfa]">*</span>}
      </label>
      <p className="text-xs text-gray-600 mb-2">{hint}</p>
      <div className="border-2 border-dashed border-white/10 rounded-xl p-4 text-center hover:border-[#6f42c1]/40 transition bg-[#0d1117]">
        {uploading ? (
          <div className="flex flex-col items-center gap-1">
            <Loader2 className="h-5 w-5 text-[#a78bfa] animate-spin" />
            <p className="text-xs text-gray-400">Uploading to IPFS…</p>
          </div>
        ) : uploaded ? (
          <div className="flex flex-col items-center gap-1">
            <CheckCircle className="h-5 w-5 text-green-400" />
            <p className="text-xs text-green-400 font-medium">
              {currentUrl && !cid ? "Already on IPFS ✓" : "Stored on IPFS ✓"}
            </p>
            {currentUrl && (
              <a href={currentUrl} target="_blank" rel="noopener noreferrer"
                className="text-[10px] text-[#a78bfa] hover:underline">View document</a>
            )}
            <label htmlFor={`prof-${fieldKey}`} className="text-xs text-gray-500 cursor-pointer mt-1">Replace</label>
          </div>
        ) : (
          <label htmlFor={`prof-${fieldKey}`} className="cursor-pointer">
            <FileText className="h-6 w-6 text-gray-600 mx-auto mb-1" />
            <span className="text-[#a78bfa] text-xs font-semibold">Click to upload</span>
            <p className="text-[10px] text-gray-600 mt-0.5">{accept.replace(/,/g, " / ")}</p>
          </label>
        )}
        <input id={`prof-${fieldKey}`} type="file" accept={accept} className="hidden" onChange={handleChange} />
      </div>
      {err && <p className="flex items-center gap-1 text-xs text-red-400 mt-1"><AlertCircle className="h-3 w-3" />{err}</p>}
    </div>
  );
}

// shafqaat — Reusable text input
function Field({ label, name, value, onChange, type = "text", placeholder, hint, required = false, textarea = false }) {
  const cls = "w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6f42c1] transition text-sm";
  return (
    <div>
      <label className="block text-xs font-semibold text-gray-300 mb-1 uppercase tracking-wider">
        {label} {required && <span className="text-[#a78bfa]">*</span>}
      </label>
      {hint && <p className="text-xs text-gray-600 mb-2">{hint}</p>}
      {textarea ? (
        <textarea name={name} value={value} onChange={onChange} placeholder={placeholder} rows={3} className={cls + " resize-none"} />
      ) : (
        <input type={type} name={name} value={value} onChange={onChange} placeholder={placeholder} className={cls} />
      )}
    </div>
  );
}

// shafqaat — Section wrapper
function Section({ icon: Icon, title, description, children }) {
  return (
    <div className="bg-[#1a2030] rounded-2xl border border-white/5 p-6 space-y-5">
      <div className="flex items-center gap-3 pb-4 border-b border-white/10">
        <div className="p-2 rounded-xl bg-[#6f42c1]/20">
          <Icon className="h-5 w-5 text-[#a78bfa]" />
        </div>
        <div>
          <h2 className="text-base font-bold text-white">{title}</h2>
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      </div>
      {children}
    </div>
  );
}

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [profile, setProfile] = useState(null);
  const [docCids, setDocCids] = useState({});  // shafqaat — tracks newly uploaded doc CIDs

  const [form, setForm] = useState({
    full_name: "", display_name: "", bio: "", phone: "",
    country: "", city: "", website_url: "", linkedin_url: "",
  });

  // shafqaat — Load existing profile and pre-fill the form
  useEffect(() => {
    async function load() {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/"); return; }
      const existing = await getMyProfile();
      if (existing) {
        setProfile(existing);
        setForm({
          full_name: existing.full_name ?? "",
          display_name: existing.display_name ?? "",
          bio: existing.bio ?? "",
          phone: existing.phone ?? "",
          country: existing.country ?? "",
          city: existing.city ?? "",
          website_url: existing.website_url ?? "",
          linkedin_url: existing.linkedin_url ?? "",
        });
      }
      setLoading(false);
    }
    load();
  }, []);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleDocUploaded = (key, cid) => {
    setDocCids((prev) => ({ ...prev, [key]: cid }));
  };

  // shafqaat — Merge form + new + existing CIDs then upsert to Supabase
  const handleSave = async () => {
    setSaving(true); setError(""); setSaved(false);
    const payload = {
      ...form,
      national_id_cid: docCids.national_id_cid || profile?.national_id_cid || null,
      passport_cid: docCids.passport_cid || profile?.passport_cid || null,
      selfie_cid: docCids.selfie_cid || profile?.selfie_cid || null,
      proof_of_address_cid: docCids.proof_of_address_cid || profile?.proof_of_address_cid || null,
      business_reg_cid: docCids.business_reg_cid || profile?.business_reg_cid || null,
      tax_cert_cid: docCids.tax_cert_cid || profile?.tax_cert_cid || null,
      bank_statement_cid: docCids.bank_statement_cid || profile?.bank_statement_cid || null,
      business_logo_url: profile?.business_logo_url || null,
    };
    const result = await saveCreatorProfile(payload);
    if (result?.error) { setError(result.error); }
    else {
      setSaved(true);
      const updated = await getMyProfile();
      setProfile(updated);
    }
    setSaving(false);
  };

  const completion = calcProfileCompletion(profile);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#181A2A] flex items-center justify-center">
        <Loader2 className="h-10 w-10 text-[#6f42c1] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#181A2A] py-8 pt-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">

        {/* shafqaat — Header */}
        <div className="flex items-center gap-4 mb-2">
          <button onClick={() => router.push("/dashboard")} className="text-gray-400 hover:text-white transition">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-3xl font-black text-white">Creator Profile</h1>
            <p className="text-gray-400 text-sm">KYC/KYB verification — international crowdfunding standards</p>
          </div>
        </div>

        {/* shafqaat — Completion progress bar */}
        <div className="bg-[#1a2030] rounded-2xl border border-white/5 p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#a78bfa]" />
              <span className="text-sm font-semibold text-white">Verification Progress</span>
            </div>
            <span className="text-sm font-bold text-[#a78bfa]">{completion}%</span>
          </div>
          <div className="w-full bg-white/10 rounded-full h-2">
            <div className="bg-gradient-to-r from-[#6f42c1] to-[#a78bfa] h-2 rounded-full transition-all duration-700"
              style={{ width: `${completion}%` }} />
          </div>
          <p className="text-xs text-gray-600 mt-2">Complete profile increases investor trust and campaign visibility</p>
        </div>

        {/* shafqaat — Banners */}
        {saved && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
            <CheckCircle className="h-4 w-4" /> Profile saved successfully!
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <AlertCircle className="h-4 w-4" /> {error}
          </div>
        )}

        {/* ── Section 1: Basic Info ── */}
        <Section icon={User} title="Basic Information" description="Your public creator identity">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label="Full Legal Name" name="full_name" value={form.full_name} onChange={handleInput}
              placeholder="As on government ID" required hint="Must match your identity documents" />
            <Field label="Display Name" name="display_name" value={form.display_name} onChange={handleInput}
              placeholder="Public name shown to investors" />
            <Field label="Phone" name="phone" value={form.phone} onChange={handleInput}
              placeholder="+92 300 1234567" type="tel" />
            <Field label="Country" name="country" value={form.country} onChange={handleInput} placeholder="Pakistan" />
            <Field label="City" name="city" value={form.city} onChange={handleInput} placeholder="Lahore" />
            <Field label="LinkedIn URL" name="linkedin_url" value={form.linkedin_url} onChange={handleInput}
              placeholder="https://linkedin.com/in/yourname" />
            <Field label="Website" name="website_url" value={form.website_url} onChange={handleInput}
              placeholder="https://yourcompany.com" />
          </div>
          <Field label="Bio / About" name="bio" value={form.bio} onChange={handleInput}
            placeholder="Brief description of you and your business for investors"
            textarea hint="Shown on your campaign pages — 2-3 sentences recommended" />
        </Section>

        {/* ── Section 2: KYC (Identity Verification) ── */}
        <Section icon={ShieldCheck} title="Identity Verification (KYC)"
          description="Required by AML/KYC standards — Kickstarter, Indiegogo, FCA, SECP">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <DocUpload fieldKey="national_id_cid" label="National ID / CNIC" required
              hint="Both sides — primary identity document" accept=".pdf,.jpg,.jpeg,.png"
              currentUrl={profile?.national_id_url} onUploaded={handleDocUploaded} />
            <DocUpload fieldKey="passport_cid" label="Passport (Optional)"
              hint="Photo page — boosts international investor trust" accept=".pdf,.jpg,.jpeg,.png"
              currentUrl={profile?.passport_url} onUploaded={handleDocUploaded} />
            <DocUpload fieldKey="selfie_cid" label="Selfie with ID" required
              hint="Hold your ID next to your face — standard Kickstarter requirement" accept=".jpg,.jpeg,.png"
              currentUrl={profile?.selfie_url} onUploaded={handleDocUploaded} />
            <DocUpload fieldKey="proof_of_address_cid" label="Proof of Address" required
              hint="Utility bill or bank letter dated within last 3 months" accept=".pdf,.jpg,.jpeg,.png"
              currentUrl={profile?.proof_of_address_url} onUploaded={handleDocUploaded} />
          </div>
        </Section>

        {/* ── Section 3: KYB (Business Verification) ── */}
        <Section icon={Building2} title="Business Verification (KYB)"
          description="SEC, FCA, SECP, FBR standards — required for investor-facing campaigns">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <DocUpload fieldKey="business_reg_cid" label="Business Registration" required
              hint="Certificate of Incorporation / SECP registration" accept=".pdf"
              currentUrl={profile?.business_reg_url} onUploaded={handleDocUploaded} />
            <DocUpload fieldKey="tax_cert_cid" label="Tax Registration Certificate" required
              hint="NTN Certificate (Pakistan) or equivalent" accept=".pdf"
              currentUrl={profile?.tax_cert_url} onUploaded={handleDocUploaded} />
            <DocUpload fieldKey="bank_statement_cid" label="Bank Statement (3 months)" required
              hint="Shows financial activity — required by AML standards" accept=".pdf"
              currentUrl={profile?.bank_statement_url} onUploaded={handleDocUploaded} />
            {/* shafqaat — Business logo placeholder (Cloudinary upload coming in next sprint) */}
            <div className="bg-[#0d1117] rounded-xl border border-white/5 p-4 flex items-center justify-center text-center">
              <div>
                <Camera className="h-6 w-6 text-gray-600 mx-auto mb-2" />
                <p className="text-xs text-gray-500 font-semibold">Business Logo</p>
                <p className="text-[10px] text-gray-600 mt-1">Coming soon — Cloudinary image upload</p>
              </div>
            </div>
          </div>
        </Section>

        {/* shafqaat — Save + Back buttons */}
        <div className="flex gap-3 pb-8">
          <button onClick={handleSave} disabled={saving || !form.full_name}
            className="flex-1 bg-[#6f42c1] hover:bg-[#5a3599] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-full transition flex items-center justify-center gap-2 text-sm"
          >
            {saving ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : <><Save className="h-4 w-4" />Save Profile</>}
          </button>
          <button onClick={() => router.push("/dashboard")}
            className="px-6 py-3 border border-white/10 text-gray-300 hover:text-white rounded-full transition text-sm font-semibold"
          >
            Back to Dashboard
          </button>
        </div>

      </div>
    </div>
  );
}