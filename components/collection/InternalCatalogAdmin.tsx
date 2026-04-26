"use client";

import { useEffect, useMemo, useState } from "react";
import {
  fetchInternalCatalogEntries,
  upsertInternalCatalogEntry,
  type InternalCatalogEntry,
} from "@/lib/supabase";

type Props = {
  accessToken: string;
  userId: string;
};

export function InternalCatalogAdmin({ accessToken, userId }: Props) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<"platform" | "accessory">("platform");
  const [entries, setEntries] = useState<InternalCatalogEntry[]>([]);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function loadEntries() {
    const rows = await fetchInternalCatalogEntries(accessToken, userId, {
      kind,
      query,
      limit: 50,
    });
    setEntries(rows);
  }

  useEffect(() => {
    void loadEntries();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind]);

  const filtered = useMemo(() => {
    if (!query.trim()) return entries;
    const normalized = query.trim().toLowerCase();
    return entries.filter((entry) =>
      `${entry.name} ${entry.version ?? ""}`.toLowerCase().includes(normalized),
    );
  }, [entries, query]);

  async function handleSave() {
    if (!name.trim()) return;
    setIsSaving(true);
    try {
      await upsertInternalCatalogEntry(accessToken, {
        owner_user_id: userId,
        kind,
        name: name.trim(),
        version: version.trim() || undefined,
        release_date: releaseDate.trim() || undefined,
        image_url: imageUrl.trim() || undefined,
      });
      setName("");
      setVersion("");
      setReleaseDate("");
      setImageUrl("");
      await loadEntries();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-white">Banco interno (admin)</h3>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "platform" | "accessory")}
          className="rounded-lg border border-white/15 bg-black/30 px-2 py-1 text-xs text-white"
        >
          <option value="platform">Plataformas</option>
          <option value="accessory">Acessórios</option>
        </select>
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome"
          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
        />
        <input
          value={version}
          onChange={(e) => setVersion(e.target.value)}
          placeholder="Versão"
          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
        />
        <input
          value={releaseDate}
          onChange={(e) => setReleaseDate(e.target.value)}
          placeholder="Data de lançamento (YYYY-MM-DD)"
          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
        />
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="URL da imagem"
          className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
        />
      </div>

      <div className="mt-2 flex gap-2">
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={isSaving || !name.trim()}
          className="rounded-lg border border-cyan-300/25 bg-cyan-500/10 px-3 py-1.5 text-xs text-cyan-100 disabled:opacity-40"
        >
          {isSaving ? "Salvando..." : "Salvar no banco interno"}
        </button>
        <button
          type="button"
          onClick={() => void loadEntries()}
          className="rounded-lg border border-white/15 bg-black/20 px-3 py-1.5 text-xs text-white/80"
        >
          Atualizar lista
        </button>
      </div>

      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar por nome/versão"
        className="mt-3 w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-white"
      />

      <div className="mt-3 max-h-52 space-y-1 overflow-auto pr-1 text-xs text-white/80">
        {filtered.map((entry) => (
          <div key={entry.id} className="rounded-md border border-white/10 bg-black/20 px-2 py-1.5">
            <p className="font-medium text-white">{entry.name}</p>
            <p className="text-white/60">{entry.version || "Sem versão"}</p>
            <p className="text-white/50">{entry.release_date || "Sem data"}</p>
          </div>
        ))}
        {filtered.length === 0 && <p className="text-white/50">Nenhum item encontrado.</p>}
      </div>
    </section>
  );
}
