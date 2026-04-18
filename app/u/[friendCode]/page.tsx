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

  const groupedItems = useMemo(() => {
    const map = new Map<string, PublicCollectionEntry[]>();

    entries.forEach((entry) => {
      const key = entry.item.platform || "Sem plataforma";
      const current = map.get(key) ?? [];
      current.push(entry);
      map.set(key, current);
    });

    return Array.from(map.entries()).map(([platform, list]) => ({
      platform,
      items: list,
    }));
  }, [entries]);

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

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {group.items.map((entry) => (
                  <ItemCard
                    key={entry.item.id}
                    item={mapPublicEntryToItem(entry)}
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
