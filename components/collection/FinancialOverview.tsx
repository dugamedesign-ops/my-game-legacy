"use client";

import { useState } from "react";
import { Item } from "@/types/collection";
import { formatCurrencyBRL, getFinancialSummary } from "@/lib/finance-utils";

type FinancialOverviewProps = {
  items: Item[];
  defaultOpen?: boolean;
  hideToggle?: boolean;
};

export function FinancialOverview({
  items,
  defaultOpen = false,
  hideToggle = false,
}: FinancialOverviewProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Item["type"][]>([]);
  const [selectedOwnership, setSelectedOwnership] = useState<Item["ownershipStatus"][]>([]);

  const platformOptions = Array.from(
    new Set(items.filter((item) => !item.isRemoved).map((item) => item.platform).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

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
      ? `${summary.missingPreorderPaidCount} pré-venda(s) sem valor pago`
      : null,
  ].filter(Boolean) as string[];
  const hasActiveFilters =
    selectedPlatforms.length > 0 ||
    selectedTypes.length > 0 ||
    selectedOwnership.length > 0;

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
          <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm font-medium text-white">Filtros financeiros</p>
              <button
                type="button"
                onClick={() => {
                  setSelectedPlatforms([]);
                  setSelectedTypes([]);
                  setSelectedOwnership([]);
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
                label="Status"
                options={[
                  { value: "collection", label: "Na coleção" },
                  { value: "wishlist", label: "Wishlist" },
                  { value: "preorder", label: "Pré-venda" },
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
            </div>
            <p className="mt-3 text-xs text-white/55">
              {filteredItems.length} item(ns) incluído(s) neste resumo.
            </p>
          </div>

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
              label="Pré-vendas pagas"
              value={formatCurrencyBRL(summary.preorderPaidValue)}
              tone="accent"
            />
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
