import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DM_Serif_Display, DM_Sans } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { getServiceSettingsCached } from "@/lib/serviceSettings";
import type { TwitterCardType } from "@/types";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSerifDisplay = DM_Serif_Display({
  variable: "--font-dm-serif",
  weight: "400",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const settings = await getServiceSettingsCached()
    const appName = settings?.appName ?? 'Church App'
    const title = settings?.seoTitle || `${appName} - Online Church Platform`
    const description = settings?.seoDescription || 'A modern online church platform with live streaming, user management, and analytics.'
    const siteName = settings?.seoSiteName || appName
    const image = settings?.seoImage
    const twitterCard: TwitterCardType = settings?.twitterCardType === 'summary' ? 'summary' : 'summary_large_image'

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        siteName,
        type: 'website',
        ...(image ? { images: [{ url: image, width: 1200, height: 630 }] } : {}),
      },
      twitter: {
        card: twitterCard,
        title,
        description,
        ...(image ? { images: [image] } : {}),
      },
    }
  } catch {
    return {
      title: "Church App - Online Church Platform",
      description: "A modern online church platform with live streaming, user management, and analytics.",
    }
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dmSerifDisplay.variable} ${dmSans.variable} antialiased`}
      >
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
