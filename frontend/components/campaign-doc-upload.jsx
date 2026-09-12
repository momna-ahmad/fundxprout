"use client";

import { useEffect, useState } from "react";
import { Loader2, CheckCircle, FileText, AlertCircle } from "lucide-react";

export default function CampaignDocUpload({
  docKey,
  label,
  hint,
  accept,
  required = false,
  onUploaded,
  formData,
}) {
  const storedCid = formData?.[docKey] ?? "";
  const [cid, setCid] = useState(storedCid);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setCid(storedCid);
  }, [storedCid]);

  const handleChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError("");
    setCid("");

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);
      uploadData.append("name", `${docKey}-${file.name}`);

      const response = await fetch("/api/ipfs-upload", {
        method: "POST",
        body: uploadData,
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Upload failed");

      setCid(result.cid);
      onUploaded(docKey, result.cid);
    } catch (uploadError) {
      setError(uploadError.message);
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
            <p className="text-xs text-gray-400">Uploading to IPFS...</p>
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
          required={required && !cid}
          className="hidden"
          onChange={handleChange}
        />
      </div>

      {error && (
        <p className="flex items-center gap-1 text-xs text-red-400 mt-1">
          <AlertCircle className="h-3 w-3" /> {error}
        </p>
      )}

      <input type="hidden" name={docKey} value={cid} />
    </div>
  );
}

export { CampaignDocUpload as DocUpload };
