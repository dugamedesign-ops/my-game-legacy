"use client";

import { useState } from "react";
import { uploadSupabaseImage } from "@/lib/supabase";
import { Item } from "@/types/collection";
import {
  type ItemPendingField,
  getItemPendingLabel,
  getPendingItems,
} from "@/lib/completion-utils";
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
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<"all" | Item["type"]>("all");
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
    if (platformFilter !== "all" && pending.platform !== platformFilter) {
      return false;
    }
    if (typeFilter !== "all" && originalItem.type !== typeFilter) {
      return false;
    }
    return true;
  });

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
      } else if (field === "mediaFormats") {
        if (draft.multiValue.length > 0) {
          nextItem.mediaFormats = draft.multiValue as NonNullable<Item["mediaFormats"]>;
        }
      }
    }

    onUpdateItem(nextItem);
    setActiveEditors((prev) => ({ ...prev, [item.id]: undefined }));
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
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-xs uppercase tracking-[0.2em] text-white/45">
                    Filtros
                  </span>
                  <select
                    value={platformFilter}
                    onChange={(event) => setPlatformFilter(event.target.value)}
                    className="rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-xs text-white outline-none"
                  >
                    <option value="all">Todas plataformas</option>
                    {availablePlatforms.map((platform) => (
                      <option key={platform} value={platform}>
                        {platform}
                      </option>
                    ))}
                  </select>
                  <select
                    value={typeFilter}
                    onChange={(event) =>
                      setTypeFilter(event.target.value as "all" | Item["type"])
                    }
                    className="rounded-full border border-white/15 bg-black/30 px-3 py-1.5 text-xs text-white outline-none"
                  >
                    <option value="all">Todos tipos</option>
                    <option value="game">Jogos</option>
                    <option value="console">Consoles</option>
                    <option value="accessory">Acessórios</option>
                  </select>
                </div>
                <p className="text-sm font-medium text-white">
                  {filteredPendingInfos.length}{" "}
                  {filteredPendingInfos.length === 1
                    ? "item com pendências"
                    : "itens com pendências"}
                </p>
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
                  const completedDraftCount = Object.keys(
                    activeEditors[pending.itemId]?.values ?? {},
                  ).length;

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
                            {pending.missingFields.map((field) => (
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
                              onClick={() => handleSaveEditor(originalItem)}
                              className="rounded-2xl bg-cyan-300 px-4 py-2 text-sm font-semibold text-black transition hover:bg-cyan-200"
                            >
                              {completedDraftCount > 2 ? "Salvar tudo" : "Salvar"}
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

  if (activeField === "amountPaid" || activeField === "currentValue") {
    return (
      <input
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

  if (activeField === "image") {
    return (
      <div className="space-y-2">
        <input
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
          placeholder="https://..."
          className="w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white outline-none"
        />
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
            {option}
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
