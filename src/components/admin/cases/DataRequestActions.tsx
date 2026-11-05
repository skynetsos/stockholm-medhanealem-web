import type { UIFieldServerProps } from "payload";

import { hasStaffRole } from "../../../access/content";
import { DataRequestButtons } from "./DataRequestButtons";

/**
 * Case page sidebar, super admins only (spec Phase 2 task 9, D-036): export the case as JSON, or
 * erase its personal data. The endpoints check the role again.
 */
export function DataRequestActions({ id, data, req, collectionSlug }: UIFieldServerProps) {
  if (!id || !hasStaffRole(req, ["super_admin"])) return null;
  const doc = data as { reference?: string | null; archivedAt?: string | null };
  return <DataRequestButtons collection={collectionSlug} id={String(id)} reference={doc.reference ?? String(id)} archivedAt={doc.archivedAt ?? null} />;
}
