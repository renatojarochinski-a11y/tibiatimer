"use client";

import { useState, type ReactNode } from "react";

export default function Panel({
  title,
  right,
  children,
  dark,
  defaultCollapsed = false,
  highlight = false,
}: {
  title: string;
  right?: ReactNode;
  children: ReactNode;
  dark: boolean;
  defaultCollapsed?: boolean;
  highlight?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(defaultCollapsed);

  const border = dark ? "border-black" : "border-neutral-300";
  const body = dark ? "bg-[#242420]" : "bg-white";
  const header = dark
    ? "border-black bg-gradient-to-b from-[#3c3c35] to-[#2a2a25] text-[#d8d2b8]"
    : "border-neutral-200 bg-neutral-100 text-neutral-600";
  const btn = dark
    ? "border-black/60 bg-[#4a4a42] text-[#d8d2b8] hover:bg-[#5a5a50]"
    : "border-neutral-300 bg-neutral-200 text-neutral-600 hover:bg-neutral-300";

  return (
    <div
      className={`overflow-hidden rounded-[3px] border ${border} ${body} ${
        highlight ? "ring-1 ring-red-500/70" : ""
      } shadow-[0_2px_5px_rgba(0,0,0,0.35)]`}
    >
      <div className={`flex items-center justify-between gap-2 border-b px-2 py-1 ${header}`}>
        <span className="select-none truncate text-[11px] font-semibold uppercase tracking-wide">
          {title}
        </span>
        <div className="flex shrink-0 items-center gap-1">
          {right}
          <button
            onClick={() => setCollapsed((c) => !c)}
            className={`flex h-4 w-4 items-center justify-center rounded-[2px] border text-[10px] leading-none ${btn}`}
            title={collapsed ? "Expandir" : "Recolher"}
          >
            {collapsed ? "+" : "–"}
          </button>
        </div>
      </div>
      {!collapsed && <div className="p-2">{children}</div>}
    </div>
  );
}
