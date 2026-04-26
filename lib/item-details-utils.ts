import { Item } from "@/types/collection";

export function formatOwnershipLabel(status: Item["ownershipStatus"]) {
  const map = {
    collection: "Na coleção",
    wishlist: "Wishlist",
    preorder: "Comprado",
  };

  return map[status];
}

export function formatProgressLabel(status?: Item["gameProgressStatus"]) {
  if (!status) return null;

  const map = {
    undefined: "Não definido",
    backlog: "Backlog",
    playing: "Jogando",
    paused: "Pausado",
    finished: "Terminado",
    platinum: "Platinado",
  };

  return map[status];
}

export function getProgressIcon(status?: Item["gameProgressStatus"]) {
  if (status === "undefined") return "❔";
  if (status === "backlog") return "📚";
  if (status === "playing") return "🎮";
  if (status === "paused") return "⏸️";
  if (status === "finished") return "✅";
  if (status === "platinum") return "🏆";
  return "—";
}

export function formatPriorityLabel(priority?: Item["purchasePriority"]) {
  if (!priority) return null;

  const map = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    maximum: "Prioridade Máxima",
  };

  return map[priority];
}

export function formatRarityLabel(tag: NonNullable<Item["rarityTags"]>[number]) {
  const map = {
    undefined: "Não definida",
    normal: "Normal",
    rare: "Raro",
    special_edition: "Edição Especial",
    highlight: "Destaque",
    repro: "Repro",
    steelbook: "Steelbook",
  };

  return map[tag];
}

export function formatMediaLabel(format: NonNullable<Item["mediaFormats"]>[number]) {
  const map = {
    physical: "Físico",
    digital: "Digital",
  };

  return map[format];
}

export function formatCurrency(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

export function formatReleaseDate(releaseDate?: string): string | null {
  if (!releaseDate) return null;
  const date = new Date(releaseDate);
  if (Number.isNaN(date.getTime())) return releaseDate;
  return date.toLocaleDateString("pt-BR");
}

export const PURCHASE_ORIGIN_OPTIONS = [
  "Loja física",
  "Online BR",
  "Online internacional",
  "Paraguai",
  "Presente",
  "Outro",
];

export const GENRE_OPTIONS = [
  "Action",
  "Adventure",
  "Role-playing (RPG)",
  "Strategy",
  "Shooter",
  "Puzzle",
  "Platform",
  "Fighting",
  "Racing",
  "Sports",
  "Simulation",
  "Turn-based strategy (TBS)",
  "Hack and slash/Beat 'em up",
  "Tactical",
  "Visual Novel",
  "Point-and-click",
  "Survival",
  "Horror",
  "Arcade",
];

export const NEW_GENRE_OPTION = "__new_genre__";
