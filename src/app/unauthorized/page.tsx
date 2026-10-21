import { Metadata } from "next";
import { UnauthorizedView } from "@/components/UnauthorizedView";

export const metadata: Metadata = {
  title: "Login Diperlukan - AbsenIn",
  description: "Silakan login terlebih dahulu untuk melanjutkan.",
};

export default function UnauthorizedPage() {
  return <UnauthorizedView type="401" />;
}

