"use client";

import { useCompany } from "@/context/CompanyContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { activeRole, isLoading } = useCompany();

  useEffect(() => {
    if (!isLoading && activeRole && !["owner", "admin", "manager"].includes(activeRole)) {
      router.replace("/dashboard");
    }
  }, [activeRole, isLoading, router]);

  return <>{children}</>;
}
