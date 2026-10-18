"use client";

import { Button, toast, useAuth, useDocumentInfo, useFormFields, useTranslation } from "@payloadcms/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { hasRole } from "../../../access/roles";
import type { AdminTranslationKeys, AdminTranslations } from "../../../i18n/admin";

/** Sidebar control on a user's page: MFA status for everyone, reset action for super_admin. */
export function MfaResetButton() {
  const { t } = useTranslation<AdminTranslations, AdminTranslationKeys>();
  const { id } = useDocumentInfo();
  const { user } = useAuth();
  const router = useRouter();
  const enabled = useFormFields(([fields]) => Boolean(fields["mfa.enabled"]?.value));
  const [busy, setBusy] = useState(false);

  if (!id || !hasRole(user as { roles?: string[] } | null, "super_admin")) return null;

  const onReset = async () => {
    if (!window.confirm(t("mfa:resetConfirm"))) return;
    setBusy(true);
    const res = await fetch(`/api/users/${id}/mfa/reset`, { method: "POST", credentials: "include" });
    setBusy(false);
    if (res.ok) {
      toast.success(t("mfa:resetDone"));
      router.refresh();
    } else {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      const key = `mfa:error_${data.error ?? "unknown"}` as AdminTranslationKeys;
      toast.error(t(key) === key ? t("mfa:error_unknown") : t(key));
    }
  };

  return (
    <div>
      <p>
        <strong>{enabled ? t("mfa:statusEnabled") : t("mfa:statusDisabled")}</strong>
      </p>
      <p>{t("mfa:resetHelp")}</p>
      <Button buttonStyle="secondary" disabled={busy} onClick={onReset} aria-label={t("mfa:resetTitle")}>
        {t("mfa:resetButton")}
      </Button>
    </div>
  );
}
