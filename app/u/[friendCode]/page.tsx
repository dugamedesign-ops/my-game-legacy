"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { useParams } from "next/navigation";
import {
  fetchPublicCollectionByFriendCode,
  type PublicCollectionEntry,
} from "@/lib/supabase";
import { ItemCard } from "@/components/collection/ItemCard";
import type { Item } from "@/types/collection";

type HeaderFilterKey =
  | "all"
  | "collection"
  | "wishlist"
  | "preorder"
  | "playing"
  | "finished";

function mapPublicEntryToItem(entry: PublicCollectionEntry): Item {
  const type = entry.item.type;
  const normalizedType: Item["type"] =
    type === "console" || type === "accessory" || type === "game"
      ? type
      : "game";

  const ownershipStatus = entry.item.ownershipStatus;
  const normalizedOwnership: Item["ownershipStatus"] =
    ownershipStatus === "wishlist" ||
    ownershipStatus === "preorder" ||
    ownershipStatus === "collection"
      ? ownershipStatus
      : "collection";

  const mediaFormats = (entry.item.mediaFormats ?? []).filter(
    (media): media is "physical" | "digital" =>
      media === "physical" || media === "digital",
  );

  return {
    id: entry.item.id,
    userId: String(entry.profile_friend_code),
    type: normalizedType,
    platform: entry.item.platform || "Sem plataforma",
    title: entry.item.title || "Item sem título",
    subtitle: entry.item.subtitle,
    ownershipStatus: normalizedOwnership,
    mediaFormats,
    gameProgressStatus:
      entry.item.gameProgressStatus === "backlog" ||
      entry.item.gameProgressStatus === "playing" ||
      entry.item.gameProgressStatus === "paused" ||
      entry.item.gameProgressStatus === "finished" ||
      entry.item.gameProgressStatus === "platinum"
        ? entry.item.gameProgressStatus
        : undefined,
    purchasePriority:
      entry.item.purchasePriority === "low" ||
      entry.item.purchasePriority === "medium" ||
      entry.item.purchasePriority === "high" ||
      entry.item.purchasePriority === "maximum"
        ? entry.item.purchasePriority
        : undefined,
    rarityTags: (entry.item.rarityTags ?? []).filter(
      (rarity): rarity is "normal" | "rare" | "special_edition" | "highlight" | "repro" =>
        rarity === "normal" ||
        rarity === "rare" ||
        rarity === "special_edition" ||
        rarity === "highlight" ||
        rarity === "repro",
    ),
    franchise: entry.item.franchise,
    genre: entry.item.genre,
    imageUrl: entry.item.imageUrl,
    notes: entry.item.notes,
    purchaseOrigin: entry.item.purchaseOrigin,
    purchaseDate: entry.item.purchaseDate,
    releaseDate: entry.item.releaseDate,
    createdAt: entry.item.createdAt ?? new Date(0).toISOString(),
    updatedAt: entry.item.updatedAt ?? new Date(0).toISOString(),
  };
}

