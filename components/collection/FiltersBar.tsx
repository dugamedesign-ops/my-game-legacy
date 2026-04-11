"use client";

import { Filters } from "@/lib/filter-utils";

type Props = {
  filters: Filters;
  setFilters: (filters: Filters) => void;
};

export function FiltersBar({ filters, setFilters }: Props) {
  function toggle<T>(array: T[], value: T): T[] {
    return array.includes(value)
      ? array.filter((v) => v !== value)
      : [...array, value];
  }

  function update<K extends keyof Filters>(
    key: K,
    value: Filters[K][number]
  ) {
    setFilters({
      ...filters,
      [key]: toggle(filters[key], value),
    });
  }

  return (
    <section className="mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-sm text-white/50 mb-3">Filtros</p>

      <div className="flex flex-wrap gap-2">
        <FilterChip
          label="Jogos"
          active={filters.types.includes("game")}
          onClick={() => update("types", "game")}
        />

        <FilterChip
          label="Wishlist"
          active={filters.ownership.includes("wishlist")}
          onClick={() => update("ownership", "wishlist")}
        />

        <FilterChip
          label="Alta prioridade"
          active={filters.priorities.includes("high")}
          onClick={() => update("priorities", "high")}
        />

        <FilterChip
          label="Platinados"
          active={filters.gameStatus.includes("platinum")}
          onClick={() => update("gameStatus", "platinum")}
        />

        <FilterChip
          label="Físico"
          active={filters.media.includes("physical")}
          onClick={() => update("media", "physical")}
        />

        <FilterChip
          label="Sem valor"
          active={filters.missing.includes("noPaid")}
          onClick={() => update("missing", "noPaid")}
        />
      </div>
    </section>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full px-3 py-1 text-xs border transition ${
        active
          ? "bg-white text-black border-white"
          : "bg-white/5 text-white/70 border-white/10"
      }`}
    >
      {label}
    </button>
  );
}