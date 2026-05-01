"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Item } from "@/types/collection";
import { StatusBadge } from "./StatusBadge";
import { searchIgdbCover } from "@/lib/igdb";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/CustomSelect";
import { uploadSupabaseImage } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import { getNormalizedAcquisitionStatus } from "@/lib/acquisition-utils";
import {
  formatCurrency,
  formatMediaLabel,
  formatOwnershipLabel,
  formatPriorityLabel,
  formatProgressLabel,
  formatRarityLabel,
  formatReleaseDate,
  GENRE_OPTIONS,
  getProgressIcon,
  NEW_GENRE_OPTION,
  PURCHASE_ORIGIN_OPTIONS,
} from "@/lib/item-details-utils";

type ItemDetailsModalProps = {
  item: Item | null;
  existingItems: Item[];
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem: (updatedItem: Item) => void;
};

export function ItemDetailsModal({
  item,
  existingItems,
  isOpen,
  onClose,
  onUpdateItem,
}: ItemDetailsModalProps) {
  const { session } = useAuth();
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
  const [purchaseOriginOptions, setPurchaseOriginOptions] = useState<string[]>(
    [...PURCHASE_ORIGIN_OPTIONS],
  );
  const [genrePrimaryInput, setGenrePrimaryInput] = useState("");
  const [genreSecondaryInput, setGenreSecondaryInput] = useState("");
  const [genreOptions, setGenreOptions] = useState<string[]>([...GENRE_OPTIONS]);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState("");
  const [reviewInput, setReviewInput] = useState("");
  const [ratingInput, setRatingInput] = useState(0);

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

    setNameInput(item.title ?? "");
    setSubtitleInput(item.subtitle ?? "");
    setFranchiseInput(item.franchise ?? "");
    setCompanyInput(item.company ?? "");
    setPlatformInput(item.platform ?? "");
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

    const storedRaw =
      typeof window !== "undefined"
        ? window.localStorage.getItem("my-game-legacy-purchase-origins")
        : null;
    let stored: string[] = [];
    if (storedRaw) {
      try {
        stored = JSON.parse(storedRaw) as string[];
      } catch {
        stored = [];
      }
    }
    const merged = [...new Set([...PURCHASE_ORIGIN_OPTIONS, ...stored, item.purchaseOrigin ?? ""])]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    setPurchaseOriginOptions(merged);
    const mergedGenres = [...new Set([...GENRE_OPTIONS, primary, secondary])]
      .filter(Boolean)
      .sort((a, b) => a.localeCompare(b));
    setGenreOptions(mergedGenres);
  }, [item, isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
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
  const purchaseOriginSelectOptions: CustomSelectOption[] = [
    { value: "", label: "Em branco" },
    ...purchaseOriginOptions.map((origin) => ({ value: origin, label: origin })),
    { value: "__new_origin__", label: "+ Cadastrar nova origem" },
  ];
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

  function handlePurchaseOriginChange(value: string) {
    if (value !== "__new_origin__") {
      setPurchaseOriginInput(value);
      return;
    }

    const typed = window.prompt("Digite a nova origem da compra:");
    if (!typed) return;
    const normalized = typed.trim();
    if (!normalized) return;

    const exists = purchaseOriginOptions.some(
      (option) => option.toLowerCase() === normalized.toLowerCase(),
    );
    const finalValue = exists
      ? purchaseOriginOptions.find(
          (option) => option.toLowerCase() === normalized.toLowerCase(),
        ) ?? normalized
      : normalized;

    if (!exists) {
      const next = [...purchaseOriginOptions, normalized].sort((a, b) =>
        a.localeCompare(b),
      );
      setPurchaseOriginOptions(next);
      window.localStorage.setItem(
        "my-game-legacy-purchase-origins",
        JSON.stringify(next.filter((origin) => !PURCHASE_ORIGIN_OPTIONS.includes(origin))),
      );
    }

    setPurchaseOriginInput(finalValue);
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
      review: reviewInput.trim().slice(0, 1000) || undefined,
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
      onUpdateItem(updatedItem);
      onClose();
    } catch (error) {
      console.error(error);
      setSaveFeedback("Não foi possível salvar agora. Tente novamente.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-[#0b1020] text-white shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full border border-white/10 bg-white/10 px-3 py-2 text-sm text-white/80 transition hover:bg-white/15 hover:text-white"
        >
          X
        </button>

        <div className="grid max-h-[90vh] grid-cols-1 overflow-y-auto lg:grid-cols-[360px_1fr]">
          <div
            ref={imagePanelRef}
            className="border-b border-white/10 bg-gradient-to-br from-slate-800 via-slate-900 to-black lg:sticky lg:top-0 lg:self-start lg:border-b-0 lg:border-r"
          >
            <div
              className="relative aspect-[3/4] w-full cursor-pointer"
              onClick={() => setIsImageActionsOpen((prev) => !prev)}
            >
              {imageUrlInput ? (
                <img
                  src={imageUrlInput}
                  alt={nameInput || item.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-end bg-gradient-to-br from-slate-700/60 via-slate-900 to-black p-6">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-white/45">
                      {platformInput || item.platform}
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold text-white">
                      {nameInput || item.title}
                    </h2>
                    {!isGame && subtitleInput && (
                      <p className="mt-2 text-base text-white/70">
                        {subtitleInput}
                      </p>
                    )}
                  </div>
                </div>
              )}
              {isImageActionsOpen && (
                <div
                  className="absolute inset-0 flex items-end justify-center bg-black/35 px-3 py-4 backdrop-blur-[3px]"
                >
                  <div className="flex flex-wrap items-center justify-center gap-2 rounded-2xl border border-cyan-200/45 bg-black/55 p-2 shadow-[0_0_0_1px_rgba(103,232,249,0.22)]">
                    <IconActionButton
                      icon="✏️"
                      label="Editar imagem"
                      onClick={() => setIsEditingImage((prev) => !prev)}
                    />
                    <IconActionButton
                      icon="🖼️"
                      label={isUploadingImage ? "Enviando..." : "Trocar imagem"}
                      onClick={handlePickImageFromComputer}
                    />
                    {isGame && (
                      <IconActionButton
                        icon="🔎"
                        label={isSearchingCover ? "Buscando..." : "IGDB"}
                        onClick={handleSearchCoverAgain}
                      />
                    )}
                    {imageUrlInput && (
                      <IconActionButton
                        icon="🗑️"
                        label="Remover imagem"
                        onClick={handleRemoveImage}
                      />
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-3 border-t border-white/10 px-3 py-3">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-white/45">{ratingLabel}</p>
                <div className="mt-1 flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, index) => {
                    const star = index + 1;
                    return (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRatingInput(star === ratingInput ? 0 : star)}
                        className="text-lg"
                        aria-label={`Definir ${usesHypeScale ? "hype" : "nota"} ${star}`}
                      >
                        {star <= ratingInput ? "★" : "☆"}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-white/80">
                {isGame && (
                  <span className="rounded-full border border-white/20 bg-black/30 px-2 py-1">
                    {progressIcon} {previewProgressLabel || "Sem status"}
                  </span>
                )}
                {!!previewGenre && (
                  <span className="rounded-full border border-white/20 bg-black/30 px-2 py-1">
                    🎯 {previewGenre}
                  </span>
                )}
                {previewReleaseDateLabel && (
                  <span className="rounded-full border border-white/20 bg-black/30 px-2 py-1">
                    📅 {previewReleaseDateLabel}
                  </span>
                )}
                {expectedArrivalDateInput && (
                  <span className="rounded-full border border-white/20 bg-black/30 px-2 py-1">
                    🚚 Entrega: {expectedArrivalDateInput}
                  </span>
                )}
                <span className="rounded-full border border-white/20 bg-black/30 px-2 py-1">
                  🕹 {platformInput || item.platform}
                </span>
                {!!item.franchise && (
                  <span className="rounded-full border border-white/20 bg-black/30 px-2 py-1">
                    🧩 {item.franchise}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8">
            <div className="space-y-6">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-white/40">
                  Detalhes do item
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  {nameInput || item.title}
                </h2>
                {!isGame && subtitleInput && (
                  <p className="mt-2 text-lg text-white/65">{subtitleInput}</p>
                )}
                <p className="mt-2 text-sm text-white/55">
                  Data de lançamento: {previewReleaseDateLabel || "—"}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <StatusBadge
                  label={formatOwnershipLabel(ownershipStatusInput)}
                  variant={
                    ownershipStatusInput === "wishlist"
                      ? "wishlist"
                      : "default"
                  }
                />

                {previewPriorityLabel && isWishlist && (
                  <StatusBadge label={previewPriorityLabel} variant="priority" />
                )}

                {previewProgressLabel && (
                  <StatusBadge label={previewProgressLabel} variant="progress" />
                )}

                {mediaFormatsInput?.map((format) => (
                  <StatusBadge
                    key={format}
                    label={formatMediaLabel(format)}
                    variant="media"
                  />
                ))}

                {rarityInput && (
                  <StatusBadge
                    label={formatRarityLabel(rarityInput)}
                    variant="rarity"
                  />
                )}
              </div>

              <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <h3 className="text-lg font-semibold text-white">
                  Informações principais
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm text-white/70">Nome</span>
                    <input
                      value={nameInput}
                      onChange={(e) => setNameInput(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                    />
                  </label>

                  {shouldShowGameStatus && (
                    <label className="block">
                      <span className="mb-2 block text-sm text-white/70">Franquia</span>
                      <input
                        value={franchiseInput}
                        onChange={(e) => setFranchiseInput(e.target.value)}
                        placeholder="Opcional"
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                      />
                    </label>
                  )}

                  <label className="block">
                    <span className="mb-2 block text-sm text-white/70">Empresa</span>
                    <input
                      value={companyInput}
                      onChange={(e) => setCompanyInput(e.target.value)}
                      placeholder="Ex: Sony, Nintendo, Capcom"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                    />
                  </label>

                  {!isGame && (
                    <label className="block">
                      <span className="mb-2 block text-sm text-white/70">
                        Versão
                      </span>
                      <input
                        value={subtitleInput}
                        onChange={(e) => setSubtitleInput(e.target.value)}
                        placeholder="Opcional"
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                      />
                    </label>
                  )}

                  {isGame && subtitleInput.trim() && (
                    <p className="text-xs text-amber-200/90 md:col-span-2">
                      Este jogo tinha subtítulo preenchido. O valor será movido para Notas ao salvar.
                    </p>
                  )}

                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm text-white/70">
                      Plataforma
                    </span>
                    <select
                      value={platformInput}
                      onChange={(e) => setPlatformInput(e.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                    >
                      {platformOptions.length === 0 && (
                        <option value="" className="bg-[#0b1020]">
                          Sem plataforma cadastrada
                        </option>
                      )}
                      {platformOptions.map((platform) => (
                        <option key={platform} value={platform} className="bg-[#0b1020]">
                          {platform}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              </section>

              {isEditingImage && (
                <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                  <h3 className="text-lg font-semibold text-white">Ajustar imagem</h3>
                  <div className="mt-4 space-y-3">
                    <input
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="Cole aqui a URL da nova imagem"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                    />
                    <p className="text-sm text-white/55">
                      Você pode colar a URL manualmente, buscar via IGDB ou enviar do computador.
                    </p>
                  </div>
                </section>
              )}

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />

              <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <h3 className="text-lg font-semibold text-white">
                  Edição rápida
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="block">
                    <span className="mb-2 block text-sm text-white/70">
                      Status de posse
                    </span>
                    <OwnershipStatusButtons
                      value={ownershipStatusInput}
                      onChange={(value) => setOwnershipStatusInput(value)}
                    />
                    {isGame && (
                      <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4">
                        <span className="mb-2 block text-sm text-white/70">Mídia</span>
                        <div className="flex flex-wrap gap-2">
                          <ToggleChip
                            label="Física"
                            active={mediaFormatsInput?.includes("physical") ?? false}
                            onClick={() => toggleMediaFormat("physical")}
                          />

                          <ToggleChip
                            label="Digital"
                            active={mediaFormatsInput?.includes("digital") ?? false}
                            onClick={() => toggleMediaFormat("digital")}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {shouldShowGameStatus && (
                    <label className="block">
                      <span className="mb-2 block text-sm text-white/70">
                        Status do jogo
                      </span>
                    <GameStatusChips
                      value={gameProgressStatusInput}
                      onChange={setGameProgressStatusInput}
                      />
                    </label>
                  )}
                </div>

                {isGame && (
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <label className="block">
                      <span className="mb-2 block text-sm text-white/70">Gênero 1</span>
                      <CustomSelect
                        value={genrePrimaryInput}
                        onChange={(value) => handleGenreChange("primary", value)}
                        options={genrePrimaryOptions}
                        placeholder="Em branco"
                      />
                    </label>
                    <label className="block">
                      <span className="mb-2 block text-sm text-white/70">Gênero 2</span>
                      <CustomSelect
                        value={genreSecondaryInput}
                        onChange={(value) => handleGenreChange("secondary", value)}
                        options={genreSecondaryOptions}
                        placeholder="Em branco"
                      />
                    </label>
                  </div>
                )}
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <h3 className="text-lg font-semibold text-white">
                  Financeiro e Metadados
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  {isGame ? (
                    <>
                      {(hasPhysicalSelected || hasDigitalSelected) ? (
                        <>
                          {hasPhysicalSelected && (
                            <label className="block">
                              <span className="mb-2 block text-sm text-white/70">Preço (Físico)</span>
                              <input
                                value={pricePhysicalInput}
                                onChange={(e) => setPricePhysicalInput(e.target.value)}
                                placeholder={shouldDisablePaidInputs ? "Opcional na wishlist" : "Ex: 299.90"}
                                disabled={shouldDisablePaidInputs}
                                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 disabled:opacity-50"
                              />
                            </label>
                          )}
                          {hasDigitalSelected && (
                            <label className="block">
                              <span className="mb-2 block text-sm text-white/70">Preço (Digital)</span>
                              <input
                                value={priceDigitalInput}
                                onChange={(e) => setPriceDigitalInput(e.target.value)}
                                placeholder={shouldDisablePaidInputs ? "Opcional na wishlist" : "Ex: 249.90"}
                                disabled={shouldDisablePaidInputs}
                                className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 disabled:opacity-50"
                              />
                            </label>
                          )}
                        </>
                      ) : (
                        <label className="block">
                          <span className="mb-2 block text-sm text-white/70">
                            {isWishlist ? "Valor de referência" : "Valor pago"}
                          </span>
                          <input
                            value={amountPaidInput}
                            onChange={(e) => setAmountPaidInput(e.target.value)}
                            placeholder={
                              shouldDisablePaidInputs
                                ? "Wishlist não usa valor pago"
                                : "Ex: 299.90"
                            }
                            disabled={shouldDisablePaidInputs}
                            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 disabled:opacity-50"
                          />
                        </label>
                      )}
                    </>
                  ) : (
                    <label className="block">
                      <span className="mb-2 block text-sm text-white/70">
                        {isWishlist ? "Valor de referência" : "Valor pago"}
                      </span>
                      <input
                        value={amountPaidInput}
                        onChange={(e) => setAmountPaidInput(e.target.value)}
                        placeholder={
                          shouldDisablePaidInputs
                            ? "Wishlist não usa valor pago"
                            : "Ex: 299.90"
                        }
                        disabled={shouldDisablePaidInputs}
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35 disabled:opacity-50"
                      />
                    </label>
                  )}

                  <label className="block">
                    <span className="mb-2 block text-sm text-white/70">
                      Valor atual
                    </span>
                    <input
                      value={currentValueInput}
                      onChange={(e) => setCurrentValueInput(e.target.value)}
                      placeholder={
                        isWishlist
                          ? "Ex: valor atual da wishlist"
                          : "Ex: valor atual de mercado"
                      }
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                    />
                  </label>

                  {isWishlist && !hasAcquisitionInWishlist ? (
                    <label className="block md:col-span-2">
                      <span className="mb-2 block text-sm text-white/70">
                        Prioridade
                      </span>
                      <PriorityButtons
                        value={purchasePriorityInput}
                        onChange={(value) => setPurchasePriorityInput(value)}
                      />
                    </label>
                  ) : (
                    <div />
                  )}

                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm text-white/70">
                      Raridade
                    </span>
                    <RarityButtons
                      itemType={item.type}
                      value={rarityInput}
                      onChange={(value) => setRarityInput(value)}
                    />
                  </label>

                  {isWishlist && (
                    <>
                      <label className="block md:col-span-2">
                        <span className="mb-2 block text-sm text-white/70">
                          Substatus de compra
                        </span>
                        <div className="grid grid-cols-1 gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setAcquisitionStatusInput((current) =>
                                current === "purchased" ? "" : "purchased",
                              )
                            }
                            className={`rounded-xl border px-3 py-2 text-sm transition ${
                              acquisitionStatusInput === "purchased"
                                ? "border-red-300 bg-red-500/20 text-red-100"
                                : "border-white/10 bg-black/20 text-white/75 hover:bg-white/10"
                            }`}
                          >
                            Comprado
                          </button>
                        </div>
                      </label>

                      {acquisitionStatusInput && (
                        <label className="block md:col-span-2">
                          <span className="mb-2 block text-sm text-white/70">
                            Previsão de entrega (opcional)
                          </span>
                          <input
                            value={expectedArrivalDateInput}
                            onChange={(e) => setExpectedArrivalDateInput(e.target.value)}
                            placeholder="DD-MM-AAAA"
                            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                          />
                          <p className="mt-2 text-xs text-white/55">
                            Você pode preencher agora ou editar depois neste mesmo modal.
                          </p>
                        </label>
                      )}
                    </>
                  )}
                </div>

                {!isWishlist && (
                  <>
                    <div className="mt-4">
                      <span className="mb-2 block text-sm text-white/70">
                        Data da compra
                      </span>
                      <div className="grid gap-4 md:grid-cols-3">
                        <label className="block">
                          <span className="mb-2 block text-sm text-white/60">Dia</span>
                          <input
                            value={purchaseDayInput}
                            onChange={(e) => setPurchaseDayInput(e.target.value)}
                            placeholder="11"
                            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm text-white/60">Mês</span>
                          <input
                            value={purchaseMonthInput}
                            onChange={(e) => setPurchaseMonthInput(e.target.value)}
                            placeholder="04"
                            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                          />
                        </label>
                        <label className="block">
                          <span className="mb-2 block text-sm text-white/60">Ano</span>
                          <CustomSelect
                            value={purchaseYearInput}
                            onChange={setPurchaseYearInput}
                            options={purchaseYearOptions}
                            placeholder="2026"
                          />
                        </label>
                      </div>
                      {(item.type === "game" || previewReleaseDateLabel) && (
                        <p className="mt-3 flex items-center gap-2 text-xs text-cyan-100/80">
                          Referência de lançamento:{" "}
                          {previewReleaseDateLabel
                            ? `${previewReleaseDateLabel} ${
                                item.type === "game" ? "(IGDB)" : "(cadastrada)"
                              }`
                            : "não informada"}
                          {hasValidReleaseDate && (
                            <>
                              <button
                                type="button"
                                onClick={copyReleaseDateToPurchaseDate}
                                className="rounded border border-cyan-200/30 px-1.5 py-0.5 text-[11px] text-cyan-100 hover:bg-cyan-300/15"
                              >
                                ↘ usar na compra
                              </button>
                              <span
                                title="Usa a data de lançamento para preencher dia, mês e ano da data da compra."
                                className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-cyan-100/40 text-[10px]"
                              >
                                ?
                              </span>
                            </>
                          )}
                        </p>
                      )}
                      {purchaseVsReleaseInfo && (
                        <p className="mt-2 text-sm text-cyan-100/85">{purchaseVsReleaseInfo}</p>
                      )}
                    </div>

                  </>
                )}

                <div className="mt-4">
                  <label className="block">
                    <span className="mb-2 block text-sm text-white/70">Notas</span>
                    <textarea
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value.slice(0, 100))}
                      rows={4}
                      placeholder="Observações sobre o item (até 100 caracteres)"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                    />
                    <span className="mt-1 block text-right text-xs text-white/50">{notesInput.length}/100</span>
                  </label>
                </div>

                <div className="mt-4">
                  <label className="block">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="block text-sm text-white/70">Review do item</span>
                      <span className="text-xs text-white/50">{reviewInput.length}/1000</span>
                    </div>
                    <textarea
                      value={reviewInput}
                      onChange={(e) => setReviewInput(e.target.value.slice(0, 1000))}
                      rows={6}
                      placeholder="Escreva sua review (até 1000 caracteres)"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                    />
                  </label>
                </div>

              </section>
              {saveFeedback && <p className="text-sm text-rose-200">{saveFeedback}</p>}
            </div>
            <div className="sticky bottom-0 mt-6 border-t border-white/10 bg-[#0b1020]/95 p-4 backdrop-blur">
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAll}
                  className="rounded-2xl bg-white px-6 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  <span className="block">Salvar</span>
                  <span className="block text-[11px] font-normal text-black/70">
                    Ctrl/⌘ + Enter
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-4 py-2 text-sm transition ${
        active
          ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-100"
          : "border-white/10 bg-white/5 text-white/75 hover:bg-white/10"
      }`}
    >
      {label}
    </button>
  );
}

function IconActionButton({
  icon,
  label,
  onClick,
}: {
  icon: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
      title={label}
      className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-cyan-200/35 bg-cyan-500/15 text-sm shadow-[0_0_0_1px_rgba(103,232,249,0.2)] transition hover:bg-cyan-400/25"
      aria-label={label}
    >
      {icon}
    </button>
  );
}

function OwnershipStatusButtons({
  value,
  onChange,
}: {
  value: Item["ownershipStatus"];
  onChange: (value: Item["ownershipStatus"]) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
      {[
        { value: "collection", label: "Na coleção", active: "border-white/25 bg-white text-black" },
        { value: "wishlist", label: "Wishlist", active: "border-amber-300 bg-amber-300 text-black" },
      ].map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value as Item["ownershipStatus"])}
          className={`rounded-lg border px-2.5 py-2 text-xs transition ${
            value === option.value
              ? option.active
              : "border-white/10 bg-black/20 text-white/75 hover:bg-white/10"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

function GameStatusChips({
  value,
  onChange,
}: {
  value: NonNullable<Item["gameProgressStatus"]> | "";
  onChange: (value: NonNullable<Item["gameProgressStatus"]> | "") => void;
}) {
  const options: { value: NonNullable<Item["gameProgressStatus"]> | ""; label: string }[] = [
    { value: "undefined", label: "❔ Não definido" },
    { value: "backlog", label: "📚 Backlog" },
    { value: "playing", label: "🎮 Jogando" },
    { value: "paused", label: "⏸️ Pausado" },
    { value: "finished", label: "✅ Terminado" },
    { value: "seeking_platinum", label: "🥇 Buscando a Platina" },
    { value: "platinum", label: "🏆 Platinado" },
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

function MoneyCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/[0.06] to-white/[0.03] p-5">
      <p className="text-xs uppercase tracking-[0.22em] text-white/40">{label}</p>
      <p className="mt-3 text-2xl font-semibold text-white">{value}</p>
    </div>
  );
}

function HistorySection({
  title,
  entries,
}: {
  title: string;
  entries?: { date: string; value: number }[];
}) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <h3 className="text-lg font-semibold text-white">{title}</h3>

      {entries && entries.length > 0 ? (
        <div className="mt-4 space-y-3">
          {entries.map((entry, index) => (
            <div
              key={`${entry.date}-${index}`}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
            >
              <span className="text-sm text-white/65">{entry.date}</span>
              <span className="text-sm font-semibold text-white">
                {new Intl.NumberFormat("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                }).format(entry.value)}
              </span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-white/55">
          Nenhum histórico registrado ainda.
        </p>
      )}
    </section>
  );
}
