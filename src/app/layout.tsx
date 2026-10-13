import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AbsenIn - Smart Attendance System",
  description: "Absensi digital dengan verifikasi GPS real-time",
  manifest: "/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#7FAF8B",
  width: "device-width",
  initialScale: 1,
  minimumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

import { GoogleAuthProvider } from "@/components/GoogleAuthProvider";
import { CompanyProvider } from "@/context/CompanyContext";
import { DialogProvider } from "@/context/DialogContext";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${plusJakartaSans.variable} h-full antialiased`}
    >
      <body
        suppressHydrationWarning
        className="min-h-full flex flex-col bg-background text-foreground max-w-md mx-auto shadow-sm border-x border-border/40 relative font-sans"
      >
        <GoogleAuthProvider>
          <CompanyProvider>
            <DialogProvider>
              {children}
            </DialogProvider>
          </CompanyProvider>
        </GoogleAuthProvider>
      </body>
    </html>
  );
}
