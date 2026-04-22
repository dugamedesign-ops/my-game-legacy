import { Item } from "@/types/collection";
import { getNormalizedAcquisitionStatus } from "./acquisition-utils";

export type FinancialSummary = {
  investedInCollection: number;
  currentCollectionValue: number;
  wishlistMonitoredValue: number;

  missingCollectionPaidCount: number;
  missingCollectionCurrentCount: number;
  missingWishlistCurrentCount: number;
};

export function getFinancialSummary(items: Item[]): FinancialSummary {
  let investedInCollection = 0;
  let currentCollectionValue = 0;
  let wishlistMonitoredValue = 0;

  let missingCollectionPaidCount = 0;
  let missingCollectionCurrentCount = 0;
  let missingWishlistCurrentCount = 0;

  for (const item of items) {
    if (item.isRemoved) continue;

    const acquisitionStatus = getNormalizedAcquisitionStatus(item);
    const isCollectionOrPurchased =
      item.ownershipStatus === "collection" ||
      (item.ownershipStatus === "wishlist" && acquisitionStatus === "purchased");

    if (isCollectionOrPurchased) {
      if (typeof item.amountPaid === "number") {
        investedInCollection += item.amountPaid;
      } else {
        missingCollectionPaidCount += 1;
      }
    }

    if (item.ownershipStatus === "collection") {
      if (typeof item.currentValue === "number") {
        currentCollectionValue += item.currentValue;
      } else {
        missingCollectionCurrentCount += 1;
      }
    }

    if (item.ownershipStatus === "wishlist" && !acquisitionStatus) {
      if (typeof item.currentValue === "number") {
        wishlistMonitoredValue += item.currentValue;
      } else {
        missingWishlistCurrentCount += 1;
      }
    }
  }

  return {
    investedInCollection,
    currentCollectionValue,
    wishlistMonitoredValue,
    missingCollectionPaidCount,
    missingCollectionCurrentCount,
    missingWishlistCurrentCount,
  };
}

export function formatCurrencyBRL(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}
