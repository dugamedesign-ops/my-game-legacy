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
  const response = await fetch("/api/igdb/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro ao buscar jogos na IGDB: ${text}`);
  }

  const data = (await response.json()) as {
    results: IgdbSearchResult[];
  };

  return data.results ?? [];
}