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
