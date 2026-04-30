"use client";

import type { Filters } from "@/lib/filter-utils";
import type {
  GameProgressStatus,
  Item,
  ItemType,
  OwnershipStatus,
  PurchasePriority,
} from "@/types/collection";

type Props = {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  items: Item[];
  compact?: boolean;
};

export function FiltersBar({ filters, setFilters, items, compact = false }: Props) {
  function toggleValue<T>(array: T[], value: T): T[] {
    return array.includes(value)
      ? array.filter((v) => v !== value)
      : [...array, value];
  }

  function toggleType(value: ItemType) {
    const nextTypes = toggleValue(filters.types, value);
    const hasNonGameTypes = nextTypes.includes("console") || nextTypes.includes("accessory");

    setFilters({
      ...filters,
      types: nextTypes,
      gameStatus: hasNonGameTypes ? [] : filters.gameStatus,
    });
  }

  function toggleOwnership(value: OwnershipStatus) {
    setFilters({
      ...filters,
      ownership: toggleValue(filters.ownership, value),
    });
  }

  function togglePriority(value: PurchasePriority) {
    setFilters({
      ...filters,
      priorities: toggleValue(filters.priorities, value),
    });
  }

  function toggleGameStatus(value: GameProgressStatus) {
    setFilters({
      ...filters,
      gameStatus: toggleValue(filters.gameStatus, value),
    });
  }

  function toggleMedia(value: "physical" | "digital") {
    setFilters({
      ...filters,
      media: toggleValue(filters.media, value),
    });
  }

  function toggleMissing(value: "noImage" | "noPaid" | "noCurrent") {
    setFilters({
      ...filters,
      missing: toggleValue(filters.missing, value),
    });
  }
  function handleFranchiseChange(value: string) {
    setFilters({
      ...filters,
      franchises: value ? [value] : [],
    });
  }

  function clearAllFilters() {
    setFilters({
      types: [],
      ownership: [],
      priorities: [],
      gameStatus: [],
      franchises: [],
      media: [],
      missing: [],
    });
  }

  const hasActiveFilters =
    filters.types.length > 0 ||
    filters.ownership.length > 0 ||
    filters.priorities.length > 0 ||
    filters.gameStatus.length > 0 ||
    filters.franchises.length > 0 ||
    filters.media.length > 0 ||
    filters.missing.length > 0;
  const franchiseOptions = Array.from(
    new Set(items.map((item) => item.franchise?.trim()).filter(Boolean)),
  ).sort((a, b) => a!.localeCompare(b!, "pt-BR", { sensitivity: "base" })) as string[];

  return (
    <section className={compact ? "" : "mb-6 rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-[0_8px_40px_rgb(0,0,0,0.18)]"}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-white/40">
            Filtros
          </p>
          <h2 className="mt-2 text-xl font-semibold text-white">
            Navegação inteligente
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
            Combine filtros para encontrar itens por tipo, status, mídia,
            progresso e pendências.
          </p>
        </div>

        <button
          type="button"
          onClick={clearAllFilters}
          disabled={!hasActiveFilters}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Limpar filtros
        </button>
      </div>

      <div className="mt-5 space-y-4">
        <FilterGroup label="Tipo">
          <FilterChip
            label="Consoles"
            active={filters.types.includes("console")}
            onClick={() => toggleType("console")}
          />
          <FilterChip
            label="Acessórios"
            active={filters.types.includes("accessory")}
            onClick={() => toggleType("accessory")}
          />
          <FilterChip
            label="Jogos"
            active={filters.types.includes("game")}
            onClick={() => toggleType("game")}
          />
        </FilterGroup>

        <FilterGroup label="Status de posse">
          <FilterChip
            label="Na coleção"
            active={filters.ownership.includes("collection")}
            onClick={() => toggleOwnership("collection")}
          />
          <FilterChip
            label="Wishlist"
            active={filters.ownership.includes("wishlist")}
            onClick={() => toggleOwnership("wishlist")}
          />
        </FilterGroup>

        <FilterGroup label="Prioridade">
          <FilterChip
            label="Baixa"
            active={filters.priorities.includes("low")}
            onClick={() => togglePriority("low")}
          />
          <FilterChip
            label="Média"
            active={filters.priorities.includes("medium")}
            onClick={() => togglePriority("medium")}
          />
          <FilterChip
            label="Alta"
            active={filters.priorities.includes("high")}
            onClick={() => togglePriority("high")}
          />
          <FilterChip
            label="Máxima"
            active={filters.priorities.includes("maximum")}
            onClick={() => togglePriority("maximum")}
          />
        </FilterGroup>

        <FilterGroup label="Status do jogo">
          <FilterChip
            label="Backlog"
            active={filters.gameStatus.includes("backlog")}
            onClick={() => toggleGameStatus("backlog")}
          />
          <FilterChip
            label="Jogando"
            active={filters.gameStatus.includes("playing")}
            onClick={() => toggleGameStatus("playing")}
          />
          <FilterChip
            label="Pausado"
            active={filters.gameStatus.includes("paused")}
            onClick={() => toggleGameStatus("paused")}
          />
          <FilterChip
            label="Terminado"
            active={filters.gameStatus.includes("finished")}
            onClick={() => toggleGameStatus("finished")}
          />
          <FilterChip
            label="Buscando a Platina"
            active={filters.gameStatus.includes("seeking_platinum")}
            onClick={() => toggleGameStatus("seeking_platinum")}
          />
          <FilterChip
            label="Platinado"
            active={filters.gameStatus.includes("platinum")}
            onClick={() => toggleGameStatus("platinum")}
          />
        </FilterGroup>
        <FilterGroup label="Franquia">
          <select
            value={filters.franchises[0] ?? ""}
            onChange={(event) => handleFranchiseChange(event.target.value)}
            className="w-full max-w-sm rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white"
          >
            <option value="">Todas</option>
            {franchiseOptions.map((franchise) => (
              <option key={franchise} value={franchise}>
                {franchise}
              </option>
            ))}
          </select>
        </FilterGroup>

        <FilterGroup label="Mídia">
          <FilterChip
            label="Física"
            active={filters.media.includes("physical")}
            onClick={() => toggleMedia("physical")}
          />
          <FilterChip
            label="Digital"
            active={filters.media.includes("digital")}
            onClick={() => toggleMedia("digital")}
          />
        </FilterGroup>

        <FilterGroup label="Pendências">
          <FilterChip
            label="Sem imagem"
            active={filters.missing.includes("noImage")}
            onClick={() => toggleMissing("noImage")}
          />
          <FilterChip
            label="Sem valor pago"
            active={filters.missing.includes("noPaid")}
            onClick={() => toggleMissing("noPaid")}
          />
          <FilterChip
            label="Sem valor atual"
            active={filters.missing.includes("noCurrent")}
            onClick={() => toggleMissing("noCurrent")}
          />
        </FilterGroup>
      </div>
    </section>
  );
}

function FilterGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.22em] text-white/35">
        {label}
      </p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
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
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs transition ${
        active
          ? "border-white bg-white text-black"
          : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
      }`}
    >
      {label}
    </button>
  );
}
