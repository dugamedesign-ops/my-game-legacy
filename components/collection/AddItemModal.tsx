"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Item,
  ItemType,
  MediaFormat,
  OwnershipStatus,
} from "@/types/collection";
import {
  searchIgdbCover,
  searchIgdbGames,
  type IgdbSearchResult,
} from "@/lib/igdb";
import {
  checkForDuplicates,
  formatMediaList,
  formatOwnershipLabel,
} from "@/lib/duplicate-utils";
import { CustomSelect, type CustomSelectOption } from "@/components/ui/CustomSelect";

type AddItemModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Item) => void;
  existingItems: Item[];
  initialType?: ItemType | null;
  initialPlatform?: string | null;
  currentUserId?: string | null;
};

type FormState = {
  type: ItemType;
  platform: string;
  title: string;
  subtitle: string;
  ownershipStatus: OwnershipStatus;
  gameProgressStatus: NonNullable<Item["gameProgressStatus"]> | "";
  physical: boolean;
  digital: boolean;
  pricePhysical: string;
  priceDigital: string;
  imageUrl: string;
  franchise: string;
  genrePrimary: string;
  genreSecondary: string;
  releaseDate: string;
};

const PLATFORM_OPTIONS = [
  "PlayStation 5",
  "PlayStation 4",
  "Nintendo Switch",
  "Nintendo Switch 2",
  "PlayStation 3",
  "PlayStation 2",
  "PSP",
  "Nintendo 3DS",
  "Xbox Series X",
  "PC",
];
const NEW_PLATFORM_OPTION = "__new_platform__";
const NEW_GENRE_OPTION = "__new_genre__";
const NEW_FRANCHISE_OPTION = "__new_franchise__";
const IGDB_GENRE_OPTIONS = [
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

export function AddItemModal({
  isOpen,
  onClose,
  onSave,
  existingItems,
  initialType = null,
  initialPlatform = null,
  currentUserId = null,
}: AddItemModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isSearchingCover, setIsSearchingCover] = useState(false);
  const [searchResults, setSearchResults] = useState<IgdbSearchResult[]>([]);
  const [isSearchingGames, setIsSearchingGames] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [isGameSelectionDone, setIsGameSelectionDone] = useState(false);
  const [platformOptions, setPlatformOptions] = useState<string[]>(PLATFORM_OPTIONS);
  const [genreOptions, setGenreOptions] = useState<string[]>(IGDB_GENRE_OPTIONS);
  const [franchiseOptions, setFranchiseOptions] = useState<string[]>([]);

  const skipNextAutoSearchRef = useRef(false);

  function getInitialForm(
    typeOverride?: ItemType | null,
    platformOverride?: string | null,
  ): FormState {
    return {
      type: typeOverride ?? "game",
      platform: platformOverride ?? "",
      title: "",
      subtitle: "",
      ownershipStatus: "collection",
      gameProgressStatus: "",
      physical: false,
      digital: false,
      pricePhysical: "",
      priceDigital: "",
      imageUrl: "",
      franchise: "",
      genrePrimary: "",
      genreSecondary: "",
      releaseDate: "",
    };
  }

  const [form, setForm] = useState<FormState>(
    getInitialForm(initialType, initialPlatform),
  );
  const isGameSearchStep = step === 2 && form.type === "game" && !isGameSelectionDone;
  const gameProgressOptions: CustomSelectOption[] = [
    { value: "", label: "Não definido" },
    { value: "backlog", label: "Backlog" },
    { value: "playing", label: "Jogando" },
    { value: "paused", label: "Pausado" },
    { value: "finished", label: "Terminado" },
    { value: "platinum", label: "Platinado" },
  ];

  const modalTitle = useMemo(() => {
    if (form.type === "console") return "Novo console";
    if (form.type === "accessory") return "Novo acessório";
    return "Novo jogo";
  }, [form.type]);
  const hasContextPlatform = Boolean(initialPlatform?.trim());

  useEffect(() => {
    if (!isOpen) return;

    const customPlatformsRaw =
      typeof window !== "undefined"
        ? window.localStorage.getItem("my-game-legacy-custom-platforms")
        : null;
    let customPlatforms: string[] = [];
    if (customPlatformsRaw) {
      try {
        customPlatforms = JSON.parse(customPlatformsRaw) as string[];
      } catch {
        customPlatforms = [];
      }
    }
    const fromExistingItems = existingItems
      .map((item) => item.platform?.trim())
      .filter(Boolean) as string[];
    const merged = [...new Set([...PLATFORM_OPTIONS, ...fromExistingItems, ...customPlatforms])];
    setPlatformOptions(merged.sort((a, b) => a.localeCompare(b)));
    const customGenresRaw =
      typeof window !== "undefined"
        ? window.localStorage.getItem("my-game-legacy-custom-genres")
        : null;
    let customGenres: string[] = [];
    if (customGenresRaw) {
      try {
        customGenres = JSON.parse(customGenresRaw) as string[];
      } catch {
        customGenres = [];
      }
    }
    const mergedGenres = [...new Set([...IGDB_GENRE_OPTIONS, ...customGenres])].sort((a, b) =>
      a.localeCompare(b),
    );
    setGenreOptions(mergedGenres);
    const customFranchisesRaw =
      typeof window !== "undefined"
        ? window.localStorage.getItem("my-game-legacy-custom-franchises")
        : null;
    let customFranchises: string[] = [];
    if (customFranchisesRaw) {
      try {
        customFranchises = JSON.parse(customFranchisesRaw) as string[];
      } catch {
        customFranchises = [];
      }
    }
    const franchisesFromItems = existingItems
      .map((item) => item.franchise?.trim())
      .filter(Boolean) as string[];
    const mergedFranchises = [...new Set([...franchisesFromItems, ...customFranchises])].sort(
      (a, b) => a.localeCompare(b),
    );
    setFranchiseOptions(mergedFranchises);

    setForm(getInitialForm(initialType, initialPlatform));
    setSearchResults([]);
    setShowResults(false);
    setIsGameSelectionDone(false);

    if (initialType) {
      setStep(2);
    } else {
      setStep(1);
    }
  }, [existingItems, isOpen, initialType, initialPlatform]);

  useEffect(() => {
    if (form.type !== "game") return;
    if (step !== 2) return;

    if (skipNextAutoSearchRef.current) {
      skipNextAutoSearchRef.current = false;
      return;
    }

    const trimmed = form.title.trim();

    if (trimmed.length < 2) {
      setSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setIsSearchingGames(true);
        const results = await searchIgdbGames(trimmed);
        setSearchResults(results);
        setShowResults(true);
      } catch (error) {
        console.error(error);
      } finally {
        setIsSearchingGames(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [form.title, form.type, step]);

  const mediaFormats = useMemo(() => {
    const formats: MediaFormat[] = [];
    if (form.physical) formats.push("physical");
    if (form.digital) formats.push("digital");
    return formats.length > 0 ? formats : undefined;
  }, [form.physical, form.digital]);

  const hasPhysicalSelected = form.physical;
  const hasDigitalSelected = form.digital;
  const hasBothMediaSelected = hasPhysicalSelected && hasDigitalSelected;

  function parseOptionalNumber(value: string): number | undefined {
    const normalized = value.replace(",", ".").trim();
    if (!normalized) return undefined;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  function getConsolidatedAmountPaid() {
    const physicalPrice = parseOptionalNumber(form.pricePhysical);
    const digitalPrice = parseOptionalNumber(form.priceDigital);

    if (hasBothMediaSelected) {
      if (physicalPrice === undefined && digitalPrice === undefined) return undefined;
      return (physicalPrice ?? 0) + (digitalPrice ?? 0);
    }

    if (hasPhysicalSelected) return physicalPrice;
    if (hasDigitalSelected) return digitalPrice;
    return undefined;
  }

  const duplicateCheck = useMemo(() => {
    const isConsole = form.type === "console";
    const comparableTitle = isConsole ? form.platform : form.title;

    if (!comparableTitle.trim() || !form.platform.trim()) {
      return { exactDuplicates: [], relatedItems: [] };
    }

    return checkForDuplicates(existingItems, {
      type: form.type,
      title: comparableTitle,
      platform: form.platform,
      subtitle:
        form.type === "console" || form.type === "accessory"
          ? form.subtitle
          : undefined,
      ownershipStatus: form.ownershipStatus,
      gameProgressStatus:
        form.type === "game" ? form.gameProgressStatus || undefined : undefined,
      mediaFormats: form.type === "game" ? mediaFormats : undefined,
    });
  }, [
    existingItems,
    form.type,
    form.title,
    form.platform,
    form.subtitle,
    form.ownershipStatus,
    form.gameProgressStatus,
    mediaFormats,
  ]);

  function resetAndClose() {
    setStep(1);
    setSearchResults([]);
    setShowResults(false);
    setForm(getInitialForm(null, null));
    onClose();
  }

  useEffect(() => {
    if (!isOpen) return;

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setStep(1);
        setSearchResults([]);
        setShowResults(false);
        setForm(getInitialForm(null, null));
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen) return;

    function isTypingTarget(target: EventTarget | null) {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName.toLowerCase();
      return (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target.isContentEditable
      );
    }

    function handleShortcuts(event: KeyboardEvent) {
      if (!isOpen) return;

      if (step === 1 && !isTypingTarget(event.target)) {
        if (event.key === "1") {
          event.preventDefault();
          event.stopPropagation();
          updateField("type", "game");
          setStep(2);
          return;
        }
        if (event.key === "2") {
          event.preventDefault();
          event.stopPropagation();
          updateField("type", "console");
          setStep(2);
          return;
        }
        if (event.key === "3") {
          event.preventDefault();
          event.stopPropagation();
          updateField("type", "accessory");
          setStep(2);
          return;
        }
      }

      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        if (step === 2 && getIsFormValid()) {
          event.preventDefault();
          event.stopPropagation();
          handleSave();
        }
        return;
      }

      if (event.defaultPrevented) return;
    }

    window.addEventListener("keydown", handleShortcuts, true);
    return () => window.removeEventListener("keydown", handleShortcuts, true);
  }, [isOpen, step, form, duplicateCheck, getIsFormValid, handleSave]);

  if (!isOpen) return null;

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function getIsStepOneValid() {
    return !!form.type;
  }

  function getIsFormValid() {
    if (form.type === "console") {
      return !!form.platform.trim();
    }

    if (form.type === "accessory") {
      return !!form.platform.trim() && !!form.title.trim();
    }

    return !!form.platform.trim() && !!form.title.trim();
  }

  function buildItem(): Item {
    const now = new Date().toISOString();

    const isConsole = form.type === "console";
    const title = isConsole ? form.platform : form.title.trim();
    const subtitle = isConsole
      ? form.subtitle.trim()
      : form.subtitle.trim() || undefined;

    const pricePhysical = parseOptionalNumber(form.pricePhysical);
    const priceDigital = parseOptionalNumber(form.priceDigital);

    return {
      id: crypto.randomUUID(),
      userId: currentUserId ?? "local-user",
      type: form.type,
      platform: form.platform.trim(),
      title,
      subtitle,
      ownershipStatus: form.ownershipStatus,
      gameProgressStatus:
        form.type === "game" ? form.gameProgressStatus || undefined : undefined,
      mediaFormats: form.type === "game" ? mediaFormats : undefined,
      pricePhysical: form.type === "game" && form.physical ? pricePhysical : undefined,
      priceDigital: form.type === "game" && form.digital ? priceDigital : undefined,
      amountPaid:
        form.type === "game" && form.ownershipStatus !== "wishlist"
          ? getConsolidatedAmountPaid()
          : undefined,
      franchise:
        form.type === "game" ? form.franchise.trim() || undefined : undefined,
      genre:
        form.type === "game"
          ? [form.genrePrimary.trim(), form.genreSecondary.trim()]
              .filter(Boolean)
              .join(" / ") || undefined
          : undefined,
      releaseDate:
        form.type === "game" && form.releaseDate
          ? form.releaseDate
          : undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      createdAt: now,
      updatedAt: now,
    };
  }

  async function handleSearchCover() {
  if (form.type !== "game") return;
  if (!form.title.trim()) return;

  setIsSearchingCover(true);

  try {
    const coverUrl = await searchIgdbCover(
      form.title.trim(),
      form.platform.trim(),
    );

    if (coverUrl) {
      updateField("imageUrl", coverUrl);
    } else {
      alert(
        "Não encontrei capa automaticamente. Você pode colar a URL manualmente.",
      );
    }
  } catch (error) {
    console.error(error);
    alert("Não foi possível buscar a capa agora.");
  } finally {
    setIsSearchingCover(false);
  }
  }

  function applySearchResult(result: IgdbSearchResult) {
    skipNextAutoSearchRef.current = true;

    setForm((prev) => ({
      ...prev,
      title: result.name || prev.title,
      imageUrl: result.coverUrl || prev.imageUrl,
      releaseDate: prev.releaseDate || result.releaseDate || prev.releaseDate,
      franchise: result.franchise || prev.franchise,
      genrePrimary: prev.genrePrimary || result.genre || prev.genrePrimary,
      platform:
        prev.platform ||
        result.platforms.find((platform) =>
          PLATFORM_OPTIONS.includes(platform),
        ) ||
        prev.platform,
    }));
    if (result.franchise?.trim()) {
      const normalized = result.franchise.trim();
      setFranchiseOptions((prev) => {
        if (prev.some((option) => option.toLowerCase() === normalized.toLowerCase())) {
          return prev;
        }
        return [...prev, normalized].sort((a, b) => a.localeCompare(b));
      });
    }

    setShowResults(false);
    setIsGameSelectionDone(true);
  }

  function handlePlatformSelect(value: string) {
    if (value !== NEW_PLATFORM_OPTION) {
      updateField("platform", value);
      return;
    }

    const typedName = window.prompt("Digite o nome da nova plataforma:");
    if (!typedName) return;

    const normalized = typedName.trim();
    if (!normalized) return;

    const alreadyExists = platformOptions.some(
      (option) => option.toLowerCase() === normalized.toLowerCase(),
    );

    if (alreadyExists) {
      alert("Essa plataforma já existe na lista.");
      updateField(
        "platform",
        platformOptions.find(
          (option) => option.toLowerCase() === normalized.toLowerCase(),
        ) || "",
      );
      return;
    }

    const updated = [...platformOptions, normalized].sort((a, b) =>
      a.localeCompare(b),
    );
    setPlatformOptions(updated);
    updateField("platform", normalized);
    window.localStorage.setItem(
      "my-game-legacy-custom-platforms",
      JSON.stringify(updated.filter((platform) => !PLATFORM_OPTIONS.includes(platform))),
    );
  }

  function handleGenreSelect(
    field: "genrePrimary" | "genreSecondary",
    value: string,
  ) {
    if (value !== NEW_GENRE_OPTION) {
      updateField(field, value);
      if (field === "genrePrimary" && value === form.genreSecondary) {
        updateField("genreSecondary", "");
      }
      return;
    }

    const typed = window.prompt("Digite o nome do novo gênero:");
    if (!typed) return;
    const normalized = typed.trim();
    if (!normalized) return;

    const exists = genreOptions.some(
      (option) => option.toLowerCase() === normalized.toLowerCase(),
    );
    const finalValue = exists
      ? genreOptions.find(
          (option) => option.toLowerCase() === normalized.toLowerCase(),
        ) ?? normalized
      : normalized;

    if (!exists) {
      const next = [...genreOptions, normalized].sort((a, b) =>
        a.localeCompare(b),
      );
      setGenreOptions(next);
      window.localStorage.setItem(
        "my-game-legacy-custom-genres",
        JSON.stringify(next.filter((genre) => !IGDB_GENRE_OPTIONS.includes(genre))),
      );
    }

    updateField(field, finalValue);
    if (field === "genrePrimary" && finalValue === form.genreSecondary) {
      updateField("genreSecondary", "");
    }
  }

  function handleFranchiseSelect(value: string) {
    if (value === "") {
      updateField("franchise", "");
      return;
    }

    if (value !== NEW_FRANCHISE_OPTION) {
      updateField("franchise", value);
      return;
    }

    const typed = window.prompt("Digite o nome da nova franquia:");
    if (!typed) return;
    const normalized = typed.trim();
    if (!normalized) return;

    const exists = franchiseOptions.some(
      (option) => option.toLowerCase() === normalized.toLowerCase(),
    );
    const finalValue = exists
      ? franchiseOptions.find(
          (option) => option.toLowerCase() === normalized.toLowerCase(),
        ) ?? normalized
      : normalized;

    if (!exists) {
      const next = [...franchiseOptions, normalized].sort((a, b) =>
        a.localeCompare(b),
      );
      setFranchiseOptions(next);
      window.localStorage.setItem("my-game-legacy-custom-franchises", JSON.stringify(next));
    }

    updateField("franchise", finalValue);
  }

  function handleSave() {
    if (!getIsFormValid()) return;

    if (duplicateCheck.exactDuplicates.length > 0) {
      alert(
        "Esse item já existe com a mesma plataforma, status e variação. Para console/acessório, altere a versão/subtítulo para cadastrar outro.",
      );
      return;
    }

    onSave(buildItem());
    resetAndClose();
  }

  const platformSelectOptions: CustomSelectOption[] = [
    { value: "", label: "Selecione a plataforma" },
    ...platformOptions.map((platform) => ({ value: platform, label: platform })),
    { value: NEW_PLATFORM_OPTION, label: "+ Cadastrar nova plataforma" },
  ];
  const franchiseSelectOptions: CustomSelectOption[] = [
    { value: "", label: "Em branco" },
    ...franchiseOptions.map((franchise) => ({ value: franchise, label: franchise })),
    { value: NEW_FRANCHISE_OPTION, label: "+ Cadastrar nova franquia" },
  ];
  const primaryGenreOptions: CustomSelectOption[] = [
    { value: "", label: "Em branco" },
    ...genreOptions.map((genre) => ({ value: genre, label: genre })),
    { value: NEW_GENRE_OPTION, label: "+ Cadastrar novo gênero" },
  ];
  const secondaryGenreOptions: CustomSelectOption[] = [
    { value: "", label: "Em branco" },
    ...genreOptions
      .filter((genre) => genre !== form.genrePrimary)
      .map((genre) => ({ value: genre, label: genre })),
    { value: NEW_GENRE_OPTION, label: "+ Cadastrar novo gênero" },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 px-3 py-4 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:px-4 sm:py-6">
      <div
        className={`mx-auto flex w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1020] text-white shadow-[0_20px_80px_rgba(0,0,0,0.45)] ${
          isGameSearchStep
            ? "max-w-6xl max-h-[calc(100dvh-1.5rem)]"
            : "max-w-4xl max-h-[calc(100dvh-2rem)]"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-white/40">
              Cadastro
            </p>
            <h2 className="mt-1 text-2xl font-semibold">{modalTitle}</h2>
          </div>

          <button
            type="button"
            onClick={resetAndClose}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            Fechar
          </button>
        </div>

        <div className="overflow-y-auto p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <p className="mb-3 text-sm text-white/70">
                  Primeiro, escolha o tipo do item:
                </p>

                <div className="grid gap-3 sm:grid-cols-3">
                  <TypeCard
                    title="1. Jogo"
                    active={form.type === "game"}
                    onClick={() => updateField("type", "game")}
                  />
                  <TypeCard
                    title="2. Console"
                    active={form.type === "console"}
                    onClick={() => updateField("type", "console")}
                  />
                  <TypeCard
                    title="3. Acessório"
                    active={form.type === "accessory"}
                    onClick={() => updateField("type", "accessory")}
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  disabled={!getIsStepOneValid()}
                  onClick={() => setStep(2)}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-5">
              {form.type === "game" && !isGameSelectionDone ? (
                <div className="space-y-4 rounded-3xl border border-white/10 bg-black/20 p-4 sm:p-5">
                  <p className="text-sm text-white/70">
                    Pesquise e selecione seu jogo primeiro para continuar o cadastro.
                  </p>

                  <input
                    value={form.title}
                    onChange={(e) => {
                      updateField("title", e.target.value);
                      setShowResults(true);
                    }}
                    placeholder="Pesquisar por um jogo..."
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                    autoFocus
                  />

                  {showResults && (searchResults.length > 0 || isSearchingGames) && (
                    <div className="max-h-[52dvh] min-h-[240px] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1326] shadow-2xl">
                      {isSearchingGames ? (
                        <div className="px-4 py-3 text-sm text-white/65">
                          Buscando na IGDB...
                        </div>
                      ) : (
                        searchResults.map((result) => (
                          <button
                            key={result.id}
                            type="button"
                            onClick={() => applySearchResult(result)}
                            className="flex w-full items-center gap-3 border-b border-white/5 px-4 py-3 text-left transition hover:bg-white/[0.04]"
                          >
                            <div className="h-16 w-12 overflow-hidden rounded-lg bg-white/5">
                              {result.coverUrl ? (
                                <img
                                  src={result.coverUrl}
                                  alt={result.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : null}
                            </div>

                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-white">
                                {result.name}
                              </p>
                              <p className="mt-1 truncate text-xs text-white/55">
                                {result.platforms.join(" • ") ||
                                  "Plataforma não identificada"}
                              </p>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      type="button"
                      disabled={!form.title.trim()}
                      onClick={() => setIsGameSelectionDone(true)}
                      className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Continuar com esse nome
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {form.type === "game" && (
                    <FieldBlock label="Título do jogo *">
                      <input
                        value={form.title}
                        onChange={(e) => updateField("title", e.target.value)}
                        placeholder="Nome do jogo"
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                      />
                    </FieldBlock>
                  )}

                  {form.type === "game" && (
                    <FieldBlock label="Subtítulo / versão">
                      <input
                        value={form.subtitle}
                        onChange={(e) => updateField("subtitle", e.target.value)}
                        placeholder="Opcional"
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                      />
                    </FieldBlock>
                  )}

              {form.type === "game" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldBlock label="Plataforma *">
                    <CustomSelect
                      value={form.platform}
                      onChange={handlePlatformSelect}
                      options={platformSelectOptions}
                      placeholder="Selecione a plataforma"
                      autoFocus={form.type !== "game" && !hasContextPlatform}
                    />
                  </FieldBlock>

                  <FieldBlock label="Status de posse">
                    <OwnershipStatusButtons
                      value={form.ownershipStatus}
                      onChange={(value) => updateField("ownershipStatus", value)}
                    />
                  </FieldBlock>
                </div>
              ) : (
                <>
                  <FieldBlock label="Plataforma *">
                    <CustomSelect
                      value={form.platform}
                      onChange={handlePlatformSelect}
                      options={platformSelectOptions}
                      placeholder="Selecione a plataforma"
                      autoFocus={!hasContextPlatform}
                    />
                  </FieldBlock>

                  <FieldBlock label="Status de posse">
                    <OwnershipStatusButtons
                      value={form.ownershipStatus}
                      onChange={(value) => updateField("ownershipStatus", value)}
                    />
                  </FieldBlock>
                </>
              )}

              {form.type === "console" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldBlock label="Título do card">
                    <input
                      value={form.platform}
                      disabled
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60 outline-none"
                    />
                  </FieldBlock>

                  <FieldBlock label="Versão">
                    <input
                      value={form.subtitle}
                      onChange={(e) => updateField("subtitle", e.target.value)}
                      placeholder="Ex: Slim 30 anos"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                      autoFocus={hasContextPlatform}
                    />
                  </FieldBlock>
                </div>
              ) : form.type === "accessory" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldBlock label="Nome *">
                    <input
                      value={form.title}
                      onChange={(e) => updateField("title", e.target.value)}
                      placeholder="Ex: DualSense"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                      autoFocus={hasContextPlatform}
                    />
                  </FieldBlock>

                  <FieldBlock label="Subtítulo / versão">
                    <input
                      value={form.subtitle}
                      onChange={(e) => updateField("subtitle", e.target.value)}
                      placeholder="Ex: Helldivers 2"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                    />
                  </FieldBlock>
                </div>
              ) : form.type !== "game" ? (
                <FieldBlock label="Subtítulo / versão">
                  <input
                    value={form.subtitle}
                    onChange={(e) => updateField("subtitle", e.target.value)}
                    placeholder="Opcional"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                  />
                </FieldBlock>
              ) : null}

              {form.type === "game" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 sm:h-full">
                      <p className="mb-3 text-sm font-medium text-white">Mídia</p>

                      <div className="flex flex-wrap gap-3">
                        <ToggleChip
                          label="Física"
                          active={form.physical}
                          onClick={() => updateField("physical", !form.physical)}
                        />
                        <ToggleChip
                          label="Digital"
                          active={form.digital}
                          onClick={() => updateField("digital", !form.digital)}
                        />
                      </div>
                    </div>

                    <FieldBlock label="Status do jogo">
                      <CustomSelect
                        value={form.gameProgressStatus}
                        onChange={(value) =>
                          updateField(
                            "gameProgressStatus",
                            (value as NonNullable<Item["gameProgressStatus"]> | "") ?? "",
                          )
                        }
                        options={gameProgressOptions}
                        placeholder="Não definido"
                      />
                    </FieldBlock>
                  </div>

                  {(hasPhysicalSelected || hasDigitalSelected) && (
                    <div
                      className={`grid gap-4 ${
                        hasBothMediaSelected ? "sm:grid-cols-2" : "sm:grid-cols-1"
                      }`}
                    >
                      {hasPhysicalSelected && (
                        <FieldBlock label="Preço (Físico)">
                          <input
                            value={form.pricePhysical}
                            onChange={(e) => updateField("pricePhysical", e.target.value)}
                            placeholder="Ex: 299.90"
                            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                          />
                        </FieldBlock>
                      )}

                      {hasDigitalSelected && (
                        <FieldBlock label="Preço (Digital)">
                          <input
                            value={form.priceDigital}
                            onChange={(e) => updateField("priceDigital", e.target.value)}
                            placeholder="Ex: 249.90"
                            className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                          />
                        </FieldBlock>
                      )}
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2">
                    <FieldBlock label="Franquia">
                      <CustomSelect
                        value={form.franchise}
                        onChange={handleFranchiseSelect}
                        options={franchiseSelectOptions}
                        placeholder="Em branco"
                      />
                    </FieldBlock>

                    <FieldBlock label="Gênero 1">
                      <CustomSelect
                        value={form.genrePrimary}
                        onChange={(value) => handleGenreSelect("genrePrimary", value)}
                        options={primaryGenreOptions}
                        placeholder="Em branco"
                      />
                    </FieldBlock>
                  </div>
                  {form.genrePrimary && (
                    <FieldBlock label="Gênero 2 (opcional)">
                      <CustomSelect
                        value={form.genreSecondary}
                        onChange={(value) => handleGenreSelect("genreSecondary", value)}
                        options={secondaryGenreOptions}
                        placeholder="Em branco"
                      />
                    </FieldBlock>
                  )}
                </>
              )}

              <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                  <div className="flex-1">
                    <FieldBlock label="URL da imagem / capa">
                      <input
                        value={form.imageUrl}
                        onChange={(e) => updateField("imageUrl", e.target.value)}
                        placeholder="Cole a URL da imagem ou use a busca automática"
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                      />
                    </FieldBlock>
                  </div>

                  {form.type === "game" && (
                    <button
                      type="button"
                      onClick={handleSearchCover}
                      disabled={!form.title.trim() || isSearchingCover}
                      className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSearchingCover ? "Buscando..." : "Buscar capa via IGDB"}
                    </button>
                  )}
                </div>
              </div>

              {(duplicateCheck.exactDuplicates.length > 0 ||
                duplicateCheck.relatedItems.length > 0) && (
                <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm font-medium text-white">
                    Itens relacionados já cadastrados
                  </p>

                  {duplicateCheck.exactDuplicates.length > 0 && (
                    <div className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 p-3">
                      <p className="text-sm text-red-100">
                        Já existe um item igual com a mesma plataforma, mesmo status
                        e mesma mídia.
                      </p>
                    </div>
                  )}

                  {duplicateCheck.relatedItems.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {duplicateCheck.relatedItems.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3"
                        >
                          <p className="text-sm font-medium text-white">
                            {item.title}
                          </p>
                          <p className="mt-1 text-xs text-white/60">
                            {formatOwnershipLabel(item.ownershipStatus)} •{" "}
                            {formatMediaList(item.mediaFormats)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  <p className="mt-3 text-xs text-white/50">
                    Tudo bem ter mais de um cadastro do mesmo jogo quando a mídia
                    ou o status forem diferentes.
                  </p>
                </div>
              )}

              <div className="sticky bottom-0 z-10 flex items-center justify-between gap-3 rounded-2xl bg-[#0b1020]/95 py-2 backdrop-blur">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-white transition hover:bg-white/10"
                >
                  Voltar
                </button>

                <button
                  type="button"
                  onClick={handleSave}
                  disabled={!getIsFormValid()}
                  className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Salvar item
                </button>
              </div>
              </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TypeCard({
  title,
  active,
  onClick,
}: {
  title: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-3xl border p-5 text-left transition ${
        active
          ? "border-cyan-400/30 bg-cyan-500/10"
          : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]"
      }`}
    >
      <h3 className="text-lg font-semibold text-white">{title}</h3>
    </button>
  );
}

function OwnershipStatusButtons({
  value,
  onChange,
}: {
  value: OwnershipStatus;
  onChange: (value: OwnershipStatus) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
      <button
        type="button"
        onClick={() => onChange("collection")}
        className={`rounded-xl border px-3 py-2 text-sm transition ${
          value === "collection"
            ? "border-white/20 bg-white text-black"
            : "border-white/10 bg-black/20 text-white/75 hover:bg-white/10"
        }`}
      >
        Na coleção
      </button>
      <button
        type="button"
        onClick={() => onChange("wishlist")}
        className={`rounded-xl border px-3 py-2 text-sm transition ${
          value === "wishlist"
            ? "border-amber-300 bg-amber-300 text-black"
            : "border-white/10 bg-black/20 text-white/75 hover:bg-white/10"
        }`}
      >
        Wishlist
      </button>
      <button
        type="button"
        onClick={() => onChange("preorder")}
        className={`rounded-xl border px-3 py-2 text-sm transition ${
          value === "preorder"
            ? "border-fuchsia-400 bg-fuchsia-500 text-white"
            : "border-white/10 bg-black/20 text-white/75 hover:bg-white/10"
        }`}
      >
        Pré-venda
      </button>
    </div>
  );
}

function FieldBlock({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-white/70">{label}</span>
      {children}
    </label>
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
