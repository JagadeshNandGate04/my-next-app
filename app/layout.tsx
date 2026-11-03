import type { Metadata } from "next";
import "./globals.css";

import Providers from "./store/providers";
import AppLayout from "./components/AppLayout";

export const metadata: Metadata = {
  title: "NANDGATE-IT | Attendance Portal",
  description: "Employee Attendance and Management System",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-[#f0f6fa]">
        <Providers>
          <AppLayout>{children}</AppLayout>
        </Providers>
      </body>
    </html>
  );
}