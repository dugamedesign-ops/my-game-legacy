import { Item } from "@/types/collection";

export function isItemReleased(item: Pick<Item, "releaseDate">, now = new Date()) {
  if (!item.releaseDate) return true;

  const releaseDate = new Date(item.releaseDate);
  if (Number.isNaN(releaseDate.getTime())) return true;
  return releaseDate.getTime() <= now.getTime();
}

export function getNormalizedAcquisitionStatus(
  item: Pick<Item, "ownershipStatus" | "acquisitionStatus">,
) {
  if (item.acquisitionStatus === "purchased") return "purchased";
  if (item.acquisitionStatus === "preorder") return "purchased";
  if (item.ownershipStatus === "preorder") return "purchased";
  return null;
}

export function getAcquisitionStatusLabel(status: "purchased") {
  void status;
  return "Comprado";
}
