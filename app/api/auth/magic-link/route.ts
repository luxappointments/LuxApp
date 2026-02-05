import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const schema = z.object({
  email: z.string().email(),
  fullName: z.string().optional(),
  mode: z.enum(["signin", "signup"])
});

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = schema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);

  const origin = new URL(req.url).origin;

  try {
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: {
        emailRedirectTo: `${origin}/auth/signin`,
        data: parsed.data.mode === "signup" && parsed.data.fullName ? { full_name: parsed.data.fullName } : undefined
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } catch (err) {
    return NextResponse.json(
      {
        error: "No se pudo conectar con Supabase. Revisa NEXT_PUBLIC_SUPABASE_URL o tu DNS/red.",
        details: err instanceof Error ? err.message : "unknown_error"
      },
      { status: 400 }
    );
  }

  return NextResponse.json({ ok: true });
}
