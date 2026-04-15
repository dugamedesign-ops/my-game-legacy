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

  const categoryData = useMemo(() => {
    const consoles = getItemsByCategory(items, "console");
    const accessories = getItemsByCategory(items, "accessory");
    const games = getItemsByCategory(items, "game");

    return {
      consoles,
      accessories,
      games,
      visibleCategories: CATEGORY_ORDER.filter((category) => {
        if (category === "console") return consoles.length > 0;
        if (category === "accessory") return accessories.length > 0;
        return games.length > 0;
      }),
    };
  }, [items]);

  return (
    <section className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.04] shadow-[0_10px_40px_rgb(0,0,0,0.22)]">
      <div
        className={`w-full border-b border-white/10 bg-gradient-to-r ${theme.header} px-4 py-3 text-left`}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${theme.accent}`} />
            <h2 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
              {platform}
            </h2>
          </div>

          <div className="flex shrink-0 items-center gap-2 text-sm text-white/70">
            <button
              type="button"
              onClick={() => onAddItem?.("game", platform)}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/85 transition hover:bg-white/10"
              title={`Adicionar jogo em ${platform}`}
            >
              🎮 +Jogo
            </button>
            <button
              type="button"
              onClick={() => onAddItem?.("console", platform)}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/85 transition hover:bg-white/10"
              title={`Adicionar console em ${platform}`}
            >
              🖥️ +Console
            </button>
            <button
              type="button"
              onClick={() => onAddItem?.("accessory", platform)}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-white/85 transition hover:bg-white/10"
              title={`Adicionar acessório em ${platform}`}
            >
              🎧 +Acessório
            </button>
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-sm transition hover:bg-white/10"
              aria-label={isOpen ? "Recolher plataforma" : "Expandir plataforma"}
            >
              {isOpen ? "🔽" : "▶️"}
            </button>
          </div>
        </div>
      </div>

      <div
        className={`grid transition-[grid-template-rows] duration-300 ease-out ${
          isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="overflow-hidden">
          <div className="space-y-4 p-4">
            {categoryData.visibleCategories.map((category) => (
              <CategorySection
                key={category}
                category={category}
                items={getItemsByCategory(items, category)}
                onAddItem={() => onAddItem?.(category, platform)}
                onItemClick={onItemClick}
                onItemContextMenu={onItemContextMenu}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
