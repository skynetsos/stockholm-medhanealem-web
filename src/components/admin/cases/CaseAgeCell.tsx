"use client";

import { useTranslation } from "@payloadcms/ui";
import type { DefaultCellComponentProps } from "payload";

import type { AdminTranslationKeys, AdminTranslations } from "../../../i18n/admin";
import { caseAgeDays } from "../../../lib/cases/overview";

/** "Age" column of the case lists: days since the case was sent (Stockholm calendar days). */
export function CaseAgeCell({ rowData }: DefaultCellComponentProps) {
  const { t } = useTranslation<AdminTranslations, AdminTranslationKeys>();
  const createdAt = (rowData as { createdAt?: string }).createdAt;
  if (!createdAt) return null;
  const days = caseAgeDays(createdAt);
  return <span>{days === 0 ? t("cases:today") : t("cases:ageDays", { count: days })}</span>;
}
