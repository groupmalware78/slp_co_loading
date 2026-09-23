import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Freight Forwarder API",
  description: "REST API for freight-forwarder client applications.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>{children}</body>
    </html>
  );
}
