"use client";

import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";

function FAQRedirectContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const params = searchParams.toString();
    const dest = params ? `/bantuan?${params}` : "/bantuan";
    router.replace(dest);
  }, [router, searchParams]);

  return (
    <div className="min-h-screen bg-[#fbfdfc] flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-[#356E3B] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function FAQRedirectPage() {
  return (
    <Suspense fallback={null}>
      <FAQRedirectContent />
    </Suspense>
  );
}
