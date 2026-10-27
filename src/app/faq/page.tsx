"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function FAQRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.toString();
    const dest = params ? `/bantuan?${params}` : "/bantuan";
    router.replace(dest);
  }, [router, searchParams]);

  return (
    <div className="min-h-[100dvh] w-full bg-[#FAFCF9] flex items-center justify-center" role="status" aria-live="polite">
      <Loader2 className="w-8 h-8 animate-spin text-[#1E4738]" />
    </div>
  );
}

export default function FAQRedirectPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[100dvh] w-full bg-[#FAFCF9] flex items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="w-8 h-8 animate-spin text-[#1E4738]" />
      </div>
    }>
      <FAQRedirectContent />
    </Suspense>
  );
}
