"use client";

import { Button, useTranslation } from "@payloadcms/ui";
import { useId, useRef, useState } from "react";

import type { AdminTranslationKeys, AdminTranslations } from "../../../i18n/admin";
import { stockholmDateTimeLabel } from "../../../lib/admin-dates";
import styles from "./Cases.module.css";

type Props = { collection: string; id: string; reference: string; archivedAt: string | null };

/**
 * "Data requests" in the case sidebar (D-036): a download link for the JSON export, and erasure
 * behind a dialog where the reference has to be typed. The page reloads after erasing.
 */
export function DataRequestButtons({ collection, id, reference, archivedAt }: Props) {
  const { t } = useTranslation<AdminTranslations, AdminTranslationKeys>();
  const dialog = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const titleId = useId();
  const inputId = useId();

  async function erase() {
    if (typed.trim() !== reference) return setError(t("cases:eraseMismatch"));
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/${collection}/${id}/erase`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ confirm: typed.trim() }),
      });
      if (res.ok) return window.location.reload();
      setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? res.statusText);
    } catch {
      setError(t("mfa:error_unknown"));
    }
    setPending(false);
  }

  return (
    <section aria-labelledby={`${titleId}-section`} className={styles.actions}>
      <h3 id={`${titleId}-section`} className={styles.actionsTitle}>
        {t("cases:dataRequests")}
      </h3>
      <p className={styles.currentStatus}>{t("cases:dataRequestsHelp")}</p>
      {archivedAt && <p className={styles.currentStatus}>{t("cases:erasedAlready", { date: stockholmDateTimeLabel(archivedAt) })}</p>}
      <div className={styles.buttons}>
        <a href={`/api/${collection}/${id}/export`} download={`${reference}.json`} className="btn btn--style-secondary btn--size-small btn--icon-style-without-border">
          {t("cases:exportJson")}
        </a>
        <Button
          buttonStyle="secondary"
          size="small"
          margin={false}
          onClick={() => {
            setTyped("");
            setError(null);
            dialog.current?.showModal();
          }}
        >
          {t("cases:erase")}
        </Button>
      </div>

      <dialog ref={dialog} aria-labelledby={titleId} className={styles.dialog}>
        <h2 id={titleId}>{t("cases:eraseTitle")}</h2>
        <p>{t("cases:eraseText")}</p>
        <label htmlFor={inputId} className={styles.noteLabel}>
          {t("cases:eraseConfirmLabel", { reference })}
        </label>
        <input
          id={inputId}
          value={typed}
          onChange={(e) => {
            setTyped(e.target.value);
            setError(null);
          }}
          autoComplete="off"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={styles.note}
        />
        {error && (
          <p id={`${inputId}-error`} role="alert" className={styles.error}>
            {error}
          </p>
        )}
        <div className={styles.buttons}>
          <Button buttonStyle="secondary" size="small" margin={false} onClick={() => dialog.current?.close()}>
            {t("cases:cancel")}
          </Button>
          <Button buttonStyle="primary" size="small" margin={false} disabled={pending} onClick={erase}>
            {pending ? t("cases:working") : t("cases:eraseButton")}
          </Button>
        </div>
      </dialog>
    </section>
  );
}
