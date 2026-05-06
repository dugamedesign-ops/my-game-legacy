import { createCipheriv, createECDH, createHmac, createPrivateKey, randomBytes, sign } from "crypto";
import type { SupabaseUser } from "@/lib/supabase";
import { getSupabaseEnv } from "@/lib/supabase";

type StoredPushSubscription = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
};

type PushSubscriptionRow = {
  endpoint: string;
  subscription: StoredPushSubscription;
};

export type PushConfig = {
  publicKey: string;
  privateKey: string;
  subject: string;
};

function base64UrlToBuffer(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
  return Buffer.from(`${normalized}${padding}`, "base64");
}

function bufferToBase64Url(value: Buffer) {
  return value
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function hkdfExtract(salt: Buffer, ikm: Buffer) {
  return createHmac("sha256", salt).update(ikm).digest();
}

function hkdfExpand(prk: Buffer, info: Buffer | string, length: number) {
  const infoBuffer = Buffer.isBuffer(info) ? info : Buffer.from(info);
  const buffers: Buffer[] = [];
  let previous = Buffer.alloc(0);
  let counter = 1;

  while (Buffer.concat(buffers).length < length) {
    previous = createHmac("sha256", prk)
      .update(previous)
      .update(infoBuffer)
      .update(Buffer.from([counter]))
      .digest();
    buffers.push(previous);
    counter += 1;
  }

  return Buffer.concat(buffers).subarray(0, length);
}

function getVapidConfig(): PushConfig | null {
  const publicKey =
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY?.trim() ||
    process.env.VAPID_PUBLIC_KEY?.trim();
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim();
  const subject =
    process.env.VAPID_SUBJECT?.trim() ||
    process.env.WEB_PUSH_EMAIL?.trim() ||
    "mailto:admin@my-game-legacy.local";

  if (!publicKey || !privateKey) return null;
  return { publicKey, privateKey, subject };
}

export function getPublicPushConfig() {
  const config = getVapidConfig();
  return {
    enabled: !!config,
    publicKey: config?.publicKey ?? null,
  };
}

export function getServerPushConfig() {
  return getVapidConfig();
}

export function getSupabaseServiceEnv() {
  const env = getSupabaseEnv();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!env || !serviceRoleKey) return null;
  return { ...env, serviceRoleKey };
}

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme?.toLowerCase() !== "bearer" || !token) return null;
  return token;
}

export async function getUserFromRequest(request: Request) {
  const token = getBearerToken(request);
  const env = getSupabaseEnv();
  if (!token || !env) return null;

  const response = await fetch(`${env.url}/auth/v1/user`, {
    headers: {
      apikey: env.anonKey,
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) return null;
  return (await response.json()) as SupabaseUser;
}

export async function upsertPushSubscription(
  userId: string,
  subscription: StoredPushSubscription,
  userAgent?: string | null,
) {
  const env = getSupabaseServiceEnv();
  if (!env) throw new Error("Push remoto não configurado no Supabase.");

  const response = await fetch(
    `${env.url}/rest/v1/push_subscriptions?on_conflict=endpoint`,
    {
      method: "POST",
      headers: {
        apikey: env.serviceRoleKey,
        Authorization: `Bearer ${env.serviceRoleKey}`,
        "Content-Type": "application/json",
        Prefer: "resolution=merge-duplicates,return=minimal",
      },
      body: JSON.stringify([
        {
          user_id: userId,
          endpoint: subscription.endpoint,
          subscription,
          user_agent: userAgent ?? null,
          updated_at: new Date().toISOString(),
        },
      ]),
    },
  );

  if (!response.ok) throw new Error(await response.text());
}

export async function fetchPushSubscriptions(userId: string) {
  const env = getSupabaseServiceEnv();
  if (!env) throw new Error("Push remoto não configurado no Supabase.");

  const response = await fetch(
    `${env.url}/rest/v1/push_subscriptions?select=endpoint,subscription&user_id=eq.${encodeURIComponent(userId)}`,
    {
      headers: {
        apikey: env.serviceRoleKey,
        Authorization: `Bearer ${env.serviceRoleKey}`,
      },
      cache: "no-store",
    },
  );

  if (!response.ok) throw new Error(await response.text());
  return (await response.json()) as PushSubscriptionRow[];
}

export async function deletePushSubscription(endpoint: string) {
  const env = getSupabaseServiceEnv();
  if (!env) return;

  await fetch(
    `${env.url}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`,
    {
      method: "DELETE",
      headers: {
        apikey: env.serviceRoleKey,
        Authorization: `Bearer ${env.serviceRoleKey}`,
      },
    },
  );
}

function createVapidJwt(audience: string, config: PushConfig) {
  const publicKey = base64UrlToBuffer(config.publicKey);
  const privateKey = base64UrlToBuffer(config.privateKey);
  const x = bufferToBase64Url(publicKey.subarray(1, 33));
  const y = bufferToBase64Url(publicKey.subarray(33, 65));
  const d = bufferToBase64Url(privateKey);
  const key = createPrivateKey({
    key: { kty: "EC", crv: "P-256", x, y, d },
    format: "jwk",
  });
  const header = bufferToBase64Url(Buffer.from(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const payload = bufferToBase64Url(
    Buffer.from(
      JSON.stringify({
        aud: audience,
        exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
        sub: config.subject,
      }),
    ),
  );
  const data = `${header}.${payload}`;
  const signature = sign("sha256", Buffer.from(data), {
    key,
    dsaEncoding: "ieee-p1363",
  });

  return `${data}.${bufferToBase64Url(signature)}`;
}

function encryptPushPayload(subscription: StoredPushSubscription, payload: string) {
  const receiverPublicKey = base64UrlToBuffer(subscription.keys.p256dh);
  const authSecret = base64UrlToBuffer(subscription.keys.auth);
  const serverEcdh = createECDH("prime256v1");
  serverEcdh.generateKeys();
  const serverPublicKey = serverEcdh.getPublicKey();
  const sharedSecret = serverEcdh.computeSecret(receiverPublicKey);
  const keyInfo = Buffer.concat([
    Buffer.from("WebPush: info\0"),
    receiverPublicKey,
    serverPublicKey,
  ]);
  const ikm = hkdfExpand(hkdfExtract(authSecret, sharedSecret), keyInfo, 32);
  const salt = randomBytes(16);
  const prk = hkdfExtract(salt, ikm);
  const cek = hkdfExpand(prk, "Content-Encoding: aes128gcm\0", 16);
  const nonce = hkdfExpand(prk, "Content-Encoding: nonce\0", 12);
  const recordSize = 4096;
  const plaintext = Buffer.concat([Buffer.from(payload), Buffer.from([2])]);
  const cipher = createCipheriv("aes-128-gcm", cek, nonce);
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final(), cipher.getAuthTag()]);
  const header = Buffer.alloc(21 + serverPublicKey.length);
  salt.copy(header, 0);
  header.writeUInt32BE(recordSize, 16);
  header.writeUInt8(serverPublicKey.length, 20);
  serverPublicKey.copy(header, 21);

  return Buffer.concat([header, encrypted]);
}

export async function sendWebPushNotification(
  subscription: StoredPushSubscription,
  payload: Record<string, unknown>,
  config: PushConfig,
) {
  const endpointUrl = new URL(subscription.endpoint);
  const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;
  const body = encryptPushPayload(subscription, JSON.stringify(payload));
  const jwt = createVapidJwt(audience, config);

  return await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      TTL: "60",
      Urgency: "normal",
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      Authorization: `vapid t=${jwt}, k=${config.publicKey}`,
    },
    body,
  });
}
