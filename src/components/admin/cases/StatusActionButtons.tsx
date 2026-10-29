"use client";

import { Button, useFormModified, useTranslation } from "@payloadcms/ui";
import { useId, useRef, useState } from "react";

import type { AdminTranslationKeys, AdminTranslations } from "../../../i18n/admin";
import { ethiopianDateLabel, stockholmDateTimeLabel } from "../../../lib/admin-dates";
import type { BaptismStatus } from "../../../lib/baptism/state";
import { TRANSITION_NOTE_MAX } from "../../../lib/baptism/transition-limits";
import styles from "./Cases.module.css";

type Props = { id: string; status: BaptismStatus; transitions: BaptismStatus[]; final: boolean; scheduledDate: string | null };

/** Both email the applicant, so they ask first (D-032). */
const NEEDS_CONFIRMATION: BaptismStatus[] = ["confirmed", "declined"];

/**
 * Status buttons on the case page (spec Phase 2 task 6). Each posts to /api/baptism-requests/:id/status
 * and reloads the page, so the form never holds a stale status. "Confirm" and "Decline" open a
 * dialog first; declining needs an internal note.
 */
export function StatusActionButtons({ id, status, transitions, final, scheduledDate }: Props) {
  const { t } = useTranslation<AdminTranslations, AdminTranslationKeys>();
  const modified = useFormModified();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogFor, setDialogFor] = useState<BaptismStatus | null>(null);
  const [note, setNote] = useState("");
  const [noteError, setNoteError] = useState<string | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const noteId = useId();

  const label = (to: BaptismStatus): string => (status === "confirmed" && to === "scheduling" ? t("cases:action_reschedule") : t(`cases:action_${to}` as AdminTranslationKeys));

  async function send(to: BaptismStatus, withNote?: string) {
    setPending(true);
    setError(null);
    try {
      const res = await fetch(`/api/baptism-requests/${id}/status`, {
        method: "POST",
        credentials: "include",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to, note: withNote }),
      });
      if (res.ok) return window.location.reload();
      setError(((await res.json().catch(() => ({}))) as { error?: string }).error ?? res.statusText);
    } catch {
      setError(t("mfa:error_unknown"));
    }
    setPending(false);
  }

  function choose(to: BaptismStatus) {
    if (modified) return setError(t("cases:saveFirst"));
    if (!NEEDS_CONFIRMATION.includes(to)) return send(to);
    setDialogFor(to);
    setNote("");
    setNoteError(null);
    dialog.current?.showModal();
  }

  function closeDialog() {
    dialog.current?.close();
    setDialogFor(null);
  }

  async function confirmDialog() {
    if (dialogFor === "declined" && !note.trim()) return setNoteError(t("cases:declineNoteRequired"));
    const to = dialogFor!;
    closeDialog();
    await send(to, dialogFor === "declined" ? note.trim() : undefined);
  }

  return (
    <div className={styles.actions}>
      <p className={styles.currentStatus}>
        {t("cases:currentStatus")}: <strong>{t(`cases:status_${status}` as AdminTranslationKeys)}</strong>
      </p>
      <h3 className={styles.actionsTitle}>{t("cases:nextSteps")}</h3>
      {transitions.length ? (
        <div className={styles.buttons}>
          {transitions.map((to) => (
            <Button key={to} buttonStyle={to === "declined" ? "secondary" : "primary"} size="small" disabled={pending} onClick={() => choose(to)} margin={false}>
              {label(to)}
            </Button>
          ))}
        </div>
      ) : (
        <p>{final ? t("cases:noNextSteps") : t("cases:noNextStepsForRole")}</p>
      )}
      {pending && <p aria-live="polite">{t("cases:working")}</p>}
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}

      <dialog ref={dialog} aria-labelledby={titleId} className={styles.dialog} onClose={() => setDialogFor(null)}>
        {dialogFor === "confirmed" && (
          <>
            <h2 id={titleId}>{t("cases:confirmTitle")}</h2>
            {scheduledDate ? (
              <p>{t("cases:confirmText", { date: `${stockholmDateTimeLabel(scheduledDate)} · ${ethiopianDateLabel(scheduledDate)}` })}</p>
            ) : (
              <p>{t("cases:confirmNoDate")}</p>
            )}
          </>
        )}
        {dialogFor === "declined" && (
          <>
            <h2 id={titleId}>{t("cases:declineTitle")}</h2>
            <p>{t("cases:declineText")}</p>
            <label htmlFor={noteId} className={styles.noteLabel}>
              {t("cases:declineNote")}
            </label>
            <textarea
              id={noteId}
              value={note}
              onChange={(e) => {
                setNote(e.target.value);
                setNoteError(null);
              }}
              rows={4}
              maxLength={TRANSITION_NOTE_MAX}
              required
              aria-invalid={noteError ? true : undefined}
              aria-describedby={noteError ? `${noteId}-error` : undefined}
              className={styles.note}
            />
            {noteError && (
              <p id={`${noteId}-error`} role="alert" className={styles.error}>
                {noteError}
              </p>
            )}
          </>
        )}
        <div className={styles.buttons}>
          <Button buttonStyle="secondary" size="small" onClick={closeDialog} margin={false}>
            {t("cases:cancel")}
          </Button>
          {(dialogFor === "declined" || scheduledDate) && (
            <Button buttonStyle="primary" size="small" onClick={confirmDialog} margin={false}>
              {dialogFor === "declined" ? t("cases:declineButton") : t("cases:confirmButton")}
            </Button>
          )}
        </div>
      </dialog>
    </div>
  );
}
