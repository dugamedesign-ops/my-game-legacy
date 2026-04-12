import { Item } from "@/types/collection";

type CardSize = "large" | "medium" | "small";

type ItemCardProps = {
  item: Item;
  onClick?: (item: Item) => void;
  onContextMenu?: (item: Item, x: number, y: number) => void;
  size?: CardSize;
  showMediaSeals?: boolean;
};

const sizeConfig: Record<CardSize, string> = {
  large: "aspect-[3/4]",
  medium: "aspect-[5/6]",
  small: "aspect-[4/5]",
};

function getOwnershipFrame(item: Item) {
  if (item.ownershipStatus === "wishlist") {
    return "border-2 border-amber-300/90 shadow-[0_0_0_1px_rgba(252,211,77,0.35)]";
  }

  if (item.ownershipStatus === "preorder") {
    return "border-2 border-fuchsia-400/90 shadow-[0_0_0_1px_rgba(232,121,249,0.35)]";
  }

  return "border-2 border-white/12";
}

function getCornerSeal(item: Item) {
  if (item.ownershipStatus === "wishlist") return "☆";
  if (item.ownershipStatus === "preorder") return "🎀";
  return null;
}

function getCornerSealLabel(item: Item) {
  if (item.ownershipStatus === "wishlist") return "Wishlist";
  if (item.ownershipStatus === "preorder") return "Pré-venda";
  return "";
}

function hasMedia(item: Item, media: "physical" | "digital") {
  return !!item.mediaFormats?.includes(media);
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
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt={item.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.03]"
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
            {item.subtitle || item.platform}
          </p>

          <div className="flex shrink-0 items-center gap-1.5">
            {shouldRenderMediaSeals && (
              <>
                {showPhysicalSeal && <MediaSeal icon="💿" label="Mídia física" />}
                {showDigitalSeal && <MediaSeal icon="☁️" label="Mídia digital" />}
              </>
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
