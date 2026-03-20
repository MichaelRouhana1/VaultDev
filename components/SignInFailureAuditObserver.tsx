"use client";

import { useEffect, useRef } from "react";

/**
 * Observes Clerk sign-in UI for visible [role="alert"] messages and reports them once per distinct text
 * to the rate-limited audit API (FAILED_LOGIN). Heuristic — Clerk DOM may change between versions.
 */
export function SignInFailureAuditObserver() {
  const lastLogged = useRef<string | null>(null);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const report = (text: string) => {
      if (text.length < 2 || text === lastLogged.current) return;
      lastLogged.current = text;
      void fetch("/api/audit/sign-in-failure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.slice(0, 500) }),
      });
      setTimeout(() => {
        if (lastLogged.current === text) lastLogged.current = null;
      }, 120_000);
    };

    const scan = () => {
      const alerts = document.querySelectorAll('[role="alert"]');
      for (const el of alerts) {
        const t = el.textContent?.trim();
        if (t && t.length > 2) {
          if (debounce.current) clearTimeout(debounce.current);
          debounce.current = setTimeout(() => report(t), 400);
          break;
        }
      }
    };

    const obs = new MutationObserver(() => scan());
    obs.observe(document.body, { subtree: true, childList: true, characterData: true });
    scan();
    return () => {
      obs.disconnect();
      if (debounce.current) clearTimeout(debounce.current);
    };
  }, []);

  return null;
}
