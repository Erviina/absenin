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
  icons: {
    icon: [
      { url: "/img/assets/logo-icon.svg", type: "image/svg+xml" },
      { url: "/img/assets/logo-icon.png", sizes: "512x512", type: "image/png" },
      { url: "/favicon.ico" },
    ],
    shortcut: "/favicon.ico",
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
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
import { AuthGuard } from "@/components/AuthGuard";

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
        className="min-h-[100dvh] flex flex-col bg-background text-foreground w-full sm:max-w-md sm:mx-auto sm:shadow-xl sm:border-x sm:border-border/40 border-x-0 relative font-sans"
      >
        <GoogleAuthProvider>
          <CompanyProvider>
            <DialogProvider>
              <AuthGuard>
                {children}
              </AuthGuard>
            </DialogProvider>
          </CompanyProvider>
        </GoogleAuthProvider>
      </body>
    </html>
  );
}
