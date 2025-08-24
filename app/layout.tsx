import type { Metadata, Viewport } from "next";
import "./globals.css";
import ResponsiveLayout from "@/components/wrapper/ResponsiveLayout";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "WhispersWall",
  description: "Created by WebDev",
};

// ✅ Add this
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body>
          <ResponsiveLayout>{children}</ResponsiveLayout>
        </body>
      </html>
    </ClerkProvider>
  );
}
