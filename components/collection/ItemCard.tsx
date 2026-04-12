import Image from "next/image";
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

function hasMedia(item: Item, media: "physical" | "digital") {
  return !!item.mediaFormats?.includes(media);
}

function MediaSeal({ src, alt }: { src: string; alt: string }) {
  return (
    <span className="inline-flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-white/35 bg-black/55 backdrop-blur">
      <Image
        src={src}
        alt={alt}
        width={64}
        height={64}
        className="h-12 w-12 scale-[2.2] object-contain"
      />
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

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/55 via-black/10 to-transparent" />

        {cornerSeal && (
          <span className="absolute right-3 top-3 inline-flex h-14 w-14 items-center justify-center rounded-full border border-white/25 bg-black/40 text-sm text-white/95 backdrop-blur">
            {cornerSeal}
          </span>
        )}

        {shouldRenderMediaSeals && (
          <div className="absolute bottom-3 left-3 flex items-center gap-2.5">
            {showPhysicalSeal && (
              <MediaSeal src="/icons/media-physical.png" alt="Mídia física" />
            )}
            {showDigitalSeal && (
              <MediaSeal src="/icons/media-digital.png" alt="Mídia digital" />
            )}
          </div>
        )}
      </div>

      <div className="mx-1 mt-1 rounded-lg border border-white/10 bg-[#0b1020]/92 px-2.5 py-2">
        <h3
          className={`font-semibold leading-snug text-white ${
            isSmall ? "line-clamp-2 text-sm" : "line-clamp-2 text-[15px]"
          }`}
        >
          {item.title}
        </h3>

        {item.subtitle && (
          <p className="mt-0.5 line-clamp-1 text-xs text-white/72">{item.subtitle}</p>
        )}
      </div>
    </button>
  );
}
