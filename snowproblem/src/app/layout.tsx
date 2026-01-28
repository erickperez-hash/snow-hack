import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "SnowProblem - On-Demand Snow Removal",
    template: "%s | SnowProblem",
  },
  description:
    "Connect with local snow removal services through transparent bidding. Post jobs, receive competitive bids, and get your property cleared quickly.",
  keywords: [
    "snow removal",
    "snow plowing",
    "driveway clearing",
    "sidewalk shoveling",
    "winter services",
    "on-demand",
  ],
  authors: [{ name: "SnowProblem Team" }],
  creator: "SnowProblem",
  publisher: "SnowProblem",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SnowProblem",
  },
  formatDetection: {
    telephone: true,
    email: true,
    address: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://snowproblem.app",
    siteName: "SnowProblem",
    title: "SnowProblem - On-Demand Snow Removal",
    description:
      "Connect with local snow removal services through transparent bidding.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "SnowProblem - On-Demand Snow Removal",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SnowProblem - On-Demand Snow Removal",
    description:
      "Connect with local snow removal services through transparent bidding.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: [
      { url: "/icons/icon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/icon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0f172a" },
  ],
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://api.mapbox.com" />
        <link rel="dns-prefetch" href="https://api.mapbox.com" />
      </head>
      <body className={`${inter.className} antialiased`}>{children}</body>
    </html>
  );
}
