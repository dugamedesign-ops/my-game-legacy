import { NextRequest, NextResponse } from "next/server";

const TWITCH_TOKEN_URL = "https://id.twitch.tv/oauth2/token";
const IGDB_GAMES_URL = "https://api.igdb.com/v4/games";

let cachedAccessToken: string | null = null;
let cachedTokenExpiresAt = 0;

async function getTwitchAccessToken() {
  const clientId = process.env.TWITCH_CLIENT_ID;
  const clientSecret = process.env.TWITCH_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("TWITCH_CLIENT_ID ou TWITCH_CLIENT_SECRET não configurados.");
  }

  const now = Date.now();

  if (cachedAccessToken && now < cachedTokenExpiresAt) {
    return cachedAccessToken;
  }

  const url = new URL(TWITCH_TOKEN_URL);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("client_secret", clientSecret);
  url.searchParams.set("grant_type", "client_credentials");

  const response = await fetch(url.toString(), {
    method: "POST",
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Erro ao gerar token Twitch: ${response.status} - ${text}`);
  }

  const data = (await response.json()) as {
    access_token: string;
    expires_in: number;
  };

  cachedAccessToken = data.access_token;
  cachedTokenExpiresAt = now + (data.expires_in - 60) * 1000;

  return cachedAccessToken;
}

function buildCoverUrl(imageId?: string, size = "t_cover_big") {
  if (!imageId) return null;
  return `https://images.igdb.com/igdb/image/upload/${size}/${imageId}.png`;
}

function escapeIgdbString(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

function buildSearchBody(query: string) {
  const safeQuery = escapeIgdbString(query);

  return `
    fields
      name,
      first_release_date,
      cover.image_id,
      genres.name,
      collections.name,
      franchises.name,
      involved_companies.company.name,
      involved_companies.publisher,
      platforms.name;
    search "${safeQuery}";
    limit 25;
  `;
}

function buildPartialNameSearchBody(query: string) {
  const safeQuery = escapeIgdbString(query);

  return `
    fields
      name,
      first_release_date,
      cover.image_id,
      genres.name,
      collections.name,
      franchises.name,
      involved_companies.company.name,
      involved_companies.publisher,
      platforms.name;
    where name ~ *"${safeQuery}"*;
    limit 25;
  `;
}

type IgdbGame = {
  id: number;
  name?: string;
  first_release_date?: number;
  cover?: {
    image_id?: string;
  };
  genres?: { name?: string }[];
  collections?: { name?: string }[];
  franchises?: { name?: string }[];
  involved_companies?: { company?: { name?: string }; publisher?: boolean }[];
  platforms?: { name?: string }[];
};

function formatReleaseDate(unix?: number) {
  if (!unix) return null;

  const date = new Date(unix * 1000);
  return date.toISOString().split("T")[0];
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as { query?: string };

    const query = body.query?.trim();

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [] });
    }

    const clientId = process.env.TWITCH_CLIENT_ID;
    if (!clientId) {
      return NextResponse.json(
        { error: "TWITCH_CLIENT_ID não configurado." },
        { status: 500 },
      );
    }
    const assuredClientId = clientId;

    const accessToken = await getTwitchAccessToken();

    async function fetchGames(body: string) {
      const response = await fetch(IGDB_GAMES_URL, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Client-ID": assuredClientId,
          Authorization: `Bearer ${accessToken}`,
        },
        body,
        cache: "no-store",
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`Erro IGDB: ${response.status} - ${text}`);
      }

      return (await response.json()) as IgdbGame[];
    }

    const [searchGames, partialNameGames] = await Promise.all([
      fetchGames(buildSearchBody(query)),
      fetchGames(buildPartialNameSearchBody(query)),
    ]);

    const mergedGames = new Map<number, IgdbGame>();
    for (const game of [...searchGames, ...partialNameGames]) {
      mergedGames.set(game.id, game);
    }

    function getPublisherName(game: IgdbGame) {
      const publisher = game.involved_companies?.find((entry) => entry.publisher);
      return publisher?.company?.name || "";
    }

    const results = Array.from(mergedGames.values()).slice(0, 25).map((game) => ({
      id: game.id,
      name: game.name ?? "",
      coverUrl: buildCoverUrl(game.cover?.image_id),
      releaseDate: formatReleaseDate(game.first_release_date),
      franchise:
        game.franchises?.[0]?.name ||
        game.collections?.[0]?.name ||
        "",
      company: game.involved_companies?.[0]?.company?.name || "",
      publisher: getPublisherName(game),
      genre: game.genres?.[0]?.name || "",
      platforms:
        game.platforms?.map((platform) => platform.name).filter(Boolean) ?? [],
    }));

    return NextResponse.json({ results });
  } catch (error) {
    console.error("Erro em /api/igdb/search:", error);

    return NextResponse.json(
      { error: "Falha ao buscar jogos na IGDB." },
      { status: 500 },
    );
  }
}
