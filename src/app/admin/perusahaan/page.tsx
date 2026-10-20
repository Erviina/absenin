"use client";

import dynamic from "next/dynamic";
import { CompanyProfileSkeleton } from "@/components/CardSkeleton";

const KelolaPerusahaanPage = dynamic(
  () => import("./page-content"),
  {
    ssr: false,
    loading: () => <CompanyProfileSkeleton />,
  }
);

export default function Page() {
  return <KelolaPerusahaanPage />;
}
