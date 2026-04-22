"use client";

import { useRef, useState } from "react";
import { Item } from "@/types/collection";
import { formatCurrencyBRL, getFinancialSummary } from "@/lib/finance-utils";
import type { FinancialCollectionViewFilters } from "@/lib/collection-view-filters";
import { getAcquisitionStatusLabel, getNormalizedAcquisitionStatus } from "@/lib/acquisition-utils";

type FinancialOverviewProps = {
  items: Item[];
  defaultOpen?: boolean;
  hideToggle?: boolean;
  onViewInCollection?: (filters: FinancialCollectionViewFilters) => void;
  onUpdateItem?: (item: Item) => void;
};

export function FinancialOverview({
  items,
  defaultOpen = false,
  hideToggle = false,
  onViewInCollection,
  onUpdateItem,
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
  const [activeMissingKey, setActiveMissingKey] = useState<
    "collection_paid" | "collection_current" | "wishlist_current" | "purchased_paid" | null
  >(null);
  const [missingDraftValues, setMissingDraftValues] = useState<Record<string, string>>({});
  const missingInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

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

  const missingGroups = (() => {
    const collectionMissingPaid = filteredItems.filter(
      (item) => item.ownershipStatus === "collection" && item.amountPaid === undefined,
    );
    const collectionMissingCurrent = filteredItems.filter(
      (item) => item.ownershipStatus === "collection" && item.currentValue === undefined,
    );
    const wishlistMissingCurrent = filteredItems.filter(
      (item) =>
        item.ownershipStatus === "wishlist" &&
        !getNormalizedAcquisitionStatus(item) &&
        item.currentValue === undefined,
    );
    const purchasedMissingPaid = filteredItems.filter(
      (item) =>
        item.ownershipStatus === "wishlist" &&
        getNormalizedAcquisitionStatus(item) === "purchased" &&
        item.amountPaid === undefined,
    );

    return [
      {
        key: "collection_paid" as const,
        label: `${collectionMissingPaid.length} ${collectionMissingPaid.length === 1 ? "item" : "itens"} da coleção sem valor pago`,
        items: collectionMissingPaid,
        field: "amountPaid" as const,
      },
      {
        key: "collection_current" as const,
        label: `${collectionMissingCurrent.length} ${collectionMissingCurrent.length === 1 ? "item" : "itens"} da coleção sem valor atual`,
        items: collectionMissingCurrent,
        field: "currentValue" as const,
      },
      {
        key: "wishlist_current" as const,
        label: `${wishlistMissingCurrent.length} ${wishlistMissingCurrent.length === 1 ? "item" : "itens"} da wishlist sem valor monitorado`,
        items: wishlistMissingCurrent,
        field: "currentValue" as const,
      },
      {
        key: "purchased_paid" as const,
        label: `${purchasedMissingPaid.length} ${purchasedMissingPaid.length === 1 ? "item" : "itens"} comprado(s) sem valor pago`,
        items: purchasedMissingPaid,
        field: "amountPaid" as const,
      },
    ].filter((group) => group.items.length > 0);
  })();
  const activeMissingGroup = missingGroups.find((group) => group.key === activeMissingKey) ?? null;
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

  function saveMissingFieldValue(item: Item, field: "amountPaid" | "currentValue", index: number) {
    if (!activeMissingGroup) return;

    const draft = missingDraftValues[item.id] ?? "";
    const normalized = draft.replace(",", ".").trim();
    if (!normalized) return;

    const numeric = Number(normalized);
    if (!Number.isFinite(numeric)) return;

    const nextItemId = activeMissingGroup.items[index + 1]?.id ?? null;

    onUpdateItem?.({
      ...item,
      [field]: numeric,
      updatedAt: new Date().toISOString(),
    });

    setMissingDraftValues((current) => ({
      ...current,
      [item.id]: "",
    }));

    if (nextItemId) {
      window.setTimeout(() => {
        missingInputRefs.current[nextItemId]?.focus();
      }, 40);
    }
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
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <FinanceCard
              label="Investido no Legado"
              value={formatCurrencyBRL(summary.investedInCollection)}
              tone="default"
            />
            <FinanceCard
              label="Valor do Legado"
              value={formatCurrencyBRL(summary.currentCollectionValue)}
              tone="positive"
            />
            <FinanceCard
              label="Wishlist"
              value={formatCurrencyBRL(summary.wishlistMonitoredValue)}
              tone="warning"
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
              {filteredItems.length} {filteredItems.length === 1 ? "item incluído" : "itens incluídos"} neste resumo.
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
            <p className="text-sm font-medium text-white">Campos para completar</p>

            {missingGroups.length > 0 ? (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {missingGroups.map((group) => (
                    <button
                      key={group.key}
                      type="button"
                      onClick={() =>
                        setActiveMissingKey((current) =>
                          current === group.key ? null : group.key,
                        )
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        activeMissingKey === group.key
                          ? "border-cyan-300/70 bg-cyan-500/15 text-cyan-100"
                          : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
                      }`}
                    >
                      {group.label}
                    </button>
                  ))}
                </div>

                {activeMissingGroup && (
                  <div className="mt-4 space-y-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                    {activeMissingGroup.items.map((item, index) => {
                      const draft = missingDraftValues[item.id] ?? "";
                      const inputLabel =
                        activeMissingGroup.field === "amountPaid"
                          ? "Valor pago"
                          : "Valor atual";
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-white/10 bg-black/20 p-2.5"
                        >
                          <p className="text-xs font-semibold text-white">
                            {item.title}
                            {item.subtitle ? ` — ${item.subtitle}` : ""}
                          </p>
                          <p className="mt-0.5 text-[11px] text-white/55">{item.platform}</p>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <input
                              ref={(element) => {
                                missingInputRefs.current[item.id] = element;
                              }}
                              value={draft}
                              onChange={(event) =>
                                setMissingDraftValues((current) => ({
                                  ...current,
                                  [item.id]: event.target.value,
                                }))
                              }
                              onKeyDown={(event) => {
                                if (event.key !== "Enter") return;
                                event.preventDefault();
                                saveMissingFieldValue(item, activeMissingGroup.field, index);
                              }}
                              placeholder={`${inputLabel} (R$)`}
                              inputMode="decimal"
                              className="min-w-[170px] flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35"
                            />
                            <button
                              type="button"
                              onClick={() =>
                                saveMissingFieldValue(item, activeMissingGroup.field, index)
                              }
                              className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-xs text-white transition hover:bg-white/15"
                            >
                              Salvar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </>
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
