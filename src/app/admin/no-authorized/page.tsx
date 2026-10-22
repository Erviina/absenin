import { Metadata } from "next";
import { UnauthorizedView } from "@/components/UnauthorizedView";

export const metadata: Metadata = {
  title: "Akses Ditolak - AbsenIn",
  description: "Anda tidak memiliki izin untuk membuka halaman ini.",
};

export default function AdminNoAuthorizedPage() {
  return <UnauthorizedView type="403" />;
}

