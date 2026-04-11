import { Item } from "@/types/collection";

export type FinancialSummary = {
  investedInCollection: number;
  currentCollectionValue: number;
  wishlistMonitoredValue: number;
  preorderPaidValue: number;

  missingCollectionPaidCount: number;
  missingCollectionCurrentCount: number;
  missingWishlistCurrentCount: number;
  missingPreorderPaidCount: number;
};

export function getFinancialSummary(items: Item[]): FinancialSummary {
  let investedInCollection = 0;
  let currentCollectionValue = 0;
  let wishlistMonitoredValue = 0;
  let preorderPaidValue = 0;

  let missingCollectionPaidCount = 0;
  let missingCollectionCurrentCount = 0;
  let missingWishlistCurrentCount = 0;
  let missingPreorderPaidCount = 0;

  for (const item of items) {
    if (item.isRemoved) continue;

    if (item.ownershipStatus === "collection") {
      if (typeof item.amountPaid === "number") {
        investedInCollection += item.amountPaid;
      } else {
        missingCollectionPaidCount += 1;
      }

      if (typeof item.currentValue === "number") {
        currentCollectionValue += item.currentValue;
      } else {
        missingCollectionCurrentCount += 1;
      }
    }

    if (item.ownershipStatus === "wishlist") {
      if (typeof item.currentValue === "number") {
        wishlistMonitoredValue += item.currentValue;
      } else {
        missingWishlistCurrentCount += 1;
      }
    }

    if (item.ownershipStatus === "preorder") {
      if (typeof item.amountPaid === "number") {
        preorderPaidValue += item.amountPaid;
      } else {
        missingPreorderPaidCount += 1;
      }
    }
  }

  return {
    investedInCollection,
    currentCollectionValue,
    wishlistMonitoredValue,
    preorderPaidValue,
    missingCollectionPaidCount,
    missingCollectionCurrentCount,
    missingWishlistCurrentCount,
    missingPreorderPaidCount,
  };
}

export function formatCurrencyBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}