"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import { Megaphone } from "lucide-react";
import AnnouncementModal from "../dashboard/AnnouncementModal";

const AnnouncementContext = createContext<(() => void) | null>(null);

export function useAnnouncement() {
  const open = useContext(AnnouncementContext);
  if (!open) throw new Error("useAnnouncement must be used within AnnouncementProvider.");
  return open;
}

export function AnnouncementIcon({ showLabel = false }: { showLabel?: boolean }) {
  const open = useAnnouncement();

  return (
    <div className="ml-auto flex shrink-0 flex-col items-center gap-2">
      {showLabel && (
        <span aria-hidden="true" className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700 shadow-md">
          Announce
        </span>
      )}
      <button
        type="button"
        onClick={open}
        aria-label="Send announcement"
        title="Send announcement"
        className="announcement-float inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#1b64da] text-white shadow-md transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-700"
      >
        <Megaphone className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}

export default function AnnouncementProvider({
  children,
  showFloating = true,
}: {
  children: ReactNode;
  showFloating?: boolean;
}) {
  const [open, setOpen] = useState(false);

  return (
    <AnnouncementContext.Provider value={() => setOpen(true)}>
      {children}
      {showFloating && <div className="fixed left-4 top-[88px] z-40 flex flex-col items-center gap-2 sm:left-6 sm:top-[116px]">
        <span aria-hidden="true" className="rounded-full bg-white px-3 py-1 text-xs font-bold text-blue-700 shadow-md">
          Announce
        </span>
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Send announcement"
          title="Send announcement"
          className="announcement-float flex h-14 w-14 items-center justify-center rounded-full bg-[#1b64da] text-white shadow-lg shadow-blue-500/40 transition-colors hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-700"
        >
          <Megaphone className="h-6 w-6" aria-hidden="true" />
        </button>
      </div>}
      {open && <AnnouncementModal onClose={() => setOpen(false)} />}
    </AnnouncementContext.Provider>
  );
}
