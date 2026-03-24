"use client";

import { useEffect } from "react";
import { clearOrderActivationCookies } from "@/actions/clearOrderActivationCookies";

/**
 * RSC cannot delete cookies; run once on mount after server-rendered “done” states
 * (e.g. order already linked, activate-account handoff complete).
 */
export function ActivationCookieCleanup() {
  useEffect(() => {
    void clearOrderActivationCookies();
  }, []);
  return null;
}
