"use client";


import { ChangeEvent, useEffect, useMemo, useState } from "react";

type Game = {
  id: number;
  title: string;
  platformId: number | null;
  image: string;
};

type Platform = {
  id: number;
  name: string;
  label: string;
  color: string;
};

type SearchResult = {
  id: number;
  name: string;
  image: string | null;
  platforms: string[];
  firstReleaseDate: number | null;
};

const initialPlatforms: Platform[] = [
  {
    id: 1,
    name: "Nintendo Switch",
    label: "Switch",
    color: "bg-red-600",
  },
  {
    id: 2,
    name: "Nintendo Switch 2",
    label: "Switch 2",
    color: "bg-red-500",
  },
  {
    id: 3,
    name: "PlayStation 5",
    label: "PS5",
    color: "bg-blue-500",
  },
];

const initialGames: Game[] = [
  {
    id: 1,
    title: "Hades II",
    platformId: 2,
    image: "https://images.igdb.com/igdb/image/upload/t_cover_big/coaknx.jpg",
  },
];

type Section = "collection" | "platforms";

const allowedColors = [
  { value: "bg-red-600", name: "Vermelho forte" },
  { value: "bg-red-500", name: "Vermelho" },
  { value: "bg-blue-700", name: "Azul escuro" },
  { value: "bg-blue-500", name: "Azul" },
  { value: "bg-green-600", name: "Verde" },
  { value: "bg-purple-600", name: "Roxo" },
  { value: "bg-yellow-500", name: "Amarelo" },
  { value: "bg-zinc-600", name: "Cinza" },
];

