"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { Item } from "@/types/collection";
import {
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
import { AuthPanel } from "@/components/auth/AuthPanel";
import { useAuth } from "@/providers/AuthProvider";
import { ItemCard } from "./ItemCard";

type CollectionDashboardProps = {
  items: Item[];
};

type ContextMenuState = {
  item: Item;
  x: number;
  y: number;
} | null;

export function CollectionDashboard({ items }: CollectionDashboardProps) {
  const { user: authUser, signOut } = useAuth();
  const {
    items: collectionItems,
    addItem,
    updateItem,
    removeItem,
    isLoaded,
    user,
    isSyncing,
    hasLocalDataToImport,
    importLocalData,
    dismissLocalImport,
  } = usePersistentCollection(items);

  const [search, setSearch] = useState("");
  const [legacyTitleOverride, setLegacyTitleOverride] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [isEditingLegacyTitle, setIsEditingLegacyTitle] = useState(false);
  const [isFinancialOpen, setIsFinancialOpen] = useState(false);
  const [isPendingOpen, setIsPendingOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const [importStatus, setImportStatus] = useState<string | null>(null);

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

  const legacyTitle = useMemo(() => {
    if (legacyTitleOverride.trim()) return legacyTitleOverride;
    const rawName =
      authUser?.user_metadata?.full_name ??
      authUser?.user_metadata?.name ??
      authUser?.email?.split("@")[0] ??
      "My";
    const firstName = rawName.split(" ")[0].replace(/[^a-zA-ZÀ-ÿ0-9]/g, "");
    return `${firstName || "My"}'s Legacy`;
  }, [authUser?.email, authUser?.user_metadata?.full_name, authUser?.user_metadata?.name, legacyTitleOverride]);

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

  useEffect(() => {
    if (!isMobileSidebarOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMobileSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (isFinancialOpen) setIsFinancialOpen(false);
      if (isPendingOpen) setIsPendingOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isFinancialOpen, isPendingOpen]);

  function handleOpenDefaultAdd() {
    setPrefilledType(null);
    setPrefilledPlatform(null);
    setIsAddModalOpen(true);
    setIsMobileSidebarOpen(false);
  }

  function handleOpenContextualAdd(
    type: "console" | "accessory" | "game",
    platform: string,
  ) {
    setPrefilledType(type);
    setPrefilledPlatform(platform);
    setIsAddModalOpen(true);
  }


  function handleOpenQuickAdd(type: "console" | "accessory" | "game") {
    setPrefilledType(type);
    setPrefilledPlatform(null);
    setIsAddModalOpen(true);
    setIsMobileSidebarOpen(false);
  }

  function handleLegacyTitleSave() {
    setLegacyTitleOverride((current) => current.trim());
    setIsEditingLegacyTitle(false);
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

  const legacyPersonName = useMemo(
    () =>
      authUser?.user_metadata?.full_name ??
      authUser?.user_metadata?.name ??
      authUser?.email?.split("@")[0] ??
      "Usuário",
    [authUser?.email, authUser?.user_metadata?.full_name, authUser?.user_metadata?.name],
  );
  const legacyHandle = useMemo(() => {
    const normalized = legacyPersonName
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "");
    return `@${normalized || "mylegacy"}`;
  }, [legacyPersonName]);
  const headerFilterCounts = useMemo(
    () => ({
      all: collectionItems.length,
      collection: collectionItems.filter((item) => item.ownershipStatus === "collection").length,
      wishlist: collectionItems.filter((item) => item.ownershipStatus === "wishlist").length,
      preorder: collectionItems.filter((item) => item.ownershipStatus === "preorder").length,
      playing: collectionItems.filter((item) => item.gameProgressStatus === "playing").length,
      finished: collectionItems.filter((item) => item.gameProgressStatus === "finished").length,
    }),
    [collectionItems],
  );
  const activeHeaderFilter = useMemo(() => {
    const hasOnlyOwnership = filters.ownership.length === 1 && filters.gameStatus.length === 0;
    const hasOnlyGameStatus = filters.gameStatus.length === 1 && filters.ownership.length === 0;
    const hasOtherFilters =
      filters.types.length > 0 ||
      filters.priorities.length > 0 ||
      filters.media.length > 0 ||
      filters.missing.length > 0;

    if (!hasOtherFilters && filters.ownership.length === 0 && filters.gameStatus.length === 0) {
      return "all";
    }
    if (!hasOtherFilters && hasOnlyOwnership && filters.ownership[0] === "collection") return "collection";
    if (!hasOtherFilters && hasOnlyOwnership && filters.ownership[0] === "wishlist") return "wishlist";
    if (!hasOtherFilters && hasOnlyOwnership && filters.ownership[0] === "preorder") return "preorder";
    if (!hasOtherFilters && hasOnlyGameStatus && filters.gameStatus[0] === "playing") return "playing";
    if (!hasOtherFilters && hasOnlyGameStatus && filters.gameStatus[0] === "finished") return "finished";
    return null;
  }, [filters]);

  function applyHeaderFilter(
    target: "all" | "collection" | "wishlist" | "preorder" | "playing" | "finished",
  ) {
    setFilters({
      types: [],
      ownership:
        target === "collection" || target === "wishlist" || target === "preorder"
          ? [target]
          : [],
      priorities: [],
      gameStatus: target === "playing" || target === "finished" ? [target] : [],
      media: [],
      missing: [],
    });
  }
  const latestAddedItems = useMemo(() => {
    return [...collectionItems]
      .sort((a, b) => {
        const aDate = new Date(a.createdAt ?? a.updatedAt ?? 0).getTime();
        const bDate = new Date(b.createdAt ?? b.updatedAt ?? 0).getTime();
        return bDate - aDate;
      })
      .slice(0, 10);
  }, [collectionItems]);

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
          <div className="mb-4 flex items-center justify-between lg:hidden">
            <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">
              {legacyTitle}
            </p>
            <button
              type="button"
              onClick={() => setIsMobileSidebarOpen((open) => !open)}
              aria-expanded={isMobileSidebarOpen}
              aria-controls="mobile-sidebar"
              className="inline-flex items-center justify-center rounded-xl border border-white/15 bg-white/5 p-2 text-white transition hover:bg-white/10 active:scale-95"
            >
              <span className="sr-only">Abrir funções da barra lateral</span>
              <span className="text-xl leading-none">☰</span>
            </button>
          </div>

          {isMobileSidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setIsMobileSidebarOpen(false)}
            />
          )}

          <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-6">
            <aside
              id="mobile-sidebar"
              className={`mb-6 lg:sticky lg:top-6 lg:mb-0 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto ${
                isMobileSidebarOpen
                  ? "fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[320px] overflow-y-auto border-r border-white/10 bg-[#0b1220] p-4 shadow-2xl sm:w-[380px] lg:static lg:inset-auto lg:z-auto lg:w-auto lg:max-w-none lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
                  : "hidden lg:block"
              }`}
            >
              <div className={`rounded-[28px] border border-white/10 p-4 shadow-[0_8px_40px_rgb(0,0,0,0.18)] ${isMobileSidebarOpen ? "bg-[#0f172a]" : "bg-white/[0.04]"}`}>
                <div className="flex items-center justify-between lg:block">
                  <p className="text-xs uppercase tracking-[0.28em] text-cyan-200/80">My Game Legacy</p>
                  <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="rounded-lg border border-white/15 px-2 py-1 text-xs text-white/75 transition hover:bg-white/10 lg:hidden"
                  >
                    Fechar
                  </button>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {isEditingLegacyTitle ? (
                    <input
                      value={legacyTitle}
                      onChange={(event) => setLegacyTitleOverride(event.target.value)}
                      onBlur={handleLegacyTitleSave}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") handleLegacyTitleSave();
                        if (event.key === "Escape") setIsEditingLegacyTitle(false);
                      }}
                      className="w-full rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-xl font-semibold text-white outline-none placeholder:text-white/35"
                      placeholder="Seu nome Legacy"
                      autoFocus
                    />
                  ) : (
                    <div className="min-w-0">
                      <h2 className="text-[1.7rem] font-semibold leading-tight text-white sm:text-3xl">
                        {legacyTitle}
                      </h2>
                      <button
                        type="button"
                        onClick={() => setIsEditingLegacyTitle(true)}
                        className="mt-1 inline-flex rounded-md border border-white/15 px-1.5 py-0.5 text-[11px] text-white/70 transition hover:bg-white/10"
                        aria-label="Editar nome da coleção"
                      >
                        ✏️ editar
                      </button>
                    </div>
                  )}
                </div>
                <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                  <AuthPanel />
                  {isSyncing && (
                    <p className="mt-2 text-xs text-white/50">Sincronizando coleção online...</p>
                  )}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="grid grid-cols-3 gap-2">
                    <button type="button" onClick={() => handleOpenQuickAdd("game")} className="flex min-h-[72px] flex-col items-center justify-center rounded-xl border border-white/15 px-1.5 py-2 text-white/85 transition hover:bg-white/10 active:scale-[0.97]">
                      <span className="text-center text-[10px] font-semibold leading-tight">+ Jogo</span>
                      <span className="mt-1 text-lg leading-none">🎮</span>
                    </button>
                    <button type="button" onClick={() => handleOpenQuickAdd("console")} className="flex min-h-[72px] flex-col items-center justify-center rounded-xl border border-white/15 px-1.5 py-2 text-white/85 transition hover:bg-white/10 active:scale-[0.97]">
                      <span className="text-center text-[10px] font-semibold leading-tight">+ Console</span>
                      <span className="mt-1 text-lg leading-none">🕹️</span>
                    </button>
                    <button type="button" onClick={() => handleOpenQuickAdd("accessory")} className="flex min-h-[72px] flex-col items-center justify-center rounded-xl border border-white/15 px-1.5 py-2 text-white/85 transition hover:bg-white/10 active:scale-[0.97]">
                      <span className="text-center text-[10px] font-semibold leading-tight">+ Acessório</span>
                      <span className="mt-1 text-lg leading-none">🎧</span>
                    </button>
                  </div>
                </div>
                <div className="mt-4 space-y-2 border-t border-white/10 pt-3">
                  <SidebarActionButton
                    label="Financeiro"
                    onClick={() => {
                      setIsFinancialOpen(true);
                      setIsMobileSidebarOpen(false);
                    }}
                  />
                  <SidebarActionButton
                    label="Completar depois"
                    onClick={() => {
                      setIsPendingOpen(true);
                      setIsMobileSidebarOpen(false);
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setIsFiltersOpen((open) => !open)}
                    className="flex w-full items-center justify-between rounded-xl border border-white/15 px-3 py-2 text-sm text-white/85 transition hover:bg-white/10"
                  >
                    <span>Filtros inteligentes</span>
                    <span className="text-xs">{isFiltersOpen ? "▲" : "▼"}</span>
                  </button>
                  {isFiltersOpen && (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-2">
                      <FiltersBar filters={filters} setFilters={setFilters} compact />
                    </div>
                  )}
                  <button
                    type="button"
                    disabled
                    aria-disabled="true"
                    className="flex w-full items-center justify-between rounded-xl border border-white/10 px-3 py-2 text-sm text-white/40"
                    title="Área em breve"
                  >
                    <span>Configurações</span>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-white/30">
                      Em breve
                    </span>
                  </button>
                </div>
                {authUser && (
                  <div className="mt-4 border-t border-white/10 pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileSidebarOpen(false);
                        void signOut();
                      }}
                      className="w-full rounded-xl border border-white/20 px-3 py-2 text-sm text-white/85 transition hover:bg-white/10 active:scale-[0.98]"
                    >
                      Sair
                    </button>
                  </div>
                )}
              </div>
            </aside>
            <div>
          <header className="mb-6 overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05] p-4 shadow-[0_8px_30px_rgb(0,0,0,0.22)] backdrop-blur sm:p-5">
            {hasLocalDataToImport && user && (
              <div className="mb-6 rounded-2xl border border-cyan-400/30 bg-cyan-500/10 p-4 text-sm text-cyan-50">
                <p className="font-medium">Encontramos dados locais no seu navegador.</p>
                <p className="mt-1 text-cyan-100/85">
                  Deseja importar sua coleção do localStorage para sua conta?
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const result = await importLocalData();
                      if (result.error) {
                        setImportStatus(`Falha ao importar: ${result.error}`);
                        return;
                      }
                      setImportStatus(`${result.imported} item(ns) importado(s) com sucesso.`);
                    }}
                    className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-black hover:bg-white/90"
                  >
                    Importar agora
                  </button>
                  <button
                    type="button"
                    onClick={dismissLocalImport}
                    className="rounded-xl border border-white/20 px-3 py-2 text-xs text-white/80 hover:bg-white/10"
                  >
                    Agora não
                  </button>
                </div>
                {importStatus && <p className="mt-2 text-xs text-cyan-100">{importStatus}</p>}
              </div>
            )}

            <div className="space-y-5">
              <div>
                <p className="text-2xl font-semibold leading-tight text-white">{legacyTitle}</p>
                <p className="mt-1 text-sm text-white/60">{legacyHandle}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                <HeaderFilterChip
                  label="Todos"
                  value={headerFilterCounts.all}
                  active={activeHeaderFilter === "all"}
                  color="white"
                  onClick={() => applyHeaderFilter("all")}
                />
                <HeaderFilterChip
                  label="Na coleção"
                  value={headerFilterCounts.collection}
                  active={activeHeaderFilter === "collection"}
                  color="cyan"
                  onClick={() => applyHeaderFilter("collection")}
                />
                <HeaderFilterChip
                  label="Wishlist"
                  value={headerFilterCounts.wishlist}
                  active={activeHeaderFilter === "wishlist"}
                  color="amber"
                  onClick={() => applyHeaderFilter("wishlist")}
                />
                <HeaderFilterChip
                  label="Pré-venda"
                  value={headerFilterCounts.preorder}
                  active={activeHeaderFilter === "preorder"}
                  color="violet"
                  onClick={() => applyHeaderFilter("preorder")}
                />
                <HeaderFilterChip
                  label="Jogando"
                  value={headerFilterCounts.playing}
                  active={activeHeaderFilter === "playing"}
                  color="fuchsia"
                  onClick={() => applyHeaderFilter("playing")}
                />
                <HeaderFilterChip
                  label="Terminado"
                  value={headerFilterCounts.finished}
                  active={activeHeaderFilter === "finished"}
                  color="emerald"
                  onClick={() => applyHeaderFilter("finished")}
                />
              </div>
            </div>
          </header>
          {!isEmpty && (
            <section className="mb-8 rounded-[28px] border border-white/10 bg-white/[0.04] p-4 shadow-[0_8px_40px_rgb(0,0,0,0.18)]">
              <input
                type="text"
                placeholder="Buscar por nome, plataforma ou versão..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-white/20"
              />
            </section>
          )}

          {!isEmpty && latestAddedItems.length > 0 && (
            <section className="mb-8 rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.03] p-4 shadow-[0_8px_40px_rgb(0,0,0,0.18)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold tracking-wide text-white">Últimos adicionados</h2>
                <span className="text-xs uppercase tracking-[0.18em] text-white/45">
                  vitrine
                </span>
              </div>
              <div className="mx-auto flex max-w-[980px] gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                {latestAddedItems.map((item) => (
                  <div key={item.id} className="w-[148px] shrink-0 snap-start sm:w-[156px]">
                    <ItemCard
                      item={item}
                      size="small"
                      onClick={setSelectedItem}
                      showMediaSeals={false}
                    />
                  </div>
                ))}
              </div>
            </section>
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

            </div>
          </div>

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
        currentUserId={user?.id}
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

      {isFinancialOpen && (
        <OverlayPanel title="Financeiro" onClose={() => setIsFinancialOpen(false)}>
          <FinancialOverview items={collectionItems} defaultOpen hideToggle />
        </OverlayPanel>
      )}

      {isPendingOpen && (
        <OverlayPanel title="Completar depois" onClose={() => setIsPendingOpen(false)}>
          <PendingItemsOverview
            items={collectionItems}
            onOpenItem={(item) => {
              setSelectedItem(item);
              setIsPendingOpen(false);
            }}
            defaultOpen
            hideToggle
          />
        </OverlayPanel>
      )}
    </>
  );
}

