"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Item } from "@/types/collection";
import { supabaseRestRequest } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

const STORAGE_KEY = "game-collection-items";
const PENDING_SYNC_PREFIX = "game-collection-pending:";

type CloudRow = {
  id: string;
  payload: Item;
  updated_at: string;
};

function normalizeLegacyOwnership(item: Item): Item {
  if (item.ownershipStatus !== "preorder") return item;

  return {
    ...item,
    ownershipStatus: "wishlist",
    acquisitionStatus: "purchased",
  };
}

function readLocalItems() {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return saved
      ? (JSON.parse(saved) as Item[]).map(normalizeLegacyOwnership)
      : null;
  } catch (error) {
    console.error("Erro ao ler coleção local:", error);
    return null;
  }
}

function writeLocalItems(items: Item[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch (error) {
    console.error("Erro ao salvar coleção local:", error);
  }
}

function readPendingItems(userId: string): Item[] {
  try {
    const saved = window.localStorage.getItem(`${PENDING_SYNC_PREFIX}${userId}`);
    return saved
      ? (JSON.parse(saved) as Item[]).map(normalizeLegacyOwnership)
      : [];
  } catch (error) {
    console.error("Erro ao ler fila de sincronização:", error);
    return [];
  }
}

function writePendingItems(userId: string, items: Item[]) {
  try {
    window.localStorage.setItem(
      `${PENDING_SYNC_PREFIX}${userId}`,
      JSON.stringify(items),
    );
  } catch (error) {
    console.error("Erro ao salvar fila de sincronização:", error);
  }
}

export function usePersistentCollection(initialItems: Item[]) {
  const { user, session, isReady: isAuthReady, isEnabled } = useAuth();

  const [items, setItems] = useState<Item[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasLocalDataToImport, setHasLocalDataToImport] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const queuePendingItem = useCallback((item: Item) => {
    if (!user) return;
    const current = readPendingItems(user.id);
    const next = [...current.filter((pending) => pending.id !== item.id), item];
    writePendingItems(user.id, next);
  }, [user]);

  const unqueuePendingItem = useCallback((itemId: string) => {
    if (!user) return;
    const current = readPendingItems(user.id);
    writePendingItems(
      user.id,
      current.filter((pending) => pending.id !== itemId),
    );
  }, [user]);

  const upsertCloudItem = useCallback(async (item: Item) => {
    if (!session?.access_token || !user) return;

    const normalized = normalizeLegacyOwnership({ ...item, userId: user.id });
    queuePendingItem(normalized);

    try {
      await supabaseRestRequest<CloudRow[]>(
        "collection_items?on_conflict=id",
        session.access_token,
        {
          method: "POST",
          headers: {
            Prefer: "resolution=merge-duplicates,return=representation",
          },
          body: JSON.stringify([
            {
              id: normalized.id,
              user_id: user.id,
              payload: normalized,
              updated_at: new Date().toISOString(),
            },
          ]),
        },
      );
      unqueuePendingItem(normalized.id);
    } catch (error) {
      console.error("Erro ao sincronizar item online:", error);
    }
  }, [queuePendingItem, session?.access_token, unqueuePendingItem, user]);

  const deleteCloudItem = useCallback(async (itemId: string) => {
    if (!session?.access_token || !user) return;

    try {
      await supabaseRestRequest(
        `collection_items?id=eq.${itemId}&user_id=eq.${user.id}`,
        session.access_token,
        { method: "DELETE", headers: { Prefer: "return=minimal" } },
      );
    } catch (error) {
      console.error("Erro ao excluir item online:", error);
    }
  }, [session?.access_token, user]);

  useEffect(() => {
    if (!isAuthReady) return;

    const localItems = readLocalItems();

    if (!isEnabled || !user || !session?.access_token) {
      setItems(localItems ?? initialItems);
      setIsLoaded(true);
      return;
    }

    const currentUserId = user.id;
    const accessToken = session.access_token;
    const normalizedLocalItems =
      localItems?.map((item) => ({ ...item, userId: currentUserId })) ?? [];

    let isCancelled = false;

    async function loadCloudItems() {
      setIsSyncing(true);

      try {
        const data = await supabaseRestRequest<CloudRow[]>(
          `collection_items?select=id,payload,updated_at&user_id=eq.${currentUserId}&order=updated_at.desc`,
          accessToken,
        );

        if (isCancelled) return;

        const cloudItems = data.map((entry) => ({
          ...normalizeLegacyOwnership(entry.payload),
          id: entry.id,
          userId: currentUserId,
        }));
        const pendingItems = readPendingItems(currentUserId);
        const mergedItems = [...cloudItems];
        pendingItems.forEach((pending) => {
          if (!mergedItems.some((cloud) => cloud.id === pending.id)) {
            mergedItems.unshift(pending);
          }
        });

        setItems(mergedItems);

        const dismissedKey = `game-collection-import-dismissed:${currentUserId}`;
        const wasDismissed =
          window.localStorage.getItem(dismissedKey) === "true";

        if (
          (localItems?.length ?? 0) > 0 &&
          mergedItems.length === 0 &&
          !wasDismissed
        ) {
          setHasLocalDataToImport(true);
        } else {
          setHasLocalDataToImport(false);
        }

        if (pendingItems.length > 0) {
          pendingItems.forEach((pending) => {
            void upsertCloudItem({ ...pending, userId: currentUserId });
          });
        }
      } catch (error) {
        console.error("Erro ao carregar coleção online:", error);
        setItems(localItems ?? initialItems);
      } finally {
        if (!isCancelled) {
          setIsLoaded(true);
          setIsSyncing(false);
        }
      }
    }

    if (normalizedLocalItems.length > 0) {
      setItems(normalizedLocalItems);
      setIsLoaded(true);
    }

    void loadCloudItems();

    return () => {
      isCancelled = true;
    };
  }, [initialItems, isAuthReady, isEnabled, session?.access_token, upsertCloudItem, user]);

  useEffect(() => {
    if (!isLoaded) return;

    const isAuthenticatedOnline = !!(isEnabled && user && session?.access_token);
    if (isAuthenticatedOnline) return;

    writeLocalItems(items);
  }, [isEnabled, isLoaded, items, session?.access_token, user]);

  return useMemo(() => {
    return {
      items,
      user,
      isSyncing,
      hasLocalDataToImport,
      dismissLocalImport: () => {
        if (!user) return;
        window.localStorage.setItem(
          `game-collection-import-dismissed:${user.id}`,
          "true",
        );
        setHasLocalDataToImport(false);
      },
      importLocalData: async () => {
        if (!user || !session?.access_token) return { imported: 0 };

        const localItems = readLocalItems() ?? [];
        if (localItems.length === 0) return { imported: 0 };

        const rows = localItems.map((item) => {
          const normalized = normalizeLegacyOwnership({ ...item, userId: user.id });
          return {
            id: normalized.id,
            user_id: user.id,
            payload: normalized,
            updated_at: new Date().toISOString(),
          };
        });

        try {
          await supabaseRestRequest<CloudRow[]>(
            "collection_items?on_conflict=id",
            session.access_token,
            {
              method: "POST",
              headers: {
                Prefer: "resolution=merge-duplicates,return=representation",
              },
              body: JSON.stringify(rows),
            },
          );
        } catch (error) {
          console.error("Erro ao importar dados locais:", error);
          return { imported: 0, error: "Erro de sincronização com Supabase." };
        }

        setItems(localItems.map((item) => ({ ...item, userId: user.id })));
        setHasLocalDataToImport(false);
        window.localStorage.setItem(
          `game-collection-import-dismissed:${user.id}`,
          "true",
        );

        return { imported: localItems.length };
      },
      setItems,
      addItem: (item: Item) => {
        const normalized = normalizeLegacyOwnership({ ...item, userId: user?.id ?? item.userId });
        setItems((prev) => [normalized, ...prev]);
        void upsertCloudItem(normalized);
      },
      updateItem: (updatedItem: Item) => {
        const normalized = normalizeLegacyOwnership({
          ...updatedItem,
          userId: user?.id ?? updatedItem.userId,
        });
        setItems((prev) =>
          prev.map((item) => (item.id === normalized.id ? normalized : item)),
        );
        void upsertCloudItem(normalized);
      },
      removeItem: (itemId: string) => {
        setItems((prev) => prev.filter((item) => item.id !== itemId));
        void deleteCloudItem(itemId);
      },
      clearAllItems: () => {
        setItems([]);
      },
      isLoaded,
    };
  }, [deleteCloudItem, hasLocalDataToImport, isLoaded, isSyncing, items, session, upsertCloudItem, user]);
}
