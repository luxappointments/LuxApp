import { getAdminSupabase } from "@/lib/supabase/admin";

type BusinessNotificationInput = {
  businessId: string;
  appointmentId?: string | null;
  userId?: string | null;
  kind: string;
  payload?: Record<string, unknown>;
};

export async function createBusinessNotification(input: BusinessNotificationInput) {
  const admin = getAdminSupabase();
  const { error } = await admin.from("notifications").insert({
    user_id: input.userId || null,
    business_id: input.businessId,
    appointment_id: input.appointmentId || null,
    kind: input.kind,
    channel: "in_app",
    payload: input.payload || {}
  });

  return { error };
}
