"use client";

import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  /**
   * Varian warna badge/tag
   */
  variant?: 
    | "success" 
    | "warning" 
    | "danger" 
    | "info" 
    | "purple" 
    | "neutral" 
    | "company" 
    | "personal";
  /**
   * Ukuran badge
   */
  size?: "xs" | "sm" | "md" | "lg";
  /**
   * Ikon di sisi kiri badge
   */
  icon?: React.ReactNode;
  /**
   * Indikator titik berwarna di sisi kiri
   */
  dot?: boolean;
  /**
   * Apakah teks otomatis uppercase
   */
  uppercase?: boolean;
}

export function Badge({
  children,
  variant = "success",
  size = "md",
  icon,
  dot = false,
  uppercase = false,
  className = "",
  ...props
}: BadgeProps) {
  const variantClasses = {
    success: "bg-[#E8F3EB] text-[#356E3B] border border-[#D1E5D5]",
    warning: "bg-[#FEF3C7] text-[#D97706] border border-[#FDE68A]",
    danger: "bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]",
    info: "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]",
    purple: "bg-[#FAF5FF] text-[#9333EA] border-[#E9D5FF]",
    neutral: "bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB]",
    company: "bg-[#E0E7FF] text-[#4338CA] border-[#C7D2FE]",
    personal: "bg-[#FEF3C7] text-[#D97706] border-[#FDE68A]",
  }[variant];

  const sizeClasses = {
    xs: "px-2 py-0.5 text-[9px] gap-1",
    sm: "px-2.5 py-0.5 text-[10px] gap-1.2",
    md: "px-3 py-1 text-[11px] gap-1.5",
    lg: "px-3.5 py-1.5 text-[12px] gap-2",
  }[size];

  return (
    <span
      className={`inline-flex items-center w-fit rounded-full font-bold select-none shrink-0 transition-colors ${uppercase ? "uppercase tracking-wider" : ""} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {dot && <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0 opacity-80" />}
      {icon && <span className="shrink-0 flex items-center">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}

export default Badge;
