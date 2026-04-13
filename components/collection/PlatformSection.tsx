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
        className={`w-full border-b border-white/10 bg-gradient-to-r ${theme.header} px-5 py-5 text-left`}
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

          <div className="relative flex flex-wrap items-center gap-2 text-sm text-white/70">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                setIsAddMenuOpen((prev) => !prev);
              }}
              className="rounded-full border border-white/15 bg-black/25 px-3 py-1 text-sm font-medium text-white transition hover:bg-black/35"
            >
              + Adicionar em {platform}
            </button>
            {isAddMenuOpen && (
              <div
                className="absolute right-0 top-11 z-20 min-w-[220px] rounded-2xl border border-white/10 bg-[#0d1326] p-2 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => {
                    onAddItem?.("game", platform);
                    setIsAddMenuOpen(false);
                  }}
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10"
                >
                  + Jogo 🎮
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onAddItem?.("accessory", platform);
                    setIsAddMenuOpen(false);
                  }}
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10"
                >
                  + Acessório 🎧
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onAddItem?.("console", platform);
                    setIsAddMenuOpen(false);
                  }}
                  className="block w-full rounded-xl px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10"
                >
                  + Console 🕹️
                </button>
              </div>
            )}
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Consoles: {categoryData.consoles.length}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Acessórios: {categoryData.accessories.length}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
              Jogos: {categoryData.games.length}
            </span>
            <button
              type="button"
              onClick={() => setIsOpen((prev) => !prev)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 transition hover:bg-white/10"
            >
              {isOpen ? "Fechar" : "Abrir"}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
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
      )}
    </section>
  );
}
