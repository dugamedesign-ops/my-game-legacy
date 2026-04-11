"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Item } from "@/types/collection";
import {
  getCollectionSummary,
  groupItemsByPlatform,
} from "@/lib/collection-utils";
import { PlatformSection } from "./PlatformSection";
import { ItemDetailsModal } from "./ItemDetailsModal";
import { AddItemModal } from "./AddItemModal";
import { usePersistentCollection } from "@/hooks/usePersistentCollection";
import { FinancialOverview } from "./FinancialOverview";
import { PendingItemsOverview } from "./PendingItemsOverview";
import { FiltersBar } from "./FiltersBar";
import { applyFilters, type Filters } from "@/lib/filter-utils";

type CollectionDashboardProps = {
  items: Item[];
};

type ContextMenuState = {
  item: Item;
  x: number;
  y: number;
} | null;

export function CollectionDashboard({ items }: CollectionDashboardProps) {
  const {
    items: collectionItems,
    addItem,
    updateItem,
    removeItem,
    isLoaded,
  } = usePersistentCollection(items);

  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);

  const [prefilledType, setPrefilledType] = useState<
    "console" | "accessory" | "game" | null
  >(null);
  const [prefilledPlatform, setPrefilledPlatform] = useState<string | null>(
    null,
  );

  const [filters, setFilters] = useState<Filters>({
    types: [],
    ownership: [],
    priorities: [],
    gameStatus: [],
    media: [],
    missing: [],
  });

  useEffect(() => {
    function handleCloseContextMenu() {
      setContextMenu(null);
    }

    window.addEventListener("click", handleCloseContextMenu);
    window.addEventListener("scroll", handleCloseContextMenu);
    window.addEventListener("resize", handleCloseContextMenu);

    return () => {
      window.removeEventListener("click", handleCloseContextMenu);
      window.removeEventListener("scroll", handleCloseContextMenu);
      window.removeEventListener("resize", handleCloseContextMenu);
    };
  }, []);

  function handleOpenDefaultAdd() {
    setPrefilledType(null);
    setPrefilledPlatform(null);
    setIsAddModalOpen(true);
  }

  function handleOpenContextualAdd(
    type: "console" | "accessory" | "game",
    platform: string,
  ) {
    setPrefilledType(type);
    setPrefilledPlatform(platform);
    setIsAddModalOpen(true);
  }

  const filteredItems = useMemo(() => {
    const base = collectionItems.filter((item) => {
      const normalizedSearch = search.trim().toLowerCase();

      const matchesSearch =
        normalizedSearch === "" ||
        item.title.toLowerCase().includes(normalizedSearch) ||
        item.platform.toLowerCase().includes(normalizedSearch) ||
        item.subtitle?.toLowerCase().includes(normalizedSearch);

      return matchesSearch;
    });

    return applyFilters(base, filters);
  }, [collectionItems, search, filters]);

  const groupedPlatforms = useMemo(
    () => groupItemsByPlatform(filteredItems),
    [filteredItems],
  );

  const summary = useMemo(
    () => getCollectionSummary(collectionItems),
    [collectionItems],
  );

  const isEmpty = collectionItems.length === 0;

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_25%),radial-gradient(circle_at_80%_20%,_rgba(168,85,247,0.12),_transparent_20%),linear-gradient(180deg,_#09090b_0%,_#111827_100%)] text-white">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-4">
          <div className="rounded-3xl border border-white/10 bg-white/[0.04] px-6 py-5 text-white/75 shadow-[0_8px_40px_rgb(0,0,0,0.18)]">
            Carregando sua coleção...
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.15),_transparent_25%),radial-gradient(circle_at_80%_20%,_rgba(168,85,247,0.12),_transparent_20%),linear-gradient(180deg,_#09090b_0%,_#111827_100%)] text-white">
        <div className="mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
          <header className="mb-8 overflow-hidden rounded-[32px] border border-white/10 bg-white/[0.05] p-6 shadow-[0_8px_40px_rgb(0,0,0,0.25)] backdrop-blur">
            <div className="flex flex-col gap-8 xl:flex-row xl:items-end xl:justify-between">
              <div className="space-y-3">
                <p className="text-sm uppercase tracking-[0.3em] text-white/45">
                  Coleção gamer
                </p>
                <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
                  Sua vitrine digital
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-white/65 sm:text-base">
                  Organize sua coleção por plataforma, acompanhe wishlist,
                  pré-vendas e construa uma base linda, clara e pronta para
                  evoluir.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <SummaryCard label="Itens" value={summary.totalItems} />
                <SummaryCard label="Na coleção" value={summary.collectionCount} />
                <SummaryCard label="Wishlist" value={summary.wishlistCount} />
                <SummaryCard label="Pré-venda" value={summary.preorderCount} />
              </div>
            </div>
          </header>

          {!isEmpty && <FinancialOverview items={collectionItems} />}

          {!isEmpty && (
            <PendingItemsOverview
              items={collectionItems}
              onOpenItem={(item) => setSelectedItem(item)}
            />
          )}

          {!isEmpty && (
            <>
              <FiltersBar filters={filters} setFilters={setFilters} />

              <section className="mb-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_8px_40px_rgb(0,0,0,0.18)]">
                <input
                  type="text"
                  placeholder="Buscar por nome, plataforma ou versão..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/20"
                />
              </section>
            </>
          )}

          {isEmpty ? (
            <EmptyCollectionState onAddClick={handleOpenDefaultAdd} />
          ) : groupedPlatforms.length > 0 ? (
            <section className="space-y-6">
              {groupedPlatforms.map((group) => (
                <PlatformSection
                  key={group.platform}
                  platform={group.platform}
                  items={group.items}
                  onItemClick={setSelectedItem}
                  onItemContextMenu={(item, x, y) => {
                    setContextMenu({ item, x, y });
                  }}
                  onAddItem={handleOpenContextualAdd}
                />
              ))}
            </section>
          ) : (
            <NoResultsState />
          )}

          <button
            type="button"
            onClick={handleOpenDefaultAdd}
            className="fixed bottom-6 right-6 rounded-full border border-white/10 bg-white text-black shadow-2xl transition hover:scale-[1.03] hover:bg-white/90"
          >
            <span className="block px-5 py-4 text-sm font-semibold">
              ＋ Adicionar item
            </span>
          </button>
        </div>
      </div>

      <ItemDetailsModal
        item={selectedItem}
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        onUpdateItem={(updatedItem) => {
          updateItem(updatedItem);
          setSelectedItem(updatedItem);
        }}
      />

            <AddItemModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setPrefilledType(null);
          setPrefilledPlatform(null);
        }}
        onSave={addItem}
        existingItems={collectionItems}
        initialType={prefilledType}
        initialPlatform={prefilledPlatform}
      />

      {contextMenu && (
        <div
          className="fixed z-[60] min-w-[180px] rounded-2xl border border-white/10 bg-[#0d1326] p-2 shadow-2xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={() => {
              const confirmed = window.confirm(
                `Deseja excluir "${contextMenu.item.title}" permanentemente?`,
              );

              if (confirmed) {
                removeItem(contextMenu.item.id);
                if (selectedItem?.id === contextMenu.item.id) {
                  setSelectedItem(null);
                }
              }

              setContextMenu(null);
            }}
            className="flex w-full rounded-xl px-3 py-2 text-left text-sm text-red-100 transition hover:bg-red-500/10"
          >
            Excluir item
          </button>
        </div>
      )}
    </>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs uppercase tracking-[0.25em] text-white/40">
        {label}
      </p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function EmptyCollectionState({ onAddClick }: { onAddClick: () => void }) {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_8px_40px_rgb(0,0,0,0.18)]">
      <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
        <div className="rounded-[28px] border border-dashed border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-8">
          <div className="max-w-2xl space-y-5">
            <div className="inline-flex rounded-full border border-cyan-400/20 bg-cyan-500/15 px-4 py-1.5 text-sm text-cyan-100">
              Sua coleção começa aqui
            </div>

            <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Monte sua vitrine do jeito certo desde o primeiro item
            </h2>

            <p className="text-sm leading-7 text-white/65 sm:text-base">
              Sua coleção está vazia por enquanto, mas a estrutura já está pronta
              para receber consoles, acessórios e jogos com visual premium.
            </p>

            <button
              type="button"
              onClick={onAddClick}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
            >
              Cadastrar primeiro item
            </button>
          </div>
        </div>

        <div className="grid gap-4">
          <EmptyInfoCard
            icon="📁"
            title="Pastas por plataforma"
            description="Cada plataforma terá suas próprias seções de consoles, acessórios e jogos."
          />
          <EmptyInfoCard
            icon="🎮"
            title="Detalhes ricos por item"
            description="Cada card poderá abrir uma ficha completa com valores, mídia, progresso e histórico."
          />
          <EmptyInfoCard
            icon="✨"
            title="Base pronta para crescer"
            description="A estrutura já está preparada para filtros avançados, edição rápida e cadastro real."
          />
        </div>
      </div>
    </section>
  );
}

function NoResultsState() {
  return (
    <section className="rounded-[32px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_8px_40px_rgb(0,0,0,0.18)]">
      <div className="rounded-[28px] border border-dashed border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.02] p-8">
        <h2 className="text-2xl font-semibold text-white">
          Nenhum item encontrado
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">
          Sua busca ou combinação de filtros não retornou resultados. Tente
          limpar alguns filtros ou ajustar o termo pesquisado.
        </p>
      </div>
    </section>
  );
}

function EmptyInfoCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-white">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-white/60">{description}</p>
    </div>
  );
}