"use client";

import { ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { CompanySwitcher } from "./CompanySwitcher";

interface TopBarProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
  showCompanySwitcher?: boolean;
  bgColor?: string;
}

export function TopBar({ 
  title, 
  onBack, 
  rightAction, 
  showCompanySwitcher = false,
  bgColor = "bg-[#356E3B]" 
}: TopBarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      router.back();
    }
  };

  return (
    <div className={`${bgColor} py-4 px-6 flex items-center justify-between sticky top-0 z-20 shrink-0`}>
      <button 
        onClick={handleBack}
        className="w-10 h-10 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center text-white transition-colors z-10"
      >
        <ChevronLeft className="w-6 h-6 text-white" />
      </button>
      <h1 className="text-white text-[18px] font-bold absolute left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none">
        {title}
      </h1>
      <div className="flex items-center gap-2 justify-end z-10">
        {showCompanySwitcher && <CompanySwitcher variant="dark" />}
        {rightAction}
      </div>
    </div>
  );
}

