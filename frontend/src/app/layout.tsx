import type { Metadata } from "next";
import { AntdRegistry } from "@/providers/AntdRegistry";
import { Geist, Geist_Mono, DM_Sans } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from "@/providers/QueryProvider";
import { TabProvider } from "@/contexts/TabContext";
import "react-resizable/css/styles.css";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Nablafleet TMS",
  description: "Transport Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="light" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${dmSans.variable} antialiased`}
      >
        <AntdRegistry>
          <QueryProvider>
            <TabProvider>
              <AuthProvider>{children}</AuthProvider>
            </TabProvider>
          </QueryProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
