"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Item } from "@/types/collection";
import { StatusBadge } from "./StatusBadge";
import { searchIgdbCover, searchIgdbGames } from "@/lib/igdb";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/CustomSelect";
import { uploadSupabaseImage } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { getNormalizedAcquisitionStatus } from "@/lib/acquisition-utils";
import {
  formatMediaLabel,
  formatOwnershipLabel,
  formatPriorityLabel,
  formatProgressLabel,
  formatRarityLabel,
  formatReleaseDate,
  GENRE_OPTIONS,
  getProgressIcon,
  NEW_GENRE_OPTION,
} from "@/lib/item-details-utils";

type ItemDetailsModalProps = {
  item: Item | null;
  existingItems: Item[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem: (updatedItem: Item) => void;
  onDeleteItem: (itemId: string) => void;
  onAddItem: (newItem: Item) => void;
};

export function ItemDetailsModal({
  item,
  existingItems,
  isOpen,
  onClose,
  onUpdateItem,
  onDeleteItem,
  onAddItem,
}: ItemDetailsModalProps) {
  const { session, user } = useAuth();
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [isSearchingCover, setIsSearchingCover] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isImageActionsOpen, setIsImageActionsOpen] = useState(false);

  const [nameInput, setNameInput] = useState("");
  const [subtitleInput, setSubtitleInput] = useState("");
  const [franchiseInput, setFranchiseInput] = useState("");
  const [companyInput, setCompanyInput] = useState("");
  const [platformInput, setPlatformInput] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");

  const [ownershipStatusInput, setOwnershipStatusInput] =
    useState<Item["ownershipStatus"]>("collection");
  const [gameProgressStatusInput, setGameProgressStatusInput] = useState<
    NonNullable<Item["gameProgressStatus"]> | ""
  >("");
  const [mediaFormatsInput, setMediaFormatsInput] = useState<
    Item["mediaFormats"]
  >([]);

  const [amountPaidInput, setAmountPaidInput] = useState("");
  const [pricePhysicalInput, setPricePhysicalInput] = useState("");
  const [priceDigitalInput, setPriceDigitalInput] = useState("");
  const [currentValueInput, setCurrentValueInput] = useState("");

  const [purchasePriorityInput, setPurchasePriorityInput] = useState<
    Item["purchasePriority"] | ""
  >("");
  const [acquisitionStatusInput, setAcquisitionStatusInput] = useState<
    NonNullable<Item["acquisitionStatus"]> | ""
  >("");
  const [expectedArrivalDateInput, setExpectedArrivalDateInput] = useState("");
  const [rarityInput, setRarityInput] = useState<
    NonNullable<Item["rarityTags"]>[number] | ""
  >("");

  const [purchaseYearInput, setPurchaseYearInput] = useState("");
  const [purchaseMonthInput, setPurchaseMonthInput] = useState("");
  const [purchaseDayInput, setPurchaseDayInput] = useState("");
  const [purchaseOriginInput, setPurchaseOriginInput] = useState("");
  const [genrePrimaryInput, setGenrePrimaryInput] = useState("");
  const [genreSecondaryInput, setGenreSecondaryInput] = useState("");
  const [genreOptions, setGenreOptions] = useState<string[]>([...GENRE_OPTIONS]);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState("");
  const [reviewInput, setReviewInput] = useState("");
  const [ratingInput, setRatingInput] = useState(0);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(true);
  const [selectedPlatformsInput, setSelectedPlatformsInput] = useState<string[]>([]);
  const [igdbPlatformOptions, setIgdbPlatformOptions] = useState<string[]>([]);
  const [platformStatusInput, setPlatformStatusInput] = useState<Record<string, NonNullable<Item["gameProgressStatus"]> | "">>({});

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imagePanelRef = useRef<HTMLDivElement | null>(null);
  const handleSaveAllRef = useRef<() => void>(() => {});
  const platformOptions = useMemo(() => {
    const options = Array.from(
      new Set(
        existingItems
          .filter((entry) => !entry.isRemoved)
          .map((entry) => entry.platform.trim())
          .filter(Boolean),
      ),
    ).sort((a, b) => a.localeCompare(b, "pt-BR", { sensitivity: "base" }));

    const current = platformInput.trim();
    if (current && !options.includes(current)) {
      options.unshift(current);
    }

    return options;
  }, [existingItems, platformInput]);

  useEffect(() => {
    if (!item || !isOpen) return;

    setIsEditingMode(false);

    setNameInput(item.title ?? "");
    setSubtitleInput(item.subtitle ?? "");
    setFranchiseInput(item.franchise ?? "");
    setCompanyInput(item.company ?? "");
    setPlatformInput(item.platform ?? "");
    const titlePlatforms = existingItems
      .filter((entry) => !entry.isRemoved && entry.title.trim().toLowerCase() === item.title.trim().toLowerCase())
      .map((entry) => entry.platform)
      .filter(Boolean);
    const uniquePlatforms = Array.from(new Set([item.platform, ...titlePlatforms].filter(Boolean)));
    setSelectedPlatformsInput(uniquePlatforms);
    const statusMap: Record<string, NonNullable<Item["gameProgressStatus"]> | ""> = {};
    existingItems
      .filter((entry) => !entry.isRemoved && entry.title.trim().toLowerCase() === item.title.trim().toLowerCase())
      .forEach((entry) => {
        if (entry.platform) statusMap[entry.platform] = entry.gameProgressStatus ?? "";
      });
    if (item.platform && !statusMap[item.platform]) {
      statusMap[item.platform] = item.gameProgressStatus ?? "";
    }
    setPlatformStatusInput(statusMap);
    setIgdbPlatformOptions([]);
    setImageUrlInput(item.imageUrl ?? "");

    setOwnershipStatusInput(item.ownershipStatus);
    setGameProgressStatusInput(item.gameProgressStatus ?? "undefined");
    setMediaFormatsInput(item.mediaFormats ?? []);

    setAmountPaidInput(
      item.amountPaid !== undefined && item.amountPaid !== null
        ? String(item.amountPaid)
        : "",
    );
    const hasPhysical = item.mediaFormats?.includes("physical") ?? false;
    const hasDigital = item.mediaFormats?.includes("digital") ?? false;
    const fallbackAmount =
      item.amountPaid !== undefined && item.amountPaid !== null
        ? String(item.amountPaid)
        : "";
    setPricePhysicalInput(
      item.pricePhysical !== undefined && item.pricePhysical !== null
        ? String(item.pricePhysical)
        : hasPhysical && !hasDigital
          ? fallbackAmount
          : "",
    );
    setPriceDigitalInput(
      item.priceDigital !== undefined && item.priceDigital !== null
        ? String(item.priceDigital)
        : hasDigital && !hasPhysical
          ? fallbackAmount
          : "",
    );
    setCurrentValueInput(
      item.currentValue !== undefined && item.currentValue !== null
        ? String(item.currentValue)
        : "",
    );

    setPurchasePriorityInput(item.purchasePriority ?? "");
    setAcquisitionStatusInput(getNormalizedAcquisitionStatus(item) ?? "");
    setExpectedArrivalDateInput(item.expectedArrivalDate ?? "");
    setRarityInput(item.rarityTags?.[0] ?? "undefined");

    setPurchaseYearInput(item.purchaseDate?.year ? String(item.purchaseDate.year) : "2026");
    setPurchaseMonthInput(item.purchaseDate?.month ? String(item.purchaseDate.month) : "");
    setPurchaseDayInput(item.purchaseDate?.day ? String(item.purchaseDate.day) : "");
    setPurchaseOriginInput(item.purchaseOrigin ?? "");
    setNotesInput(item.notes ?? "");
    setReviewInput(item.review ?? "");
    setRatingInput(item.rating ?? 0);
    setSaveFeedback(null);
    const [primary = "", secondary = ""] = (item.genre ?? "")
      .split("/")
      .map((part) => part.trim())
      .filter(Boolean);
    setGenrePrimaryInput(primary);
    setGenreSecondaryInput(secondary);

    setIsEditingImage(false);
    setIsSearchingCover(false);
    setIsUploadingImage(false);
    setIsImageActionsOpen(false);

    const mergedGenres = [...new Set([...GENRE_OPTIONS, primary, secondary])]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    setGenreOptions(mergedGenres);
  }, [item, isOpen, existingItems]);

  useEffect(() => {
    if (!isOpen || !item || item.type !== "game") return;
    let isMounted = true;
    void searchIgdbGames(item.title)
      .then((results) => {
        if (!isMounted) return;
        const exact = results.find(
          (entry) => entry.name.trim().toLowerCase() === item.title.trim().toLowerCase(),
        );
        const platforms = (exact ?? results[0])?.platforms ?? [];
        setIgdbPlatformOptions(Array.from(new Set(platforms.filter(Boolean))));
      })
      .catch(() => {
        if (isMounted) setIgdbPlatformOptions([]);
      });
    return () => {
      isMounted = false;
    };
  }, [isOpen, item]);

  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
      if ((event.ctrlKey || event.metaKey || event.altKey) && event.key === "Enter") {
        event.preventDefault();
        handleSaveAllRef.current();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isImageActionsOpen) return;

    function handleClickOutside(event: MouseEvent) {
      if (
        imagePanelRef.current &&
        event.target instanceof Node &&
        !imagePanelRef.current.contains(event.target)
      ) {
        setIsImageActionsOpen(false);
      }
    }

    window.addEventListener("mousedown", handleClickOutside);
    return () => window.removeEventListener("mousedown", handleClickOutside);
  }, [isImageActionsOpen]);

  useEffect(() => {
    handleSaveAllRef.current = handleSaveAll;
  });

  useEffect(() => {
    if (ownershipStatusInput === "wishlist") return;
    setAcquisitionStatusInput("");
    setExpectedArrivalDateInput("");
  }, [ownershipStatusInput]);

  useEffect(() => {
    if (acquisitionStatusInput) return;
    setExpectedArrivalDateInput("");
  }, [acquisitionStatusInput]);

  if (!isOpen || !item) return null;

  const isGame = item.type === "game";
  const isWishlist = ownershipStatusInput === "wishlist";
  const hasAcquisitionInWishlist = isWishlist && acquisitionStatusInput === "purchased";
  const shouldDisablePaidInputs = isWishlist && !hasAcquisitionInWishlist;
  const hasPhysicalSelected = mediaFormatsInput?.includes("physical") ?? false;
  const hasDigitalSelected = mediaFormatsInput?.includes("digital") ?? false;
  const hasBothMediaSelected = hasPhysicalSelected && hasDigitalSelected;
  const genrePrimaryOptions: CustomSelectOption[] = [
    { value: "", label: "Em branco" },
    ...genreOptions.map((genre) => ({ value: genre, label: genre })),
    { value: NEW_GENRE_OPTION, label: "+ Cadastrar novo gênero" },
  ];
  const genreSecondaryOptions: CustomSelectOption[] = [
    { value: "", label: "Em branco" },
    ...genreOptions
      .filter((genre) => genre !== genrePrimaryInput)
      .map((genre) => ({ value: genre, label: genre })),
    { value: NEW_GENRE_OPTION, label: "+ Cadastrar novo gênero" },
  ];
  const purchaseYearOptions: CustomSelectOption[] = [
    { value: "", label: "Em branco" },
    ...Array.from({ length: 47 }, (_, index) => {
      const year = 2026 - index;
      return { value: String(year), label: String(year) };
    }),
  ];

  const previewProgressLabel = formatProgressLabel(
    gameProgressStatusInput || undefined,
  );
  const previewPriorityLabel = formatPriorityLabel(
    purchasePriorityInput || undefined,
  );
  const previewReleaseDateLabel = formatReleaseDate(item.releaseDate);
  const purchaseYearNumber = purchaseYearInput ? Number(purchaseYearInput) : undefined;
  const releaseDateObj = item.releaseDate ? new Date(item.releaseDate) : null;
  const isReleasedForRating =
    !releaseDateObj ||
    Number.isNaN(releaseDateObj.getTime()) ||
    releaseDateObj.getTime() <= Date.now();
  const usesHypeScale = isWishlist && !isReleasedForRating;
  const hasValidReleaseDate = Boolean(
    releaseDateObj && !Number.isNaN(releaseDateObj.getTime()),
  );
  const shouldShowGameStatus = isGame && hasValidReleaseDate && isReleasedForRating;
  const ratingLabel = usesHypeScale ? "Hype" : "Nota";
  const releaseYear = releaseDateObj && !Number.isNaN(releaseDateObj.getTime())
    ? releaseDateObj.getFullYear()
    : undefined;
  const purchaseVsReleaseInfo =
    purchaseYearNumber && releaseYear
      ? purchaseYearNumber === releaseYear
        ? "Comprado no ano de lançamento"
        : purchaseYearNumber > releaseYear
          ? `Comprado ${purchaseYearNumber - releaseYear} ano(s) após o lançamento`
          : "Comprado antes do lançamento"
      : null;
  const progressIcon = getProgressIcon(gameProgressStatusInput || undefined);
  const previewGenre = [genrePrimaryInput, genreSecondaryInput].filter(Boolean).join(" / ");

  function parseOptionalNumber(value: string): number | undefined {
    const normalized = value.replace(",", ".").trim();
    if (!normalized) return undefined;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  function getConsolidatedAmountPaid() {
    const physicalPrice = parseOptionalNumber(pricePhysicalInput);
    const digitalPrice = parseOptionalNumber(priceDigitalInput);

    if (hasBothMediaSelected) {
      if (physicalPrice === undefined && digitalPrice === undefined) return undefined;
      return (physicalPrice ?? 0) + (digitalPrice ?? 0);
    }

    if (hasPhysicalSelected) return physicalPrice;
    if (hasDigitalSelected) return digitalPrice;
    return parseOptionalNumber(amountPaidInput);
  }

  function toggleMediaFormat(format: "physical" | "digital") {
    const current = mediaFormatsInput ?? [];
    const next = current.includes(format)
      ? current.filter((m) => m !== format)
      : [...current, format];

    setMediaFormatsInput(next);
  }

  function copyReleaseDateToPurchaseDate() {
    if (!releaseDateObj || Number.isNaN(releaseDateObj.getTime())) return;
    setPurchaseDayInput(String(releaseDateObj.getDate()).padStart(2, "0"));
    setPurchaseMonthInput(String(releaseDateObj.getMonth() + 1).padStart(2, "0"));
    setPurchaseYearInput(String(releaseDateObj.getFullYear()));
  }

  async function handleSearchCoverAgain() {
    if (!isGame || !item) return;

    const currentTitle = nameInput.trim() || item.title;
    const currentPlatform = platformInput.trim() || item.platform;

    setIsSearchingCover(true);

    try {
      const coverUrl = await searchIgdbCover(currentTitle, currentPlatform);

      if (!coverUrl) {
        alert("Não encontrei uma capa nova para esse jogo agora.");
        return;
      }

      setImageUrlInput(coverUrl);
      setIsEditingImage(false);
    } catch (error) {
      console.error(error);
      alert("Não foi possível buscar a capa agora.");
    } finally {
      setIsSearchingCover(false);
    }
  }

  function handlePickImageFromComputer() {
    fileInputRef.current?.click();
  }

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;
    if (!item) {
      event.target.value = "";
      return;
    }

    if (!file.type.startsWith("image/")) {
      alert("Selecione um arquivo de imagem válido.");
      return;
    }

    setIsUploadingImage(true);
    try {
      if (!session?.access_token) {
        throw new Error("Faça login para enviar imagens personalizadas.");
      }

      const { publicUrl } = await uploadSupabaseImage({
        file,
        accessToken: session.access_token,
        userId: item.userId,
        itemId: item.id,
      });

      setImageUrlInput(publicUrl);
      setIsEditingImage(false);
    } catch (error) {
      console.error(error);
      alert("Não foi possível enviar a imagem para o armazenamento online.");
    } finally {
      setIsUploadingImage(false);
      event.target.value = "";
    }
  }

  function handleRemoveImage() {
    setImageUrlInput("");
    setIsEditingImage(false);
  }

  function handleGenreChange(
    field: "primary" | "secondary",
    value: string,
  ) {
    const setField = field === "primary" ? setGenrePrimaryInput : setGenreSecondaryInput;
    const otherValue = field === "primary" ? genreSecondaryInput : genrePrimaryInput;
    const setOther = field === "primary" ? setGenreSecondaryInput : setGenrePrimaryInput;

    if (value !== NEW_GENRE_OPTION) {
      setField(value);
      if (value && value === otherValue) {
        setOther("");
      }
      return;
    }

    const typed = window.prompt("Digite o nome do novo gênero:");
    if (!typed) return;
    const normalized = typed.trim();
    if (!normalized) return;

    const exists = genreOptions.find(
      (option) => option.toLowerCase() === normalized.toLowerCase(),
    );
    const finalValue = exists ?? normalized;

    if (!exists) {
      const next = [...genreOptions, normalized].sort((a, b) =>
        a.localeCompare(b),
      );
      setGenreOptions(next);
      window.localStorage.setItem(
        "my-game-legacy-custom-genres",
        JSON.stringify(next.filter((genre) => !GENRE_OPTIONS.includes(genre))),
      );
    }

    setField(finalValue);
    if (finalValue === otherValue) {
      setOther("");
    }
  }

  function handleSaveAll() {
    if (!item) return;
    setSaveFeedback(null);

    const year = purchaseYearInput.trim() ? Number(purchaseYearInput.trim()) : undefined;
    const month = purchaseMonthInput.trim() ? Number(purchaseMonthInput.trim()) : undefined;
    const day = purchaseDayInput.trim() ? Number(purchaseDayInput.trim()) : undefined;
    const hasWishlistAcquisitionStatus =
      ownershipStatusInput === "wishlist" &&
      acquisitionStatusInput === "purchased";

    const subtitleText = subtitleInput.trim();
    const notesBaseText = notesInput.trim();
    const notesWithSubtitleForGame =
      isGame && subtitleText
        ? `Subtítulo legado: ${subtitleText}${notesBaseText ? `\n${notesBaseText}` : ""}`
        : notesBaseText;

    const updatedItem: Item = {
      ...item,
      title: nameInput.trim() || item.title,
      subtitle: isGame ? undefined : subtitleText || undefined,
      franchise: isGame ? franchiseInput.trim() || undefined : undefined,
      company: companyInput.trim() || undefined,
      platform: platformInput.trim() || item.platform,
      imageUrl: imageUrlInput.trim() || undefined,

      ownershipStatus: ownershipStatusInput,
      gameProgressStatus:
        isGame ? gameProgressStatusInput || "undefined" : undefined,
      mediaFormats: isGame
        ? mediaFormatsInput && mediaFormatsInput.length > 0
          ? mediaFormatsInput
          : undefined
        : undefined,
      pricePhysical:
        isGame && hasPhysicalSelected
          ? parseOptionalNumber(pricePhysicalInput)
          : undefined,
      priceDigital:
        isGame && hasDigitalSelected
          ? parseOptionalNumber(priceDigitalInput)
          : undefined,

      amountPaid:
        ownershipStatusInput === "wishlist" && !hasWishlistAcquisitionStatus
          ? undefined
          : isGame
            ? getConsolidatedAmountPaid()
            : parseOptionalNumber(amountPaidInput),
      currentValue: parseOptionalNumber(currentValueInput),

      purchasePriority:
        ownershipStatusInput === "wishlist" && !hasWishlistAcquisitionStatus
          ? purchasePriorityInput || undefined
          : undefined,
      acquisitionStatus:
        ownershipStatusInput === "wishlist"
          ? acquisitionStatusInput || undefined
          : undefined,
      expectedArrivalDate:
        ownershipStatusInput === "wishlist"
          ? expectedArrivalDateInput.trim() || undefined
          : undefined,
      rarityTags: [rarityInput || "undefined"],
      rating: ratingInput > 0 ? ratingInput : undefined,
      ratingMode: usesHypeScale ? "hype" : "note",

      purchaseDate:
        year || month || day
          ? {
              year,
              month,
              day,
            }
          : undefined,
      purchaseOrigin: purchaseOriginInput.trim() || undefined,
      notes: notesWithSubtitleForGame.slice(0, 100) || undefined,
      review: reviewInput.trim().slice(0, 5000) || undefined,
      genre:
        isGame
          ? [genrePrimaryInput.trim(), genreSecondaryInput.trim()]
              .filter(Boolean)
              .join(" / ") || undefined
          : item.genre,

      updatedAt: new Date().toISOString(),
    };

    const normalizedTitle = updatedItem.title.trim().toLowerCase();
    const normalizedPlatform = updatedItem.platform.trim().toLowerCase();
    const normalizedSubtitle = (updatedItem.subtitle ?? "").trim().toLowerCase();
    const hasDuplicateOnTargetPlatform = existingItems.some((other) => {
      if (other.id === updatedItem.id || other.isRemoved) return false;

      return (
        other.title.trim().toLowerCase() === normalizedTitle &&
        other.platform.trim().toLowerCase() === normalizedPlatform &&
        (other.subtitle ?? "").trim().toLowerCase() === normalizedSubtitle
      );
    });

    if (hasDuplicateOnTargetPlatform) {
      setSaveFeedback(
        "Já existe um item com o mesmo nome, versão/subtítulo e plataforma. Altere os dados para continuar.",
      );
      return;
    }

    try {
      const selectedPlatforms = selectedPlatformsInput.length > 0
        ? selectedPlatformsInput
        : [updatedItem.platform];
      const [primaryPlatform, ...extraPlatforms] = selectedPlatforms;
      const baseUpdatedItem = {
        ...updatedItem,
        platform: primaryPlatform,
        gameProgressStatus: platformStatusInput[primaryPlatform] || updatedItem.gameProgressStatus,
      };
      onUpdateItem(baseUpdatedItem);

      extraPlatforms.forEach((platform) => {
        const existingPlatformItem = existingItems.find(
          (existing) =>
            !existing.isRemoved &&
            existing.id !== updatedItem.id &&
            existing.title.trim().toLowerCase() === updatedItem.title.trim().toLowerCase() &&
            existing.platform.trim().toLowerCase() === platform.trim().toLowerCase(),
        );
        if (existingPlatformItem) {
          onUpdateItem({
            ...existingPlatformItem,
            title: baseUpdatedItem.title,
            franchise: baseUpdatedItem.franchise,
            company: baseUpdatedItem.company,
            genre: baseUpdatedItem.genre,
            imageUrl: baseUpdatedItem.imageUrl,
            review: baseUpdatedItem.review,
            gameProgressStatus: platformStatusInput[platform] || existingPlatformItem.gameProgressStatus,
            updatedAt: new Date().toISOString(),
          });
          return;
        }

        onAddItem({
          ...baseUpdatedItem,
          id: `item-${crypto.randomUUID()}`,
          platform,
          gameProgressStatus: platformStatusInput[platform] || baseUpdatedItem.gameProgressStatus,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });
      onClose();
    } catch (error) {
      console.error(error);
      setSaveFeedback("Não foi possível salvar agora. Tente novamente.");
    }
  }

  const userName = user?.user_metadata?.name ?? "Usuário";
  const userHandle = user?.email ?? "@usuario";
  const userAvatar = user?.user_metadata?.avatar_url as string | undefined;
  const gamePlatforms = Array.from(
    new Set(
      existingItems
        .filter((entry) => !entry.isRemoved && entry.title.trim().toLowerCase() === item.title.trim().toLowerCase())
        .map((entry) => entry.platform)
        .filter(Boolean),
    ),
  );
  const allGamePlatforms = Array.from(
    new Set([...igdbPlatformOptions, ...gamePlatforms, ...selectedPlatformsInput, platformInput].filter(Boolean)),
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="relative max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-[32px] border border-white/10 bg-gradient-to-br from-[#1f2535] via-[#161b28] to-[#131722] p-6 text-white shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-2xl border border-white/20 bg-white/5 p-3 text-white/70 hover:bg-white/10"
        >
          ✕
        </button>
        {!isEditingMode && (
          <div className="mb-5 flex items-center gap-2.5">
            {userAvatar ? (
              <img src={userAvatar} alt={userName} className="h-9 w-9 rounded-full object-cover" />
            ) : (
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 text-[11px] font-medium">
                {userName.slice(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <p className="text-base font-medium leading-none text-white/90">{userName}</p>
              <p className="text-sm text-white/55">@{userHandle.replace("@", "").split("@")[0]}</p>
            </div>
          </div>
        )}
        {!isEditingMode ? (
        <div className="grid gap-6 md:grid-cols-[320px_1fr]">
          <div className="overflow-hidden rounded-3xl border border-white/10 bg-black/20">
            {imageUrlInput ? (
              <img src={imageUrlInput} alt={nameInput || item.title} className="h-full w-full object-cover" />
            ) : (
              <div className="aspect-[3/4] w-full bg-black/30" />
            )}
          </div>
          <div className="pt-1">
            <h2 className="text-4xl font-semibold">{nameInput || item.title}</h2>
            <p className="mt-1.5 text-xl text-white/70">{previewGenre || "Sem gêneros cadastrados"}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-base text-white/65">
              <span>{previewReleaseDateLabel || "Sem data de lançamento"}</span>
              {companyInput && <span>| {companyInput}</span>}
              {franchiseInput && <span>| {franchiseInput}</span>}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <div className="text-3xl tracking-wide text-cyan-300">
                {Array.from({ length: 5 }, (_, index) => (index < ratingInput ? "★" : "☆")).join("")}
              </div>
              <div className="rounded-full bg-cyan-400 px-4 py-1.5 text-base font-medium text-black">
                {progressIcon} {previewProgressLabel || "Sem status"}
              </div>
            </div>
            <div className="mt-5 border-t border-white/10 pt-4">
              <p className="text-lg font-semibold text-white/65">VISÃO GERAL</p>
              <p className="mt-2 text-base text-white/55">Plataformas</p>
              <p className="text-2xl font-semibold">{gamePlatforms.join(", ") || item.platform}</p>
            </div>
            <div className="mt-6 border-t border-white/10 pt-3.5">
              <button
                type="button"
                onClick={() => setIsEditingMode(true)}
                className="text-lg text-white/70 transition hover:text-white"
              >
                ✎ Editar
              </button>
            </div>
          </div>
        </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-[110px_1fr] md:items-center">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
                {imageUrlInput ? (
                  <div className="relative">
                    <img
                      src={imageUrlInput}
                      alt={nameInput || item.title}
                      className="h-[130px] w-full cursor-pointer object-cover"
                      onClick={() => setIsImageActionsOpen((prev) => !prev)}
                    />
                    {isImageActionsOpen && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/45 p-3 backdrop-blur-[3px]">
                        <div className="grid w-full max-w-[180px] gap-2 rounded-2xl border border-cyan-200/40 bg-black/70 p-3 shadow-xl">
                          <button type="button" onClick={() => setIsEditingImage((prev) => !prev)} className="rounded-lg border border-white/15 px-3 py-2 text-sm">Editar URL</button>
                          <button type="button" onClick={handlePickImageFromComputer} className="rounded-lg border border-white/15 px-3 py-2 text-sm">Upload</button>
                          <button type="button" onClick={handleSearchCoverAgain} className="rounded-lg border border-white/15 px-3 py-2 text-sm">IGDB</button>
                          <button type="button" onClick={handleRemoveImage} className="rounded-lg border border-white/15 px-3 py-2 text-sm text-rose-200">Remover</button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="h-[130px] w-full bg-black/30" />
                )}
              </div>
              {isEditingImage && (
                <input
                  value={imageUrlInput}
                  onChange={(e) => setImageUrlInput(e.target.value)}
                  placeholder="Cole URL da capa"
                  className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs text-white placeholder:text-white/35"
                />
              )}
              <div>
                <div className="flex items-center gap-3">
                  <p className="text-5xl tracking-wide text-cyan-300">
                    {Array.from({ length: 5 }, (_, index) => (index < ratingInput ? "★" : "☆")).join("")}
                  </p>
                </div>
                <p className="mt-1 text-4xl font-semibold">{nameInput || item.title}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-gradient-to-r from-white/[0.03] to-white/[0.01] px-4 py-3.5">
              <div className="flex items-center gap-3">
                <span className="w-4 text-sm font-medium text-white/55">0</span>
                <input
                  type="range"
                  min={0}
                  max={5}
                  step={1}
                  value={ratingInput}
                  onChange={(e) => setRatingInput(Number(e.target.value))}
                  className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/15 accent-cyan-400 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-cyan-300 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-cyan-300"
                />
                <span className="w-4 text-right text-sm font-medium text-white/55">5</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDetailsOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 text-base font-semibold tracking-[0.12em] text-white/70"
            >
              DETALHES <span className="text-sm text-white/55">{isDetailsOpen ? "▾" : "▸"}</span>
            </button>

            {isDetailsOpen && (
            <section className="rounded-3xl border border-white/10 bg-black/15 p-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm uppercase tracking-[0.2em] text-white/55">Informações principais</h4>
                <button type="button" onClick={handleSearchCoverAgain} className="text-xs text-cyan-200/80 hover:text-cyan-100">↻ Recarregar via IGDB</button>
              </div>
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs text-white/45">Nome</span>
                  <input
                    value={nameInput}
                    onChange={(e) => setNameInput(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none"
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs text-white/45">Franquia</span>
                  <input
                    value={franchiseInput}
                    onChange={(e) => setFranchiseInput(e.target.value)}
                    placeholder="(se houver)"
                    className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none placeholder:text-white/30"
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="mb-1 block text-xs text-white/45">Empresa</span>
                  <input
                    value={companyInput}
                    onChange={(e) => setCompanyInput(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none"
                  />
                </label>
              </div>

              <div className="mt-4">
                <span className="mb-2 block text-xs text-white/45">Plataformas</span>
                <div className="flex flex-wrap gap-2">
                  {(allGamePlatforms.length > 0 ? allGamePlatforms : platformOptions).map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      onClick={() =>
                        setSelectedPlatformsInput((current) => {
                          const next = current.includes(platform)
                            ? current.filter((entry) => entry !== platform)
                            : [...current, platform];
                          setPlatformInput(next[0] ?? platformInput);
                          return next;
                        })
                      }
                      className={`rounded-full border px-3 py-1.5 text-sm transition ${
                        selectedPlatformsInput.includes(platform)
                          ? "border-cyan-300/40 bg-cyan-400/20 text-cyan-100"
                          : "border-white/15 bg-black/20 text-white/75"
                      }`}
                    >
                      {platform}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-4 space-y-2">
                {selectedPlatformsInput.map((platform) => (
                  <div key={`folder-${platform}`} className="space-y-2 rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white/75">
                    {platform}
                    <div className="flex flex-wrap gap-2">
                      {[
                        { value: "backlog", label: "📚 Backlog" },
                        { value: "playing", label: "🎮 Jogando" },
                        { value: "paused", label: "⏸️ Pausado" },
                        { value: "finished", label: "✅ Terminado" },
                        { value: "seeking_platinum", label: "🥇 Buscando a Platina" },
                        { value: "platinum", label: "🏆 Platinado" },
                      ].map((status) => (
                        <button
                          key={`${platform}-${status.value}`}
                          type="button"
                          onClick={() =>
                            setPlatformStatusInput((current) => ({
                              ...current,
                              [platform]: status.value as NonNullable<Item["gameProgressStatus"]>,
                            }))
                          }
                          className={`rounded-full border px-3 py-1.5 text-xs transition ${
                            platformStatusInput[platform] === status.value
                              ? "border-cyan-300/40 bg-cyan-400 text-black"
                              : "border-white/15 bg-transparent text-white/80"
                          }`}
                        >
                          {status.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
            )}

            <div className="rounded-3xl border border-white/10 bg-black/15 p-4">
              <textarea
                value={reviewInput}
                onChange={(e) => setReviewInput(e.target.value.slice(0, 5000))}
                rows={8}
                placeholder="Escreva sua análise em até 5000 caracteres..."
                className="w-full resize-none bg-transparent text-base text-white outline-none placeholder:text-white/35"
              />
              <div className="mt-2 flex items-center justify-between text-sm text-white/50">
                <span>{reviewInput.length} / 5000 caractere</span>
                <span>{reviewInput.trim() ? reviewInput.trim().split(/\s+/).length : 0} palavras</span>
              </div>
            </div>

            <div className="flex items-center justify-between border-t border-white/10 pt-4">
              <div className="flex items-center gap-6 text-lg">
                <button type="button" onClick={() => setIsEditingMode(false)} className="text-white/70 hover:text-white">Fechar</button>
                <button
                  type="button"
                  onClick={() => {
                    onDeleteItem(item.id);
                    onClose();
                  }}
                  className="text-rose-400 hover:text-rose-300"
                >
                  Remover
                </button>
              </div>
              <button
                type="button"
                onClick={handleSaveAll}
                className="rounded-full bg-white px-8 py-3 text-lg font-semibold text-black"
              >
                Atualizar
                <span className="ml-2 text-xs text-black/60">Alt + Enter</span>
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
function PriorityButtons({
  value,
  onChange,
}: {
  value: Item["purchasePriority"] | "";
  onChange: (value: Item["purchasePriority"] | "") => void;
}) {
  const options: { value: Item["purchasePriority"] | ""; label: string }[] = [
    { value: "", label: "Não definida" },
    { value: "low", label: "Baixa" },
    { value: "medium", label: "Média" },
    { value: "high", label: "Alta" },
    { value: "maximum", label: "Máxima" },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full border px-3 py-2 text-sm transition ${
            value === option.value
              ? "border-cyan-300/70 bg-cyan-400/20 text-cyan-100"
              : "border-white/10 bg-black/20 text-white/75 hover:bg-white/10"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function RarityButtons({
  itemType,
  value,
  onChange,
}: {
  itemType: Item["type"];
  value: NonNullable<Item["rarityTags"]>[number] | "";
  onChange: (value: NonNullable<Item["rarityTags"]>[number] | "") => void;
}) {
  const options: { value: NonNullable<Item["rarityTags"]>[number] | ""; label: string }[] = [
    { value: "undefined", label: "Não definida" },
    { value: "normal", label: "Normal" },
    { value: "rare", label: "Raro" },
    { value: "special_edition", label: "Edição especial" },
    { value: "highlight", label: "Destaque" },
    { value: "repro", label: "Repro" },
  ];
  if (itemType === "game") {
    options.push({ value: "steelbook", label: "Steelbook" });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={option.label}
          type="button"
          onClick={() => onChange(option.value)}
          className={`rounded-full border px-3 py-2 text-sm transition ${
            value === option.value
              ? "border-fuchsia-300/70 bg-fuchsia-400/20 text-fuchsia-100"
              : "border-white/10 bg-black/20 text-white/75 hover:bg-white/10"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
