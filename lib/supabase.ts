export type SupabaseSession = {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
};

export type SupabaseUser = {
  id: string;
  email?: string;
  user_metadata?: {
    name?: string;
    full_name?: string;
    [key: string]: unknown;
  };
};

export type PublicProfile = {
  user_id: string;
  friend_code: number;
  is_public: boolean;
  display_name: string | null;
  avatar_url: string | null;
};

export type PublicCollectionItem = {
  id: string;
  type: "console" | "accessory" | "game";
  platform: string;
  title: string;
  subtitle?: string;
  ownershipStatus?: "collection" | "wishlist" | "preorder";
  acquisitionStatus?: "preorder" | "purchased";
  mediaFormats?: string[];
  gameProgressStatus?: string;
  purchasePriority?: string;
  rarityTags?: string[];
  franchise?: string;
  genre?: string;
  imageUrl?: string;
  notes?: string;
  review?: string;
  purchaseOrigin?: string;
  purchaseDate?: { year?: number; month?: number; day?: number };
  releaseDate?: string;
  expectedArrivalDate?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicCollectionEntry = {
  profile_friend_code: number;
  profile_display_name: string | null;
  profile_avatar_url: string | null;
  item: PublicCollectionItem;
};

export type PlatformOrderSlotPreference = {
  slot: 1 | 2 | 3;
  label?: string;
  mode: "alphabetical" | "custom";
  order: string[];
  updated_at: string;
};

export type InternalCatalogEntry = {
  id: string;
  owner_user_id: string;
  kind: "platform" | "accessory";
  name: string;
  version?: string | null;
  release_date?: string | null;
  image_url?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
};

type AuthResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  expires_at?: number;
  token_type?: string;
  user?: SupabaseUser;
};

const SESSION_KEY = "supabase-rest-session";
const USER_KEY = "supabase-rest-user";
const SESSION_COOKIE_KEY = "mgl_session";

const REQUIRED_SUPABASE_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

