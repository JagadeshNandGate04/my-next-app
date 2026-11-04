
// "use client";

// import React, { useEffect, useState } from "react";
// import {
//   ShieldCheck,
//   FileText,
//   Headset,
//   ArrowUpRight,
// } from "lucide-react";

// export default function Footer() {
//   const [year, setYear] = useState<number | null>(null);

//   useEffect(() => {
//     setYear(new Date().getFullYear());
//   }, []);

//   return (
//     <footer className="relative bg-white border-t border-[#d6e5fb] overflow-hidden">

//       {/* Top gradient accent */}
//       <div className="h-[3px] bg-gradient-to-r from-[#0047BA] via-[#38A9F5] to-[#7BBDE8]" />

//       {/* Decorative geometric background */}
//       <div className="absolute top-0 right-0 flex items-start gap-1 opacity-30 pointer-events-none">
//         <div className="w-12 h-10 bg-[#7BBDE8] -skew-x-[30deg]" />
//         <div className="w-6 h-14 bg-[#38A9F5] -skew-x-[30deg]" />
//         <div className="w-10 h-8 bg-[#0047BA] -skew-x-[30deg]" />
//       </div>

//       <div className="relative max-w-[1440px] mx-auto px-4 md:px-8 py-5">

//         <div className="flex flex-col md:flex-row items-center justify-between gap-5">

//           {/* Company Branding */}
//           <div className="flex items-center gap-3">

//             <div className="relative w-9 h-8 flex items-center justify-center">
//               <div className="absolute w-7 h-6 bg-[#38A9F5] -skew-x-[25deg]" />
//               <div className="absolute w-5 h-6 bg-[#0047BA] -skew-x-[25deg] translate-x-1" />
//               <span className="relative text-white font-black text-xs">
//                 N
//               </span>
//             </div>

//             <div>
//               <p className="text-[11px] font-extrabold tracking-[0.12em] text-[#17365D]">
//                 NANDGATE-IT SERVICES PVT LTD
//               </p>

//               <p className="text-[10px] text-slate-400 mt-0.5">
//                 Powered by technology. Driven by innovation.
//               </p>
//             </div>

//           </div>

//           {/* Footer Navigation */}
//           <nav
//             aria-label="Footer Navigation"
//             className="flex flex-wrap items-center justify-center gap-x-5 gap-y-3"
//           >

//             <a
//               href="#privacy"
//               className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#0047BA] transition-colors"
//             >
//               <ShieldCheck className="w-3.5 h-3.5 text-[#38A9F5]" />
//               Privacy Policy
//               <ArrowUpRight className="w-3 h-3 opacity-50" />
//             </a>

//             <a
//               href="#audit"
//               className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#0047BA] transition-colors"
//             >
//               <FileText className="w-3.5 h-3.5 text-[#38A9F5]" />
//               Audit Logs
//               <ArrowUpRight className="w-3 h-3 opacity-50" />
//             </a>

//             <a
//               href="#sla"
//               className="flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-[#0047BA] transition-colors"
//             >
//               <Headset className="w-3.5 h-3.5 text-[#38A9F5]" />
//               Support & SLA
//               <ArrowUpRight className="w-3 h-3 opacity-50" />
//             </a>

//           </nav>

//         </div>

//         {/* Bottom Copyright */}
//         <div className="mt-5 pt-4 border-t border-[#edf3fb] flex flex-col sm:flex-row items-center justify-between gap-2">

//           <p className="text-[10px] text-slate-400 font-medium">
//             © {year ?? "2026"} NANDGATE-IT SERVICES PVT LTD. All rights reserved.
//           </p>

//         </div>

//       </div>
//     </footer>
//   );
// }


"use client";

/**
 * app/components/Footer.tsx
 * Page footer – same rounded card style as the dashboard cards.
 * Optional links: <Footer links={[{ label: 'Support', href: '/support' }]} />
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Footer({
  links = [],
}: {
  links?: { label: string; href: string }[];
}) {
  const [year, setYear] = useState(2026);

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      setYear(new Date().getFullYear());
    }, 0);

    return () => window.clearTimeout(timerId);
  }, []);

  return (
    <footer className="relative w-full overflow-hidden bg-white pt-12">
      <div className="relative w-full">

        {/* Light blue decorative wave */}
        <div
          className="absolute inset-0 bg-[#7BBDE8]"
          style={{
            clipPath:
              'polygon(0 32%, 16% 0, 48% 42%, 65% 48%, 78% 40%, 100% 52%, 100% 100%, 0 100%)',
          }}
        />

        {/* Main blue footer */}
        <div
          className="relative bg-[#0875BD] px-6 pb-7 pt-16 text-white sm:px-10"
          style={{
            clipPath:
              'polygon(0 24%, 14% 0, 45% 39%, 65% 46%, 78% 41%, 100% 49%, 100% 100%, 0 100%)',
          }}
        >
          <div className="mx-auto flex max-w-[1440px] flex-col items-center justify-between gap-5 pt-5 sm:flex-row">

            {/* Copyright */}
            <p className="text-center text-sm font-medium text-white/90">
              © {year}{' '}
              <span className="font-bold text-white">
                NANDGATE-IT
              </span>
              {' '}| All rights reserved
            </p>

            {/* Navigation */}
            {links.length > 0 && (
              <nav
                className="flex flex-wrap items-center justify-center gap-5"
                aria-label="Footer"
              >
                {links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm font-medium text-white/90 transition-colors hover:text-white hover:underline"
                  >
                    {link.label}
                  </Link>
                ))}
              </nav>
            )}

            {/* Social Media Icons */}
            <div className="flex items-center gap-5">

              {/* Facebook */}
              <a href="#" aria-label="Facebook" className="hover:opacity-75">
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                  <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V8c0-.9.3-1.5 1.6-1.5h1.7V3.7c-.8-.1-1.6-.2-2.4-.2-2.4 0-4.1 1.5-4.1 4.3v2.1H7.5V13h2.8v8h3.2z" />
                </svg>
              </a>

              {/* Twitter / X */}
              <a href="#" aria-label="Twitter" className="hover:opacity-75">
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                  <path d="M18.9 2H22l-6.8 7.8L23.2 22h-6.3l-5-7.4L5.5 22H2.3l7.3-8.4L1.8 2h6.5l4.5 6.8L18.9 2zm-1.1 17.9h1.7L7.2 4H5.4l12.4 15.9z" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a href="#" aria-label="LinkedIn" className="hover:opacity-75">
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                  <path d="M5.2 3a2.2 2.2 0 1 0 0 4.4 2.2 2.2 0 0 0 0-4.4zM3.3 9h3.8v12H3.3V9zm6.1 0H13v1.6h.1c.5-.9 1.7-1.9 3.5-1.9 3.7 0 4.4 2.4 4.4 5.5V21h-3.8v-6c0-1.4 0-3.2-2-3.2s-2.3 1.5-2.3 3.1V21H9.4V9z" />
                </svg>
              </a>

              {/* RSS */}
              <a href="#" aria-label="RSS" className="hover:opacity-75">
                <svg viewBox="0 0 24 24" className="h-6 w-6 fill-current">
                  <path d="M4 4v3a13 13 0 0 1 13 13h3C20 10.1 13.9 4 4 4zm0 6v3a7 7 0 0 1 7 7h3c0-5.5-4.5-10-10-10zm2 7a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
                </svg>
              </a>

            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
