"use client";

import React, { useEffect } from "react";
import { PlatformAdminErrorView } from "@/components/platform-admin/PlatformAdminErrorView";

export default function PlatformAdminErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Platform Admin Runtime Error]:", error);
  }, [error]);

  return (
    <PlatformAdminErrorView
      type="500"
      error={error}
      reset={reset}
    />
  );
}
