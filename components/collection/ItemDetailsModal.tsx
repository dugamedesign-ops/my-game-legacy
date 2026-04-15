"use client";

import { useEffect, useRef, useState } from "react";
import { Item } from "@/types/collection";
import { StatusBadge } from "./StatusBadge";
import { searchIgdbCover } from "@/lib/igdb";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/CustomSelect";
import { uploadSupabaseImage } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

type ItemDetailsModalProps = {
  item: Item | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdateItem: (updatedItem: Item) => void;
};

function formatOwnershipLabel(status: Item["ownershipStatus"]) {
  const map = {
    collection: "Na coleção",
    wishlist: "Wishlist",
    preorder: "Pré-venda",
  };

  return map[status];
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

function formatCurrency(value?: number) {
  if (value === undefined || value === null || Number.isNaN(value)) return "—";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value);
}

function formatPurchaseDate(
  purchaseDate?: Item["purchaseDate"],
): string | null {
  if (!purchaseDate?.year) return null;

  if (purchaseDate.day && purchaseDate.month) {
    return `${String(purchaseDate.day).padStart(2, "0")}/${String(
      purchaseDate.month,
    ).padStart(2, "0")}/${purchaseDate.year}`;
  }

  if (purchaseDate.month) {
    return `${String(purchaseDate.month).padStart(2, "0")}/${purchaseDate.year}`;
  }

  return `${purchaseDate.year}`;
}