export default function PublicProfilePage() {
  const params = useParams<{ friendCode: string }>();
  const [friendCode, setFriendCode] = useState<number | null>(null);
  const [entries, setEntries] = useState<PublicCollectionEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeQuickFilter, setActiveQuickFilter] = useState<HeaderFilterKey>("all");

  useEffect(() => {
    let isCancelled = false;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const parsed = Number.parseInt(params.friendCode, 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
          setError("ID público inválido.");
          setIsLoading(false);
          return;
        }

        setFriendCode(parsed);

        const result = await fetchPublicCollectionByFriendCode(parsed);
        if (isCancelled) return;
        setEntries(result);
      } catch {
        if (isCancelled) return;
        setError("Não foi possível carregar o perfil público.");
      } finally {
        if (!isCancelled) setIsLoading(false);
      }
    }

    void load();

    return () => {
      isCancelled = true;
    };
  }, [params.friendCode]);

  const publicItems = useMemo(() => {
    return entries.map((entry) => mapPublicEntryToItem(entry));
  }, [entries]);

  const filteredItems = useMemo(() => {
    return publicItems.filter((item) => {
      if (activeQuickFilter === "all") return true;
      if (activeQuickFilter === "collection") return item.ownershipStatus === "collection";
      if (activeQuickFilter === "wishlist") return item.ownershipStatus === "wishlist";
      if (activeQuickFilter === "preorder") return item.ownershipStatus === "preorder";
      if (activeQuickFilter === "playing") return item.gameProgressStatus === "playing";
      if (activeQuickFilter === "finished") {
        return (
          item.gameProgressStatus === "finished" ||
          item.gameProgressStatus === "platinum"
        );
      }
      return true;
    });
  }, [activeQuickFilter, publicItems]);

  const groupedItems = useMemo(() => {
    function ownershipRank(item: Item) {
      if (item.ownershipStatus === "collection") return 0;
      if (item.ownershipStatus === "wishlist") return 1;
      return 2;
    }

    const map = new Map<string, Item[]>();

    filteredItems.forEach((item) => {
      const key = item.platform || "Sem plataforma";
      const current = map.get(key) ?? [];
      current.push(item);
      map.set(key, current);
    });

    return Array.from(map.entries())
      .sort(([platformA], [platformB]) =>
        platformA.localeCompare(platformB, "pt-BR", { sensitivity: "base" }),
      )
      .map(([platform, list]) => ({
        platform,
        items: [...list].sort((a, b) => {
          const byOwnership = ownershipRank(a) - ownershipRank(b);
          if (byOwnership !== 0) return byOwnership;
          return a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" });
        }),
      }));
  }, [filteredItems]);

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
      value: publicItems.length,
      icon: "✦",
      activeClassName:
        "border-white/55 bg-white/10 text-white shadow-[0_8px_26px_rgba(255,255,255,0.15)]",
    },
    {
      key: "collection",
      label: "Na coleção",
      value: publicItems.filter((item) => item.ownershipStatus === "collection").length,
      icon: "🗂",
      activeClassName:
        "border-cyan-300/70 bg-cyan-500/10 text-cyan-100 shadow-[0_8px_26px_rgba(34,211,238,0.2)]",
    },
    {
      key: "wishlist",
      label: "Wishlist",
      value: publicItems.filter((item) => item.ownershipStatus === "wishlist").length,
      icon: "★",
      activeClassName:
        "border-yellow-300/80 bg-yellow-400/10 text-yellow-100 shadow-[0_8px_26px_rgba(250,204,21,0.25)]",
    },
    {
      key: "preorder",
      label: "Pré-venda",
      value: publicItems.filter((item) => item.ownershipStatus === "preorder").length,
      icon: "⚡",
      activeClassName:
        "border-violet-300/80 bg-violet-500/10 text-violet-100 shadow-[0_8px_26px_rgba(168,85,247,0.24)]",
    },
    {
      key: "playing",
      label: "Jogando",
      value: publicItems.filter((item) => item.gameProgressStatus === "playing").length,
      icon: "◔",
      activeClassName:
        "border-fuchsia-300/80 bg-fuchsia-500/10 text-fuchsia-100 shadow-[0_8px_26px_rgba(217,70,239,0.24)]",
    },
    {
      key: "finished",
      label: "Terminado",
      value: publicItems.filter(
        (item) =>
          item.gameProgressStatus === "finished" ||
          item.gameProgressStatus === "platinum",
      ).length,
      icon: "✓",
      activeClassName:
        "border-emerald-300/80 bg-emerald-500/10 text-emerald-100 shadow-[0_8px_26px_rgba(16,185,129,0.24)]",
    },
  ];

  const profileName =
    entries[0]?.profile_display_name?.trim() || `Coleção #${friendCode ?? "..."}`;
  const profileAvatar = entries[0]?.profile_avatar_url ?? null;

  if (isLoading) {
    return (
      <main className="min-h-screen bg-[#080b14] px-4 py-10 text-white">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          Carregando perfil público...
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#080b14] px-4 py-10 text-white">
        <div className="mx-auto max-w-5xl rounded-3xl border border-red-300/20 bg-red-500/10 p-8 text-red-100">
          {error}
        </div>
      </main>
    );
  }

  if (entries.length === 0) {
    return (
      <main className="min-h-screen bg-[#080b14] px-4 py-10 text-white">
        <div className="mx-auto max-w-5xl rounded-3xl border border-white/10 bg-white/[0.04] p-8">
          <h1 className="text-2xl font-semibold">Perfil público</h1>
          <p className="mt-2 text-white/70">
            Nenhuma coleção pública encontrada para o ID #{friendCode ?? "-"}.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(56,189,248,0.12),_transparent_35%),linear-gradient(180deg,_#07090f_0%,_#0d1322_100%)] px-4 py-10 text-white">
      <div className="mx-auto max-w-6xl">
        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_12px_40px_rgba(0,0,0,0.22)]">
          <div className="flex items-center gap-4">
            <div className="relative h-14 w-14 overflow-hidden rounded-full border border-white/20 bg-white/10">
              {profileAvatar ? (
                <Image
                  src={profileAvatar}
                  alt="Avatar do perfil público"
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-cyan-100">
                  {profileName.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-100/70">
                Perfil público
              </p>
              <h1 className="text-2xl font-semibold">{profileName}</h1>
              <p className="text-sm text-cyan-100/80">ID #{entries[0].profile_friend_code}</p>
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
                onClick={() => setActiveQuickFilter(filter.key)}
              />
            ))}
          </div>
        </section>

        <section className="mt-6 space-y-5">
          {groupedItems.map((group) => (
            <div
              key={group.platform}
              className="rounded-3xl border border-white/10 bg-white/[0.03] p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-white">{group.platform}</h2>
                <span className="text-xs uppercase tracking-[0.16em] text-white/50">
                  {group.items.length} item(ns)
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
                {group.items.map((entry) => (
                  <ItemCard
                    key={entry.id}
                    item={entry}
                    size="medium"
                    showMediaSeals
                  />
                ))}
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
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
