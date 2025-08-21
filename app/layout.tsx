import type { Metadata } from "next";
import "./globals.css";
import ResponsiveLayout from "@/components/wrapper/ResponsiveLayout";
import { ClerkProvider } from "@clerk/nextjs";

export const metadata: Metadata = {
  title: "WhispersWall",
  description: "Created by WebDev",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // client component handling sidebar toggle
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