function formatReleaseDate(releaseDate?: string): string | null {
  if (!releaseDate) return null;
  const date = new Date(releaseDate);
  if (Number.isNaN(date.getTime())) return releaseDate;
  return date.toLocaleDateString("pt-BR");
}
const PURCHASE_ORIGIN_OPTIONS = [
  "Loja física",
  "Online BR",
  "Online internacional",
  "Paraguai",
  "Presente",
  "Outro",
];
const GENRE_OPTIONS = [
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
const NEW_GENRE_OPTION = "__new_genre__";

export function ItemDetailsModal({
  item,
  isOpen,
  onClose,
  onUpdateItem,
}: ItemDetailsModalProps) {
  const { session } = useAuth();
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [isSearchingCover, setIsSearchingCover] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const [nameInput, setNameInput] = useState("");
  const [subtitleInput, setSubtitleInput] = useState("");
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
  const [rarityInput, setRarityInput] = useState<
    NonNullable<Item["rarityTags"]>[number] | ""
  >("");

  const [purchaseYearInput, setPurchaseYearInput] = useState("");
  const [purchaseMonthInput, setPurchaseMonthInput] = useState("");
  const [purchaseDayInput, setPurchaseDayInput] = useState("");
  const [purchaseOriginInput, setPurchaseOriginInput] = useState("");
  const [purchaseOriginOptions, setPurchaseOriginOptions] = useState<string[]>(
    PURCHASE_ORIGIN_OPTIONS,
  );
  const [genrePrimaryInput, setGenrePrimaryInput] = useState("");
  const [genreSecondaryInput, setGenreSecondaryInput] = useState("");
  const [genreOptions, setGenreOptions] = useState<string[]>(GENRE_OPTIONS);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [notesInput, setNotesInput] = useState("");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!item || !isOpen) return;

    setNameInput(item.title ?? "");
    setSubtitleInput(item.subtitle ?? "");
    setImageUrlInput(item.imageUrl ?? "");

    setOwnershipStatusInput(item.ownershipStatus);
    setGameProgressStatusInput(item.gameProgressStatus ?? "");
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
    setRarityInput(item.rarityTags?.[0] ?? "");

    setPurchaseYearInput(item.purchaseDate?.year ? String(item.purchaseDate.year) : "2026");
    setPurchaseMonthInput(item.purchaseDate?.month ? String(item.purchaseDate.month) : "");
    setPurchaseDayInput(item.purchaseDate?.day ? String(item.purchaseDate.day) : "");
    setPurchaseOriginInput(item.purchaseOrigin ?? "");
    setNotesInput(item.notes ?? "");
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
        handleSaveAll();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose, handleSaveAll]);

  if (!isOpen || !item) return null;

  const isGame = item.type === "game";
  const isWishlist = ownershipStatusInput === "wishlist";
  const hasPhysicalSelected = mediaFormatsInput?.includes("physical") ?? false;
  const hasDigitalSelected = mediaFormatsInput?.includes("digital") ?? false;
  const hasBothMediaSelected = hasPhysicalSelected && hasDigitalSelected;
  const gameProgressOptions: CustomSelectOption[] = [
    { value: "", label: "Não definido" },
    { value: "backlog", label: "Backlog" },
    { value: "playing", label: "Jogando" },
    { value: "paused", label: "Pausado" },
    { value: "finished", label: "Terminado" },
    { value: "platinum", label: "Platinado" },
  ];
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
  const previewPurchaseDateLabel = formatPurchaseDate(
    purchaseYearInput || purchaseMonthInput || purchaseDayInput
      ? {
          year: purchaseYearInput ? Number(purchaseYearInput) : undefined,
          month: purchaseMonthInput ? Number(purchaseMonthInput) : undefined,
          day: purchaseDayInput ? Number(purchaseDayInput) : undefined,
        }
      : undefined,
  );
  const purchaseYearNumber = purchaseYearInput ? Number(purchaseYearInput) : undefined;
  const releaseDateObj = item.releaseDate ? new Date(item.releaseDate) : null;
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

  async function handleSearchCoverAgain() {
    if (!isGame || !item) return;

    const currentTitle = nameInput.trim() || item.title;
    const currentPlatform = item.platform;

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

    const updatedItem: Item = {
      ...item,
      title: nameInput.trim() || item.title,
      subtitle: subtitleInput.trim() || undefined,
      imageUrl: imageUrlInput.trim() || undefined,

      ownershipStatus: ownershipStatusInput,
      gameProgressStatus:
        isGame && ownershipStatusInput === "collection"
          ? gameProgressStatusInput || undefined
          : undefined,
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
        ownershipStatusInput === "wishlist"
          ? undefined
          : isGame
            ? getConsolidatedAmountPaid()
            : parseOptionalNumber(amountPaidInput),
      currentValue: parseOptionalNumber(currentValueInput),

      purchasePriority:
        ownershipStatusInput === "wishlist"
          ? purchasePriorityInput || undefined
          : undefined,
      rarityTags: rarityInput ? [rarityInput] : undefined,

      purchaseDate:
        year || month || day
          ? {
              year,
              month,
              day,
            }
          : undefined,
      purchaseOrigin: purchaseOriginInput.trim() || undefined,
      notes: notesInput.trim() || undefined,
      genre:
        isGame
          ? [genrePrimaryInput.trim(), genreSecondaryInput.trim()]
              .filter(Boolean)
              .join(" / ") || undefined
          : item.genre,

      updatedAt: new Date().toISOString(),
    };

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
          Fechar
        </button>

        <div className="grid max-h-[90vh] grid-cols-1 overflow-y-auto lg:grid-cols-[360px_1fr]">
          <div className="border-b border-white/10 bg-gradient-to-br from-slate-800 via-slate-900 to-black lg:border-b-0 lg:border-r">
            <div className="aspect-[3/4] w-full">
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
                      {item.platform}
                    </p>
                    <h2 className="mt-2 text-3xl font-semibold text-white">
                      {nameInput || item.title}
                    </h2>
                    {subtitleInput && (
                      <p className="mt-2 text-base text-white/70">
                        {subtitleInput}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center justify-center gap-2 border-t border-white/10 px-3 py-3">
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

          <div className="p-6 sm:p-8">
            <div className="space-y-6">
              <div>
                <p className="text-sm uppercase tracking-[0.28em] text-white/40">
                  Detalhes do item
                </p>
                <h2 className="mt-2 text-3xl font-semibold tracking-tight text-white">
                  {nameInput || item.title}
                </h2>
                {subtitleInput && (
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
                      : ownershipStatusInput === "preorder"
                        ? "preorder"
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

                  <label className="block">
                    <span className="mb-2 block text-sm text-white/70">
                      Subtítulo
                    </span>
                    <input
                      value={subtitleInput}
                      onChange={(e) => setSubtitleInput(e.target.value)}
                      placeholder="Opcional"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                    />
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
                  <label className="block">
                    <span className="mb-2 block text-sm text-white/70">
                      Status de posse
                    </span>
                    <OwnershipStatusButtons
                      value={ownershipStatusInput}
                      onChange={(value) => setOwnershipStatusInput(value)}
                    />
                  </label>

                  {isGame && (
                    <label className="block">
                      <span className="mb-2 block text-sm text-white/70">
                        Status do jogo
                      </span>
                      <CustomSelect
                        value={gameProgressStatusInput}
                        onChange={(value) =>
                          setGameProgressStatusInput(
                            (value as NonNullable<Item["gameProgressStatus"]> | "") ?? "",
                          )
                        }
                        options={gameProgressOptions}
                        placeholder="Não definido"
                      />
                    </label>
                  )}
                </div>

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
                  Financeiro e metadados
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
                                placeholder={isWishlist ? "Opcional na wishlist" : "Ex: 299.90"}
                                disabled={isWishlist}
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
                                placeholder={isWishlist ? "Opcional na wishlist" : "Ex: 249.90"}
                                disabled={isWishlist}
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
                              isWishlist
                                ? "Wishlist não usa valor pago"
                                : "Ex: 299.90"
                            }
                            disabled={isWishlist}
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
                          isWishlist
                            ? "Wishlist não usa valor pago"
                            : "Ex: 299.90"
                        }
                        disabled={isWishlist}
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

                  {isWishlist ? (
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
                      value={rarityInput}
                      onChange={(value) => setRarityInput(value)}
                    />
                  </label>
                </div>

                <div className="mt-4">
                  <span className="mb-2 block text-sm text-white/70">
                    Data da compra (data do lançamento do item, puxado do database)
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
                </div>

                <div className="mt-4 grid gap-4">
                  <label className="block">
                    <span className="mb-2 block text-sm text-white/70">
                      Origem da compra
                    </span>
                    <CustomSelect
                      value={purchaseOriginInput}
                      onChange={handlePurchaseOriginChange}
                      options={purchaseOriginSelectOptions}
                      placeholder="Em branco"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm text-white/70">Notas</span>
                    <textarea
                      value={notesInput}
                      onChange={(e) => setNotesInput(e.target.value)}
                      rows={4}
                      placeholder="Observações sobre o item"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                    />
                  </label>
                </div>
              </section>

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InfoCard label="Tipo" value={getTypeLabel(item.type)} />
                <InfoCard label="Plataforma" value={item.platform} />
                <InfoCard label="Franquia" value={item.franchise || "—"} />
                <InfoCard label="Gênero" value={item.genre || "—"} />
                <InfoCard
                  label="Origem da compra"
                  value={purchaseOriginInput || "—"}
                />
                <InfoCard
                  label="Data da compra"
                  value={previewPurchaseDateLabel || "—"}
                />
                <InfoCard
                  label="Data de lançamento"
                  value={previewReleaseDateLabel || "—"}
                />
              </div>
              {purchaseVsReleaseInfo && (
                <p className="text-sm text-cyan-100/85">{purchaseVsReleaseInfo}</p>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                {isGame && (hasPhysicalSelected || hasDigitalSelected) ? (
                  <>
                    {hasPhysicalSelected && (
                      <MoneyCard
                        label="Preço (Físico)"
                        value={formatCurrency(
                          isWishlist
                            ? undefined
                            : parseOptionalNumber(pricePhysicalInput),
                        )}
                      />
                    )}
                    {hasDigitalSelected && (
                      <MoneyCard
                        label="Preço (Digital)"
                        value={formatCurrency(
                          isWishlist
                            ? undefined
                            : parseOptionalNumber(priceDigitalInput),
                        )}
                      />
                    )}
                  </>
                ) : (
                  <MoneyCard
                    label={isWishlist ? "Valor referência" : "Valor pago"}
                    value={formatCurrency(
                      isWishlist
                        ? undefined
                        : parseOptionalNumber(amountPaidInput),
                    )}
                  />
                )}
                <MoneyCard
                  label="Valor atual"
                  value={formatCurrency(parseOptionalNumber(currentValueInput))}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleSaveAll}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90"
                >
                  Salvar alterações
                </button>
              </div>
              {saveFeedback && <p className="text-sm text-rose-200">{saveFeedback}</p>}

              <div className="grid gap-6 xl:grid-cols-2">
                <HistorySection
                  title="Histórico de preço monitorado"
                  entries={item.trackedPriceHistory}
                />
                <HistorySection
                  title="Histórico de valorização"
                  entries={item.collectionValueHistory}
                />
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
      onClick={onClick}
      title={label}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-sm transition hover:bg-white/10"
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
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      {[
        { value: "collection", label: "Na coleção", active: "border-white/25 bg-white text-black" },
        { value: "wishlist", label: "Wishlist", active: "border-amber-300 bg-amber-300 text-black" },
        { value: "preorder", label: "Pré-venda", active: "border-fuchsia-400 bg-fuchsia-500 text-white" },
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
  value,
  onChange,
}: {
  value: NonNullable<Item["rarityTags"]>[number] | "";
  onChange: (value: NonNullable<Item["rarityTags"]>[number] | "") => void;
}) {
  const options: { value: NonNullable<Item["rarityTags"]>[number] | ""; label: string }[] = [
    { value: "", label: "Não definida" },
    { value: "normal", label: "Normal" },
    { value: "rare", label: "Raro" },
    { value: "special_edition", label: "Edição especial" },
    { value: "highlight", label: "Destaque" },
    { value: "repro", label: "Repro" },
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

function getTypeLabel(type: Item["type"]) {
  const map = {
    console: "Console",
    accessory: "Acessório",
    game: "Jogo",
  };

  return map[type];
}

function InfoCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-[0.22em] text-white/40">{label}</p>
      <p className="mt-2 text-base font-medium text-white">{value}</p>
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
