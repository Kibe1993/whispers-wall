// app/layout.tsx (server component)
import type { Metadata, Viewport } from "next";
import "./globals.css";
import ResponsiveLayout from "@/components/wrapper/ResponsiveLayout";
import { ClerkProvider } from "@clerk/nextjs";
import QueryProvider from "@/components/tanstack/QueryProvider";

export const metadata: Metadata = {
  title: "WhispersWall",
  description: "Created by WebDev",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
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
          <QueryProvider>
            <ResponsiveLayout>{children}</ResponsiveLayout>
          </QueryProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
