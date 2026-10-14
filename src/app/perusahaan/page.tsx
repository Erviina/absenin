"use client";

import dynamic from "next/dynamic";

const ProfilPerusahaanContent = dynamic(
  () => import("./page-content"),
  { ssr: false }
);

export default function ProfilPerusahaanPage() {
  return <ProfilPerusahaanContent />;
}
