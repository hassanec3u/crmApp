/**
 * Layout racine — App Router.
 *
 *  - Fournit la session NextAuth via `<SessionProvider>` (composant
 *    client).
 *  - Configure les métadonnées (PWA-ready) et le viewport mobile-first.
 *  - La police "Inter" est chargée via `next/font` (auto-hébergée).
 */
import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";

import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "@/components/ui/toaster";
import { cn } from "@/lib/utils";

import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "CRM Immobilier",
    template: "%s · CRM Immobilier",
  },
  description: "CRM mobile-first pour agents immobiliers.",
  applicationName: "CRM Immobilier",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "CRM Immobilier",
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: false,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={cn(
          "min-h-screen bg-background font-sans antialiased",
          inter.variable,
        )}
      >
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
