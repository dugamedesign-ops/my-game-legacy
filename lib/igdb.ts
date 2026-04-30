export type IgdbSearchResult = {
  id: number;
  name: string;
  coverUrl: string | null;
  releaseDate: string | null;
  franchise: string;
  company: string;
  publisher: string;
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
  const tokens = trimmedQuery.split(/\s+/).filter(Boolean);
  const withoutPlatformHints = tokens
    .filter((token) => {
      const normalized = token
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
      return ![
        "ps1",
        "ps2",
        "ps3",
        "ps4",
        "ps5",
        "xbox",
        "x360",
        "xone",
        "pc",
        "switch",
        "wii",
        "wiiu",
      ].includes(normalized);
    })
    .join(" ")
    .trim();

  const queryCandidates = [
    trimmedQuery,
    withoutPlatformHints,
    tokens.slice(0, -1).join(" ").trim(),
  ];

  const seenQueries = new Set<string>();
  const queryList = queryCandidates.filter((value): value is string => {
    if (!value || value.length < 2 || seenQueries.has(value)) return false;
    seenQueries.add(value);
    return true;
  });

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

  return Array.from(merged.values()).slice(0, 20);
}
