import { Item } from "@/types/collection";

type DraftComparable = {
  type: Item["type"];
  title: string;
  platform: string;
  subtitle?: string;
  ownershipStatus: Item["ownershipStatus"];
  mediaFormats?: Item["mediaFormats"];
};

export type DuplicateCheckResult = {
  exactDuplicates: Item[];
  relatedItems: Item[];
};

function normalize(value?: string) {
  return (value ?? "").trim().toLowerCase();
}

function getMediaSignature(mediaFormats?: Item["mediaFormats"]) {
  if (!mediaFormats || mediaFormats.length === 0) return "none";
  return [...mediaFormats].sort().join("|");
}

export function checkForDuplicates(
  existingItems: Item[],
  draft: DraftComparable,
): DuplicateCheckResult {
  const normalizedTitle = normalize(draft.title);
  const normalizedPlatform = normalize(draft.platform);
  const normalizedSubtitle = normalize(draft.subtitle);
  const draftMediaSignature = getMediaSignature(draft.mediaFormats);
  const requiresSubtitleMatch =
    draft.type === "console" || draft.type === "accessory";

  const sameBaseItems = existingItems.filter((item) => {
    if (item.isRemoved) return false;

    return (
      item.type === draft.type &&
      normalize(item.title) === normalizedTitle &&
      normalize(item.platform) === normalizedPlatform
    );
  });

  const exactDuplicates = sameBaseItems.filter((item) => {
    const sameSubtitle = normalize(item.subtitle) === normalizedSubtitle;

    return (
      item.ownershipStatus === draft.ownershipStatus &&
      getMediaSignature(item.mediaFormats) === draftMediaSignature &&
      (!requiresSubtitleMatch || sameSubtitle)
    );
  });

  const relatedItems = sameBaseItems.filter(
    (item) => !exactDuplicates.some((exact) => exact.id === item.id),
  );

  return {
    exactDuplicates,
    relatedItems,
  };
}

export function formatOwnershipLabel(status: Item["ownershipStatus"]) {
  const map = {
    collection: "Na coleção",
    wishlist: "Wishlist",
    preorder: "Pré-venda",
  };

  return map[status];
}

export function formatMediaList(mediaFormats?: Item["mediaFormats"]) {
  if (!mediaFormats || mediaFormats.length === 0) {
    return "Sem mídia definida";
  }

  const map = {
    physical: "Física",
    digital: "Digital",
  };

  return mediaFormats.map((media) => map[media]).join(" + ");
}
