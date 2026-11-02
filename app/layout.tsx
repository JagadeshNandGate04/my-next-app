import type { Metadata } from "next";
import "./globals.css";

import Providers from "./store/providers";
import Header from "./components/Header";
import Footer from "./components/Footer";

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
          <Header />

          <div className="flex-1 min-w-0">
            {children}
          </div>

          <Footer />
        </Providers>
      </body>
    </html>
  );
}