function HeaderFilterChip({
  label,
  value,
  active,
  color,
  onClick,
}: {
  label: string;
  value: number;
  active: boolean;
  color: "white" | "cyan" | "amber" | "violet" | "fuchsia" | "emerald";
  onClick: () => void;
}) {
  const tone = {
    white: active
      ? "border-white/80 bg-white/15 text-white"
      : "border-white/20 text-white/75 hover:border-white/45 hover:bg-white/10",
    cyan: active
      ? "border-cyan-300/80 bg-cyan-500/15 text-cyan-100"
      : "border-cyan-300/25 text-cyan-100/75 hover:border-cyan-300/45 hover:bg-cyan-500/10",
    amber: active
      ? "border-amber-300/85 bg-amber-500/15 text-amber-100"
      : "border-amber-300/30 text-amber-100/75 hover:border-amber-300/45 hover:bg-amber-500/10",
    violet: active
      ? "border-violet-400/85 bg-violet-500/15 text-violet-100"
      : "border-violet-400/30 text-violet-100/75 hover:border-violet-400/45 hover:bg-violet-500/10",
    fuchsia: active
      ? "border-fuchsia-400/85 bg-fuchsia-500/15 text-fuchsia-100"
      : "border-fuchsia-400/30 text-fuchsia-100/75 hover:border-fuchsia-400/45 hover:bg-fuchsia-500/10",
    emerald: active
      ? "border-emerald-400/85 bg-emerald-500/15 text-emerald-100"
      : "border-emerald-400/30 text-emerald-100/75 hover:border-emerald-400/45 hover:bg-emerald-500/10",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-3 py-2 text-left transition ${tone[color]}`}
    >
      <p className="text-[11px] uppercase tracking-[0.16em]">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </button>
  );
}

function SidebarActionButton({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl border border-white/15 px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10"
    >
      {label}
    </button>
  );
}

function OverlayPanel({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-[30px] border border-white/10 bg-[#0b1220] p-4 sm:p-6"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-white/20 px-3 py-1 text-sm text-white/80 transition hover:bg-white/10"
          >
            Fechar
          </button>
        </div>
        {children}
      </div>
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
