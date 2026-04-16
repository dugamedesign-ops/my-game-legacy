"use client";

import { useState } from "react";
import { Item, ItemType } from "@/types/collection";
import { CATEGORY_LABELS } from "@/lib/collection-utils";
import { ItemCard } from "./ItemCard";

type CategorySectionProps = {
  category: ItemType;
  items: Item[];
  defaultOpen?: boolean;
  onAddItem?: () => void;
  onItemClick?: (item: Item) => void;
  onItemContextMenu?: (item: Item, x: number, y: number) => void;
};

export function CategorySection({
  category,
  items,
  defaultOpen = true,
  onAddItem,
  onItemClick,
  onItemContextMenu,
}: CategorySectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const itemCountLabel = `${items.length} ${items.length === 1 ? "item" : "itens"}`;

  return (
    <section className="rounded-2xl border border-white/10 bg-black/10">
      <div className="flex flex-wrap items-start justify-between gap-4 px-5 py-5">
        <div className="flex items-start gap-3">
          <div>
            <div className="flex items-center gap-3">
              <h3 className="text-base font-semibold text-white sm:text-lg">
                {CATEGORY_LABELS[category]}
              </h3>
              <button
                type="button"
                onClick={onAddItem}
                disabled={!onAddItem}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/5 text-base text-white/85 transition hover:bg-white/10"
                aria-label={`Adicionar item em ${CATEGORY_LABELS[category]}`}
                title={`Adicionar item em ${CATEGORY_LABELS[category]}`}
              >
                +
              </button>
            </div>

            <p className="mt-1 text-sm text-white/50">{itemCountLabel}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-sm transition hover:bg-white/10"
            aria-label={isOpen ? "Recolher subpasta" : "Expandir subpasta"}
          >
            {isOpen ? "🔽" : "▶️"}
          </button>
        </div>
      </div>

      {isOpen && items.length > 0 && (
        <div
          className="grid grid-cols-2 gap-4 p-4 md:grid-cols-3 lg:grid-cols-4"
        >
          {items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              onClick={onItemClick}
              onContextMenu={onItemContextMenu}
              size="medium"
              showMediaSeals={category === "game"}
            />
          ))}
        </div>
      )}
    </section>
  );
}
