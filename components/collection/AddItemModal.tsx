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

type AddItemModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (item: Item) => void;
  existingItems: Item[];
  initialType?: ItemType | null;
  initialPlatform?: string | null;
};

type FormState = {
  type: ItemType;
  platform: string;
  title: string;
  subtitle: string;
  ownershipStatus: OwnershipStatus;
  physical: boolean;
  digital: boolean;
  imageUrl: string;
  franchise: string;
  genre: string;
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

export function AddItemModal({
  isOpen,
  onClose,
  onSave,
  existingItems,
  initialType = null,
  initialPlatform = null,
}: AddItemModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [isSearchingCover, setIsSearchingCover] = useState(false);
  const [searchResults, setSearchResults] = useState<IgdbSearchResult[]>([]);
  const [isSearchingGames, setIsSearchingGames] = useState(false);
  const [showResults, setShowResults] = useState(false);

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
      physical: false,
      digital: false,
      imageUrl: "",
      franchise: "",
      genre: "",
      releaseDate: "",
    };
  }

  const [form, setForm] = useState<FormState>(
    getInitialForm(initialType, initialPlatform),
  );

  const modalTitle = useMemo(() => {
    if (form.type === "console") return "Novo console";
    if (form.type === "accessory") return "Novo acessório";
    return "Novo jogo";
  }, [form.type]);

  useEffect(() => {
    if (!isOpen) return;

    setForm(getInitialForm(initialType, initialPlatform));
    setSearchResults([]);
    setShowResults(false);

    if (initialType) {
      setStep(2);
    } else {
      setStep(1);
    }
  }, [isOpen, initialType, initialPlatform]);

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
      ownershipStatus: form.ownershipStatus,
      mediaFormats: form.type === "game" ? mediaFormats : undefined,
    });
  }, [
    existingItems,
    form.type,
    form.title,
    form.platform,
    form.ownershipStatus,
    mediaFormats,
  ]);

  if (!isOpen) return null;

  function resetAndClose() {
    setStep(1);
    setSearchResults([]);
    setShowResults(false);
    setForm(getInitialForm(null, null));
    onClose();
  }

  function updateField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function getIsStepOneValid() {
    return !!form.type;
  }

  function getIsFormValid() {
    if (form.type === "console") {
      return !!form.platform.trim() && !!form.subtitle.trim();
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

    return {
      id: crypto.randomUUID(),
      userId: "demo-user",
      type: form.type,
      platform: form.platform.trim(),
      title,
      subtitle,
      ownershipStatus: form.ownershipStatus,
      mediaFormats: form.type === "game" ? mediaFormats : undefined,
      franchise:
        form.type === "game" ? form.franchise.trim() || undefined : undefined,
      genre: form.type === "game" ? form.genre.trim() || undefined : undefined,
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
      releaseDate: result.releaseDate || prev.releaseDate,
      franchise: result.franchise || prev.franchise,
      genre: result.genre || prev.genre,
      platform:
        prev.platform ||
        result.platforms.find((platform) =>
          PLATFORM_OPTIONS.includes(platform),
        ) ||
        prev.platform,
    }));

    setShowResults(false);
  }

  function handleSave() {
    if (!getIsFormValid()) return;

    if (duplicateCheck.exactDuplicates.length > 0) {
      alert(
        "Esse item já existe com a mesma plataforma, mesmo status e mesma mídia. Altere a mídia ou o status para cadastrar uma nova posse.",
      );
      return;
    }

    onSave(buildItem());
    resetAndClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-4xl overflow-hidden rounded-[28px] border border-white/10 bg-[#0b1020] text-white shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
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

        <div className="p-6">
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <p className="mb-3 text-sm text-white/70">
                  Primeiro, escolha o tipo do item:
                </p>

                <div className="grid gap-3 sm:grid-cols-3">
                  <TypeCard
                    title="Console"
                    active={form.type === "console"}
                    onClick={() => updateField("type", "console")}
                  />
                  <TypeCard
                    title="Acessório"
                    active={form.type === "accessory"}
                    onClick={() => updateField("type", "accessory")}
                  />
                  <TypeCard
                    title="Jogo"
                    active={form.type === "game"}
                    onClick={() => updateField("type", "game")}
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
              {form.type === "game" && (
                <div className="relative">
                  <FieldBlock label="Nome do jogo *">
                    <input
                      value={form.title}
                      onChange={(e) => {
                        updateField("title", e.target.value);
                        setShowResults(true);
                      }}
                      placeholder="Digite o nome para buscar sugestões"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                    />
                  </FieldBlock>

                  {showResults && (searchResults.length > 0 || isSearchingGames) && (
                    <div className="absolute z-20 mt-2 max-h-80 w-full overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1326] shadow-2xl">
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
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <FieldBlock label="Plataforma *">
                  <select
                    value={form.platform}
                    onChange={(e) => updateField("platform", e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                  >
                    <option value="">Selecione a plataforma</option>
                    {PLATFORM_OPTIONS.map((platform) => (
                      <option key={platform} value={platform} className="text-black">
                        {platform}
                      </option>
                    ))}
                  </select>
                </FieldBlock>

                <FieldBlock label="Status de posse">
                  <select
                    value={form.ownershipStatus}
                    onChange={(e) =>
                      updateField("ownershipStatus", e.target.value as OwnershipStatus)
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
                </FieldBlock>
              </div>

              {form.type === "console" ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <FieldBlock label="Título do card">
                    <input
                      value={form.platform}
                      disabled
                      className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60 outline-none"
                    />
                  </FieldBlock>

                  <FieldBlock label="Versão *">
                    <input
                      value={form.subtitle}
                      onChange={(e) => updateField("subtitle", e.target.value)}
                      placeholder="Ex: Slim 30 anos"
                      className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
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
              ) : (
                <FieldBlock label="Subtítulo / versão">
                  <input
                    value={form.subtitle}
                    onChange={(e) => updateField("subtitle", e.target.value)}
                    placeholder="Opcional"
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                  />
                </FieldBlock>
              )}

              {form.type === "game" && (
                <>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FieldBlock label="Franquia">
                      <input
                        value={form.franchise}
                        onChange={(e) => updateField("franchise", e.target.value)}
                        placeholder="Ex: Devil May Cry"
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                      />
                    </FieldBlock>

                    <FieldBlock label="Gênero">
                      <input
                        value={form.genre}
                        onChange={(e) => updateField("genre", e.target.value)}
                        placeholder="Ex: Action"
                        className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none placeholder:text-white/35"
                      />
                    </FieldBlock>
                  </div>

                  <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
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
                </>
              )}

              {(form.type === "game" || form.ownershipStatus === "preorder") && (
                <FieldBlock label="Data de lançamento">
                  <input
                    type="date"
                    value={form.releaseDate}
                    onChange={(e) => updateField("releaseDate", e.target.value)}
                    className="w-full rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm text-white outline-none"
                  />
                </FieldBlock>
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

              <div className="flex items-center justify-between gap-3">
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
