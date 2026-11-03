"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import Header from "./Header";
import Footer from "./Footer";

export default function AppLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login" || pathname.startsWith("/login/");

  return (
    <>
      {!isLoginPage && <Header />}

      <div className="flex-1 min-w-0">{children}</div>

      {!isLoginPage && <Footer />}
    </>
  );
}
