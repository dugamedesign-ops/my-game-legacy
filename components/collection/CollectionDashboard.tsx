"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import Image from "next/image";
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
import { useAuth } from "@/providers/AuthProvider";
import { ItemCard } from "./ItemCard";
import {
  createEmptyFinancialCollectionViewFilters,
  matchesFinancialCollectionViewFilters,
  type FinancialCollectionViewFilters,
} from "@/lib/collection-view-filters";
import { getNormalizedAcquisitionStatus, isItemReleased } from "@/lib/acquisition-utils";

type CollectionDashboardProps = {
  items: Item[];
};

type ContextMenuState = {
  item: Item;
  x: number;
  y: number;
} | null;

type HeaderFilterKey =
  | "all"
  | "collection"
  | "wishlist"
  | "purchased"
  | "playing"
  | "finished";

type PlatformOrderMode = "alphabetical" | "custom";

function getInitialPlatformOrderMode(): PlatformOrderMode {
  if (typeof window === "undefined") return "alphabetical";
  const saved = window.localStorage.getItem(
    "my-game-legacy-platform-order-mode",
  );
  return saved === "custom" ? "custom" : "alphabetical";
}

function getInitialCustomPlatformOrder() {
  if (typeof window === "undefined") return [] as string[];
  const raw = window.localStorage.getItem("my-game-legacy-platform-order");
  if (!raw) return [] as string[];
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function CollectionDashboard({ items }: CollectionDashboardProps) {
  const { user: authUser, signOut, publicProfile, setProfileVisibility } = useAuth();
  const userMetadata = (authUser?.user_metadata ?? {}) as Record<string, unknown>;
  const metadataFullName =
    typeof userMetadata.full_name === "string"
      ? userMetadata.full_name
      : typeof userMetadata.full_name === "number"
        ? String(userMetadata.full_name)
        : undefined;
  const metadataName =
    typeof userMetadata.name === "string"
      ? userMetadata.name
      : typeof userMetadata.name === "number"
        ? String(userMetadata.name)
        : undefined;
  const metadataUsername =
    typeof userMetadata.username === "string"
      ? userMetadata.username
      : typeof userMetadata.username === "number"
        ? String(userMetadata.username)
        : undefined;
  const metadataUserName =
    typeof userMetadata.user_name === "string"
      ? userMetadata.user_name
      : typeof userMetadata.user_name === "number"
        ? String(userMetadata.user_name)
        : undefined;
  const metadataAvatarUrl =
    typeof userMetadata.avatar_url === "string"
      ? userMetadata.avatar_url
      : undefined;
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
  const [isLegacyMenuOpen, setIsLegacyMenuOpen] = useState(false);
  const [isFinancialOpen, setIsFinancialOpen] = useState(false);
  const [isPendingOpen, setIsPendingOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [platformDefaultOpen, setPlatformDefaultOpen] = useState(true);
  const [platformSectionSeed, setPlatformSectionSeed] = useState(0);
  const [platformOrderMode, setPlatformOrderMode] =
    useState<PlatformOrderMode>(getInitialPlatformOrderMode);
  const [customPlatformOrder, setCustomPlatformOrder] = useState<string[]>(
    getInitialCustomPlatformOrder,
  );
  const [draggedPlatform, setDraggedPlatform] = useState<string | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [financialFocusFilters, setFinancialFocusFilters] = useState<FinancialCollectionViewFilters>(
    createEmptyFinancialCollectionViewFilters,
  );
  const [activeQuickFilter, setActiveQuickFilter] =
    useState<HeaderFilterKey>("all");
  const collectionSectionRef = useRef<HTMLElement | null>(null);
  const latestAddedCarouselRef = useRef<HTMLDivElement | null>(null);
  const legacyMenuRef = useRef<HTMLDivElement | null>(null);
  const isModalOpenRef = useRef(false);
  const isMobileSidebarOpenRef = useRef(false);
  const hasModalHistoryEntryRef = useRef(false);
  const hasSidebarHistoryEntryRef = useRef(false);
  const skipNextPopstateRef = useRef(false);
  const skipNextSidebarPopstateRef = useRef(false);

  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [isLatestAddedPaused, setIsLatestAddedPaused] = useState(false);

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
      metadataFullName ??
      metadataName ??
      authUser?.email?.split("@")[0] ??
      "My";
    const firstName = rawName.split(" ")[0].replace(/[^a-zA-ZÀ-ÿ0-9]/g, "");
    return `${firstName || "My"}'s Legacy`;
  }, [authUser?.email, legacyTitleOverride, metadataFullName, metadataName]);

  useEffect(() => {
    function handleCloseContextMenu(event: Event) {
      if (
        event.target instanceof Node &&
        legacyMenuRef.current?.contains(event.target)
      ) {
        return;
      }

      setContextMenu(null);
      setIsLegacyMenuOpen(false);
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
    function handleScroll() {
      setShowBackToTop(window.scrollY > 900);
    }

    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isAnyModalOpen = isAddModalOpen || !!selectedItem;

  useEffect(() => {
    isModalOpenRef.current = isAnyModalOpen;
  }, [isAnyModalOpen]);

  useEffect(() => {
    isMobileSidebarOpenRef.current = isMobileSidebarOpen;
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    if (!isAnyModalOpen || hasModalHistoryEntryRef.current) return;

    window.history.pushState(
      { ...(window.history.state ?? {}), __mglModal: true },
      "",
    );
    hasModalHistoryEntryRef.current = true;
  }, [isAnyModalOpen]);

  useEffect(() => {
    if (isAnyModalOpen || !hasModalHistoryEntryRef.current) return;

    skipNextPopstateRef.current = true;
    hasModalHistoryEntryRef.current = false;
    window.history.back();
  }, [isAnyModalOpen]);

  useEffect(() => {
    if (!isMobileSidebarOpen || hasSidebarHistoryEntryRef.current) return;

    window.history.pushState(
      { ...(window.history.state ?? {}), __mglSidebar: true },
      "",
    );
    hasSidebarHistoryEntryRef.current = true;
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    if (isMobileSidebarOpen || !hasSidebarHistoryEntryRef.current) return;

    skipNextSidebarPopstateRef.current = true;
    hasSidebarHistoryEntryRef.current = false;
    window.history.back();
  }, [isMobileSidebarOpen]);

  useEffect(() => {
    function handlePopState() {
      if (skipNextSidebarPopstateRef.current) {
        skipNextSidebarPopstateRef.current = false;
        return;
      }

      if (skipNextPopstateRef.current) {
        skipNextPopstateRef.current = false;
        return;
      }

      if (isMobileSidebarOpenRef.current) {
        hasSidebarHistoryEntryRef.current = false;
        setIsMobileSidebarOpen(false);
        return;
      }

      if (!isModalOpenRef.current) return;

      hasModalHistoryEntryRef.current = false;
      setIsAddModalOpen(false);
      setPrefilledType(null);
      setPrefilledPlatform(null);
      setSelectedItem(null);
    }

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
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
      if (isLegacyMenuOpen) setIsLegacyMenuOpen(false);
      if (isFinancialOpen) setIsFinancialOpen(false);
      if (isPendingOpen) setIsPendingOpen(false);
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isFinancialOpen, isLegacyMenuOpen, isPendingOpen]);

  useEffect(() => {
    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target.isContentEditable
      );
    }

    function handleShortcut(event: KeyboardEvent) {
      if (event.defaultPrevented) return;
      if (isAddModalOpen || selectedItem) return;
      if (isTypingTarget(event.target)) return;

      if (event.key.toLowerCase() === "a" && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        setPrefilledType(null);
        setPrefilledPlatform(null);
        setIsAddModalOpen(true);
        setIsMobileSidebarOpen(false);
      }
    }

    window.addEventListener("keydown", handleShortcut);
    return () => window.removeEventListener("keydown", handleShortcut);
  }, [isAddModalOpen, selectedItem]);

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

  function handleLegacyTitleSave() {
    setLegacyTitleOverride((current) => current.trim());
    setIsEditingLegacyTitle(false);
  }

  async function handleCopyPublicLink() {
    if (!publicProfile?.friend_code || !publicProfile.is_public) return;

    try {
      const publicLink = `${window.location.origin}/u/${publicProfile.friend_code}`;
      await navigator.clipboard.writeText(publicLink);
    } catch {}
  }

  function handleOpenPublicProfile() {
    if (!publicProfile?.friend_code || !publicProfile.is_public) return;
    const publicLink = `${window.location.origin}/u/${publicProfile.friend_code}`;
    window.open(publicLink, "_blank", "noopener,noreferrer");
  }

  const allActivePlatforms = useMemo(() => {
    return Array.from(
      new Set(
        collectionItems
          .filter((item) => !item.isRemoved)
          .map((item) => item.platform),
      ),
    ).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));
  }, [collectionItems]);

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

    const byFilters = applyFilters(base, filters);

    return byFilters.filter((item) =>
      matchesFinancialCollectionViewFilters(item, financialFocusFilters),
    );
  }, [collectionItems, financialFocusFilters, search, filters]);

  const groupedPlatformsRaw = useMemo(
    () => groupItemsByPlatform(filteredItems),
    [filteredItems],
  );

  const effectiveCustomPlatformOrder = useMemo(() => {
    const normalized = customPlatformOrder.filter((platform) =>
      allActivePlatforms.includes(platform),
    );
    const missing = allActivePlatforms.filter(
      (platform) => !normalized.includes(platform),
    );
    return [...normalized, ...missing];
  }, [allActivePlatforms, customPlatformOrder]);

  const groupedPlatforms = useMemo(() => {
    const sortedAlphabetically = [...groupedPlatformsRaw].sort((a, b) =>
      a.platform.localeCompare(b.platform, "pt-BR", { sensitivity: "base" }),
    );

    if (platformOrderMode !== "custom") {
      return sortedAlphabetically;
    }

    const orderIndex = new Map(
      effectiveCustomPlatformOrder.map((platform, index) => [platform, index]),
    );

    return [...groupedPlatformsRaw].sort((a, b) => {
      const aIndex = orderIndex.get(a.platform);
      const bIndex = orderIndex.get(b.platform);

      if (aIndex !== undefined && bIndex !== undefined) {
        return aIndex - bIndex;
      }
      if (aIndex !== undefined) return -1;
      if (bIndex !== undefined) return 1;

      return a.platform.localeCompare(b.platform, "pt-BR", { sensitivity: "base" });
    });
  }, [effectiveCustomPlatformOrder, groupedPlatformsRaw, platformOrderMode]);

  const summary = useMemo(
    () => getCollectionSummary(collectionItems),
    [collectionItems],
  );
  const latestAddedItems = useMemo(() => {
    return [...collectionItems]
      .sort((a, b) => {
        const aDate = new Date(a.createdAt ?? a.updatedAt ?? 0).getTime();
        const bDate = new Date(b.createdAt ?? b.updatedAt ?? 0).getTime();
        return bDate - aDate;
      })
      .slice(0, 10);
  }, [collectionItems]);

  useEffect(() => {
    const carousel = latestAddedCarouselRef.current;
    if (!carousel) return;
    if (latestAddedItems.length <= 1 || isLatestAddedPaused) return;

    const intervalId = window.setInterval(() => {
      const maxScrollLeft = carousel.scrollWidth - carousel.clientWidth;
      const isNearEnd = carousel.scrollLeft >= maxScrollLeft - 12;

      if (isNearEnd) {
        carousel.scrollTo({ left: 0, behavior: "smooth" });
        return;
      }

      carousel.scrollBy({ left: 176, behavior: "smooth" });
    }, 2800);

    return () => window.clearInterval(intervalId);
  }, [isLatestAddedPaused, latestAddedItems.length]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("my-game-legacy-platform-order-mode", platformOrderMode);
    window.localStorage.setItem(
      "my-game-legacy-platform-order",
      JSON.stringify(effectiveCustomPlatformOrder),
    );
  }, [effectiveCustomPlatformOrder, platformOrderMode]);

  function applyQuickFilter(next: HeaderFilterKey) {
    setActiveQuickFilter(next);
    setFilters({
      types: [],
      ownership:
        next === "collection" || next === "wishlist"
          ? [next]
          : [],
      priorities: [],
      gameStatus:
        next === "playing"
          ? ["playing"]
          : next === "finished"
            ? ["finished", "platinum"]
            : [],
      media: [],
      missing: [],
    });
    setFinancialFocusFilters(
      next === "purchased"
        ? {
            ...createEmptyFinancialCollectionViewFilters(),
            acquisitionStatuses: ["preorder", "purchased"],
          }
        : createEmptyFinancialCollectionViewFilters(),
    );
    setSearch("");

    setTimeout(() => {
      collectionSectionRef.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
      window.scrollBy({ top: -72, behavior: "smooth" });
    }, 60);
  }

  function handleOpenAllPlatforms() {
    setPlatformDefaultOpen(true);
    setPlatformSectionSeed((prev) => prev + 1);
  }

  function handleCloseAllPlatforms() {
    setPlatformDefaultOpen(false);
    setPlatformSectionSeed((prev) => prev + 1);
  }

  function handleDragStartPlatform(platform: string) {
    setPlatformOrderMode("custom");
    setDraggedPlatform(platform);
  }

  function handleDropPlatform(targetPlatform: string) {
    if (!draggedPlatform || draggedPlatform === targetPlatform) return;

    setCustomPlatformOrder((prev) => {
      const working =
        prev.length > 0 ? [...prev] : [...effectiveCustomPlatformOrder];
      const fromIndex = working.indexOf(draggedPlatform);
      const toIndex = working.indexOf(targetPlatform);

      if (fromIndex === -1 || toIndex === -1) return working;

      const next = [...working];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });

    setDraggedPlatform(null);
  }

  function handleResetAlphabeticalPlatformOrder() {
    setPlatformOrderMode("alphabetical");
    setCustomPlatformOrder(allActivePlatforms);
  }

  function applyWishlistPurchaseStatus(
    item: Item,
    acquisitionStatus: "preorder" | "purchased",
  ) {
    if (item.ownershipStatus !== "wishlist") return;

    let expectedArrivalDate = item.expectedArrivalDate;
    if (acquisitionStatus === "purchased") {
      const promptValue = window.prompt(
        "Data prevista de chegada (opcional, formato DD-MM-AAAA):",
        item.expectedArrivalDate ?? "",
      );
      if (promptValue === null) return;

      const normalized = promptValue.trim();
      if (normalized.length === 0) {
        expectedArrivalDate = undefined;
      } else {
        const dateParts = normalized.split("-");
        const isValidPtBrFormat =
          dateParts.length === 3 &&
          dateParts.every((part) => /^\d+$/.test(part)) &&
          dateParts[0].length === 2 &&
          dateParts[1].length === 2 &&
          dateParts[2].length === 4;

        if (!isValidPtBrFormat) {
          window.alert("Data inválida. Use o formato DD-MM-AAAA.");
          return;
        }

        const [dayText, monthText, yearText] = dateParts;
        const parsed = new Date(`${yearText}-${monthText}-${dayText}T00:00:00`);
        if (Number.isNaN(parsed.getTime())) {
          window.alert("Data inválida. Use o formato DD-MM-AAAA.");
          return;
        }
        expectedArrivalDate = normalized;
      }
    } else {
      expectedArrivalDate = undefined;
    }

    const updated: Item = {
      ...item,
      ownershipStatus: "wishlist",
      acquisitionStatus,
      expectedArrivalDate,
      updatedAt: new Date().toISOString(),
    };

    updateItem(updated);
    if (selectedItem?.id === updated.id) {
      setSelectedItem(updated);
    }
    setContextMenu(null);
  }

  function handleViewFinancialInCollection(next: FinancialCollectionViewFilters) {
    setFilters((prev) => ({
      ...prev,
      types: next.types,
      ownership: next.ownership,
      priorities: next.priorities,
      gameStatus: [],
      media: [],
      missing: [],
    }));
    setFinancialFocusFilters(next);
    setSearch(next.platforms.length === 1 ? next.platforms[0] : "");
    setIsFinancialOpen(false);

    setTimeout(() => {
      collectionSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      window.scrollBy({ top: -72, behavior: "smooth" });
    }, 80);
  }

  const headerFilters: {
    key: HeaderFilterKey;
    label: string;
    value: number;
    icon: string;
    activeClassName: string;
  }[] = [
    {
      key: "all",
      label: "Todos",
      value: summary.totalItems,
      icon: "✦",
      activeClassName:
        "border-white/55 bg-white/10 text-white shadow-[0_8px_26px_rgba(255,255,255,0.15)]",
    },
    {
      key: "collection",
      label: "Na coleção",
      value: summary.collectionCount,
      icon: "🗂",
      activeClassName:
        "border-cyan-300/70 bg-cyan-500/10 text-cyan-100 shadow-[0_8px_26px_rgba(34,211,238,0.2)]",
    },
    {
      key: "wishlist",
      label: "Wishlist",
      value: summary.wishlistCount,
      icon: "★",
      activeClassName:
        "border-yellow-300/80 bg-yellow-400/10 text-yellow-100 shadow-[0_8px_26px_rgba(250,204,21,0.25)]",
    },
    {
      key: "purchased",
      label: "Comprado",
      value: collectionItems.filter((item) => !!getNormalizedAcquisitionStatus(item)).length,
      icon: "⚡",
      activeClassName:
        "border-violet-300/80 bg-violet-500/10 text-violet-100 shadow-[0_8px_26px_rgba(168,85,247,0.24)]",
    },
    {
      key: "playing",
      label: "Jogando",
      value: collectionItems.filter((item) => item.gameProgressStatus === "playing").length,
      icon: "◔",
      activeClassName:
        "border-fuchsia-300/80 bg-fuchsia-500/10 text-fuchsia-100 shadow-[0_8px_26px_rgba(217,70,239,0.24)]",
    },
    {
      key: "finished",
      label: "Terminado",
      value: collectionItems.filter(
        (item) =>
          item.gameProgressStatus === "finished" ||
          item.gameProgressStatus === "platinum",
      ).length,
      icon: "✓",
      activeClassName:
        "border-emerald-300/80 bg-emerald-500/10 text-emerald-100 shadow-[0_8px_26px_rgba(16,185,129,0.24)]",
    },
  ];

  const legacyUsername =
    metadataUsername ??
    metadataUserName ??
    authUser?.email?.split("@")[0] ??
    "username";
  const legacyAvatarSrc = metadataAvatarUrl ?? null;
  const legacyAvatarLabel = legacyTitle.slice(0, 2).toUpperCase() || "LG";

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
                  ? "styled-scrollbar fixed inset-y-0 left-0 z-50 w-[86vw] max-w-[320px] overflow-y-auto border-r border-white/10 bg-[#0b1220] p-4 shadow-2xl sm:w-[380px] lg:static lg:inset-auto lg:z-auto lg:w-auto lg:max-w-none lg:overflow-visible lg:border-0 lg:bg-transparent lg:p-0 lg:shadow-none"
                  : "hidden lg:block"
              }`}
            >
              <div className={`rounded-[28px] border border-white/10 p-4 shadow-[0_8px_40px_rgb(0,0,0,0.18)] ${isMobileSidebarOpen ? "bg-[#0f172a]" : "bg-white/[0.04]"}`}>
                <div className="flex items-center justify-between lg:block">
                  <button
                    type="button"
                    onClick={() => setIsMobileSidebarOpen(false)}
                    className="rounded-lg border border-white/15 px-2 py-1 text-xs text-white/75 transition hover:bg-white/10 lg:hidden"
                  >
                    Fechar
                  </button>
                </div>
                <div className="mt-2 rounded-2xl border border-white/10 bg-black/20 p-2">
                  <div className="relative flex h-[120px] w-full items-center justify-center overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-[#0d1730] to-[#0b1220]">
                    <Image
                      src="/my-game-legacy-official.png"
                      alt="Logo oficial My Game Legacy"
                      fill
                      className="object-cover"
                      sizes="(max-width: 1024px) 100vw, 248px"
                      priority
                    />
                  </div>
                </div>
                {isSyncing && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
                    <p className="text-xs text-white/50">Sincronizando coleção online...</p>
                  </div>
                )}
                <div className="mt-4 space-y-2 pt-1">
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

            <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-[#0c1222] via-[#10182b] to-[#111a2d] p-4 sm:p-5">
              <div className="space-y-1">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="shrink-0">
                      <div className="relative h-14 w-14 overflow-hidden rounded-full border border-white/20 bg-white/10">
                        {legacyAvatarSrc ? (
                          <Image
                            src={legacyAvatarSrc}
                            alt="Avatar da legacy"
                            fill
                            sizes="56px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-cyan-100/90">
                            {legacyAvatarLabel}
                          </div>
                        )}
                      </div>
                      {publicProfile?.friend_code && (
                        <div className="mt-1 flex items-center justify-center gap-1.5">
                          <p className="text-center text-[10px] font-medium text-cyan-100/75">
                            ID #{publicProfile.friend_code}
                          </p>
                          <span
                            className={`rounded-full border px-1.5 py-0.5 text-[9px] uppercase tracking-[0.12em] ${
                              publicProfile.is_public
                                ? "border-emerald-300/35 bg-emerald-500/15 text-emerald-100"
                                : "border-amber-300/30 bg-amber-500/15 text-amber-100"
                            }`}
                          >
                            {publicProfile.is_public ? "Público" : "Privado"}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="min-w-0">
                      {isEditingLegacyTitle ? (
                        <input
                          value={legacyTitle}
                          onChange={(event) => setLegacyTitleOverride(event.target.value)}
                          onBlur={handleLegacyTitleSave}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") handleLegacyTitleSave();
                            if (event.key === "Escape") {
                              setIsEditingLegacyTitle(false);
                              setIsLegacyMenuOpen(false);
                            }
                          }}
                          className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-xl font-semibold text-white outline-none placeholder:text-white/35 sm:text-2xl"
                          placeholder="Seu nome Legacy"
                          autoFocus
                        />
                      ) : (
                        <h1 className="truncate text-xl font-semibold leading-tight text-white sm:text-2xl">
                          {legacyTitle}
                        </h1>
                      )}
                      <p className="text-sm text-cyan-100/80">{legacyUsername}</p>
                    </div>
                  </div>

                  <div className="relative" ref={legacyMenuRef}>
                    <button
                      type="button"
                      onClick={() => setIsLegacyMenuOpen((open) => !open)}
                      className="inline-flex h-8 w-8 items-center justify-center rounded-full text-xl leading-none text-white/75 transition hover:bg-white/10 hover:text-white"
                      aria-haspopup="menu"
                      aria-expanded={isLegacyMenuOpen}
                      aria-label="Abrir opções da legacy"
                    >
                      ⋮
                    </button>
                    {isLegacyMenuOpen && (
                      <div className="absolute right-0 top-9 z-20 min-w-[196px] rounded-xl border border-white/15 bg-[#0b1220] p-1 shadow-2xl">
                        {publicProfile?.friend_code && (
                          <>
                            <button
                              type="button"
                              onClick={() => {
                                handleOpenPublicProfile();
                                setIsLegacyMenuOpen(false);
                              }}
                              className="w-full rounded-lg px-3 py-2 text-left text-sm text-cyan-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                              disabled={!publicProfile.is_public}
                            >
                              Ver perfil público
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                void handleCopyPublicLink();
                                setIsLegacyMenuOpen(false);
                              }}
                              className="w-full rounded-lg px-3 py-2 text-left text-sm text-cyan-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-45"
                              disabled={!publicProfile.is_public}
                            >
                              Copiar link do perfil
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const result = await setProfileVisibility(
                                  !publicProfile.is_public,
                                );
                                if (result.error) {
                                  window.alert(result.error);
                                }
                                setIsLegacyMenuOpen(false);
                              }}
                              className="w-full rounded-lg px-3 py-2 text-left text-sm text-cyan-100 transition hover:bg-white/10"
                            >
                              {publicProfile.is_public
                                ? "Desativar perfil público"
                                : "Ativar perfil público"}
                            </button>
                            <div className="my-1 h-px bg-white/10" />
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setIsEditingLegacyTitle(true);
                            setIsLegacyMenuOpen(false);
                          }}
                          className="w-full rounded-lg px-3 py-2 text-left text-sm text-white/85 transition hover:bg-white/10"
                        >
                          Mudar nome da legacy
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
                {headerFilters.map((filter) => (
                  <HeaderFilterButton
                    key={filter.key}
                    label={filter.label}
                    icon={filter.icon}
                    value={filter.value}
                    isActive={activeQuickFilter === filter.key}
                    activeClassName={filter.activeClassName}
                    onClick={() => applyQuickFilter(filter.key)}
                  />
                ))}
              </div>
            </div>
          </header>

          {!isEmpty && latestAddedItems.length > 0 && (
            <section className="mb-8 rounded-[28px] border border-white/10 bg-gradient-to-br from-white/[0.05] to-white/[0.03] p-4 shadow-[0_8px_40px_rgb(0,0,0,0.18)]">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-base font-semibold tracking-wide text-white">Últimos adicionados</h2>
              </div>
              <div
                ref={latestAddedCarouselRef}
                onMouseEnter={() => setIsLatestAddedPaused(true)}
                onMouseLeave={() => setIsLatestAddedPaused(false)}
                onTouchStart={() => setIsLatestAddedPaused(true)}
                onTouchEnd={() => setIsLatestAddedPaused(false)}
                className="styled-scrollbar mx-auto flex max-w-[980px] gap-3 overflow-x-auto pb-2 snap-x snap-mandatory"
              >
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

          {isEmpty ? (
            <EmptyCollectionState onAddClick={handleOpenDefaultAdd} />
          ) : groupedPlatforms.length > 0 ? (
            <section ref={collectionSectionRef} className="space-y-6">
              <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Ordem das plataformas
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPlatformOrderMode("custom")}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        platformOrderMode === "custom"
                          ? "border-cyan-300/70 bg-cyan-500/15 text-cyan-100"
                          : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      Minha ordem
                    </button>
                    <button
                      type="button"
                      onClick={handleResetAlphabeticalPlatformOrder}
                      className={`rounded-full border px-3 py-1.5 text-xs transition ${
                        platformOrderMode === "alphabetical"
                          ? "border-cyan-300/70 bg-cyan-500/15 text-cyan-100"
                          : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                      }`}
                    >
                      Ordem alfabética
                    </button>
                  </div>
                </div>

                {platformOrderMode === "custom" && groupedPlatforms.length > 1 && (
                  <>
                    <p className="mt-3 text-xs text-white/50">
                      Arraste e solte as plataformas para reorganizar.
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {groupedPlatforms.map((group) => (
                        <div
                          key={`order-chip-${group.platform}`}
                          draggable
                          onDragStart={() => handleDragStartPlatform(group.platform)}
                          onDragOver={(event) => {
                            event.preventDefault();
                          }}
                          onDrop={() => handleDropPlatform(group.platform)}
                          onDragEnd={() => setDraggedPlatform(null)}
                          className={`inline-flex cursor-grab items-center gap-1 rounded-full border px-2 py-1 text-xs text-white/80 ${
                            draggedPlatform === group.platform
                              ? "border-cyan-300/70 bg-cyan-500/20"
                              : "border-white/15 bg-black/25"
                          }`}
                        >
                          <span className="text-white/50" aria-hidden>
                            ⋮⋮
                          </span>
                          <span>{group.platform}</span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={handleOpenAllPlatforms}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/85 transition hover:bg-white/10"
                >
                  Abrir todas as plataformas
                </button>
                <button
                  type="button"
                  onClick={handleCloseAllPlatforms}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/85 transition hover:bg-white/10"
                >
                  Fechar todas as plataformas
                </button>
              </div>
              {groupedPlatforms.map((group) => (
                <PlatformSection
                  key={`${group.platform}-${platformSectionSeed}`}
                  platform={group.platform}
                  items={group.items}
                  onItemClick={setSelectedItem}
                  onItemContextMenu={(item, x, y) => {
                    setContextMenu({ item, x, y });
                  }}
                  onAddItem={handleOpenContextualAdd}
                  defaultOpen={platformDefaultOpen}
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
              ＋ Adicionar <span className="ml-1 text-[11px] font-normal text-black/70">(A)</span>
            </span>
          </button>

          {showBackToTop && (
            <button
              type="button"
              onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
              className="fixed bottom-24 right-6 rounded-full border border-white/15 bg-black/60 px-3 py-2 text-xs font-medium text-white/80 shadow-xl backdrop-blur transition hover:bg-black/75 hover:text-white"
              aria-label="Voltar ao topo"
            >
              ↑ Topo
            </button>
          )}
        </div>
      </div>

      <ItemDetailsModal
        item={selectedItem}
        existingItems={collectionItems}
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
          {contextMenu.item.ownershipStatus === "wishlist" && (
            <button
              type="button"
              onClick={() =>
                applyWishlistPurchaseStatus(
                  contextMenu.item,
                  isItemReleased(contextMenu.item) ? "purchased" : "preorder",
                )
              }
              className="mb-1 flex w-full rounded-xl px-3 py-2 text-left text-sm text-red-100 transition hover:bg-red-500/10"
            >
              {isItemReleased(contextMenu.item)
                ? "Marcar como comprado"
                : "Marcar como pré-venda"}
            </button>
          )}
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
          <FinancialOverview
            items={collectionItems}
            defaultOpen
            hideToggle
            onViewInCollection={handleViewFinancialInCollection}
          />
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
            onUpdateItem={updateItem}
            defaultOpen
            hideToggle
          />
        </OverlayPanel>
      )}
    </>
  );
}

function HeaderFilterButton({
  label,
  icon,
  value,
  isActive,
  activeClassName,
  onClick,
}: {
  label: string;
  icon: string;
  value: number;
  isActive: boolean;
  activeClassName: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-2xl border px-3 py-2 text-left transition ${
        isActive
          ? activeClassName
          : "border-white/10 bg-black/15 text-white/75 hover:bg-white/10"
      }`}
    >
      <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em]">
        <span aria-hidden>{icon}</span>
        <span>{label}</span>
      </div>
      <p className="mt-1 text-2xl font-semibold leading-none">{value}</p>
      <div
        className={`mt-2 h-0.5 w-full rounded-full transition ${
          isActive ? "bg-current/95" : "bg-white/10"
        }`}
      />
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
