import { getUserFromRequest, upsertPushSubscription } from "../_utils";

export const dynamic = "force-dynamic";

type SubscribePayload = {
  subscription?: {
    endpoint?: string;
    expirationTime?: number | null;
    keys?: {
      p256dh?: string;
      auth?: string;
    };
  };
};

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user?.id) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const payload = (await request.json()) as SubscribePayload;
  const subscription = payload.subscription;

  if (
    !subscription?.endpoint ||
    !subscription.keys?.p256dh ||
    !subscription.keys.auth
  ) {
    return Response.json({ error: "Assinatura push inválida." }, { status: 400 });
  }

  try {
    await upsertPushSubscription(
      user.id,
      {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ?? null,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      },
      request.headers.get("user-agent"),
    );

    return Response.json({ ok: true });
  } catch (error) {
    console.error("Erro ao salvar assinatura push:", error);
    return Response.json(
      { error: "Não foi possível salvar este dispositivo para push remoto." },
      { status: 500 },
    );
  }
}
