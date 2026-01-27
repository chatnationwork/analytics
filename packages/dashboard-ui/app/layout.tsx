import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Providers } from "@/components/Providers";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { PermissionProvider } from "@/components/auth/PermissionContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Analytics Dashboard",
  description: "Cross-channel journey analytics",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          <AuthProvider>
            <PermissionProvider>
              {children}
            </PermissionProvider>
          </AuthProvider>
        </Providers>
      </body>
    </html>
  );
}
