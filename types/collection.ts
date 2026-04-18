export type ItemType = "console" | "accessory" | "game";

export type OwnershipStatus = "collection" | "wishlist" | "preorder";

export type GameProgressStatus =
  | "backlog"
  | "playing"
  | "paused"
  | "finished"
  | "platinum";

export type PurchasePriority = "low" | "medium" | "high" | "maximum";

export type RarityTag =
  | "normal"
  | "rare"
  | "special_edition"
  | "highlight"
  | "repro"
  | "steelbook";

export type MediaFormat = "physical" | "digital";

export type PriceHistoryEntry = {
  date: string;
  value: number;
};

export type PurchaseDate = {
  year?: number;
  month?: number;
  day?: number;
};

export type Item = {
  id: string;
  userId: string;

  type: ItemType;
  platform: string;

  /**
   * Nome principal visível no card.
   * Para consoles, vamos usar a própria plataforma como título visual.
   */
  title: string;

  /**
   * Subtítulo visual:
   * - console: versão (Slim 30 anos)
   * - acessório: cor / edição / versão
   * - jogo: opcional
   */
  subtitle?: string;

  ownershipStatus: OwnershipStatus;

  mediaFormats?: MediaFormat[];

  gameProgressStatus?: GameProgressStatus;

  purchasePriority?: PurchasePriority;
  rarityTags?: RarityTag[];

  franchise?: string;
  genre?: string;

  imageUrl?: string;
  notes?: string;
  purchaseOrigin?: string;

  purchaseDate?: PurchaseDate;
  releaseDate?: string;

  amountPaid?: number;
  pricePhysical?: number;
  priceDigital?: number;
  currentValue?: number;
  desiredValue?: number;

  trackedPriceHistory?: PriceHistoryEntry[];
  collectionValueHistory?: PriceHistoryEntry[];

  isRemoved?: boolean;
  removedReason?: "removed" | "sold";

  createdAt: string;
  updatedAt: string;
};
