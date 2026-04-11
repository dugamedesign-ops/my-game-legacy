import { Item } from "@/types/collection";

export type ItemPendingField =
  | "image"
  | "amountPaid"
  | "currentValue"
  | "mediaFormats"
  | "gameProgressStatus"
  | "purchasePriority"
  | "rarity";

export type ItemPendingInfo = {
  itemId: string;
  title: string;
  subtitle?: string;
  platform: string;
  type: Item["type"];
  ownershipStatus: Item["ownershipStatus"];
  missingFields: ItemPendingField[];
};

export function getItemPendingLabel(field: ItemPendingField) {
  const map: Record<ItemPendingField, string> = {
    image: "Imagem pendente",
    amountPaid: "Valor pago pendente",
    currentValue: "Valor atual pendente",
    mediaFormats: "Mídia pendente",
    gameProgressStatus: "Status do jogo pendente",
    purchasePriority: "Prioridade pendente",
    rarity: "Raridade pendente",
  };

  return map[field];
}

export function getPendingItems(items: Item[]): ItemPendingInfo[] {
  const pendingItems: ItemPendingInfo[] = [];

  for (const item of items) {
    if (item.isRemoved) continue;

    const missingFields: ItemPendingField[] = [];

    if (!item.imageUrl) {
      missingFields.push("image");
    }

    if (item.ownershipStatus === "collection") {
      if (item.amountPaid === undefined) {
        missingFields.push("amountPaid");
      }

      if (item.currentValue === undefined) {
        missingFields.push("currentValue");
      }
    }

    if (item.ownershipStatus === "wishlist") {
      if (item.currentValue === undefined) {
        missingFields.push("currentValue");
      }

      if (!item.purchasePriority) {
        missingFields.push("purchasePriority");
      }
    }

    if (item.ownershipStatus === "preorder") {
      if (item.amountPaid === undefined) {
        missingFields.push("amountPaid");
      }
    }

    if (item.type === "game") {
      if (!item.mediaFormats || item.mediaFormats.length === 0) {
        missingFields.push("mediaFormats");
      }

      if (
        item.ownershipStatus === "collection" &&
        !item.gameProgressStatus
      ) {
        missingFields.push("gameProgressStatus");
      }
    }

    if (!item.rarityTags || item.rarityTags.length === 0) {
      missingFields.push("rarity");
    }

    if (missingFields.length > 0) {
      pendingItems.push({
        itemId: item.id,
        title: item.title,
        subtitle: item.subtitle,
        platform: item.platform,
        type: item.type,
        ownershipStatus: item.ownershipStatus,
        missingFields,
      });
    }
  }

  return pendingItems.sort((a, b) => {
    if (b.missingFields.length !== a.missingFields.length) {
      return b.missingFields.length - a.missingFields.length;
    }

    return a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" });
  });
}