"use client";

import { useState } from "react";
import Image from "next/image";
import { User } from "lucide-react";

interface UserAvatarProps {
  src?: string | null;
  name?: string | null;
  size?: number;
  className?: string;
}

export default function UserAvatar({
  src,
  name,
  size = 36,
  className = "",
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  const initial = name?.trim() ? name.trim().charAt(0).toUpperCase() : null;

  if (src && !imgError) {
    return (
      <div
        className={`relative rounded-full overflow-hidden flex-shrink-0 border border-white/10 bg-[#1a2030] ${className}`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <Image
          src={src}
          alt={name || "User Avatar"}
          fill
          sizes={`${size}px`}
          className="object-cover rounded-full"
          onError={() => setImgError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center font-bold text-white flex-shrink-0 border border-[#6f42c1]/40 shadow-sm ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        fontSize: `${Math.max(12, Math.floor(size * 0.4))}px`,
        background: "linear-gradient(135deg, #6f42c1, #a78bfa)",
      }}
    >
      {initial ? initial : <User size={Math.floor(size * 0.5)} />}
    </div>
  );
}
