
"use client";

import React, { useEffect, useState } from "react";
import {
  ShieldCheck,
  FileText,
  Headset,
  ArrowUpRight,
} from "lucide-react";

export default function Footer() {
  const [year, setYear] = useState<number | null>(null);

  useEffect(() => {
    setYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="relative bg-white border-t border-[#d6e5fb] overflow-hidden">

      {/* Top gradient accent */}
      <div className="h-[3px] bg-gradient-to-r from-[#0047BA] via-[#38A9F5] to-[#7BBDE8]" />

      {/* Decorative geometric background */}
      <div className="absolute top-0 right-0 flex items-start gap-1 opacity-30 pointer-events-none">
        <div className="w-12 h-10 bg-[#7BBDE8] -skew-x-[30deg]" />
        <div className="w-6 h-14 bg-[#38A9F5] -skew-x-[30deg]" />
        <div className="w-10 h-8 bg-[#0047BA] -skew-x-[30deg]" />
      </div>

      <div className="relative max-w-[1440px] mx-auto px-4 md:px-8 py-5">

        <div className="flex flex-col md:flex-row items-center justify-between gap-5">

          {/* Company Branding */}
          <div className="flex items-center gap-3">

            <div className="relative w-9 h-8 flex items-center justify-center">
              <div className="absolute w-7 h-6 bg-[#38A9F5] -skew-x-[25deg]" />
              <div className="absolute w-5 h-6 bg-[#0047BA] -skew-x-[25deg] translate-x-1" />
              <span className="relative text-white font-black text-xs">
                N
              </span>
            </div>

            <div>
              <p className="text-[11px] font-extrabold tracking-[0.12em] text-[#17365D]">
                NANDGATE-IT SERVICES PVT LTD
              </p>

              <p className="text-[10px] text-slate-400 mt-0.5">
                Powered by technology. Driven by innovation.
              </p>
            </div>

          </div>

          {/* Footer Navigation */}
          <nav
            aria-label="Footer Navigation"
            className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3"
          >

            <a
              href="#privacy"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#0047BA] transition-colors"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-[#38A9F5]" />
              Privacy Policy
              <ArrowUpRight className="w-3 h-3 opacity-50" />
            </a>

            <a
              href="#audit"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#0047BA] transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-[#38A9F5]" />
              Audit Logs
              <ArrowUpRight className="w-3 h-3 opacity-50" />
            </a>

            <a
              href="#sla"
              className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#0047BA] transition-colors"
            >
              <Headset className="w-3.5 h-3.5 text-[#38A9F5]" />
              Support & SLA
              <ArrowUpRight className="w-3 h-3 opacity-50" />
            </a>

          </nav>

        </div>

        {/* Bottom Copyright */}
        <div className="mt-5 pt-4 border-t border-[#edf3fb] flex flex-col sm:flex-row items-center justify-between gap-2">

          <p className="text-[10px] text-slate-400 font-medium">
            © {year ?? "2026"} NANDGATE-IT SERVICES PVT LTD. All rights reserved.
          </p>

        </div>

      </div>
    </footer>
  );
}
