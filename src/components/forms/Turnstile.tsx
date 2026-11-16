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
          // Turnstile has no Amharic: let it pick from the browser instead of warning (review F-18).
          language: locale === "am" ? "auto" : locale,
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

  // Remove the widget when the form goes away (client navigation), so none is left behind (review F-18).
  useEffect(
    () => () => {
      if (widget.current && window.turnstile) window.turnstile.remove(widget.current);
      widget.current = null;
    },
    [],
  );

  return <div ref={container} className="min-h-0" />;
}
