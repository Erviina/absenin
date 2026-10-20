import { Metadata } from "next";
import { UnauthorizedView } from "@/components/UnauthorizedView";

export const metadata: Metadata = {
  title: "Tidak Memiliki Hak Akses - AbsenIn",
  description: "Halaman ini memerlukan hak akses manajemen atau pemilik.",
};

export default function UnauthorizedPage() {
  return <UnauthorizedView />;
}