export default function Home() {
  const [mounted, setMounted] = useState(false);

  const [section, setSection] = useState<Section>("collection");

  const [games, setGames] = useState<Game[]>(initialGames);
  const [platforms, setPlatforms] = useState<Platform[]>(initialPlatforms);

  const [menuOpenId, setMenuOpenId] = useState<number | null>(null);

  const [isAddingGame, setIsAddingGame] = useState(false);
  const [editingGame, setEditingGame] = useState<Game | null>(null);

  const [newTitle, setNewTitle] = useState("");
  const [newPlatformId, setNewPlatformId] = useState<string>("");
  const [newImage, setNewImage] = useState("");

  const [editTitle, setEditTitle] = useState("");
  const [editPlatformId, setEditPlatformId] = useState<string>("");
  const [editImage, setEditImage] = useState("");

  const [addSearchResults, setAddSearchResults] = useState<SearchResult[]>([]);
  const [editSearchResults, setEditSearchResults] = useState<SearchResult[]>([]);
  const [isSearchingAdd, setIsSearchingAdd] = useState(false);
  const [isSearchingEdit, setIsSearchingEdit] = useState(false);

  const [newPlatformName, setNewPlatformName] = useState("");
  const [newPlatformLabel, setNewPlatformLabel] = useState("");
  const [newPlatformColor, setNewPlatformColor] = useState("bg-zinc-600");

  const platformMap = useMemo(() => {
    return new Map(platforms.map((platform) => [platform.id, platform]));
  }, [platforms]);

  const sortedPlatforms = useMemo(() => {
  return [...platforms].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
}, [platforms]);

const groupedGames = useMemo(() => {
  const groups = new Map<
    string,
    {
      platformId: number | null;
      platformName: string;
      platformLabel: string;
      platformColor: string;
      games: Game[];
    }
  >();

  games.forEach((game) => {
    const platform = game.platformId
      ? platformMap.get(game.platformId)
      : null;

    const platformName = platform?.name || "Sem plataforma";
    const platformLabel = platform?.label || "Outro";
    const platformColor = platform?.color || "bg-zinc-600";

    if (!groups.has(platformName)) {
      groups.set(platformName, {
        platformId: game.platformId,
        platformName,
        platformLabel,
        platformColor,
        games: [],
      });
    }

    groups.get(platformName)!.games.push(game);
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      games: group.games.sort((a, b) =>
        a.title.localeCompare(b.title, "pt-BR")
      ),
    }))
    .sort((a, b) =>
      a.platformName.localeCompare(b.platformName, "pt-BR")
    );
}, [games, platformMap]);

  useEffect(() => {
    setMounted(true);

    const savedGames = localStorage.getItem("games");
    const savedPlatforms = localStorage.getItem("platforms");

    if (savedPlatforms) {
      try {
        setPlatforms(JSON.parse(savedPlatforms));
      } catch {}
    }

    if (savedGames) {
      try {
        setGames(JSON.parse(savedGames));
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("games", JSON.stringify(games));
  }, [games, mounted]);

  useEffect(() => {
    if (!mounted) return;
    localStorage.setItem("platforms", JSON.stringify(platforms));
  }, [platforms, mounted]);

  function handleImageUpload(
    event: ChangeEvent<HTMLInputElement>,
    setter: (value: string) => void
  ) {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      if (typeof reader.result === "string") {
        setter(reader.result);
      }
    };

    reader.readAsDataURL(file);
  }

  async function searchGames(query: string, mode: "add" | "edit") {
    if (!query.trim()) return;

    if (mode === "add") {
      setIsSearchingAdd(true);
      setAddSearchResults([]);
    } else {
      setIsSearchingEdit(true);
      setEditSearchResults([]);
    }

    try {
      const response = await fetch(
        `/api/igdb/search?q=${encodeURIComponent(query)}`
      );

      const data = await response.json();

      if (!Array.isArray(data)) {
        if (mode === "add") {
          setAddSearchResults([]);
        } else {
          setEditSearchResults([]);
        }
        return;
      }

      if (mode === "add") {
        setAddSearchResults(data);
      } else {
        setEditSearchResults(data);
      }
    } catch (error) {
      console.error("Erro na busca:", error);
      if (mode === "add") {
        setAddSearchResults([]);
      } else {
        setEditSearchResults([]);
      }
    } finally {
      if (mode === "add") {
        setIsSearchingAdd(false);
      } else {
        setIsSearchingEdit(false);
      }
    }
  }

  function findPlatformIdByName(name: string) {
    const found = platforms.find(
      (platform) => platform.name.toLowerCase() === name.toLowerCase()
    );
    return found ? String(found.id) : "";
  }

  function selectAddGame(result: SearchResult) {
    setNewTitle(result.name);
    setNewImage(result.image || "");

    const matchedPlatformId = result.platforms?.[0]
      ? findPlatformIdByName(result.platforms[0])
      : "";

    setNewPlatformId(matchedPlatformId);
    setAddSearchResults([]);
  }

  function selectEditGame(result: SearchResult) {
    setEditTitle(result.name);
    setEditImage(result.image || "");

    const matchedPlatformId = result.platforms?.[0]
      ? findPlatformIdByName(result.platforms[0])
      : "";

    setEditPlatformId(matchedPlatformId);
    setEditSearchResults([]);
  }

  function addGame() {
    if (!newTitle.trim()) return;

    const newGame: Game = {
      id: Date.now(),
      title: newTitle.trim(),
      platformId: newPlatformId ? Number(newPlatformId) : null,
      image:
        newImage.trim() ||
        "https://via.placeholder.com/300x300?text=Sem+Capa",
    };

    setGames((prev) => [newGame, ...prev]);

    closeAddGameModal();
  }

  function openEdit(game: Game) {
    setEditingGame(game);
    setEditTitle(game.title);
    setEditPlatformId(game.platformId ? String(game.platformId) : "");
    setEditImage(game.image);
    setEditSearchResults([]);
    setMenuOpenId(null);
  }

  function saveEdit() {
    if (!editingGame) return;

    setGames((prev) =>
      prev.map((game) =>
        game.id === editingGame.id
          ? {
              ...game,
              title: editTitle.trim() || game.title,
              platformId: editPlatformId ? Number(editPlatformId) : null,
              image:
                editImage.trim() ||
                "https://via.placeholder.com/300x300?text=Sem+Capa",
            }
          : game
      )
    );

    closeEditGameModal();
  }

  function deleteGame(id: number) {
    setGames((prev) => prev.filter((game) => game.id !== id));
    setMenuOpenId(null);
  }

  function closeAddGameModal() {
    setIsAddingGame(false);
    setNewTitle("");
    setNewPlatformId("");
    setNewImage("");
    setAddSearchResults([]);
  }

  function closeEditGameModal() {
    setEditingGame(null);
    setEditTitle("");
    setEditPlatformId("");
    setEditImage("");
    setEditSearchResults([]);
  }

  function addPlatform() {
    if (!newPlatformName.trim() || !newPlatformLabel.trim()) return;

    const platform: Platform = {
      id: Date.now(),
      name: newPlatformName.trim(),
      label: newPlatformLabel.trim(),
      color: newPlatformColor,
    };

    setPlatforms((prev) => [platform, ...prev]);

    setNewPlatformName("");
    setNewPlatformLabel("");
    setNewPlatformColor("bg-zinc-600");
  }

  function deletePlatform(platformId: number) {
    const isBeingUsed = games.some((game) => game.platformId === platformId);

    if (isBeingUsed) {
      alert("Essa plataforma está sendo usada por um ou mais itens.");
      return;
    }

    setPlatforms((prev) => prev.filter((platform) => platform.id !== platformId));
  }

  function getPlatformData(platformId: number | null) {
    if (!platformId) {
      return {
        name: "Sem plataforma",
        label: "Outro",
        color: "bg-zinc-600",
      };
    }

    return (
      platformMap.get(platformId) || {
        name: "Sem plataforma",
        label: "Outro",
        color: "bg-zinc-600",
      }
    );
  }

  if (!mounted) return null;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="flex min-h-screen">
        <aside className="w-[260px] border-r border-zinc-800 bg-zinc-950 p-6">
          <h1 className="mb-8 text-3xl font-bold">🎮 Coleção</h1>

          <div className="space-y-3">
            <button
              onClick={() => setSection("collection")}
              className={`w-full rounded-2xl px-4 py-3 text-left font-semibold transition ${
                section === "collection"
                  ? "bg-white text-black"
                  : "bg-zinc-900 hover:bg-zinc-800"
              }`}
            >
              Coleção
            </button>

            <button
              onClick={() => setSection("platforms")}
              className={`w-full rounded-2xl px-4 py-3 text-left font-semibold transition ${
                section === "platforms"
                  ? "bg-white text-black"
                  : "bg-zinc-900 hover:bg-zinc-800"
              }`}
            >
              Plataformas
            </button>
          </div>
        </aside>

        <section className="flex-1 p-8">
          {section === "collection" && (
            <>
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <h2 className="text-4xl font-bold">Minha Coleção</h2>
                  <p className="mt-2 text-zinc-400">
                    Cadastre e organize seus jogos.
                  </p>
                </div>

                <button
                  onClick={() => setIsAddingGame(true)}
                  className="rounded-2xl bg-white px-5 py-3 font-semibold text-black hover:opacity-90"
                >
                  + Adicionar jogo
                </button>
              </div>

              <div className="space-y-10">
  {groupedGames.map((group) => (
    <div
      key={group.platformName}
      className="rounded-3xl border border-zinc-800 bg-zinc-950/70 p-6"
    >
      <div className="mb-6 flex items-center gap-3">
        <div className="text-2xl">📁</div>

        <div>
          <h3 className="text-2xl font-bold">{group.platformName}</h3>
          <p className="text-sm text-zinc-400">
            {group.games.length} item(ns)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {group.games.map((game) => {
          const platform = getPlatformData(game.platformId);

          return (
            <div
              key={game.id}
              className="relative"
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuOpenId(game.id);
              }}
            >
              <div className="flex overflow-hidden rounded-3xl bg-zinc-900 shadow-xl">
                <div className="relative flex h-[180px] w-[180px] items-center justify-center bg-zinc-950">
                  <img
                    src={game.image}
                    alt={game.title}
                    className="h-[150px] w-[150px] rounded-xl object-contain"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://via.placeholder.com/300x300?text=Sem+Capa";
                    }}
                  />

                  <div
                    className={`absolute left-3 top-3 rounded-xl px-3 py-1 text-xs font-bold text-white ${platform.color}`}
                  >
                    {platform.label}
                  </div>
                </div>

                <div className="min-w-0 flex-1 p-5">
                  <h2 className="text-[1.9rem] font-bold leading-tight tracking-tight">
                    {game.title}
                  </h2>

                  <p className="mt-4 text-2xl text-zinc-400">
                    {platform.name}
                  </p>
                </div>
              </div>

              {menuOpenId === game.id && (
                <div className="absolute right-3 top-3 z-50 overflow-hidden rounded-2xl border border-zinc-700 bg-zinc-800 shadow-2xl">
                  <button
                    onClick={() => openEdit(game)}
                    className="block w-full px-4 py-3 text-left hover:bg-zinc-700"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => deleteGame(game.id)}
                    className="block w-full px-4 py-3 text-left text-red-400 hover:bg-red-600 hover:text-white"
                  >
                    Deletar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  ))}
</div>
            </>
          )}

          {section === "platforms" && (
            <>
              <div className="mb-8">
                <h2 className="text-4xl font-bold">Plataformas</h2>
                <p className="mt-2 text-zinc-400">
                  Cadastre plataformas para usar no dropdown dos jogos.
                </p>
              </div>

              <div className="mb-8 rounded-3xl border border-zinc-800 bg-zinc-900 p-6">
                <h3 className="mb-5 text-2xl font-bold">Adicionar plataforma</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    type="text"
                    placeholder="Nome completo"
                    value={newPlatformName}
                    onChange={(e) => setNewPlatformName(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-800 px-4 py-3 outline-none"
                  />

                  <input
                    type="text"
                    placeholder="Label curta"
                    value={newPlatformLabel}
                    onChange={(e) => setNewPlatformLabel(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-800 px-4 py-3 outline-none"
                  />
                </div>

                <div className="mt-4 grid gap-4 md:grid-cols-[1fr_auto]">
                  <select
                    value={newPlatformColor}
                    onChange={(e) => setNewPlatformColor(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-800 px-4 py-3 outline-none"
                  >
                    {allowedColors.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.name}
                      </option>
                    ))}
                  </select>

                  <button
                    onClick={addPlatform}
                    className="rounded-2xl bg-white px-5 py-3 font-semibold text-black hover:opacity-90"
                  >
                    Salvar plataforma
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                {sortedPlatforms.map((platform) => (
                  <div
                    key={platform.id}
                    className="flex items-center justify-between rounded-3xl border border-zinc-800 bg-zinc-900 p-5"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`rounded-xl px-3 py-1 text-sm font-bold text-white ${platform.color}`}
                      >
                        {platform.label}
                      </div>

                      <div>
                        <p className="text-xl font-semibold">{platform.name}</p>
                        <p className="text-sm text-zinc-400">
                          Label: {platform.label}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => deletePlatform(platform.id)}
                      className="rounded-2xl bg-red-600 px-4 py-2 font-semibold text-white hover:bg-red-500"
                    >
                      Deletar
                    </button>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      {menuOpenId !== null && (
        <button
          onClick={() => setMenuOpenId(null)}
          className="fixed inset-0 z-40 cursor-default"
          aria-label="Fechar menu"
        />
      )}

      {isAddingGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-zinc-700 bg-zinc-900 p-6">
            <h2 className="mb-5 text-3xl font-bold">Adicionar jogo</h2>

            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <input
                type="text"
                placeholder="Nome do jogo"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full rounded-2xl bg-zinc-800 px-4 py-3 outline-none"
              />

              <button
                onClick={() => searchGames(newTitle, "add")}
                className="rounded-2xl bg-zinc-700 px-5 py-3 font-semibold hover:bg-zinc-600"
              >
                {isSearchingAdd ? "Buscando..." : "Buscar no banco"}
              </button>
            </div>

            {addSearchResults.length > 0 && (
              <div className="mt-4 max-h-72 overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-800">
                {addSearchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => selectAddGame(result)}
                    className="flex w-full items-center gap-3 border-b border-zinc-700 px-4 py-3 text-left last:border-b-0 hover:bg-zinc-700"
                  >
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-zinc-900">
                      {result.image ? (
                        <img
                          src={result.image}
                          alt={result.name}
                          className="h-12 w-12 object-contain"
                        />
                      ) : (
                        <span className="text-xs text-zinc-500">Sem imagem</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold">{result.name}</p>
                      <p className="truncate text-sm text-zinc-400">
                        {result.platforms?.[0] || "Plataforma desconhecida"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <select
  value={newPlatformId}
  onChange={(e) => setNewPlatformId(e.target.value)}
  className="w-full rounded-2xl bg-zinc-800 px-4 py-3 outline-none"
>
  <option value="">Selecione a plataforma</option>
  {sortedPlatforms.map((platform) => (
    <option key={platform.id} value={platform.id}>
      {platform.name}
    </option>
  ))}
</select>
              <input
                type="text"
                placeholder="URL da imagem"
                value={newImage}
                onChange={(e) => setNewImage(e.target.value)}
                className="w-full rounded-2xl bg-zinc-800 px-4 py-3 outline-none"
              />
            </div>

            <div className="mt-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, setNewImage)}
                className="w-full rounded-2xl bg-zinc-800 px-4 py-3 outline-none"
              />
            </div>

            <div className="mt-5 flex items-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-zinc-800">
                {newImage ? (
                  <img
                    src={newImage}
                    alt="Prévia"
                    className="h-20 w-20 object-contain"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://via.placeholder.com/300x300?text=Sem+Capa";
                    }}
                  />
                ) : (
                  <span className="text-xs text-zinc-500">Prévia</span>
                )}
              </div>

              <div className="text-sm text-zinc-400">
                Busque no banco, escolha a plataforma no dropdown, cole a URL ou
                envie uma imagem do PC.
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={addGame}
                className="rounded-2xl bg-white px-5 py-3 font-semibold text-black hover:opacity-90"
              >
                Salvar
              </button>

              <button
                onClick={closeAddGameModal}
                className="rounded-2xl bg-zinc-800 px-5 py-3 font-semibold hover:bg-zinc-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {editingGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-3xl border border-zinc-700 bg-zinc-900 p-6">
            <h2 className="mb-5 text-3xl font-bold">Editar jogo</h2>

            <div className="grid gap-4 md:grid-cols-[1fr_auto]">
              <input
                type="text"
                placeholder="Nome do jogo"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full rounded-2xl bg-zinc-800 px-4 py-3 outline-none"
              />

              <button
                onClick={() => searchGames(editTitle, "edit")}
                className="rounded-2xl bg-zinc-700 px-5 py-3 font-semibold hover:bg-zinc-600"
              >
                {isSearchingEdit ? "Buscando..." : "Buscar no banco"}
              </button>
            </div>

            {editSearchResults.length > 0 && (
              <div className="mt-4 max-h-72 overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-800">
                {editSearchResults.map((result) => (
                  <button
                    key={result.id}
                    onClick={() => selectEditGame(result)}
                    className="flex w-full items-center gap-3 border-b border-zinc-700 px-4 py-3 text-left last:border-b-0 hover:bg-zinc-700"
                  >
                    <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-zinc-900">
                      {result.image ? (
                        <img
                          src={result.image}
                          alt={result.name}
                          className="h-12 w-12 object-contain"
                        />
                      ) : (
                        <span className="text-xs text-zinc-500">Sem imagem</span>
                      )}
                    </div>

                    <div className="min-w-0">
                      <p className="truncate font-semibold">{result.name}</p>
                      <p className="truncate text-sm text-zinc-400">
                        {result.platforms?.[0] || "Plataforma desconhecida"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <select
                value={editPlatformId}
                onChange={(e) => setEditPlatformId(e.target.value)}
                className="w-full rounded-2xl bg-zinc-800 px-4 py-3 outline-none"
              >
                <option value="">Selecione a plataforma</option>
                {sortedPlatforms.map((platform) => (
                  <option key={platform.id} value={platform.id}>
                    {platform.name}
                  </option>
                ))}
              </select>

              <input
                type="text"
                placeholder="URL da imagem"
                value={editImage}
                onChange={(e) => setEditImage(e.target.value)}
                className="w-full rounded-2xl bg-zinc-800 px-4 py-3 outline-none"
              />
            </div>

            <div className="mt-4">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleImageUpload(e, setEditImage)}
                className="w-full rounded-2xl bg-zinc-800 px-4 py-3 outline-none"
              />
            </div>

            <div className="mt-5 flex items-center gap-4">
              <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl bg-zinc-800">
                {editImage ? (
                  <img
                    src={editImage}
                    alt="Prévia"
                    className="h-20 w-20 object-contain"
                    onError={(e) => {
                      e.currentTarget.src =
                        "https://via.placeholder.com/300x300?text=Sem+Capa";
                    }}
                  />
                ) : (
                  <span className="text-xs text-zinc-500">Prévia</span>
                )}
              </div>

              <div className="text-sm text-zinc-400">
                Busque no banco, altere a plataforma no dropdown, cole a URL ou
                envie uma imagem do PC.
              </div>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={saveEdit}
                className="rounded-2xl bg-white px-5 py-3 font-semibold text-black hover:opacity-90"
              >
                Salvar
              </button>

              <button
                onClick={closeEditGameModal}
                className="rounded-2xl bg-zinc-800 px-5 py-3 font-semibold hover:bg-zinc-700"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}