import React from "react";

export interface AbsenInLogoProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  textColor?: string;
  iconColor?: string;
}

export function AbsenInLogo({
  size = "md",
  className = "",
  textColor = "text-[#1E4738]",
  iconColor = "text-[#1E4738]",
}: AbsenInLogoProps) {
  const configs = {
    sm: {
      gap: "gap-1.5",
      icon: "w-6 h-6",
      text: "text-[20px] tracking-[-0.035em]",
    },
    md: {
      gap: "gap-2.5",
      icon: "w-9 h-9",
      text: "text-[30px] tracking-[-0.035em]",
    },
    lg: {
      gap: "gap-3",
      icon: "w-12 h-12 sm:w-14 sm:h-14",
      text: "text-[40px] sm:text-[46px] tracking-[-0.035em]",
    },
  };

  const { gap, icon, text } = configs[size] || configs.md;

  return (
    <div className={`inline-flex items-center ${gap} select-none ${className}`}>
      <svg
        viewBox="0 0 150 144"
        className={`${icon} shrink-0 ${iconColor}`}
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M 134,74 L 134,110 A 18,18 0 0 1 116,128 L 34,128 A 18,18 0 0 1 16,110 L 16,34 A 18,18 0 0 1 34,16 L 116,16 A 18,18 0 0 1 134,34 L 72,96 L 50,74"
          stroke="currentColor"
          strokeWidth="15"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      <span className={`font-extrabold leading-none ${textColor} ${text}`}>
        AbsenIN
      </span>
    </div>
  );
}
