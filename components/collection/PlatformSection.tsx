"use client";

import { useMemo, useState } from "react";
import { Item, ItemType } from "@/types/collection";
import {
  CATEGORY_ORDER,
  getItemsByCategory,
  getPlatformTheme,
} from "@/lib/collection-utils";
import { CategorySection } from "./CategorySection";

type PlatformSectionProps = {
  platform: string;
  items: Item[];
  onItemClick?: (item: Item) => void;
  onItemContextMenu?: (item: Item, x: number, y: number) => void;
  onAddItem?: (type: ItemType, platform: string) => void;
};

export function PlatformSection({
  platform,
  items,
  onItemClick,
  onItemContextMenu,
  onAddItem,
}: PlatformSectionProps) {
  const [isOpen, setIsOpen] = useState(true);
  const theme = getPlatformTheme(platform);

  const counts = useMemo(() => {
    return {
      consoles: items.filter((item) => item.type === "console").length,
      accessories: items.filter((item) => item.type === "accessory").length,
      games: items.filter((item) => item.type === "game").length,
    };
  }, [items]);

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_10px_40px_rgb(0,0,0,0.22)]">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full border-b border-white/10 bg-gradient-to-r ${theme.header} px-5 py-5 text-left transition hover:bg-white/[0.03]`}
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${theme.accent}`} />
              <h2 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                {platform}
              </h2>
            </div>

            <p className="text-sm text-white/55">
              {items.length} {items.length === 1 ? "item" : "itens"} nesta
              plataforma
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-white/70">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Consoles: {counts.consoles}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Acessórios: {counts.accessories}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Jogos: {counts.games}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              {isOpen ? "Fechar" : "Abrir"}
            </span>
          </div>
        </div>
      </button>

      {isOpen && (
        <div className="space-y-4 p-4">
          {CATEGORY_ORDER.map((category) => (
            <CategorySection
              key={category}
              category={category}
              platform={platform}
              items={getItemsByCategory(items, category)}
              onItemClick={onItemClick}
              onItemContextMenu={onItemContextMenu}
              onAddItem={onAddItem}
            />
          ))}
        </div>
      )}
    </section>
  );
}