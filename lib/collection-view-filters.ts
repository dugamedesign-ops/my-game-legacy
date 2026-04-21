import { Item } from "@/types/collection";

export type FinancialCollectionViewFilters = {
  platforms: string[];
  types: Item["type"][];
  ownership: Item["ownershipStatus"][];
  acquisitionStatuses: NonNullable<Item["acquisitionStatus"]>[];
  priorities: NonNullable<Item["purchasePriority"]>[];
  rarities: NonNullable<Item["rarityTags"]>[number][];
};

export function createEmptyFinancialCollectionViewFilters(): FinancialCollectionViewFilters {
  return {
    platforms: [],
    types: [],
    ownership: [],
    acquisitionStatuses: [],
    priorities: [],
    rarities: [],
  };
}

export function matchesFinancialCollectionViewFilters(
  item: Item,
  filters: FinancialCollectionViewFilters,
) {
  if (filters.platforms.length > 0 && !filters.platforms.includes(item.platform)) {
    return false;
  }

  if (filters.types.length > 0 && !filters.types.includes(item.type)) {
    return false;
  }

  if (filters.ownership.length > 0 && !filters.ownership.includes(item.ownershipStatus)) {
    return false;
  }

  if (filters.acquisitionStatuses.length > 0) {
    if (item.ownershipStatus !== "preorder") return false;
    const acquisitionStatus = item.acquisitionStatus === "purchased" ? "purchased" : "preorder";
    if (!filters.acquisitionStatuses.includes(acquisitionStatus)) {
      return false;
    }
  }

  if (
    filters.priorities.length > 0 &&
    (!item.purchasePriority || !filters.priorities.includes(item.purchasePriority))
  ) {
    return false;
  }

  if (
    filters.rarities.length > 0 &&
    !(item.rarityTags ?? []).some((rarity) => filters.rarities.includes(rarity))
  ) {
    return false;
  }

  return true;
}
