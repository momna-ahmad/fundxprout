"use client"
import { useState } from "react"
import { Upload, Target, Calendar, DollarSign } from "lucide-react"

export default function CreateCampaignPage() {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    goal: "",
    duration: "",
    category: "",
    image: null
  })

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleImageUpload = (e) => {
    const file = e.target.files[0]
    setFormData(prev => ({
      ...prev,
      image: file
    }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    // Handle campaign creation logic
    console.log("Creating campaign:", formData)
  }

  const categories = [
    "Technology", "Art", "Music", "Film", "Games",
    "Food", "Fashion", "Education", "Environment", "Health"
  ]

  return (
    <div className="min-h-screen bg-[#FFEEE0] py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Campaign</h1>
            <p className="text-gray-600">Launch your fundraising campaign and bring your project to life</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Campaign Title */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Title *
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f6851b] focus:border-transparent"
                placeholder="Give your campaign a compelling title"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Description *
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f6851b] focus:border-transparent"
                placeholder="Tell your story and explain why people should support your campaign"
                required
              />
            </div>

            {/* Goal and Duration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="goal" className="block text-sm font-medium text-gray-700 mb-2">
                  Funding Goal (ETH) *
                </label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    id="goal"
                    name="goal"
                    value={formData.goal}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f6851b] focus:border-transparent"
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700 mb-2">
                  Campaign Duration (days) *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="number"
                    id="duration"
                    name="duration"
                    value={formData.duration}
                    onChange={handleInputChange}
                    className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f6851b] focus:border-transparent"
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
              <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                Category *
              </label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#f6851b] focus:border-transparent"
                required
              >
                <option value="">Select a category</option>
                {categories.map((category) => (
                  <option key={category} value={category.toLowerCase()}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campaign Image *
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#f6851b] transition duration-200">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="text-gray-600">
                  <label htmlFor="image-upload" className="cursor-pointer">
                    <span className="text-[#f6851b] hover:text-[#e57a1a] font-medium">Click to upload</span>
                    <span className="text-gray-500"> or drag and drop</span>
                  </label>
                  <input
                    id="image-upload"
                    name="image"
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleImageUpload}
                    required
                  />
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  PNG, JPG, GIF up to 10MB
                </p>
                {formData.image && (
                  <p className="text-sm text-green-600 mt-2">
                    Selected: {formData.image.name}
                  </p>
                )}
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-[#f6851b] hover:bg-[#e57a1a] text-white font-semibold py-3 px-6 rounded-lg transition duration-200 flex items-center justify-center gap-2"
              >
                <Target className="h-5 w-5" />
                Create Campaign
              </button>
              <button
                type="button"
                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition duration-200"
              >
                Save as Draft
              </button>
            </div>
          </form>

          {/* Tips Section */}
          <div className="mt-12 bg-[#f2f4f6] rounded-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Campaign Creation Tips</h3>
            <ul className="space-y-2 text-sm text-gray-700">
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
  )
}