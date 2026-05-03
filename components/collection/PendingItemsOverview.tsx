"use client";

import { useEffect, useRef, useState } from "react";
import { uploadSupabaseImage } from "@/lib/supabase";
import { Item } from "@/types/collection";
import {
  type ItemPendingField,
  getItemPendingLabel,
  getPendingItems,
} from "@/lib/completion-utils";
import { getNormalizedAcquisitionStatus } from "@/lib/acquisition-utils";
import { useAuth } from "@/providers/AuthProvider";

type PendingItemsOverviewProps = {
  items: Item[];
  onOpenItem: (item: Item) => void;
  onUpdateItem: (item: Item) => void;
  defaultOpen?: boolean;
  hideToggle?: boolean;
};

type PendingEditorState = {
  activeField: ItemPendingField;
  values: Partial<
    Record<
      ItemPendingField,
      {
        textValue: string;
        multiValue: string[];
      }
    >
  >;
};

export function PendingItemsOverview({
  items,
  onOpenItem,
  onUpdateItem,
  defaultOpen = false,
  hideToggle = false,
}: PendingItemsOverviewProps) {
  const { session, user } = useAuth();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<Item["type"][]>([]);
  const [selectedOwnership, setSelectedOwnership] = useState<
    Array<Item["ownershipStatus"] | "purchased">
  >([]);
  const [selectedMissingFields, setSelectedMissingFields] = useState<ItemPendingField[]>([]);
  const [activeEditors, setActiveEditors] = useState<
    Record<string, PendingEditorState | undefined>
  >({});
  const pendingInfos = getPendingItems(items);
  const availablePlatforms = Array.from(
    new Set(pendingInfos.map((pending) => pending.platform)),
  ).sort((a, b) => a.localeCompare(b, "pt-BR"));
  const filteredPendingInfos = pendingInfos.filter((pending) => {
    const originalItem = items.find((item) => item.id === pending.itemId);
    if (!originalItem) return false;
    if (
      selectedPlatforms.length > 0 &&
      !selectedPlatforms.includes(pending.platform)
    ) {
      return false;
    }
    if (selectedTypes.length > 0 && !selectedTypes.includes(originalItem.type)) {
      return false;
    }
    if (selectedOwnership.length > 0) {
      const isPurchased = getNormalizedAcquisitionStatus(originalItem) === "purchased";
      const ownershipMatches = selectedOwnership.some((status) => {
        if (status === "purchased") return isPurchased;
        return originalItem.ownershipStatus === status;
      });
      if (!ownershipMatches) return false;
    }
    if (
      selectedMissingFields.length > 0 &&
      !pending.missingFields.some((field) => selectedMissingFields.includes(field))
    ) {
      return false;
    }
    return true;
  });
  const editingItemIds = Object.entries(activeEditors)
    .filter(([, state]) => state && Object.keys(state.values).length > 0)
    .map(([itemId]) => itemId);
  const hasMultipleItemsReadyToSave = editingItemIds.length > 1;
  const hasActiveFilters =
    selectedPlatforms.length > 0 ||
    selectedTypes.length > 0 ||
    selectedOwnership.length > 0 ||
    selectedMissingFields.length > 0;

  function createFieldDraft(item: Item, field: ItemPendingField) {
    if (field === "amountPaid") {
      return { textValue: item.amountPaid !== undefined ? String(item.amountPaid) : "", multiValue: [] };
    }
    if (field === "currentValue") {
      return { textValue: item.currentValue !== undefined ? String(item.currentValue) : "", multiValue: [] };
    }
    if (field === "purchasePriority") {
      return { textValue: item.purchasePriority ?? "", multiValue: [] };
    }
    if (field === "gameProgressStatus") {
      return { textValue: item.gameProgressStatus ?? "", multiValue: [] };
    }
    if (field === "rarity") {
      return { textValue: item.rarityTags?.[0] ?? "", multiValue: [] };
    }
    if (field === "image") {
      return { textValue: item.imageUrl ?? "", multiValue: [] };
    }
    if (field === "company") {
      return { textValue: item.company ?? "", multiValue: [] };
    }
    return { textValue: "", multiValue: item.mediaFormats ?? [] };
  }

  function handleStartEdit(item: Item, field: ItemPendingField) {
    setActiveEditors((prev) => ({
      ...prev,
      [item.id]: {
        activeField: field,
        values: {
          ...(prev[item.id]?.values ?? {}),
          [field]:
            prev[item.id]?.values?.[field] ?? createFieldDraft(item, field),
        },
      },
    }));
  }

  function handleSaveEditor(item: Item) {
    const editor = activeEditors[item.id];
    if (!editor) return;

    const nextItem: Item = { ...item, updatedAt: new Date().toISOString() };

    for (const [field, draft] of Object.entries(editor.values) as Array<
      [ItemPendingField, { textValue: string; multiValue: string[] }]
    >) {
      if (field === "amountPaid") {
        const value = Number(draft.textValue.replace(",", "."));
        if (Number.isFinite(value)) nextItem.amountPaid = value;
      } else if (field === "currentValue") {
        const value = Number(draft.textValue.replace(",", "."));
        if (Number.isFinite(value)) nextItem.currentValue = value;
      } else if (field === "purchasePriority") {
        if (
          draft.textValue === "low" ||
          draft.textValue === "medium" ||
          draft.textValue === "high" ||
          draft.textValue === "maximum"
        ) {
          nextItem.purchasePriority = draft.textValue;
        }
      } else if (field === "gameProgressStatus") {
        if (
          draft.textValue === "backlog" ||
          draft.textValue === "playing" ||
          draft.textValue === "paused" ||
          draft.textValue === "finished" ||
          draft.textValue === "platinum"
        ) {
          nextItem.gameProgressStatus = draft.textValue;
        }
      } else if (field === "rarity") {
        if (draft.textValue) {
          nextItem.rarityTags = [draft.textValue as NonNullable<Item["rarityTags"]>[number]];
        }
      } else if (field === "image") {
        if (draft.textValue.trim()) nextItem.imageUrl = draft.textValue.trim();
      } else if (field === "company") {
        nextItem.company = draft.textValue.trim() || undefined;
      } else if (field === "mediaFormats") {
        if (draft.multiValue.length > 0) {
          nextItem.mediaFormats = draft.multiValue as NonNullable<Item["mediaFormats"]>;
        }
      }
    }

    onUpdateItem(nextItem);
    setActiveEditors((prev) => ({ ...prev, [item.id]: undefined }));
  }

  function handleSaveAllEditors() {
    const itemMap = new Map(items.map((item) => [item.id, item]));
    const editorsSnapshot = activeEditors;

    for (const [itemId, editor] of Object.entries(editorsSnapshot)) {
      if (!editor || Object.keys(editor.values).length === 0) continue;
      const item = itemMap.get(itemId);
      if (!item) continue;

      const nextItem: Item = { ...item, updatedAt: new Date().toISOString() };
      for (const [field, draft] of Object.entries(editor.values) as Array<
        [ItemPendingField, { textValue: string; multiValue: string[] }]
      >) {
        if (field === "amountPaid") {
          const value = Number(draft.textValue.replace(",", "."));
          if (Number.isFinite(value)) nextItem.amountPaid = value;
        } else if (field === "currentValue") {
          const value = Number(draft.textValue.replace(",", "."));
          if (Number.isFinite(value)) nextItem.currentValue = value;
        } else if (field === "purchasePriority") {
          if (
            draft.textValue === "low" ||
            draft.textValue === "medium" ||
            draft.textValue === "high" ||
            draft.textValue === "maximum"
          ) {
            nextItem.purchasePriority = draft.textValue;
          }
        } else if (field === "gameProgressStatus") {
          if (
            draft.textValue === "backlog" ||
            draft.textValue === "playing" ||
            draft.textValue === "paused" ||
            draft.textValue === "finished" ||
            draft.textValue === "platinum"
          ) {
            nextItem.gameProgressStatus = draft.textValue;
          }
        } else if (field === "rarity") {
          if (draft.textValue) {
            nextItem.rarityTags = [draft.textValue as NonNullable<Item["rarityTags"]>[number]];
          }
        } else if (field === "image") {
          if (draft.textValue.trim()) nextItem.imageUrl = draft.textValue.trim();
        } else if (field === "company") {
          nextItem.company = draft.textValue.trim() || undefined;
        } else if (field === "mediaFormats") {
          if (draft.multiValue.length > 0) {
            nextItem.mediaFormats = draft.multiValue as NonNullable<Item["mediaFormats"]>;
          }
        }
      }
      onUpdateItem(nextItem);
    }

    setActiveEditors((prev) => {
      const next = { ...prev };
      for (const itemId of editingItemIds) {
        next[itemId] = undefined;
      }
      return next;
    });
  }

  function toggleSelection<T extends string>(
    current: T[],
    value: T,
    setter: (next: T[]) => void,
  ) {
    setter(
      current.includes(value)
        ? current.filter((entry) => entry !== value)
        : [...current, value],
    );
  }

  return (
    <section className="mb-8 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-[0_8px_40px_rgb(0,0,0,0.18)]">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.25em] text-white/40">
            Completar depois
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Pendências da coleção
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-white/60">
            Aqui aparecem os itens que ainda não estão completos. A ideia é te
            ajudar a cadastrar rápido primeiro e refinar depois, sem perder o ritmo.
          </p>
        </div>

        {!hideToggle && (
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80 transition hover:bg-white/10"
          >
            {isOpen ? "Fechar" : "Abrir"}
          </button>
        )}
      </div>

      {isOpen && (
        <div className="mt-6 flex flex-col gap-6">
          {pendingInfos.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <p className="text-sm text-white/60">
                Tudo certo por aqui. Seus itens já têm os dados principais preenchidos.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
                <p className="text-sm font-medium text-white">
                  {filteredPendingInfos.length}{" "}
                  {filteredPendingInfos.length === 1
                    ? "item com pendências"
                    : "itens com pendências"}
                </p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm font-medium text-white">Filtros de pendências</p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlatforms([]);
                      setSelectedTypes([]);
                      setSelectedOwnership([]);
                      setSelectedMissingFields([]);
                    }}
                    disabled={!hasActiveFilters}
                    className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/80 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Limpar filtros
                  </button>
                </div>
                <div className="mt-3 grid gap-4 lg:grid-cols-4">
                  <FilterGroup
                    label="Plataformas"
                    options={availablePlatforms.map((platform) => ({
                      value: platform,
                      label: platform,
                    }))}
                    selected={selectedPlatforms}
                    onToggle={(value) =>
                      toggleSelection(selectedPlatforms, value, setSelectedPlatforms)
                    }
                  />
                  <FilterGroup
                    label="Categoria"
                    options={[
                      { value: "game", label: "Jogos" },
                      { value: "console", label: "Consoles" },
                      { value: "accessory", label: "Acessórios" },
                    ]}
                    selected={selectedTypes}
                    onToggle={(value) =>
                      toggleSelection(selectedTypes, value as Item["type"], setSelectedTypes)
                    }
                  />
                  <FilterGroup
                    label="Status"
                    options={[
                      { value: "collection", label: "Na coleção" },
                      { value: "wishlist", label: "Wishlist" },
                      { value: "purchased", label: "Comprado" },
                    ]}
                    selected={selectedOwnership}
                    onToggle={(value) =>
                      toggleSelection(
                        selectedOwnership,
                        value as Item["ownershipStatus"] | "purchased",
                        setSelectedOwnership,
                      )
                    }
                  />
                  <FilterGroup
                    label="Pendência"
                    options={[
                      { value: "image", label: "Imagem" },
                      { value: "amountPaid", label: "Valor pago" },
                      { value: "currentValue", label: "Valor atual" },
                      { value: "purchasePriority", label: "Prioridade" },
                      { value: "gameProgressStatus", label: "Status jogo" },
                      { value: "rarity", label: "Raridade" },
                      { value: "mediaFormats", label: "Mídia" },
                      { value: "company", label: "Empresa" },
                    ]}
                    selected={selectedMissingFields}
                    onToggle={(value) =>
                      toggleSelection(
                        selectedMissingFields,
                        value as ItemPendingField,
                        setSelectedMissingFields,
                      )
                    }
                  />
                </div>
              </div>

              <div className="space-y-3">
                {filteredPendingInfos.length === 0 && (
                  <div className="rounded-3xl border border-dashed border-white/15 bg-black/20 p-4">
                    <p className="text-sm text-white/60">
                      Nenhuma pendência encontrada com os filtros atuais.
                    </p>
                  </div>
                )}
                {filteredPendingInfos.map((pending) => {
                  const originalItem = items.find((item) => item.id === pending.itemId);
                  if (!originalItem) return null;

                  return (
                    <div
                      key={pending.itemId}
                      className="rounded-3xl border border-white/10 bg-black/20 p-4"
                    >
                      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-lg font-semibold text-white">
                              {pending.title}
                            </h3>
                            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70">
                              {pending.platform}
                            </span>
                          </div>

                          {pending.subtitle && (
                            <p className="mt-1 text-sm text-white/55">
                              {pending.subtitle}
                            </p>
                          )}

                          <div className="mt-3 flex flex-wrap gap-2">
                            {(selectedMissingFields.length > 0
                              ? pending.missingFields.filter((field) =>
                                  selectedMissingFields.includes(field),
                                )
                              : pending.missingFields
                            ).map((field) => (
                              <button
                                key={field}
                                type="button"
                                onClick={() => handleStartEdit(originalItem, field)}
                                className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100 transition hover:bg-amber-500/20"
                              >
                                {getItemPendingLabel(field)}
                              </button>
                            ))}
                          </div>

                          {activeEditors[pending.itemId] && (
                            <div className="mt-3 rounded-2xl border border-cyan-400/20 bg-cyan-500/10 p-3">
                              <p className="mb-2 text-xs text-cyan-100/85">
                                Editando: {getItemPendingLabel(activeEditors[pending.itemId]!.activeField)}
                              </p>
                              <p className="mb-2 text-[11px] text-cyan-100/70">
                                {Object.keys(activeEditors[pending.itemId]!.values).length} campo(s)
                                pronto(s) para salvar
                              </p>
                              <PendingInlineEditor
                                item={originalItem}
                                state={activeEditors[pending.itemId]!}
                                accessToken={session?.access_token}
                                userId={user?.id}
                                onChange={(nextState) =>
                                  setActiveEditors((prev) => ({
                                    ...prev,
                                    [pending.itemId]: nextState,
                                  }))
                                }
                              />
                            </div>
                          )}
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          {activeEditors[pending.itemId] ? (
                            <button
                              type="button"
                              onClick={() =>
                                hasMultipleItemsReadyToSave
                                  ? handleSaveAllEditors()
                                  : handleSaveEditor(originalItem)
                              }
                              className="rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-200"
                            >
                              {hasMultipleItemsReadyToSave ? "Salvar tudo" : "Salvar"}
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => onOpenItem(originalItem)}
                              className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                            >
                              Abrir item
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
}

function PendingInlineEditor({
  item,
  state,
  accessToken,
  userId,
  onChange,
}: {
  item: Item;
  state: PendingEditorState;
  accessToken?: string;
  userId?: string;
  onChange: (nextState: PendingEditorState) => void;
}) {
  const activeField = state.activeField;
  const draft = state.values[activeField] ?? { textValue: "", multiValue: [] };
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const textInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (
      activeField === "amountPaid" ||
      activeField === "currentValue" ||
      activeField === "image" ||
      activeField === "company"
    ) {
      textInputRef.current?.focus();
      textInputRef.current?.select();
    }
  }, [activeField]);

  if (activeField === "amountPaid" || activeField === "currentValue") {
    return (
      <input
        ref={textInputRef}
        value={draft.textValue}
        onChange={(event) =>
          onChange({
            ...state,
            values: {
              ...state.values,
              [activeField]: { ...draft, textValue: event.target.value },
            },
          })
        }
        placeholder="Digite o valor (ex: 299.90)"
        className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none"
      />
    );
  }

  if (activeField === "image" || activeField === "company") {
    return (
      <div className="space-y-2">
        <input
          ref={textInputRef}
          value={draft.textValue}
          onChange={(event) =>
            onChange({
              ...state,
              values: {
                ...state.values,
                [activeField]: { ...draft, textValue: event.target.value },
              },
            })
          }
          placeholder={activeField === "image" ? "https://..." : "Digite a empresa"}
          className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none"
        />
        {activeField === "image" && (
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 transition hover:bg-white/10">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={!accessToken || !userId || isUploading}
            onChange={async (event) => {
              const file = event.target.files?.[0];
              event.currentTarget.value = "";
              if (!file) return;
              if (!accessToken || !userId) {
                setUploadError("Faça login para enviar imagem.");
                return;
              }

              setUploadError(null);
              setIsUploading(true);
              try {
                const { publicUrl } = await uploadSupabaseImage({
                  file,
                  accessToken,
                  userId,
                  itemId: item.id,
                });
                onChange({
                  ...state,
                  values: {
                    ...state.values,
                    [activeField]: { ...draft, textValue: publicUrl },
                  },
                });
              } catch (error) {
                setUploadError(
                  error instanceof Error
                    ? error.message
                    : "Não foi possível enviar a imagem.",
                );
              } finally {
                setIsUploading(false);
              }
            }}
          />
          {isUploading ? "Enviando imagem..." : "Enviar do computador"}
        </label>
        )}
        {uploadError && (
          <p className="text-xs text-rose-200/90">{uploadError}</p>
        )}
      </div>
    );
  }

  if (activeField === "purchasePriority") {
    const options: { value: NonNullable<Item["purchasePriority"]>; label: string }[] = [
      { value: "low", label: "Baixa" },
      { value: "medium", label: "Média" },
      { value: "high", label: "Alta" },
      { value: "maximum", label: "Máxima" },
    ];
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() =>
              onChange({
                ...state,
                values: {
                  ...state.values,
                  [activeField]: { ...draft, textValue: option.value },
                },
              })
            }
            className={`rounded-full border px-3 py-1.5 text-xs ${
              draft.textValue === option.value
                ? "border-cyan-300/70 bg-cyan-400/20 text-cyan-100"
                : "border-white/10 bg-black/20 text-white/75"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  if (activeField === "gameProgressStatus") {
    const options: { value: NonNullable<Item["gameProgressStatus"]>; label: string }[] = [
      { value: "backlog", label: "Backlog" },
      { value: "playing", label: "Jogando" },
      { value: "paused", label: "Pausado" },
      { value: "finished", label: "Finalizado" },
      { value: "seeking_platinum", label: "Buscando a Platina" },
      { value: "platinum", label: "Platina" },
    ];
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() =>
              onChange({
                ...state,
                values: {
                  ...state.values,
                  [activeField]: { ...draft, textValue: option.value },
                },
              })
            }
            className={`rounded-full border px-3 py-1.5 text-xs ${
              draft.textValue === option.value
                ? "border-cyan-300/70 bg-cyan-400/20 text-cyan-100"
                : "border-white/10 bg-black/20 text-white/75"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    );
  }

  if (activeField === "rarity") {
    const options: NonNullable<Item["rarityTags"]>[number][] = [
      "normal",
      "rare",
      "special_edition",
      "highlight",
      "repro",
      ...(item.type === "game" ? (["steelbook"] as const) : []),
    ];
    const formatRarityLabel = (value: NonNullable<Item["rarityTags"]>[number]) => {
      if (value === "normal") return "Normal";
      if (value === "rare") return "Raro";
      if (value === "special_edition") return "Edição Especial";
      if (value === "highlight") return "Destaque";
      if (value === "steelbook") return "Steelbook";
      return "Repro";
    };
    return (
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() =>
              onChange({
                ...state,
                values: {
                  ...state.values,
                  [activeField]: { ...draft, textValue: option },
                },
              })
            }
            className={`rounded-full border px-3 py-1.5 text-xs ${
              draft.textValue === option
                ? "border-cyan-300/70 bg-cyan-400/20 text-cyan-100"
                : "border-white/10 bg-black/20 text-white/75"
            }`}
          >
            {formatRarityLabel(option)}
          </button>
        ))}
      </div>
    );
  }

  const mediaOptions: NonNullable<Item["mediaFormats"]>[number][] = ["physical", "digital"];
  return (
    <div className="flex flex-wrap gap-2">
      {mediaOptions.map((option) => {
        const isActive = draft.multiValue.includes(option);
        return (
          <button
            key={option}
            type="button"
            onClick={() =>
              onChange({
                ...state,
                values: {
                  ...state.values,
                  [activeField]: {
                    ...draft,
                    multiValue: isActive
                      ? draft.multiValue.filter((media) => media !== option)
                      : [...draft.multiValue, option],
                  },
                },
              })
            }
            className={`rounded-full border px-3 py-1.5 text-xs ${
              isActive
                ? "border-cyan-300/70 bg-cyan-400/20 text-cyan-100"
                : "border-white/10 bg-black/20 text-white/75"
            }`}
          >
            {option === "physical" ? "Físico" : "Digital"}
          </button>
        );
      })}
    </div>
  );
}

function FilterGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.18em] text-white/45">{label}</p>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isActive = selected.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onToggle(option.value)}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                isActive
                  ? "border-cyan-300/70 bg-cyan-400/15 text-cyan-100"
                  : "border-white/10 bg-black/20 text-white/70 hover:bg-white/10"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