export function getMissingSupabaseEnvKeys() {
  return REQUIRED_SUPABASE_ENV_KEYS.filter((key) => !process.env[key]);
}

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function saveSession(session: SupabaseSession | null) {
  if (!session) {
    window.localStorage.removeItem(SESSION_KEY);
    window.localStorage.removeItem(USER_KEY);
    const secure = window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `${SESSION_COOKIE_KEY}=; Path=/; Max-Age=0; SameSite=Lax${secure}`;
    return;
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  const payload = encodeURIComponent(JSON.stringify(session));
  document.cookie = `${SESSION_COOKIE_KEY}=${payload}; Path=/; Max-Age=${60 * 60 * 24 * 30}; SameSite=Lax${secure}`;
}

export function loadSession(): SupabaseSession | null {
  try {
    const saved = window.localStorage.getItem(SESSION_KEY);
    if (saved) return JSON.parse(saved) as SupabaseSession;

    const cookieEntry = document.cookie
      .split("; ")
      .find((entry) => entry.startsWith(`${SESSION_COOKIE_KEY}=`));
    if (!cookieEntry) return null;

    const encodedValue = cookieEntry.split("=").slice(1).join("=");
    return JSON.parse(decodeURIComponent(encodedValue)) as SupabaseSession;
  } catch {
    return null;
  }
}

export function saveCachedUser(user: SupabaseUser | null) {
  if (!user) {
    window.localStorage.removeItem(USER_KEY);
    return;
  }
  window.localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function loadCachedUser(): SupabaseUser | null {
  try {
    const saved = window.localStorage.getItem(USER_KEY);
    return saved ? (JSON.parse(saved) as SupabaseUser) : null;
  } catch {
    return null;
  }
}

function buildSession(payload: AuthResponse): SupabaseSession | null {
  if (!payload.access_token) return null;

  return {
    access_token: payload.access_token,
    refresh_token: payload.refresh_token,
    expires_in: payload.expires_in,
    expires_at: payload.expires_at,
    token_type: payload.token_type,
  };
}

export async function sendMagicLink(email: string) {
  const env = getSupabaseEnv();
  if (!env) return { error: "Supabase não configurado." };

  const response = await fetch(`${env.url}/auth/v1/otp`, {
    method: "POST",
    headers: {
      apikey: env.anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      create_user: true,
      email_redirect_to: window.location.origin,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    return { error: body || "Falha ao enviar magic link." };
  }

  return {};
}

export async function signInWithPassword(email: string, password: string) {
  const env = getSupabaseEnv();
  if (!env) return { error: "Supabase não configurado." };

  const response = await fetch(`${env.url}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: env.anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  if (!response.ok) {
    return { error: await response.text() };
  }

  const payload = (await response.json()) as AuthResponse;
  const session = buildSession(payload);

  if (!session) {
    return { error: "Sessão inválida retornada pelo Supabase." };
  }

  return { session, user: payload.user ?? null };
}

export async function signUpWithPassword(email: string, password: string) {
  const env = getSupabaseEnv();
  if (!env) return { error: "Supabase não configurado." };

  const response = await fetch(`${env.url}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: env.anonKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      password,
      email_redirect_to: window.location.origin,
    }),
  });

  if (!response.ok) {
    return { error: await response.text() };
  }

  const payload = (await response.json()) as AuthResponse;
  const session = buildSession(payload);

  return {
    session,
    user: payload.user ?? null,
    needsEmailConfirmation: !session,
  };
}

export function startGoogleSignIn() {
  const env = getSupabaseEnv();
  if (!env) return { error: "Supabase não configurado." };

  const authUrl = new URL(`${env.url}/auth/v1/authorize`);
  authUrl.searchParams.set("provider", "google");
  authUrl.searchParams.set("redirect_to", window.location.origin);

  window.location.assign(authUrl.toString());
  return {};
}

export async function refreshSession(refreshToken: string) {
  const env = getSupabaseEnv();
  if (!env) return { error: "Supabase não configurado." };

  const response = await fetch(
    `${env.url}/auth/v1/token?grant_type=refresh_token`,
    {
      method: "POST",
      headers: {
        apikey: env.anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
  );

  if (!response.ok) {
    return { error: await response.text() };
  }

  const payload = (await response.json()) as AuthResponse;
  const session = buildSession(payload);

  if (!session) {
    return { error: "Sessão inválida ao atualizar token." };
  }

  return { session };
}

export async function signOutSupabase(accessToken: string) {
  const env = getSupabaseEnv();
  if (!env) return;

  await fetch(`${env.url}/auth/v1/logout`, {
    method: "POST",
    headers: {
      apikey: env.anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
}

export async function fetchSupabaseUser(accessToken: string) {
  const env = getSupabaseEnv();
  if (!env) return null;

  const response = await fetch(`${env.url}/auth/v1/user`, {
    headers: {
      apikey: env.anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) return null;
  return (await response.json()) as SupabaseUser;
}

export function extractSessionFromUrlHash(): SupabaseSession | null {
  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  if (!hash) return null;
  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");

  if (!accessToken) return null;

  const expiresIn = params.get("expires_in");
  const expiresAt = params.get("expires_at");

  const session: SupabaseSession = {
    access_token: accessToken,
    refresh_token: params.get("refresh_token") ?? undefined,
    expires_in: expiresIn ? Number(expiresIn) : undefined,
    expires_at: expiresAt ? Number(expiresAt) : undefined,
    token_type: params.get("token_type") ?? undefined,
  };

  window.history.replaceState({}, document.title, window.location.pathname);
  return session;
}

export async function supabaseRestRequest<T>(
  path: string,
  accessToken: string,
  options?: RequestInit,
): Promise<T> {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error("Supabase não configurado");
  }

  const response = await fetch(`${env.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: env.anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  if (response.status === 204) return [] as T;
  return (await response.json()) as T;
}

export async function ensurePublicProfile(
  accessToken: string,
  profileName?: string,
  profileAvatarUrl?: string,
) {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error("Supabase não configurado");
  }

  const response = await fetch(`${env.url}/rest/v1/rpc/ensure_public_profile`, {
    method: "POST",
    headers: {
      apikey: env.anonKey,
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      profile_name: profileName ?? null,
      profile_avatar_url: profileAvatarUrl ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as PublicProfile;
}

export async function fetchPublicCollectionByFriendCode(friendCode: number) {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error("Supabase não configurado");
  }

  const response = await fetch(
    `${env.url}/rest/v1/rpc/get_public_collection_by_friend_code`,
    {
      method: "POST",
      headers: {
        apikey: env.anonKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target_friend_code: friendCode }),
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as PublicCollectionEntry[];
}

export async function setPublicProfileVisibility(
  accessToken: string,
  isPublic: boolean,
) {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error("Supabase não configurado");
  }

  const response = await fetch(
    `${env.url}/rest/v1/rpc/set_public_profile_visibility`,
    {
      method: "POST",
      headers: {
        apikey: env.anonKey,
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target_is_public: isPublic }),
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  return (await response.json()) as PublicProfile;
}

export async function fetchUserPlatformOrderSlots(
  accessToken: string,
  userId: string,
) {
  const rows = await supabaseRestRequest<
    Array<{ platform_order_slots: PlatformOrderSlotPreference[] | null }>
  >(
    `user_preferences?select=platform_order_slots&user_id=eq.${encodeURIComponent(userId)}&limit=1`,
    accessToken,
    { method: "GET" },
  );

  return rows[0]?.platform_order_slots ?? [];
}

export async function saveUserPlatformOrderSlots(
  accessToken: string,
  userId: string,
  slots: PlatformOrderSlotPreference[],
) {
  await supabaseRestRequest(
    "user_preferences?on_conflict=user_id",
    accessToken,
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify([
        {
          user_id: userId,
          platform_order_slots: slots,
        },
      ]),
    },
  );
}

export async function fetchInternalCatalogEntries(
  accessToken: string,
  ownerUserId: string,
  params?: { kind?: "platform" | "accessory"; query?: string; limit?: number },
) {
  const queryParts = [
    "select=id,owner_user_id,kind,name,version,release_date,image_url,metadata,created_at,updated_at",
    `owner_user_id=eq.${encodeURIComponent(ownerUserId)}`,
    "order=updated_at.desc",
    `limit=${Math.min(Math.max(params?.limit ?? 50, 1), 200)}`,
  ];
  if (params?.kind) {
    queryParts.push(`kind=eq.${params.kind}`);
  }
  if (params?.query?.trim()) {
    const normalized = params.query.trim().replace(/[%_]/g, "");
    queryParts.push(`or=(name.ilike.*${encodeURIComponent(normalized)}*,version.ilike.*${encodeURIComponent(normalized)}*)`);
  }

  return await supabaseRestRequest<InternalCatalogEntry[]>(
    `internal_catalog_entries?${queryParts.join("&")}`,
    accessToken,
    { method: "GET" },
  );
}

export async function upsertInternalCatalogEntry(
  accessToken: string,
  entry: Pick<InternalCatalogEntry, "owner_user_id" | "kind" | "name"> &
    Partial<Pick<InternalCatalogEntry, "id" | "version" | "release_date" | "image_url" | "metadata">>,
) {
  const payload = {
    id: entry.id ?? crypto.randomUUID(),
    owner_user_id: entry.owner_user_id,
    kind: entry.kind,
    name: entry.name,
    version: entry.version ?? null,
    release_date: entry.release_date ?? null,
    image_url: entry.image_url ?? null,
    metadata: entry.metadata ?? null,
  };

  const rows = await supabaseRestRequest<InternalCatalogEntry[]>(
    "internal_catalog_entries?on_conflict=id",
    accessToken,
    {
      method: "POST",
      headers: {
        Prefer: "resolution=merge-duplicates,return=representation",
      },
      body: JSON.stringify([payload]),
    },
  );

  return rows[0];
}

type UploadSupabaseImageParams = {
  file: File;
  accessToken: string;
  userId: string;
  itemId?: string;
};

function sanitizeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 80);
}

export async function uploadSupabaseImage({
  file,
  accessToken,
  userId,
  itemId,
}: UploadSupabaseImageParams) {
  const env = getSupabaseEnv();
  if (!env) {
    throw new Error("Supabase não configurado.");
  }

  const bucket =
    process.env.NEXT_PUBLIC_SUPABASE_IMAGES_BUCKET?.trim() || "item-images";
  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const safeName = sanitizeFileName(file.name.replace(/\.[^/.]+$/, ""));
  const targetPath = `${userId}/${itemId ?? "draft"}/${Date.now()}-${safeName}.${extension}`;
  const contentType = file.type || "application/octet-stream";

  const response = await fetch(
    `${env.url}/storage/v1/object/${bucket}/${targetPath}`,
    {
      method: "POST",
      headers: {
        apikey: env.anonKey,
        Authorization: `Bearer ${accessToken}`,
        "x-upsert": "true",
        "Content-Type": contentType,
      },
      body: file,
    },
  );

  if (!response.ok) {
    throw new Error(await response.text());
  }

  const publicUrl = `${env.url}/storage/v1/object/public/${bucket}/${targetPath}`;
  return { publicUrl, path: targetPath, bucket };
}
