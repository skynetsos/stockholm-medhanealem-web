"use client";

import { useFormFields, useTranslation } from "@payloadcms/ui";

import type { AdminTranslationKeys, AdminTranslations } from "../../../i18n/admin";
import { ethiopianDateLabel } from "../../../lib/admin-dates";

/** Under the scheduled date picker (Stockholm time): the same day in the Ethiopian calendar (D-032). */
export function EthiopianDateHint({ path }: { path: string }) {
  const { t } = useTranslation<AdminTranslations, AdminTranslationKeys>();
  const value = useFormFields(([fields]) => fields[path]?.value) as string | null | undefined;
  const valid = typeof value === "string" && !Number.isNaN(Date.parse(value));
  return (
    <p aria-live="polite" style={{ marginTop: "0.5rem" }}>
      {valid ? t("cases:ethiopianDate", { date: ethiopianDateLabel(value) }) : null}
    </p>
  );
}
