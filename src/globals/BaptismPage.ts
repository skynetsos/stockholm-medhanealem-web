import { type Access, APIError, type FieldAccess, type GlobalBeforeChangeHook, type GlobalConfig } from "payload";

import { hasStaffRole, isTranslatorForLocale } from "../access/content";
import type { Role } from "../access/roles";
import { revalidateLayout } from "../hooks/revalidateLayout";

/** Clergy decide the requirements, the office opens and closes requests; super admins both. */
const OWNERS: Role[] = ["super_admin", "clergy_approver", "office_coordinator"];

const owners: Access = ({ req }) => hasStaffRole(req, OWNERS);
const ownersField: FieldAccess = ({ req }) => hasStaffRole(req, OWNERS);

/** Translators may translate the requirements, not add, remove or reorder them. */
const translatorsKeepRows: GlobalBeforeChangeHook = ({ data, originalDoc, req }) => {
  // Server code (no user) and owners may change rows.
  if (!req.user || hasStaffRole(req, OWNERS) || data.requirements === undefined) return data;
  const ids = (rows: unknown) => JSON.stringify(((rows ?? []) as { id?: string }[]).map((r) => r.id));
  if (ids(data.requirements) !== ids(originalDoc?.requirements)) {
    throw new APIError("Translators can translate the requirements but not add, remove or reorder them.", 403);
  }
  return data;
};

/**
 * The baptism page's own content (spec Phase 2 task 3): what to prepare and whether requests are
 * open. The guidance itself is in Teachings (category Christening). Translators fill in their
 * languages; only the owners add or remove requirements and open or close requests.
 */
export const BaptismPage: GlobalConfig = {
  slug: "baptism-page",
  label: "Baptism page",
  admin: {
    group: "Settings",
    description: "Shown on /sacraments/baptism with the christening guidance (Content → Teachings).",
  },
  access: {
    read: () => true,
    update: (args) => owners(args) || isTranslatorForLocale(args.req),
  },
  hooks: { beforeChange: [translatorsKeepRows], afterChange: [revalidateLayout] },
  fields: [
    {
      name: "requestsOpen",
      type: "checkbox",
      label: "Requests open",
      defaultValue: false,
      access: { update: ownersField },
      admin: { description: 'Shows the "Request a baptism" button and the request form. Turn off to pause new requests.' },
    },
    { name: "intro", type: "richText", localized: true, admin: { description: "Optional. Shown under the page title." } },
    {
      name: "requirements",
      type: "array",
      label: "What to prepare",
      labels: { singular: "Requirement", plural: "Requirements" },
      admin: { description: "A checklist for families, e.g. godparents, the candidate's documents. Hidden when empty." },
      fields: [
        // Rows are shared by all languages; the text is translated per language.
        { name: "item", type: "text", required: true, localized: true },
        { name: "detail", type: "textarea", localized: true },
      ],
    },
  ],
};
