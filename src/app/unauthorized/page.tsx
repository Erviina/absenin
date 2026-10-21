"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { UnauthorizedView } from "@/components/UnauthorizedView";

function UnauthorizedContent() {
  const searchParams = useSearchParams();
  const typeParam = searchParams.get("type");
  const type = typeParam === "403" ? "403" : "401";

  return <UnauthorizedView type={type} />;
}

export default function UnauthorizedPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#FAFCF9]" />}>
      <UnauthorizedContent />
    </Suspense>
  );
}
