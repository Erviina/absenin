"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getPlatformAuthToken } from "@/lib/platformAdminApi";

export default function PlatformAdminRootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getPlatformAuthToken();
    if (token) {
      router.replace("/platform-admin/overview");
    } else {
      router.replace("/login");
    }
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-[#1E3F2B]">
      <Loader2 className="w-8 h-8 animate-spin text-[#356E3B] mb-2" />
      <span className="text-[13px] font-medium text-gray-500">Mengarahkan ke Panel Platform...</span>
    </div>
  );
}
