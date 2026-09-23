import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "@/components/Providers";
import { getPortalSettings } from "@/lib/settings";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPortalSettings();
  return {
    title: `Track Your Shipment | ${settings.companyName}`,
    description: `Look up the status of your shipment with ${settings.companyName}.`,
    // Explicit and singular on purpose: this app has no app/favicon.ico
    // convention file (moved to public/default-favicon.ico) specifically
    // so Next never auto-injects a second <link rel="icon">, which would
    // otherwise compete with this per-tenant one and win in some browsers.
    icons: { icon: settings.faviconUrl || "/default-favicon.ico" },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
