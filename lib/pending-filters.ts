import { Item } from "@/types/collection";
import type { ItemPendingField } from "@/lib/completion-utils";

export type PendingFiltersState = {
  platforms: string[];
  types: Item["type"][];
  ownership: Array<Item["ownershipStatus"] | "purchased">;
  missingFields: ItemPendingField[];
};

export function createEmptyPendingFilters(): PendingFiltersState {
  return {
    platforms: [],
    types: [],
    ownership: [],
    missingFields: [],
  };
}

export function readPendingFiltersFromStorage(): PendingFiltersState {
  if (typeof window === "undefined") {
    return createEmptyPendingFilters();
  }

  const raw = window.localStorage.getItem("my-game-legacy-pending-filters");
  if (!raw) {
    return createEmptyPendingFilters();
  }

  try {
    const parsed = JSON.parse(raw) as Partial<PendingFiltersState>;
    return {
      platforms: parsed.platforms ?? [],
      types: parsed.types ?? [],
      ownership: parsed.ownership ?? [],
      missingFields: parsed.missingFields ?? [],
    };
  } catch {
    return createEmptyPendingFilters();
  }
}
