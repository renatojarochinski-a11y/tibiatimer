"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/", label: "⏱️ Timer" },
  { href: "/loot", label: "💰 Loot Splitter" },
];

export default function NavTabs({ dark }: { dark: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="mb-4 flex gap-1.5">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`rounded-[3px] border px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition ${
              active
                ? dark
                  ? "border-[#c9a227] bg-[#c9a227] text-[#1c140c]"
                  : "border-rose-500 bg-rose-500 text-white"
                : dark
                  ? "border-black/60 bg-[#333029] text-[#d8d2b8] hover:bg-[#3d3a30]"
                  : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
