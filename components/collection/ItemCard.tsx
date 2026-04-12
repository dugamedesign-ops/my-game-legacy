import { Item } from "@/types/collection";
import { StatusBadge } from "./StatusBadge";
import { getPlatformTheme } from "@/lib/collection-utils";

type CardSize = "large" | "medium" | "small";

type ItemCardProps = {
  item: Item;
  onClick?: (item: Item) => void;
  onContextMenu?: (item: Item, x: number, y: number) => void;
  size?: CardSize;
};

function formatRarityLabel(tag: NonNullable<Item["rarityTags"]>[number]) {
  const map = {
    normal: "Normal",
    rare: "Raro",
    special_edition: "Edição especial",
    highlight: "Destaque",
    repro: "Repro",
  };

  return map[tag];
}

function formatMediaLabel(format: NonNullable<Item["mediaFormats"]>[number]) {
  const map = {
    physical: "Físico",
    digital: "Digital",
  };

  return map[format];
}

const sizeConfig: Record<CardSize, string> = {
  large: "aspect-[3/4]",
  medium: "aspect-[4/5]",
  small: "aspect-[5/6]",
};

function getOwnershipFrame(item: Item) {
  if (item.ownershipStatus === "wishlist") {
    return "border-amber-300/80 shadow-[0_0_0_1px_rgba(252,211,77,0.18)]";
  }

  if (item.ownershipStatus === "preorder") {
    return "border-fuchsia-400/80 shadow-[0_0_0_1px_rgba(232,121,249,0.18)]";
  }

  return "border-white/10";
}

function getCornerSeal(item: Item) {
  if (item.ownershipStatus === "wishlist") return "☆";
  if (item.ownershipStatus === "preorder") return "🎀";
  return null;
}

export function ItemCard({
  item,
  onClick,
  onContextMenu,
  size = "large",
}: ItemCardProps) {
  const theme = getPlatformTheme(item.platform);
  const isSmall = size === "small";
  const cornerSeal = getCornerSeal(item);

  return (
    <button
      type="button"
      onClick={() => onClick?.(item)}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu?.(item, event.clientX, event.clientY);
      }}
      className={`group w-full rounded-3xl border bg-white/[0.03] p-1.5 text-left shadow-[0_8px_30px_rgb(0,0,0,0.18)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white/[0.07] ${getOwnershipFrame(item)}`}
    >
      <div className={`relative overflow-hidden rounded-[22px] ${sizeConfig[size]}`}>
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div
            className={`flex h-full w-full items-end bg-gradient-to-br ${theme.placeholder} p-4`}
          >
            <p className="text-[11px] uppercase tracking-[0.25em] text-white/55">
              {item.platform}
            </p>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/35 via-black/5 to-transparent" />

        {cornerSeal && (
          <span className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-black/30 text-sm text-white/90 backdrop-blur">
            {cornerSeal}
          </span>
        )}
      </div>

      <div className="mx-1 -mt-3 rounded-xl border border-white/10 bg-[#0b1020]/92 px-2.5 py-2 backdrop-blur">
        <h3
          className={`font-semibold leading-snug text-white ${
            isSmall ? "line-clamp-2 text-sm" : "line-clamp-2 text-base"
          }`}
        >
          {item.title}
        </h3>

        {item.subtitle && (
          <p className="mt-0.5 line-clamp-1 text-xs text-white/72">{item.subtitle}</p>
        )}

        <div className="mt-2 flex flex-wrap gap-1.5">
          {item.mediaFormats?.map((format) => (
            <StatusBadge key={format} label={formatMediaLabel(format)} variant="media" />
          ))}

          {item.rarityTags?.slice(0, 1).map((tag) => (
            <StatusBadge key={tag} label={formatRarityLabel(tag)} variant="rarity" />
          ))}
        </div>
      </div>
    </button>
  );
}
