import { Item } from "@/types/collection";
import { getAcquisitionStatusLabel, getNormalizedAcquisitionStatus } from "@/lib/acquisition-utils";

type CardSize = "large" | "medium" | "small";

type ItemCardProps = {
  item: Item;
  onClick?: (item: Item) => void;
  onContextMenu?: (item: Item, x: number, y: number) => void;
  size?: CardSize;
  showMediaSeals?: boolean;
};

const sizeConfig: Record<CardSize, string> = {
  large: "aspect-[2/3]",
  medium: "aspect-[11/16]",
  small: "aspect-[5/7]",
};

function getOwnershipFrame(item: Item) {
  const acquisitionStatus = getNormalizedAcquisitionStatus(item);
  if (item.ownershipStatus === "wishlist" && acquisitionStatus === "purchased") {
    return "border-2 border-violet-300/80 shadow-[0_0_0_1px_rgba(167,139,250,0.35)]";
  }

  if (item.ownershipStatus === "wishlist") {
    return "border-2 border-amber-300/90 shadow-[0_0_0_1px_rgba(252,211,77,0.35)]";
  }

  return "border-2 border-white/12";
}

function getCornerSeal(item: Item) {
  if (item.ownershipStatus === "wishlist" && !getNormalizedAcquisitionStatus(item)) return "☆";
  if (item.review?.trim()) return "📝";
  return null;
}

function getCornerSealLabel(item: Item) {
  if (item.ownershipStatus === "wishlist" && !getNormalizedAcquisitionStatus(item)) return "Wishlist";
  if (item.review?.trim()) return "Com review";
  return "";
}

function hasMedia(item: Item, media: "physical" | "digital") {
  return !!item.mediaFormats?.includes(media);
}

function getGameStatusSeal(item: Item) {
  if (item.type !== "game") return null;
  if (item.gameProgressStatus === "backlog") return { icon: "📚", label: "Backlog" };
  if (item.gameProgressStatus === "playing") return { icon: "🎮", label: "Jogando" };
  if (item.gameProgressStatus === "paused") return { icon: "⏸️", label: "Pausado" };
  if (item.gameProgressStatus === "finished") return { icon: "✅", label: "Finalizado" };
  if (item.gameProgressStatus === "platinum") return { icon: "🏆", label: "Platina" };
  return null;
}

function MediaSeal({ icon, label }: { icon: string; label: string }) {
  return (
    <span
      title={label}
      className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border border-white/25 bg-black/45"
    >
      <span className="text-sm leading-none" aria-label={label} role="img">
        {icon}
      </span>
    </span>
  );
}

export function ItemCard({
  item,
  onClick,
  onContextMenu,
  size = "medium",
  showMediaSeals = true,
}: ItemCardProps) {
  const isSmall = size === "small";
  const cornerSeal = getCornerSeal(item);
  const gameStatusSeal = getGameStatusSeal(item);
  const acquisitionStatus = getNormalizedAcquisitionStatus(item);
  const preorderRibbonLabel = acquisitionStatus
    ? getAcquisitionStatusLabel(acquisitionStatus).toUpperCase()
    : null;

  const showPhysicalSeal = showMediaSeals && hasMedia(item, "physical");
  const showDigitalSeal = showMediaSeals && hasMedia(item, "digital");
  const shouldRenderMediaSeals = showPhysicalSeal || showDigitalSeal;

  return (
    <button
      type="button"
      onClick={() => onClick?.(item)}
      onContextMenu={(event) => {
        event.preventDefault();
        onContextMenu?.(item, event.clientX, event.clientY);
      }}
      className={`group w-full rounded-[26px] bg-white/[0.03] p-1 text-left transition duration-300 hover:-translate-y-1 hover:bg-white/[0.06] ${getOwnershipFrame(item)}`}
    >
      <div className={`relative overflow-hidden rounded-[20px] ${sizeConfig[size]}`}>
        {preorderRibbonLabel && (
          <span className="absolute left-0 top-3 z-10 rounded-r-lg bg-red-600/95 px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] text-white shadow-lg">
            {preorderRibbonLabel}
          </span>
        )}
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full bg-black/30 object-contain p-1 transition duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="h-full w-full bg-gradient-to-br from-slate-700/70 to-slate-900/90" />
        )}
      </div>

      <div className="mx-1 mt-1 flex h-[78px] flex-col justify-between rounded-lg border border-white/10 bg-[#0b1020]/95 px-2.5 py-2">
        <h3
          className={`line-clamp-1 font-semibold leading-snug text-white ${
            isSmall ? "text-sm" : "text-[15px]"
          }`}
        >
          {item.title}
        </h3>

        <div className="mt-2 flex min-h-[32px] items-center justify-between gap-2">
          <p
            className={`line-clamp-1 pr-2 ${
              isSmall ? "text-[11px]" : "text-xs"
            } text-white/65`}
          >
            {item.subtitle ?? ""}
          </p>

          <div className="flex shrink-0 items-center gap-1.5">
            {shouldRenderMediaSeals && (
              <>
                {showPhysicalSeal && <MediaSeal icon="💿" label="Mídia física" />}
                {showDigitalSeal && <MediaSeal icon="☁️" label="Mídia digital" />}
              </>
            )}
            {gameStatusSeal && (
              <MediaSeal icon={gameStatusSeal.icon} label={gameStatusSeal.label} />
            )}
            {cornerSeal && (
              <span
                title={getCornerSealLabel(item)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/25 bg-black/45 text-sm text-white/95"
              >
                {cornerSeal}
              </span>
            )}
          </div>
        </div>
      </div>
    </button>
  );
}
