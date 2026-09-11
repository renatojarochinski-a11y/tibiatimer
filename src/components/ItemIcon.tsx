"use client";

import { useState } from "react";
import type { ItemInfo } from "@/lib/tibiaVocations";

export default function ItemIcon({
  item,
  size = 40,
}: {
  item: ItemInfo;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-md border border-black/30 text-xs font-bold text-white shadow-inner"
        style={{ width: size, height: size, background: item.color }}
        title={item.name}
      >
        {item.name
          .split(" ")
          .filter((w) => !["of", "the"].includes(w.toLowerCase()))
          .slice(0, 2)
          .map((w) => w[0])
          .join("")}
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- ícone externo do TibiaWiki, sem necessidade de otimização do next/image
    <img
      src={item.image}
      alt={item.name}
      width={size}
      height={size}
      onError={() => setFailed(true)}
      className="shrink-0 rounded-md border border-black/30 bg-black/20 object-contain p-1 shadow-inner"
      style={{ width: size, height: size, imageRendering: "pixelated" }}
    />
  );
}
