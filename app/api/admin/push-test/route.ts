import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminContext } from "@/lib/server/admin-auth";
import { sendPushToUser } from "@/lib/notifications/push";

const schema = z.object({
  title: z.string().min(1).optional(),
  body: z.string().min(1).optional()
});

export async function POST(req: Request) {
  const { ctx, error, status } = await getAdminContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const payload = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const title = parsed.data.title || "LuxApp";
  const body = parsed.data.body || "Prueba de notificación push.";

  const result = await sendPushToUser({
    userId: ctx.userId,
    title,
    body
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error || "Push failed" }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
