"use client";
import { useState } from "react";
import { useActionState } from "react";
import { launchBusinessCampaign } from "@/lib/launchCampaign";
import { Upload, Target, Calendar, DollarSign, Loader2, CheckCircle } from "lucide-react";
import Image from "next/image";

export default function CreateCampaignPage() {
  const [state, formAction, isPending] = useActionState(
    launchBusinessCampaign,
    null,
  );

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    goal: "",
    duration: "",
    category: "",
    image: null,
  });

  // Cloudinary upload state
  const [imageUrl, setImageUrl] = useState("");
  const [imageUploading, setImageUploading] = useState(false);
  const [imageUploadError, setImageUploadError] = useState("");

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFormData((prev) => ({ ...prev, image: file }));
    setImageUploading(true);
    setImageUploadError("");
    setImageUrl("");

    try {
      const uploadData = new FormData();
      uploadData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: uploadData,
      });

      const json = await res.json();

      if (!res.ok) throw new Error(json.error ?? "Upload failed");

      setImageUrl(json.url);
    } catch (err) {
      setImageUploadError(err.message ?? "Image upload failed");
    } finally {
      setImageUploading(false);
    }
  };

  const categories = [
    "Technology", "Art", "Music", "Film", "Games",
    "Food", "Fashion", "Education", "Environment", "Health",
  ];

  const inputClass =
    "w-full px-4 py-3 bg-[#0d1117] border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-[#6f42c1] focus:border-transparent transition text-sm";

  return (
    <div className="min-h-screen bg-[#181A2A] py-8 pt-24">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#1a2030] rounded-3xl border border-white/5 p-8">

          {/* Error state from action */}
          {state?.error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm">
              {state.error}
            </div>
          )}

          <div className="mb-8">
            <h1 className="text-3xl font-black text-white mb-2">Create Your Campaign</h1>
            <p className="text-gray-400 text-sm">Launch your fundraising campaign and bring your project to life</p>
          </div>

          <form action={formAction} className="space-y-6">

            {/* Campaign Title */}
            <div>
              <label htmlFor="title" className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                Campaign Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className={inputClass}
                placeholder="Give your campaign a compelling title"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                Campaign Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={6}
                className={inputClass + " resize-none"}
                placeholder="Tell your story and explain why people should support your campaign"
                required
              />
            </div>

            {/* Goal and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="goal" className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                  Funding Goal (ETH) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="number"
                    id="goal"
                    name="goal"
                    value={formData.goal}
                    onChange={handleInputChange}
                    className={inputClass + " pl-10"}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="duration" className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                  Campaign Duration (days) *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
                  <input
                    type="number"
                    id="duration"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    className={inputClass + " pl-10"}
                    placeholder="30"
                    min="1"
                    max="90"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Category */}
            <div>
              <label htmlFor="category" className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                Category *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className={inputClass}
                required
              >
                <option value="" className="bg-[#1a2030]">Select a category</option>
                {categories.map((category) => (
                  <option key={category} value={category.toLowerCase()} className="bg-[#1a2030]">
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-2 uppercase tracking-wider">
                Campaign Image
              </label>
              <div className="border-2 border-dashed border-white/10 rounded-2xl p-8 text-center hover:border-[#6f42c1]/50 transition duration-200 bg-[#0d1117]">

                {/* Preview once uploaded */}
                {imageUrl && (
                  <div className="mb-4 relative w-full aspect-video rounded-xl overflow-hidden">
                    <Image
                      src={imageUrl}
                      alt="Campaign preview"
                      fill
                      className="object-cover"
                    />
                  </div>
                )}

                {imageUploading ? (
                  <div className="flex flex-col items-center gap-2">
                    <Loader2 className="h-8 w-8 text-[#a78bfa] animate-spin" />
                    <p className="text-sm text-gray-400">Uploading to Cloudinary…</p>
                  </div>
                ) : imageUrl ? (
                  <div className="flex flex-col items-center gap-1">
                    <CheckCircle className="h-7 w-7 text-[#28a745]" />
                    <p className="text-xs text-[#28a745] font-medium">Image uploaded successfully</p>
                    <label
                      htmlFor="image-upload"
                      className="cursor-pointer text-xs text-[#a78bfa] hover:text-white transition-colors mt-1"
                    >
                      Replace image
                    </label>
                  </div>
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <span className="text-[#a78bfa] hover:text-white font-semibold text-sm transition-colors">
                        Click to upload
                      </span>
                      <span className="text-gray-500 text-sm"> or drag and drop</span>
                    </label>
                    <p className="text-xs text-gray-600 mt-2">PNG, JPG, GIF up to 10MB</p>
                  </>
                )}

                <input
                  id="image-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />

                {imageUploadError && (
                  <p className="text-xs text-red-400 mt-2">{imageUploadError}</p>
                )}
              </div>

              {/* Hidden input carries the Cloudinary URL into the server action */}
              <input type="hidden" name="image_url" value={imageUrl} />
            </div>

            {/* Submit */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={isPending || imageUploading}
                className="flex-1 bg-[#6f42c1] hover:bg-[#5a3599] disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-full transition duration-200 flex items-center justify-center gap-2 text-sm"
              >
                <Target className="h-4 w-4" />
                {isPending ? "Creating..." : imageUploading ? "Uploading image…" : "Create Campaign"}
              </button>
              <button
                type="button"
                disabled={isPending}
                className="px-6 py-3 border border-white/10 text-gray-300 hover:text-white hover:border-white/30 disabled:opacity-50 rounded-full transition duration-200 text-sm font-semibold"
              >
                Save as Draft
              </button>
            </div>
          </form>

          {/* Tips */}
          <div className="mt-8 bg-[#6f42c1]/10 border border-[#6f42c1]/20 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-[#a78bfa] mb-3">Campaign Creation Tips</h3>
            <ul className="space-y-1.5 text-sm text-gray-400">
              <li>• Write a compelling story that explains your project's purpose and impact</li>
              <li>• Set a realistic funding goal based on your project needs</li>
              <li>• Choose an eye-catching image that represents your campaign</li>
              <li>• Be transparent about how funds will be used</li>
              <li>• Engage with your supporters throughout the campaign</li>
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}