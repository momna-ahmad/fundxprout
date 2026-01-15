'use client';

import supabase from "@/lib/supabase-client";

export default function GoogleSignIn() {
  async function handleGoogleSignIn() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/next-login`,
      },
    });
  }

  return (
    <div className="pt-10 flex justify-center">
      <button
        onClick={handleGoogleSignIn}
        className="flex items-center gap-3 px-5 py-3 bg-white text-gray-700 border border-gray-300 rounded-md shadow-sm hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition duration-150"
      >
        {/* Google Icon */}
        <svg
          className="w-5 h-5"
          viewBox="0 0 533.5 544.3"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M533.5 278.4c0-17.7-1.6-35-4.7-51.8H272.1v97.5h147.4c-6.4 34.8-25.6 64.4-54.7 84.1v69.6h88.4c51.8-47.7 80.3-118.1 80.3-199.4z"
            fill="#4285f4"
          />
          <path
            d="M272.1 544.3c73.7 0 135.4-24.4 180.5-66.1l-88.4-69.6c-24.5 16.5-55.7 26.2-92.1 26.2-70.8 0-130.8-47.8-152.3-112.1H28.1v70.9c45.3 89.4 138.4 150.7 244 150.7z"
            fill="#34a853"
          />
          <path
            d="M119.8 322.7c-10.5-31.3-10.5-64.7 0-96l-91.7-70.9C-19 238.5-19 305.7 28.1 366.3l91.7-70.9z"
            fill="#fbbc04"
          />
          <path
            d="M272.1 107.5c39.9-.6 78.1 13.7 107.4 39.9l80.3-80.3C417.5 24.4 355.8 0 272.1 0c-105.6 0-198.7 61.3-244 150.7l91.7 70.9c21.5-64.2 81.5-112.1 152.3-114.1z"
            fill="#ea4335"
          />
        </svg>

        <span className="text-sm font-medium">Sign in with Google</span>
      </button>
    </div>
  );
}
