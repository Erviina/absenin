"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { UnauthorizedView } from "@/components/UnauthorizedView";
import { PlatformAdminErrorView } from "@/components/platform-admin/PlatformAdminErrorView";

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const redirectParam = searchParams.get("redirect") || "";
  const type = typeParam === "403" ? "403" : "401";

  // Jika error berasal dari area Platform Admin, tampilkan error view desktop Platform Admin
  if (redirectParam.startsWith("/platform-admin")) {
    return <PlatformAdminErrorView type={type} />;
  }

  return <UnauthorizedView type={type} redirect={redirectParam} />;
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] w-full bg-[#FAFCF9] flex items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E4738]" />
      </div>
    }>
      <UnauthorizedContent />
    </Suspense>
  );
}
