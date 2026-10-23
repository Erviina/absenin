"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { CompanySwitcher } from "./CompanySwitcher";

interface TopBarProps {
  title: string;
  onBack?: () => void;
  fallbackHref?: string;
  rightAction?: React.ReactNode;
  showCompanySwitcher?: boolean;
  bgColor?: string;
  fixed?: boolean;
}

export function TopBar({ 
  title, 
  onBack, 
  fallbackHref,
  rightAction, 
  showCompanySwitcher = false, 
  bgColor = "bg-[#356E3B]",
  fixed = false
}: TopBarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (fallbackHref) {
      if (typeof window !== "undefined" && window.history.length > 1) {
        router.back();
      } else {
        router.push(fallbackHref);
      }
    } else {
      router.back();
    }
  };

  if (fixed) {
    return (
      <>
        <header className={`${bgColor} h-[72px] px-6 flex items-center justify-between fixed top-0 left-0 right-0 w-full sm:max-w-md mx-auto z-40 shadow-sm shrink-0 transition-shadow`}>
          <button 
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center text-white hover:opacity-80 active:scale-95 transition-all z-10"
            aria-label="Kembali"
          >
            <ChevronLeft className="w-6 h-6 text-white" />
          </button>
          <h1 className="text-white text-[18px] font-bold absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
            {title}
          </h1>
          <div className="flex items-center gap-2 justify-end z-10">
            {showCompanySwitcher && <CompanySwitcher variant="dark" compact={true} />}
            {rightAction}
          </div>
        </header>
        {/* Placeholder spacer agar layout dokumen tidak tertutup fixed header */}
        <div className="h-[72px] shrink-0" aria-hidden="true" />
      </>
    );
  }

  return (
    <header className={`${bgColor} h-[72px] px-6 flex items-center justify-between sticky top-0 z-40 shadow-sm shrink-0 transition-shadow`}>
      <button 
        onClick={handleBack}
        className="w-10 h-10 flex items-center justify-center text-white hover:opacity-80 active:scale-95 transition-all z-10"
        aria-label="Kembali"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <h1 className="text-white text-[18px] font-bold absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
        {title}
      </h1>
      <div className="flex items-center gap-2 justify-end z-10">
        {showCompanySwitcher && <CompanySwitcher variant="dark" compact={true} />}
        {rightAction}
      </div>
    </header>
  );
}

