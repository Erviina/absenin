"use client";

import React from "react";
import { Loader2 } from "lucide-react";

export interface PrimaryButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  /**
   * Ikon di sisi pinggir kiri teks tombol
   */
  icon?: React.ReactNode;
  /**
   * Ikon di sisi pinggir kanan teks tombol
   */
  rightIcon?: React.ReactNode;
  /**
   * Status loading
   */
  isLoading?: boolean;
  /**
   * Teks pengganti saat loading
   */
  loadingText?: string;
  /**
   * Varian warna tombol
   */
  variant?: "primary" | "secondary" | "outline" | "danger";
  /**
   * Ukuran tombol
   */
  size?: "sm" | "md" | "lg";
  /**
   * Apakah lebar tombol 100%
   */
  fullWidth?: boolean;
}

export function PrimaryButton({
  children,
  icon,
  rightIcon,
  isLoading = false,
  loadingText,
  variant = "primary",
  size = "lg",
  fullWidth = true,
  className = "",
  disabled,
  ...props
}: PrimaryButtonProps) {
  // Ukuran tombol
  const sizeClasses = {
    sm: "py-2 px-4 text-[13px] h-10 gap-1.5",
    md: "py-3 px-5 text-[14px] h-12 gap-2",
    lg: "py-4 px-6 text-[15px] h-14 gap-2.5",
  }[size];

  // Varian tombol
  const isPlainDisabled = disabled && !isLoading;
  const variantClasses = {
    primary: isLoading
      ? "bg-gray-400 text-white cursor-wait pointer-events-none shadow-none"
      : isPlainDisabled
      ? "bg-gray-300 text-gray-100 shadow-none pointer-events-none"
      : "bg-[#356E3B] hover:bg-[#2A582F] text-white shadow-[0_4px_16px_rgba(53,110,59,0.2)] active:scale-[0.98]",
    secondary: isLoading
      ? "bg-gray-300 text-gray-600 border border-gray-300 cursor-wait pointer-events-none shadow-none"
      : isPlainDisabled
      ? "bg-gray-100 text-gray-400 border border-gray-200 pointer-events-none"
      : "bg-[#E8F3EB] hover:bg-[#D5EAD9] text-[#356E3B] border border-[#D1E5D5] active:scale-[0.98]",
    outline: isLoading
      ? "bg-gray-100 text-gray-400 border border-gray-300 cursor-wait pointer-events-none"
      : isPlainDisabled
      ? "bg-transparent text-gray-400 border border-gray-200 opacity-50 pointer-events-none"
      : "bg-transparent hover:bg-gray-50 text-[#374151] border border-[#E5E7EB] active:scale-[0.98]",
    danger: isLoading
      ? "bg-gray-400 text-white cursor-wait pointer-events-none shadow-none"
      : isPlainDisabled
      ? "bg-gray-300 text-gray-100 opacity-50 pointer-events-none"
      : "bg-[#DC2626] hover:bg-[#B91C1C] text-white shadow-sm active:scale-[0.98]",
  }[variant];

  const widthClass = fullWidth ? "w-full" : "w-auto";

  return (
    <button
      disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={`inline-flex items-center justify-center font-bold rounded-full transition-all duration-200 select-none ${widthClass} ${sizeClasses} ${variantClasses} ${className}`}
      {...props}
    >
      {isLoading ? (
        <>
          <Loader2 className="w-[18px] h-[18px] animate-spin shrink-0" />
          <span>{loadingText || "Memproses..."}</span>
        </>
      ) : (
        <>
          {icon && <span className="shrink-0 flex items-center">{icon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0 flex items-center ml-0.5">{rightIcon}</span>}
        </>
      )}
    </button>
  );
}

export default PrimaryButton;
