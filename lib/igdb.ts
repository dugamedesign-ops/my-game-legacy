export type IgdbSearchResult = {
  id: number;
  name: string;
  coverUrl: string | null;
  releaseDate: string | null;
  franchise: string;
  genre: string;
  platforms: string[];
};

export async function searchIgdbCover(
  gameName: string,
  platform?: string,
): Promise<string | null> {
  const response = await fetch("/api/igdb/cover-search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      gameName,
      platform,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro ao consultar capa na IGDB: ${text}`);
  }

  const data = (await response.json()) as {
    coverUrl: string | null;
  };

  return data.coverUrl;
}

export async function searchIgdbGames(
  query: string,
): Promise<IgdbSearchResult[]> {
  const trimmedQuery = query.trim();
  const fallbackQuery = (() => {
    const parts = trimmedQuery.split(/\s+/).filter(Boolean);
    if (parts.length < 2) return null;
    const lastChunk = parts[parts.length - 1] ?? "";
    if (lastChunk.length > 3) return null;
    const base = parts.slice(0, -1).join(" ").trim();
    return base.length >= 2 ? base : null;
  })();

  const queryList = [trimmedQuery, fallbackQuery].filter(
    (value): value is string => Boolean(value),
  );

  const responses = await Promise.all(
    queryList.map(async (currentQuery) => {
      const response = await fetch("/api/igdb/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: currentQuery }),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erro ao buscar jogos na IGDB: ${text}`);
      }

      const data = (await response.json()) as {
        results: IgdbSearchResult[];
      };

      return data.results ?? [];
    }),
  );

  const merged = new Map<number, IgdbSearchResult>();
  responses.flat().forEach((result) => {
    if (!merged.has(result.id)) {
      merged.set(result.id, result);
    }
  });

  return Array.from(merged.values());
}
