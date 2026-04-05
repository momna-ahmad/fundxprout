import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "gateway.pinata.cloud", // shafqaat — IPFS document thumbnails
      },
    ],
  },
};

export default nextConfig;