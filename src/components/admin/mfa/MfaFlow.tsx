"use client";

import { Button, useTranslation } from "@payloadcms/ui";
import Link from "next/link";
import { type FormEvent, useEffect, useRef, useState } from "react";

import type { AdminTranslationKeys, AdminTranslations } from "../../../i18n/admin";
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

export function MfaFlow({ mode }: { mode: Mode }) {
  const { t } = useTranslation<AdminTranslations, AdminTranslationKeys>();
  const [setup, setSetup] = useState<Setup | null>(null);
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [useRecovery, setUseRecovery] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

  const showError = (data: Record<string, unknown>) => {
    const key = `mfa:error_${typeof data.error === "string" ? data.error : "unknown"}` as AdminTranslationKeys;
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
      <section className={styles.panel} aria-labelledby="mfa-title">
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
    <section className={styles.panel} aria-labelledby="mfa-title">
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
    </section>
  );
}
