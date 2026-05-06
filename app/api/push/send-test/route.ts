import {
  deletePushSubscription,
  fetchPushSubscriptions,
  getServerPushConfig,
  getSupabaseServiceEnv,
  getUserFromRequest,
  sendWebPushNotification,
} from "../_utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user?.id) {
    return Response.json({ error: "Não autenticado." }, { status: 401 });
  }

  const pushConfig = getServerPushConfig();
  const supabaseEnv = getSupabaseServiceEnv();

  if (!pushConfig || !supabaseEnv) {
    return Response.json(
      { error: "Push remoto não configurado no servidor." },
      { status: 503 },
    );
  }

  try {
    const rows = await fetchPushSubscriptions(user.id);
    let sent = 0;
    let removed = 0;

    await Promise.all(
      rows.map(async (row) => {
        const response = await sendWebPushNotification(
          row.subscription,
          {
            title: "My Game Legacy",
            body: "Essa é uma notificação remota de teste do seu legado.",
            icon: "/icon.png",
            badge: "/icon.png",
            url: "/",
            tag: "my-game-legacy-remote-test",
          },
          pushConfig,
        );

        if (response.ok) {
          sent += 1;
          return;
        }

        if (response.status === 404 || response.status === 410) {
          removed += 1;
          await deletePushSubscription(row.endpoint);
          return;
        }

        const body = await response.text();
        console.error("Falha ao enviar push:", response.status, body);
      }),
    );

    return Response.json({ ok: true, total: rows.length, sent, removed });
  } catch (error) {
    console.error("Erro ao enviar push remoto:", error);
    return Response.json(
      { error: "Não foi possível enviar a notificação remota." },
      { status: 500 },
    );
  }
}
