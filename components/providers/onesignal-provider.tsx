"use client";

import { useEffect, useMemo } from "react";

import { getClientSupabase } from "@/lib/supabase/client";

declare global {
  interface Window {
    OneSignal?: any;
    __onesignalInitialized?: boolean;
  }
}

export function OneSignalProvider() {
  const supabase = useMemo(() => getClientSupabase(), []);

  useEffect(() => {
    const appId = process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID;
    if (!appId || typeof window === "undefined" || !window.OneSignal) return;

    const OneSignal = window.OneSignal;

    if (!window.__onesignalInitialized) {
      OneSignal.init({
        appId,
        allowLocalhostAsSecureOrigin: true
      });
      window.__onesignalInitialized = true;
    }

    OneSignal.isPushNotificationsEnabled?.().then((enabled: boolean) => {
      if (!enabled && OneSignal.showSlidedownPrompt) {
        OneSignal.showSlidedownPrompt();
      }
    });

    const applyUser = (userId?: string | null) => {
      if (!userId) return;
      if (typeof OneSignal.login === "function") {
        OneSignal.login(userId);
      } else if (typeof OneSignal.setExternalUserId === "function") {
        OneSignal.setExternalUserId(userId);
      }
    };

    supabase.auth.getSession().then(({ data }) => applyUser(data.session?.user?.id));

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      applyUser(session?.user?.id);
    });

    return () => {
      sub?.subscription?.unsubscribe();
    };
  }, [supabase]);

  return null;
}
