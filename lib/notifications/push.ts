type PushInput = {
  userId: string;
  title: string;
  body: string;
  url?: string | null;
  data?: Record<string, unknown>;
};

export async function sendPushToUser(input: PushInput) {
  const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
  const apiKey = process.env.ONESIGNAL_REST_API_KEY;

  if (!appId || !apiKey) {
    return { ok: false, error: "OneSignal env missing" };
  }

  try {
    const res = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${apiKey}`
      },
      body: JSON.stringify({
        app_id: appId,
        include_external_user_ids: [input.userId],
        headings: { en: input.title, es: input.title },
        contents: { en: input.body, es: input.body },
        url: input.url || undefined,
        data: input.data || undefined
      })
    });

    if (!res.ok) {
      const text = await res.text();
      return { ok: false, error: text };
    }

    return { ok: true };
  } catch (error: any) {
    return { ok: false, error: error?.message || "push error" };
  }
}
