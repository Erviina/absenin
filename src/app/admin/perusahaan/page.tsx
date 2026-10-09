"use client";

import dynamic from "next/dynamic";

const KelolaPerusahaanPage = dynamic(
  () => import("./page-content"),
  { ssr: false }
);

export default function Page() {
  return <KelolaPerusahaanPage />;
}
