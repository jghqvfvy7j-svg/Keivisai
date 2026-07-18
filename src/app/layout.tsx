import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "@/components/ui/sonner";

// Self-hosted display + data faces (downloaded from the Google Fonts repo, no
// runtime dependency on Google). Space Grotesk gives headings a technical,
// "kinetic" character; JetBrains Mono makes numbers read like instrument data.
const display = localFont({
  src: "./fonts/SpaceGrotesk.ttf",
  variable: "--font-display-src",
  weight: "300 700",
  display: "swap",
});
const mono = localFont({
  src: "./fonts/JetBrainsMono.ttf",
  variable: "--font-mono-src",
  weight: "100 800",
  display: "swap",
});
import { ThemeScript } from "@/components/theme/theme-script";
import "./globals.css";
import { RegisterSW } from "@/components/pwa/register-sw";
import { InstallPrompt } from "@/components/pwa/install-prompt";
import { OfflineSync } from "@/components/pwa/offline-sync";
import { Analytics } from "@vercel/analytics/react";

export const metadata: Metadata = {
  metadataBase: new URL("https://gymtrackpro.xyz"),
  title: "GymTrack Pro — AI Fitness",
  description:
    "Your AI training partner. Adaptive workouts, nutrition intelligence, recovery, and progress — in one place.",
  manifest: "/manifest.json",
  openGraph: {
    title: "GymTrack Pro — AI Fitness",
    description: "Train with a coach that never sleeps. AI coaching, workout plans, nutrition and progress in one app.",
    url: "https://gymtrackpro.xyz",
    siteName: "GymTrack Pro",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "GymTrack Pro" }],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GymTrack Pro — AI Fitness",
    description: "Train with a coach that never sleeps. AI coaching, workout plans, nutrition and progress.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GymTrack Pro",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#0a0b0d",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`h-full antialiased ${display.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full bg-bg text-foreground font-sans">
        {children}
        <Toaster position="top-center" richColors />
        <RegisterSW />
        <OfflineSync />
        <InstallPrompt />
        <Analytics />
      </body>
    </html>
  );
}
