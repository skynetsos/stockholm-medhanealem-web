"use client";

import { useEffect, useRef } from "react";

type TurnstileApi = {
  render: (el: HTMLElement, options: Record<string, unknown>) => string;
  reset: (id: string) => void;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
let loading: Promise<void> | null = null;

function loadScript(): Promise<void> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => {
      loading = null;
      reject(new Error("Turnstile could not load"));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/**
 * Cloudflare Turnstile spam check (spec Phase 1 task 6). Nothing loads from Cloudflare until the
 * visitor starts using the form (`active`); the widget then adds its token to the form as the field
 * "cf-turnstile-response". `resetKey` changes after every send, since a token works only once.
 */
export function Turnstile({ siteKey, locale, active, resetKey }: { siteKey: string; locale: string; active: boolean; resetKey: unknown }) {
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);

  useEffect(() => {
    if (!active || widget.current || !container.current) return;
    let cancelled = false;
    loadScript()
      .then(() => {
        if (cancelled || !container.current || !window.turnstile) return;
        widget.current = window.turnstile.render(container.current, {
          sitekey: siteKey,
          language: locale,
          appearance: "interaction-only",
          "refresh-expired": "auto",
        });
      })
      .catch(() => undefined); // the server then reports that the spam check didn't finish
    return () => {
      cancelled = true;
    };
  }, [active, siteKey, locale]);

  useEffect(() => {
    if (widget.current && window.turnstile) window.turnstile.reset(widget.current);
  }, [resetKey]);

  return <div ref={container} className="min-h-0" />;
}
