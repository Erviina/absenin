"use client";

import dynamic from "next/dynamic";
import { CompanyProfileSkeleton } from "@/components/CardSkeleton";

const ProfilPerusahaanContent = dynamic(
  () => import("./page-content"),
  {
    ssr: false,
    loading: () => <CompanyProfileSkeleton />,
  }
);

export default function ProfilPerusahaanPage() {
  return <ProfilPerusahaanContent />;
}
