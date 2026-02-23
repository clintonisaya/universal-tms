import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { Geist, Geist_Mono } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryProvider } from "@/lib/queryClient";
import { ConfigProvider, App } from "antd";
import themeConfig from "@/theme/themeConfig";
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

export const metadata: Metadata = {
  title: "Edupo TMS",
  description: "Transport Management System",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-logo.png", type: "image/png", sizes: "256x256" },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AntdRegistry>
          <QueryProvider>
            <ConfigProvider theme={themeConfig}>
              <App>
                <AuthProvider>{children}</AuthProvider>
              </App>
            </ConfigProvider>
          </QueryProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
