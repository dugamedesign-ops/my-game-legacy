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

function formatOwnershipLabel(item: Item) {
  if (item.ownershipStatus === "wishlist") return "Wishlist";
  if (item.ownershipStatus === "preorder") return "Pré-venda";
  return null;
}

function formatPriorityLabel(priority?: Item["purchasePriority"]) {
  if (!priority) return null;

  const map = {
    low: "Baixa",
    medium: "Média",
    high: "Alta",
    maximum: "Prioridade Máxima",
  };

  return map[priority];
}

function formatProgressLabel(status?: Item["gameProgressStatus"]) {
  if (!status) return null;

  const map = {
    backlog: "Backlog",
    playing: "Jogando",
    paused: "Pausado",
    finished: "Terminado",
    platinum: "Platinado",
  };

  return map[status];
}

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

export function ItemCard({
  item,
  onClick,
  onContextMenu,
  size = "large",
}: ItemCardProps) {
  const theme = getPlatformTheme(item.platform);
  const ownershipLabel = formatOwnershipLabel(item);
  const priorityLabel = formatPriorityLabel(item.purchasePriority);
  const progressLabel = formatProgressLabel(item.gameProgressStatus);

  const isSmall = size === "small";
  const showFullBadges = size === "medium" || size === "large";

  return (
    <button
      type="button"
      onClick={() => onClick?.(item)}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu?.(item, event.clientX, event.clientY);
      }}
      className="group w-full rounded-3xl border border-white/10 bg-white/[0.03] p-2 text-left shadow-[0_8px_30px_rgb(0,0,0,0.18)] backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white/[0.07]"
    >
      <div className={`relative overflow-hidden rounded-[24px] ${sizeConfig[size]}`}>
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
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-[0.25em] text-white/55">
                {item.platform}
              </p>
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />

        {ownershipLabel && (
          <div className="absolute left-4 right-4 top-4">
            {isSmall ? (
              <div
                className={`h-2 w-full rounded-full ${
                  item.ownershipStatus === "wishlist"
                    ? "bg-amber-300"
                    : "bg-fuchsia-300"
                }`}
              />
            ) : (
              <span
                className={`inline-flex rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide shadow-lg ${
                  item.ownershipStatus === "wishlist"
                    ? "bg-amber-300 text-amber-950"
                    : "bg-fuchsia-300 text-fuchsia-950"
                }`}
              >
                {item.ownershipStatus === "preorder"
                  ? "🎁 Reservado • Pré-venda"
                  : ownershipLabel}
              </span>
            )}
          </div>
        )}
      </div>

      <div className="-mt-4 mx-2 rounded-2xl border border-white/10 bg-[#0b1020]/95 p-3 backdrop-blur">
        <h3
          className={`font-semibold text-white ${
            isSmall ? "line-clamp-2 text-base" : "line-clamp-2 text-lg"
          }`}
        >
          {item.title}
        </h3>

        {item.subtitle && (
          <p
            className={`mt-1 text-white/75 ${
              isSmall ? "line-clamp-1 text-xs" : "line-clamp-2 text-sm"
            }`}
          >
            {item.subtitle}
          </p>
        )}

        {showFullBadges ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {priorityLabel && <StatusBadge label={priorityLabel} variant="priority" />}

            {progressLabel && <StatusBadge label={progressLabel} variant="progress" />}

            {item.mediaFormats?.map((format) => (
              <StatusBadge
                key={format}
                label={formatMediaLabel(format)}
                variant="media"
              />
            ))}

            {item.rarityTags?.map((tag) => (
              <StatusBadge key={tag} label={formatRarityLabel(tag)} variant="rarity" />
            ))}
          </div>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {item.mediaFormats?.map((format) => (
              <StatusBadge
                key={format}
                label={formatMediaLabel(format)}
                variant="media"
              />
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
