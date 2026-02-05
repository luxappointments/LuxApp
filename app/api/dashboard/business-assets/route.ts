import { NextResponse } from "next/server";
import sharp from "sharp";

import { getAdminSupabase } from "@/lib/supabase/admin";
import { getDashboardContext } from "@/lib/server/dashboard-auth";

export const runtime = "nodejs";

const allowedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const maxSizeBytes = 5 * 1024 * 1024;
const uploadWindowMinutes = 10;
const uploadLimitPerWindow = 10;

function getWindowStart(now: Date) {
  const start = new Date(now);
  const bucket = Math.floor(start.getMinutes() / uploadWindowMinutes) * uploadWindowMinutes;
  start.setMinutes(bucket, 0, 0);
  return start;
}

async function assertUploadRateLimit(userId: string) {
  const admin = getAdminSupabase();
  const now = new Date();
  const windowStart = getWindowStart(now);
  const { data: existing, error } = await admin
    .from("upload_rate_limits")
    .select("id, count")
    .eq("user_id", userId)
    .eq("window_start", windowStart.toISOString())
    .maybeSingle();

  if (error) return { ok: false, error: error.message };

  const nextCount = (existing?.count || 0) + 1;
  if (nextCount > uploadLimitPerWindow) {
    return { ok: false, error: "Demasiados uploads. Intenta de nuevo en unos minutos." };
  }

  const { error: upsertError } = await admin
    .from("upload_rate_limits")
    .upsert(
      {
        id: existing?.id,
        user_id: userId,
        window_start: windowStart.toISOString(),
        count: nextCount
      },
      { onConflict: "user_id,window_start" }
    );

  if (upsertError) return { ok: false, error: upsertError.message };
  return { ok: true };
}

export async function POST(req: Request) {
  try {
    const { ctx, error, status } = await getDashboardContext(req);
    if (!ctx) return NextResponse.json({ error }, { status: status || 400 });

    const formData = await req.formData();
    const kind = formData.get("kind");
    const staffId = formData.get("staffId");
    const serviceId = formData.get("serviceId");
    const file = formData.get("file");

  if (kind !== "logo" && kind !== "cover" && kind !== "staff_avatar" && kind !== "service_image") {
    return NextResponse.json({ error: "kind inválido" }, { status: 400 });
  }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Archivo inválido" }, { status: 400 });
    }
    if (!allowedTypes.has(file.type || "")) {
      return NextResponse.json({ error: "Tipo de archivo no permitido" }, { status: 400 });
    }
    if (file.size > maxSizeBytes) {
      return NextResponse.json({ error: "Archivo supera el tamaño permitido (5MB)" }, { status: 400 });
    }

    const rate = await assertUploadRateLimit(ctx.userId);
    if (!rate.ok) return NextResponse.json({ error: rate.error }, { status: 429 });

    const inputBuffer = Buffer.from(await file.arrayBuffer());
    const processed = await sharp(inputBuffer)
      .rotate()
      .resize({ width: 1600, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();

    const ext = "webp";
  const path =
    kind === "staff_avatar"
      ? `${ctx.businessId}/staff/${String(staffId || "unknown")}-${Date.now()}.${ext}`
      : kind === "service_image"
        ? `${ctx.businessId}/services/${String(serviceId || "unknown")}-${Date.now()}.${ext}`
        : `${ctx.businessId}/${kind}-${Date.now()}.${ext}`;

    const admin = getAdminSupabase();
    const { error: uploadError } = await admin.storage.from("business-assets").upload(path, processed, {
      cacheControl: "3600",
      upsert: true,
      contentType: "image/webp"
    });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 400 });
    }

    const { data: publicData } = admin.storage.from("business-assets").getPublicUrl(path);
    const publicUrl = publicData.publicUrl;

  const updateField = kind === "logo" ? { logo_url: publicUrl } : { cover_url: publicUrl };
  const updateResponse =
    kind === "staff_avatar"
      ? await admin
          .from("staff_profiles")
          .update({ avatar_url: publicUrl })
          .eq("id", String(staffId || ""))
          .eq("business_id", ctx.businessId)
      : kind === "service_image"
        ? await admin
            .from("services")
            .update({ image_url: publicUrl })
            .eq("id", String(serviceId || ""))
            .eq("business_id", ctx.businessId)
        : await admin.from("businesses").update(updateField).eq("id", ctx.businessId);
  const updateError = updateResponse.error;

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 400 });
    }

    return NextResponse.json({ url: publicUrl, kind });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Upload abortado o falló en runtime." },
      { status: 500 }
    );
  }
}
