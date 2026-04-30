import { Item } from "@/types/collection";

export type Filters = {
  types: Item["type"][];
  ownership: Item["ownershipStatus"][];
  priorities: Item["purchasePriority"][];
  gameStatus: Item["gameProgressStatus"][];
  franchises: string[];
  media: ("physical" | "digital")[];
  missing: ("noImage" | "noPaid" | "noCurrent")[];
};

export function applyFilters(items: Item[], filters: Filters) {
  return items.filter((item) => {
    // Tipo
    if (
      filters.types.length > 0 &&
      !filters.types.includes(item.type)
    ) {
      return false;
    }

    // Status
    if (
      filters.ownership.length > 0 &&
      !filters.ownership.includes(item.ownershipStatus)
    ) {
      return false;
    }

    // Prioridade (só wishlist)
    if (
      filters.priorities.length > 0 &&
      item.ownershipStatus === "wishlist"
    ) {
      if (!item.purchasePriority) return false;

      if (!filters.priorities.includes(item.purchasePriority)) {
        return false;
      }
    }

    // Status do jogo
    if (filters.gameStatus.length > 0) {
      if (item.type !== "game") return false;
      if (!item.gameProgressStatus) return false;

      if (!filters.gameStatus.includes(item.gameProgressStatus)) {
        return false;
      }
    }

    // Franquia
    if (filters.franchises.length > 0) {
      if (!item.franchise) return false;
      if (!filters.franchises.includes(item.franchise)) return false;
    }

    // Mídia
    if (
      filters.media.length > 0 &&
      item.type === "game"
    ) {
      if (!item.mediaFormats) return false;

      const match = item.mediaFormats.some((m) =>
        filters.media.includes(m)
      );

      if (!match) return false;
    }

    // Pendências
    if (filters.missing.length > 0) {
      const missingChecks = {
        noImage: !item.imageUrl,
        noPaid:
          item.ownershipStatus !== "wishlist" &&
          item.amountPaid === undefined,
        noCurrent: item.currentValue === undefined,
      };

      const match = filters.missing.some((key) => missingChecks[key]);

      if (!match) return false;
    }

    return true;
  });
}
