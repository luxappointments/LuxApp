import { NextResponse } from "next/server";
import { z } from "zod";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { getDashboardContext } from "@/lib/server/dashboard-auth";

const createSchema = z.object({
  client_email: z.string().email(),
  note: z.string().min(2).max(500),
  remind_at: z.string().datetime().nullable().optional()
});

export async function POST(req: Request) {
  const { ctx, error, status } = await getDashboardContext(req);
  if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

  const payload = await req.json();
  const parsed = createSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Payload invalido", details: parsed.error.flatten() }, { status: 400 });

  const admin = getAdminSupabase();
  const { error: insertError } = await admin.from("business_client_reminders").insert({
    business_id: ctx.businessId,
    client_email: parsed.data.client_email,
    note: parsed.data.note,
    remind_at: parsed.data.remind_at || null,
    status: "pending",
    created_by: ctx.userId
  });

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 400 });

  return NextResponse.json({ ok: true });
}
