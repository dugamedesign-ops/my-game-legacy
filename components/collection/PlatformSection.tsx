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
  defaultOpen?: boolean;
};

export function PlatformSection({
  platform,
  items,
  onItemClick,
  onItemContextMenu,
  onAddItem,
  defaultOpen = true,
}: PlatformSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
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
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAddMenuOpen((prev) => !prev)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/85 transition hover:bg-white/10"
                title={`Adicionar item em ${platform}`}
              >
                ＋ Adicionar
              </button>
              {isAddMenuOpen && (
                <div className="absolute right-0 top-9 z-20 min-w-[180px] rounded-xl border border-white/10 bg-[#0b1220] p-1.5 shadow-xl">
                  <button
                    type="button"
                    onClick={() => {
                      onAddItem?.("game", platform);
                      setIsAddMenuOpen(false);
                    }}
                    className="flex w-full rounded-lg px-3 py-2 text-left text-xs text-white/85 transition hover:bg-white/10"
                  >
                    🎮 Adicionar jogo
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAddItem?.("console", platform);
                      setIsAddMenuOpen(false);
                    }}
                    className="flex w-full rounded-lg px-3 py-2 text-left text-xs text-white/85 transition hover:bg-white/10"
                  >
                    🖥️ Adicionar console
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onAddItem?.("accessory", platform);
                      setIsAddMenuOpen(false);
                    }}
                    className="flex w-full rounded-lg px-3 py-2 text-left text-xs text-white/85 transition hover:bg-white/10"
                  >
                    🎧 Adicionar acessório
                  </button>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                setIsOpen((prev) => !prev);
                setIsAddMenuOpen(false);
              }}
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
