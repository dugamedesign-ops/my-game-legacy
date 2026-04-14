"use client";

import { useState } from "react";
import { Item } from "@/types/collection";
import {
  getItemPendingLabel,
  getPendingItems,
} from "@/lib/completion-utils";

type PendingItemsOverviewProps = {
  items: Item[];
  onOpenItem: (item: Item) => void;
  defaultOpen?: boolean;
  hideToggle?: boolean;
};

export function PendingItemsOverview({
  items,
  onOpenItem,
  defaultOpen = false,
  hideToggle = false,
}: PendingItemsOverviewProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const pendingInfos = getPendingItems(items);

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
                  {pendingInfos.length}{" "}
                  {pendingInfos.length === 1
                    ? "item com pendências"
                    : "itens com pendências"}
                </p>
              </div>

              <div className="space-y-3">
                {pendingInfos.map((pending) => {
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
                            {pending.missingFields.map((field) => (
                              <span
                                key={field}
                                className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1.5 text-xs text-amber-100"
                              >
                                {getItemPendingLabel(field)}
                              </span>
                            ))}
                          </div>
                        </div>

                        <div className="flex shrink-0 items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onOpenItem(originalItem)}
                            className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-black transition hover:bg-white/90"
                          >
                            Abrir item
                          </button>
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
