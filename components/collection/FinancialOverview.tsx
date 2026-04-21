"use client";

import { useState } from "react";
import { Item } from "@/types/collection";
import { formatCurrencyBRL, getFinancialSummary } from "@/lib/finance-utils";
import type { FinancialCollectionViewFilters } from "@/lib/collection-view-filters";
import { getAcquisitionStatusLabel, getNormalizedAcquisitionStatus } from "@/lib/acquisition-utils";

type FinancialOverviewProps = {
  items: Item[];
  defaultOpen?: boolean;
  hideToggle?: boolean;
  onViewInCollection?: (filters: FinancialCollectionViewFilters) => void;
};

export function FinancialOverview({
  items,
  defaultOpen = false,
  hideToggle = false,
  onViewInCollection,
}: FinancialOverviewProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Item["type"][]>([]);
  const [selectedOwnership, setSelectedOwnership] = useState<Item["ownershipStatus"][]>([]);
  const [selectedAcquisitionStatuses, setSelectedAcquisitionStatuses] = useState<
    NonNullable<Item["acquisitionStatus"]>[]
  >([]);
  const [selectedPriorities, setSelectedPriorities] = useState<
    NonNullable<Item["purchasePriority"]>[]
  >([]);
  const [selectedRarities, setSelectedRarities] = useState<
    NonNullable<Item["rarityTags"]>[number][]
  >([]);

  const platformOptions = Array.from(
    new Set(items.filter((item) => !item.isRemoved).map((item) => item.platform).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  const rarityOptions = Array.from(
    new Set(
      items
        .filter((item) => !item.isRemoved)
        .flatMap((item) => item.rarityTags ?? []),
    ),
  );

  const filteredItems = items.filter((item) => {
    if (item.isRemoved) return false;

    if (
      selectedPlatforms.length > 0 &&
      !selectedPlatforms.includes(item.platform)
    ) {
      return false;
    }

    if (selectedTypes.length > 0 && !selectedTypes.includes(item.type)) {
      return false;
    }

    if (
      selectedOwnership.length > 0 &&
      !selectedOwnership.includes(item.ownershipStatus)
    ) {
      return false;
    }
    if (selectedAcquisitionStatuses.length > 0) {
      const acquisitionStatus = getNormalizedAcquisitionStatus(item);
      if (!acquisitionStatus || !selectedAcquisitionStatuses.includes(acquisitionStatus)) {
        return false;
      }
    }
    if (
      selectedPriorities.length > 0 &&
      (!item.purchasePriority || !selectedPriorities.includes(item.purchasePriority))
    ) {
      return false;
    }
    if (
      selectedRarities.length > 0 &&
      !(item.rarityTags ?? []).some((rarity) => selectedRarities.includes(rarity))
    ) {
      return false;
    }

    return true;
  });

  const summary = getFinancialSummary(filteredItems);

  const missingMessages = [
    summary.missingCollectionPaidCount > 0
      ? `${summary.missingCollectionPaidCount} item(ns) da coleção sem valor pago`
      : null,
    summary.missingCollectionCurrentCount > 0
      ? `${summary.missingCollectionCurrentCount} item(ns) da coleção sem valor atual`
      : null,
    summary.missingWishlistCurrentCount > 0
      ? `${summary.missingWishlistCurrentCount} item(ns) da wishlist sem valor monitorado`
      : null,
    summary.missingPreorderPaidCount > 0
      ? `${summary.missingPreorderPaidCount} comprado(s) em rota sem valor pago`
      : null,
  ].filter(Boolean) as string[];
  const hasActiveFilters =
    selectedPlatforms.length > 0 ||
    selectedTypes.length > 0 ||
    selectedOwnership.length > 0 ||
    selectedAcquisitionStatuses.length > 0 ||
    selectedPriorities.length > 0 ||
    selectedRarities.length > 0;

  function toggleSelection<T extends string>(
    current: T[],
    value: T,
    setter: (next: T[]) => void,
  ) {
    setter(
      current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
    );
  }

  function formatRarityLabel(rarity: NonNullable<Item["rarityTags"]>[number]) {
    if (rarity === "normal") return "Normal";
    if (rarity === "rare") return "Raro";
    if (rarity === "special_edition") return "Edição Especial";
    if (rarity === "highlight") return "Destaque";
    if (rarity === "steelbook") return "Steelbook";
    return "Repro";
  }

  return (
    <section className="mb-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_8px_40px_rgb(0,0,0,0.18)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-white/40">
            Financeiro
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Resumo da coleção
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
            Os valores abaixo usam apenas os itens que já possuem dados preenchidos.
            Itens sem valores continuam no app normalmente, mas ficam fora das somas.
          </p>
        </div>

        {!hideToggle && (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            {isOpen ? "Fechar" : "Abrir"}
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-6 flex flex-col gap-6">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <FinanceCard
              label="Investido na coleção"
              value={formatCurrencyBRL(summary.investedInCollection)}
              tone="default"
            />
            <FinanceCard
              label="Valor atual da coleção"
              value={formatCurrencyBRL(summary.currentCollectionValue)}
              tone="positive"
            />
            <FinanceCard
              label="Wishlist monitorada"
              value={formatCurrencyBRL(summary.wishlistMonitoredValue)}
              tone="warning"
            />
            <FinanceCard
              label="Comprados (em rota)"
              value={formatCurrencyBRL(summary.preorderPaidValue)}
              tone="accent"
            />
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">Filtros financeiros</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedPlatforms([]);
                  setSelectedTypes([]);
                  setSelectedOwnership([]);
                  setSelectedAcquisitionStatuses([]);
                  setSelectedPriorities([]);
                  setSelectedRarities([]);
                }}
                disabled={!hasActiveFilters}
                className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Limpar filtros
              </button>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-3">
              <FilterGroup
                label="Plataformas"
                options={platformOptions.map((platform) => ({
                  value: platform,
                  label: platform,
                }))}
                selected={selectedPlatforms}
                onToggle={(value) =>
                  toggleSelection(selectedPlatforms, value, setSelectedPlatforms)
                }
              />
              <div className="space-y-4">
                <FilterGroup
                  label="Categoria"
                  options={[
                    { value: "console", label: "Consoles" },
                    { value: "accessory", label: "Acessórios" },
                    { value: "game", label: "Jogos" },
                  ]}
                  selected={selectedTypes}
                  onToggle={(value) =>
                    toggleSelection(selectedTypes, value as Item["type"], setSelectedTypes)
                  }
                />
                <FilterGroup
                  label="Prioridade"
                  options={["low", "medium", "high", "maximum"].map((priority) => ({
                    value: priority,
                    label:
                      priority === "low"
                        ? "Baixa"
                        : priority === "medium"
                          ? "Média"
                          : priority === "high"
                            ? "Alta"
                            : "Máxima",
                  }))}
                  selected={selectedPriorities}
                  onToggle={(value) =>
                    toggleSelection(
                      selectedPriorities,
                      value as NonNullable<Item["purchasePriority"]>,
                      setSelectedPriorities,
                    )
                  }
                />
              </div>
              <div className="space-y-4">
                <FilterGroup
                  label="Status"
                  options={[
                    { value: "collection", label: "Na coleção" },
                    { value: "wishlist", label: "Wishlist" },
                  ]}
                  selected={selectedOwnership}
                  onToggle={(value) =>
                    toggleSelection(
                      selectedOwnership,
                      value as Item["ownershipStatus"],
                      setSelectedOwnership,
                    )
                  }
                />
                <FilterGroup
                  label="Compra"
                  options={[
                    { value: "preorder", label: getAcquisitionStatusLabel("preorder") },
                    { value: "purchased", label: getAcquisitionStatusLabel("purchased") },
                  ]}
                  selected={selectedAcquisitionStatuses}
                  onToggle={(value) =>
                    toggleSelection(
                      selectedAcquisitionStatuses,
                      value as NonNullable<Item["acquisitionStatus"]>,
                      setSelectedAcquisitionStatuses,
                    )
                  }
                />
                <FilterGroup
                  label="Raridade"
                  options={rarityOptions.map((rarity) => ({
                    value: rarity,
                    label: formatRarityLabel(rarity),
                  }))}
                  selected={selectedRarities}
                  onToggle={(value) =>
                    toggleSelection(
                      selectedRarities,
                      value as NonNullable<Item["rarityTags"]>[number],
                      setSelectedRarities,
                    )
                  }
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-white/55">
              {filteredItems.length} item(ns) incluído(s) neste resumo.
            </p>
            {hasActiveFilters && filteredItems.length > 0 && (
              <button
                type="button"
                onClick={() =>
                  onViewInCollection?.({
                    platforms: selectedPlatforms,
                    types: selectedTypes,
                    ownership: selectedOwnership,
                    acquisitionStatuses: selectedAcquisitionStatuses,
                    priorities: selectedPriorities,
                    rarities: selectedRarities,
                  })
                }
                className="mt-3 rounded-full border border-cyan-300/40 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100 transition hover:bg-cyan-500/20"
              >
                Ver na coleção
              </button>
            )}
          </div>

          <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-medium text-white">Pendências financeiras</p>

            {missingMessages.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {missingMessages.map((message) => (
                  <span
                    key={message}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/75"
                  >
                    {message}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-white/60">
                Todos os itens relevantes para o financeiro já têm valores preenchidos.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                isActive
                  ? "border-cyan-300/70 bg-cyan-400/15 text-cyan-100"
                  : "border-white/10 bg-black/20 text-white/70 hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function FinanceCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "default" | "positive" | "warning" | "accent";
}) {
  const toneClasses = {
    default: "from-white/[0.06] to-white/[0.03]",
    positive: "from-emerald-500/12 to-white/[0.03]",
    warning: "from-amber-500/12 to-white/[0.03]",
    accent: "from-fuchsia-500/12 to-white/[0.03]",
  };

  return (
    <div
      className={`rounded-3xl border border-white/10 bg-gradient-to-br ${toneClasses[tone]} p-5`}
    >
      <p className="text-xs uppercase tracking-[0.22em] text-white/40">
        {label}
      </p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}
