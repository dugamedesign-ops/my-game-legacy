"use client";

import { useEffect, useRef, useState } from "react";
import { Item } from "@/types/collection";
import { StatusBadge } from "./StatusBadge";
import { searchIgdbCover } from "@/lib/igdb";

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

export function ItemDetailsModal({
  item,
  isOpen,
  onClose,
  onUpdateItem,
}: ItemDetailsModalProps) {
  const [isEditingImage, setIsEditingImage] = useState(false);
  const [isSearchingCover, setIsSearchingCover] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [showUploadTip, setShowUploadTip] = useState(false);

  const [nameInput, setNameInput] = useState("");
  const [subtitleInput, setSubtitleInput] = useState("");
  const [imageUrlInput, setImageUrlInput] = useState("");

  const [ownershipStatusInput, setOwnershipStatusInput] =
    useState<Item["ownershipStatus"]>("collection");
  const [gameProgressStatusInput, setGameProgressStatusInput] = useState<
    Item["gameProgressStatus"] | ""
  >("");
  const [mediaFormatsInput, setMediaFormatsInput] = useState<
    Item["mediaFormats"]
  >([]);

  const [amountPaidInput, setAmountPaidInput] = useState("");
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
    setCurrentValueInput(
      item.currentValue !== undefined && item.currentValue !== null
        ? String(item.currentValue)
        : "",
    );

    setPurchasePriorityInput(item.purchasePriority ?? "");
    setRarityInput(item.rarityTags?.[0] ?? "");

    setPurchaseYearInput(item.purchaseDate?.year ? String(item.purchaseDate.year) : "");
    setPurchaseMonthInput(item.purchaseDate?.month ? String(item.purchaseDate.month) : "");
    setPurchaseDayInput(item.purchaseDate?.day ? String(item.purchaseDate.day) : "");
    setPurchaseOriginInput(item.purchaseOrigin ?? "");
    setNotesInput(item.notes ?? "");

    setIsEditingImage(false);
    setIsSearchingCover(false);
    setIsUploadingImage(false);
    setShowUploadTip(false);
  }, [item?.id, isOpen]);

  if (!isOpen || !item) return null;

  const isGame = item.type === "game";
  const isWishlist = ownershipStatusInput === "wishlist";

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

  function parseOptionalNumber(value: string): number | undefined {
    const normalized = value.replace(",", ".").trim();
    if (!normalized) return undefined;

    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
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

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("Selecione um arquivo de imagem válido.");
      return;
    }

    const reader = new FileReader();
    setIsUploadingImage(true);

    reader.onload = () => {
      const result = reader.result;

      if (typeof result !== "string") {
        setIsUploadingImage(false);
        alert("Não foi possível carregar essa imagem.");
        return;
      }

      setImageUrlInput(result);
      setIsUploadingImage(false);
      setIsEditingImage(false);
    };

    reader.onerror = () => {
      setIsUploadingImage(false);
      alert("Erro ao ler a imagem selecionada.");
    };

    reader.readAsDataURL(file);
    event.target.value = "";
  }

  function handleRemoveImage() {
    setImageUrlInput("");
    setIsEditingImage(false);
  }

  function handleSaveAll() {
    if (!item) return;

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

      amountPaid:
        ownershipStatusInput === "wishlist"
          ? undefined
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

      updatedAt: new Date().toISOString(),
    };

    onUpdateItem(updatedItem);
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

              <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-white">
                    Imagem do item
                  </h3>

                  {!isEditingImage ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setIsEditingImage(true)}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                      >
                        Editar imagem
                      </button>

                      {isGame && (
                        <button
                          type="button"
                          onClick={handleSearchCoverAgain}
                          disabled={isSearchingCover}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isSearchingCover
                            ? "Buscando..."
                            : "Buscar capa novamente"}
                        </button>
                      )}

                      <div
                        className="relative"
                        onMouseEnter={() => setShowUploadTip(true)}
                        onMouseLeave={() => setShowUploadTip(false)}
                      >
                        <button
                          type="button"
                          onClick={handlePickImageFromComputer}
                          disabled={isUploadingImage}
                          className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isUploadingImage
                            ? "Enviando..."
                            : "Enviar do computador"}
                        </button>

                        {showUploadTip && (
                          <div className="absolute right-0 top-full z-20 mt-2 w-72 rounded-2xl border border-white/10 bg-[#0d1326] p-3 text-xs leading-5 text-white/75 shadow-2xl">
                            Imagem recomendada: <strong>1200x1500 px</strong>{" "}
                            (proporção 4:5). Para funcionar bem nos cards P, M e G,
                            mantenha textos e elementos principais mais ao centro.
                          </div>
                        )}
                      </div>

                      {imageUrlInput && (
                        <button
                          type="button"
                          onClick={handleRemoveImage}
                          className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-2 text-sm text-red-100 transition hover:bg-red-500/15"
                        >
                          Remover imagem
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setImageUrlInput(item.imageUrl ?? "");
                          setIsEditingImage(false);
                        }}
                        className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsEditingImage(false)}
                        className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                      >
                        Confirmar imagem
                      </button>
                    </div>
                  )}
                </div>

                {isEditingImage && (
                  <div className="mt-4 space-y-3">
                    <input
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="Cole aqui a URL da nova imagem"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                    />

                    <p className="text-sm text-white/55">
                      Você pode colar a URL manualmente, buscar novamente via
                      IGDB ou enviar do seu computador.
                    </p>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <h3 className="text-lg font-semibold text-white">
                  Edição rápida
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm text-white/70">
                      Status de posse
                    </span>
                    <select
                      value={ownershipStatusInput}
                      onChange={(e) =>
                        setOwnershipStatusInput(
                          e.target.value as Item["ownershipStatus"],
                        )
                      }
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                    >
                      <option value="collection" className="text-black">
                        Na coleção
                      </option>
                      <option value="wishlist" className="text-black">
                        Wishlist
                      </option>
                      <option value="preorder" className="text-black">
                        Pré-venda
                      </option>
                    </select>
                  </label>

                  {isGame && (
                    <label className="block">
                      <span className="mb-2 block text-sm text-white/70">
                        Status do jogo
                      </span>
                      <select
                        value={gameProgressStatusInput}
                        onChange={(e) =>
                          setGameProgressStatusInput(
                            (e.target.value as Item["gameProgressStatus"] | "") ?? "",
                          )
                        }
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                      >
                        <option value="" className="text-black">
                          Não definido
                        </option>
                        <option value="backlog" className="text-black">
                          Backlog
                        </option>
                        <option value="playing" className="text-black">
                          Jogando
                        </option>
                        <option value="paused" className="text-black">
                          Pausado
                        </option>
                        <option value="finished" className="text-black">
                          Terminado
                        </option>
                        <option value="platinum" className="text-black">
                          Platinado
                        </option>
                      </select>
                    </label>
                  )}
                </div>

                {isGame && (
                  <div className="mt-4">
                    <span className="mb-2 block text-sm text-white/70">
                      Mídia
                    </span>

                    <div className="flex flex-wrap gap-3">
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
              </section>

              <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
                <h3 className="text-lg font-semibold text-white">
                  Financeiro e metadados
                </h3>

                <div className="mt-4 grid gap-4 md:grid-cols-2">
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
                    <label className="block">
                      <span className="mb-2 block text-sm text-white/70">
                        Prioridade
                      </span>
                      <select
                        value={purchasePriorityInput}
                        onChange={(e) =>
                          setPurchasePriorityInput(
                            (e.target.value as Item["purchasePriority"] | "") ?? "",
                          )
                        }
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                      >
                        <option value="" className="text-black">
                          Não definida
                        </option>
                        <option value="low" className="text-black">
                          Baixa
                        </option>
                        <option value="medium" className="text-black">
                          Média
                        </option>
                        <option value="high" className="text-black">
                          Alta
                        </option>
                        <option value="maximum" className="text-black">
                          Prioridade Máxima
                        </option>
                      </select>
                    </label>
                  ) : (
                    <div />
                  )}

                  <label className="block">
                    <span className="mb-2 block text-sm text-white/70">
                      Raridade
                    </span>
                    <select
                      value={rarityInput}
                      onChange={(e) =>
                        setRarityInput(
                          (e.target.value as
                            | NonNullable<Item["rarityTags"]>[number]
                            | "") ?? "",
                        )
                      }
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                    >
                      <option value="" className="text-black">
                        Não definida
                      </option>
                      <option value="normal" className="text-black">
                        Normal
                      </option>
                      <option value="rare" className="text-black">
                        Raro
                      </option>
                      <option value="special_edition" className="text-black">
                        Edição especial
                      </option>
                      <option value="highlight" className="text-black">
                        Destaque
                      </option>
                      <option value="repro" className="text-black">
                        Repro
                      </option>
                    </select>
                  </label>
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-3">
                  <label className="block">
                    <span className="mb-2 block text-sm text-white/70">Ano</span>
                    <input
                      value={purchaseYearInput}
                      onChange={(e) => setPurchaseYearInput(e.target.value)}
                      placeholder="2026"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm text-white/70">Mês</span>
                    <input
                      value={purchaseMonthInput}
                      onChange={(e) => setPurchaseMonthInput(e.target.value)}
                      placeholder="04"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm text-white/70">Dia</span>
                    <input
                      value={purchaseDayInput}
                      onChange={(e) => setPurchaseDayInput(e.target.value)}
                      placeholder="11"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                    />
                  </label>
                </div>

                <div className="mt-4 grid gap-4">
                  <label className="block">
                    <span className="mb-2 block text-sm text-white/70">
                      Origem da compra
                    </span>
                    <input
                      value={purchaseOriginInput}
                      onChange={(e) => setPurchaseOriginInput(e.target.value)}
                      placeholder="Ex: Paraguai, Brasil, Presente, Importado"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
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
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <MoneyCard
                  label={isWishlist ? "Valor referência" : "Valor pago"}
                  value={formatCurrency(
                    isWishlist
                      ? undefined
                      : parseOptionalNumber(amountPaidInput),
                  )}
                />
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
