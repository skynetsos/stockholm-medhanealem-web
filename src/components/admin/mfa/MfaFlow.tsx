"use client";

import { Button, useTranslation } from "@payloadcms/ui";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";

import type { AdminTranslationKeys, AdminTranslations } from "../../../i18n/admin";
import { MFA_LANGUAGE_LABELS, type MfaLanguage, mfaAmharic } from "../../../i18n/mfa-am";
import styles from "./MfaFlow.module.css";

type Mode = "enrol" | "verify";
type Setup = { qrDataUrl: string; secret: string };

async function post(path: string, body?: unknown) {
  const res = await fetch(`/api/users/mfa/${path}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: res.ok, data };
}

type MfaKey = keyof AdminTranslations["mfa"];

export function MfaFlow({ mode, language }: { mode: Mode; language: MfaLanguage }) {
  const { t: payloadT } = useTranslation<AdminTranslations, AdminTranslationKeys>();
  /** Amharic from our own list (D-044), else the admin's English text. */
  const t = (key: `mfa:${MfaKey}`, options?: Record<string, unknown>): string => {
    const amharic = language === "am" ? mfaAmharic[key.slice(4) as MfaKey] : undefined;
    return amharic ?? payloadT(key, options);
  };
  const [setup, setSetup] = useState<Setup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const showError = (data: Record<string, unknown>) => {
    const key = `mfa:error_${typeof data.error === "string" ? data.error : "unknown"}` as `mfa:${MfaKey}`;
    const message = t(key);
    setError(message === key ? t("mfa:error_unknown") : message);
  };

  // Setup issues a new pending secret, so it must run exactly once (React may double-run effects in dev).
  const setupStarted = useRef(false);
  useEffect(() => {
    if (mode !== "enrol" || setupStarted.current) return;
    setupStarted.current = true;
    post("setup").then(({ ok, data }) => (ok ? setSetup(data as Setup) : showError(data)));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [mode]);

  // A full page load on purpose: the admin must start over with the new MFA session cookie.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  const goToAdmin = () => window.location.assign("/admin");

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const { ok, data } =
      mode === "enrol"
        ? await post("enroll", { code: code.trim() })
        : await post("verify", useRecovery ? { recoveryCode: code } : { code: code.trim() });
    setBusy(false);
    if (!ok) return showError(data);
    if (mode === "enrol") setRecoveryCodes(data.recoveryCodes as string[]);
    else goToAdmin();
  };

  if (recoveryCodes) {
    return (
      <section className={styles.panel} aria-labelledby="mfa-title" lang={language}>
        <h1 id="mfa-title">{t("mfa:recoveryTitle")}</h1>
        <p>{t("mfa:recoveryIntro")}</p>
        <ol className={styles.codes}>
          {recoveryCodes.map((rc) => (
            <li key={rc}>
              <code>{rc}</code>
            </li>
          ))}
        </ol>
        <label className={styles.check}>
          <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} />
          {t("mfa:recoverySaved")}
        </label>
        <Button disabled={!saved} onClick={goToAdmin}>
          {t("mfa:continue")}
        </Button>
      </section>
    );
  }

  const enrol = mode === "enrol";
  const fieldLabel = useRecovery ? t("mfa:recoveryLabel") : t("mfa:codeLabel");

  return (
    <section className={styles.panel} aria-labelledby="mfa-title" lang={language}>
      <h1 id="mfa-title">{enrol ? t("mfa:enrolTitle") : t("mfa:verifyTitle")}</h1>
      <p>{enrol ? t("mfa:enrolIntro") : t("mfa:verifyIntro")}</p>

      {enrol && !setup && !error && <p>{t("mfa:loading")}</p>}
      {enrol && setup && (
        <div className={styles.setup}>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL QR code */}
          <img src={setup.qrDataUrl} alt={t("mfa:qrAlt")} width={240} height={240} />
          <p>{t("mfa:manualKey")}</p>
          <code className={styles.secret}>{setup.secret}</code>
        </div>
      )}

      {(!enrol || setup) && (
        <form onSubmit={onSubmit} className={styles.form} noValidate>
          <label htmlFor="mfa-code">{fieldLabel}</label>
          <input
            id="mfa-code"
            name="code"
            className={styles.input}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            autoComplete="one-time-code"
            inputMode={useRecovery ? "text" : "numeric"}
            pattern={useRecovery ? undefined : "[0-9]{6}"}
            maxLength={useRecovery ? 11 : 6}
            required
            autoFocus
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "mfa-error" : undefined}
          />
          {error && (
            <p id="mfa-error" role="alert" className={styles.error}>
              {error}
            </p>
          )}
          <Button type="submit" disabled={busy || !code}>
            {enrol ? t("mfa:confirm") : t("mfa:verify")}
          </Button>
        </form>
      )}

      {!enrol && (
        <button
          type="button"
          className={styles.link}
          onClick={() => {
            setUseRecovery(!useRecovery);
            setCode("");
            setError(null);
          }}
        >
          {useRecovery ? t("mfa:useApp") : t("mfa:useRecovery")}
        </button>
      )}
      <Link className={styles.link} href="/admin/logout">
        {t("mfa:signOut")}
      </Link>
      <LanguageSwitch current={language} />
    </section>
  );
}

/** Switches these screens between Amharic and English (a page load keeps the step: the server decides it). */
function LanguageSwitch({ current }: { current: MfaLanguage }) {
  const other: MfaLanguage = current === "am" ? "en" : "am";
  return (
    <p className={styles.link}>
      <a href={`?lang=${other}`} lang={other} hrefLang={other}>
        {MFA_LANGUAGE_LABELS[other]}
      </a>
    </p>
  );
}
