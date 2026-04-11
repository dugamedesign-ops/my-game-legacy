"use client";

import { useEffect, useRef, useState } from "react";
import { Item, ItemType } from "@/types/collection";
import { CATEGORY_LABELS, getPlatformTheme } from "@/lib/collection-utils";
import { ItemCard } from "./ItemCard";

type CardSize = "large" | "medium" | "small";

type CategorySectionProps = {
  category: ItemType;
  items: Item[];
  platform: string;
  defaultOpen?: boolean;
  onItemClick?: (item: Item) => void;
  onItemContextMenu?: (item: Item, x: number, y: number) => void;
  onAddItem?: (type: ItemType, platform: string) => void;
};

const CARD_SIZE_LABELS: Record<CardSize, string> = {
  large: "Grande",
  medium: "Médio",
  small: "Pequeno",
};

export function CategorySection({
  category,
  items,
  platform,
  defaultOpen = true,
  onItemClick,
  onItemContextMenu,
  onAddItem,
}: CategorySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [cardSize, setCardSize] = useState<CardSize>("medium");
  const [isSizeMenuOpen, setIsSizeMenuOpen] = useState(false);
  const sizeMenuRef = useRef<HTMLDivElement | null>(null);

  const theme = getPlatformTheme(platform);
  const itemCountLabel = `${items.length} ${items.length === 1 ? "item" : "itens"}`;

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (!sizeMenuRef.current) return;
      if (!sizeMenuRef.current.contains(event.target as Node)) {
        setIsSizeMenuOpen(false);
      }
    }

    if (isSizeMenuOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isSizeMenuOpen]);

  return (
    <section className="rounded-2xl border border-white/10 bg-black/10">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5">
        <div className="flex items-start gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold text-white">
                {CATEGORY_LABELS[category]}
              </h3>

              <button
                type="button"
                onClick={() => onAddItem?.(category, platform)}
                className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-lg font-semibold transition hover:scale-[1.03] ${theme.accentSoft}`}
                aria-label={`Adicionar item em ${CATEGORY_LABELS[category]}`}
                title={`Adicionar em ${CATEGORY_LABELS[category]}`}
              >
                +
              </button>
            </div>

            <p className="mt-1 text-sm text-white/50">{itemCountLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div ref={sizeMenuRef} className="relative">
            <button
              type="button"
              onClick={() => setIsSizeMenuOpen((prev) => !prev)}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
            >
              Card: {CARD_SIZE_LABELS[cardSize]}
            </button>

            {isSizeMenuOpen && (
              <div className="absolute right-0 z-20 mt-2 min-w-[150px] rounded-2xl border border-white/10 bg-[#0d1326] p-2 shadow-2xl">
                {(["large", "medium", "small"] as CardSize[]).map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setCardSize(size);
                      setIsSizeMenuOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-sm transition ${
                      cardSize === size
                        ? "bg-white text-black"
                        : "text-white/75 hover:bg-white/[0.05] hover:text-white"
                    }`}
                  >
                    <span>{CARD_SIZE_LABELS[size]}</span>
                    <span className="text-xs opacity-70">
                      {size === "large" ? "G" : size === "medium" ? "M" : "P"}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            {isOpen ? "Fechar" : "Abrir"}
          </button>
        </div>
      </div>

      {isOpen && items.length > 0 && (
        <div
          className={
            cardSize === "large"
              ? "grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4"
              : cardSize === "medium"
                ? "grid grid-cols-2 gap-4 p-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5"
                : "grid grid-cols-2 gap-3 p-4 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6"
          }
        >
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={onItemClick}
              onContextMenu={onItemContextMenu}
              size={cardSize}
            />
          ))}
        </div>
      )}
    </section>
  );
}