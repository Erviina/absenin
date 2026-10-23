"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function PlatformAdminLoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    // Redirect to the main application login page
    router.replace("/login");
  }, [router]);

  return null; // No UI needed
}
