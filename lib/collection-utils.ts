import { Item, ItemType, OwnershipStatus } from "@/types/collection";

export const CATEGORY_ORDER: ItemType[] = ["console", "accessory", "game"];

export const CATEGORY_LABELS: Record<ItemType, string> = {
  console: "Consoles",
  accessory: "Acessórios",
  game: "Jogos",
};

const OWNERSHIP_ORDER: OwnershipStatus[] = ["collection", "preorder", "wishlist"];

export function groupItemsByPlatform(items: Item[]) {
  const grouped = new Map<string, Item[]>();

  for (const item of items) {
    if (item.isRemoved) continue;

    if (!grouped.has(item.platform)) {
      grouped.set(item.platform, []);
    }

    grouped.get(item.platform)!.push(item);
  }

  return Array.from(grouped.entries()).map(([platform, platformItems]) => ({
    platform,
    items: platformItems,
  }));
}

export function sortItemsByOwnership(items: Item[]) {
  return [...items].sort((a, b) => {
    const aIndex = OWNERSHIP_ORDER.indexOf(a.ownershipStatus);
    const bIndex = OWNERSHIP_ORDER.indexOf(b.ownershipStatus);

    if (aIndex !== bIndex) {
      return aIndex - bIndex;
    }

    return a.title.localeCompare(b.title, "pt-BR", { sensitivity: "base" });
  });
}

export function getItemsByCategory(items: Item[], category: ItemType) {
  return sortItemsByOwnership(items.filter((item) => item.type === category));
}

export function getCollectionSummary(items: Item[]) {
  const activeItems = items.filter((item) => !item.isRemoved);

  const wishlistCount = activeItems.filter(
    (item) => item.ownershipStatus === "wishlist",
  ).length;

  const preorderCount = activeItems.filter(
    (item) => item.ownershipStatus === "preorder",
  ).length;

  const collectionCount = activeItems.filter(
    (item) => item.ownershipStatus === "collection",
  ).length;

  const incompleteCount = activeItems.filter((item) => {
    if (item.type === "console") {
      return !item.platform || !item.subtitle;
    }

    if (item.type === "accessory") {
      return !item.title || !item.platform;
    }

    if (item.type === "game") {
      return !item.title || !item.platform;
    }

    return false;
  }).length;

  return {
    totalItems: activeItems.length,
    collectionCount,
    wishlistCount,
    preorderCount,
    incompleteCount,
  };
}

export function getPlatformTheme(platform: string) {
  const normalized = platform.toLowerCase();

  if (normalized.includes("playstation")) {
    return {
      header:
        "from-blue-600/30 via-blue-500/10 to-transparent border-blue-400/20",
      accent: "bg-blue-500/90",
      accentSoft: "border-blue-400/25 bg-blue-500/15 text-blue-100",
      placeholder:
        "from-blue-700/40 via-slate-900 to-slate-950 border-blue-400/20",
    };
  }

  if (normalized.includes("switch")) {
    return {
      header:
        "from-red-600/30 via-red-500/10 to-transparent border-red-400/20",
      accent: "bg-red-500/90",
      accentSoft: "border-red-400/25 bg-red-500/15 text-red-100",
      placeholder:
        "from-red-700/40 via-slate-900 to-slate-950 border-red-400/20",
    };
  }

  if (normalized.includes("xbox")) {
    return {
      header:
        "from-emerald-600/30 via-emerald-500/10 to-transparent border-emerald-400/20",
      accent: "bg-emerald-500/90",
      accentSoft: "border-emerald-400/25 bg-emerald-500/15 text-emerald-100",
      placeholder:
        "from-emerald-700/40 via-slate-900 to-slate-950 border-emerald-400/20",
    };
  }

  return {
    header:
      "from-violet-600/30 via-violet-500/10 to-transparent border-violet-400/20",
    accent: "bg-violet-500/90",
    accentSoft: "border-violet-400/25 bg-violet-500/15 text-violet-100",
    placeholder:
      "from-violet-700/40 via-slate-900 to-slate-950 border-violet-400/20",
  };
}