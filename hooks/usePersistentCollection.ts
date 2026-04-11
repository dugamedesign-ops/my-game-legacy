"use client";

import { useEffect, useMemo, useState } from "react";
import { Item } from "@/types/collection";

const STORAGE_KEY = "game-collection-items";

export function usePersistentCollection(initialItems: Item[]) {
  const [items, setItems] = useState<Item[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);

      if (saved) {
        const parsed = JSON.parse(saved) as Item[];
        setItems(parsed);
      } else {
        setItems(initialItems);
      }
    } catch (error) {
      console.error("Erro ao carregar coleção do localStorage:", error);
      setItems(initialItems);
    } finally {
      setIsLoaded(true);
    }
  }, [initialItems]);

  useEffect(() => {
    if (!isLoaded) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (error) {
      console.error("Erro ao salvar coleção no localStorage:", error);
    }
  }, [items, isLoaded]);

  return useMemo(() => {
    return {
      items,
      setItems,
      addItem: (item: Item) => {
        setItems((prev) => [item, ...prev]);
      },
      updateItem: (updatedItem: Item) => {
        setItems((prev) =>
          prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)),
        );
      },
      removeItem: (itemId: string) => {
        setItems((prev) => prev.filter((item) => item.id !== itemId));
      },
      clearAllItems: () => {
        setItems([]);
      },
      isLoaded,
    };
  }, [items, isLoaded]);
}