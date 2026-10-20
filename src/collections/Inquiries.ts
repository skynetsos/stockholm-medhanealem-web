import type { CollectionBeforeChangeHook, CollectionConfig } from "payload";

import { hasRoleAccess, systemOnly } from "../access";
import { locales } from "../i18n/locales";
import { nextReference } from "../lib/reference";

/** Spec §2.14 inquiry types. Phase 1 uses "contact" (the Visit page form); the others come in Phase 2. */
export const INQUIRY_TYPES = [
  { value: "contact", label: "Contact form" },
  { value: "pastoral", label: "Pastoral" },
  { value: "marriage", label: "Marriage" },
  { value: "sunday_school", label: "Sunday School" },
  { value: "volunteer", label: "Volunteer" },
  { value: "funeral", label: "Funeral (fitihat)" },
] as const;

const setReference: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation === "create" && !data.reference) data.reference = await nextReference(req.payload, "INQ");
  return data;
};

/** What the visitor sent: shown to staff, never changed through the admin or API. */
const submitted = { access: { update: systemOnly }, admin: { readOnly: true } } as const;

/**
 * Inquiries — PRIVATE (spec §2.14, §3): super_admin manages them; office coordinators read and
 * update (status, assignment); clergy read. Nobody can create one through the API: the public
 * creates inquiries only through the site's form actions (overrideAccess on the server).
 */
export const Inquiries: CollectionConfig = {
  slug: "inquiries",
  labels: { singular: "Inquiry", plural: "Inquiries" },
  admin: {
    group: "Requests",
    useAsTitle: "reference",
    defaultColumns: ["reference", "type", "status", "name", "createdAt"],
    listSearchableFields: ["reference", "name", "email"],
    description: "Messages from the website. Private: only office staff, clergy and super admins can see them.",
  },
  access: {
    read: hasRoleAccess("super_admin", "office_coordinator", "clergy_approver"),
    create: () => false,
    update: hasRoleAccess("super_admin", "office_coordinator"),
    delete: hasRoleAccess("super_admin"),
  },
  defaultSort: "-createdAt",
  hooks: { beforeChange: [setReference] },
  fields: [
    {
      type: "row",
      fields: [
        { name: "reference", type: "text", unique: true, index: true, ...submitted, admin: { ...submitted.admin, width: "34%" } },
        {
          name: "type",
          type: "select",
          required: true,
          options: INQUIRY_TYPES.map((t) => ({ ...t })),
          ...submitted,
          admin: { ...submitted.admin, width: "33%" },
        },
        {
          name: "status",
          type: "select",
          required: true,
          defaultValue: "new",
          options: [
            { label: "New", value: "new" },
            { label: "In progress", value: "in_progress" },
            { label: "Closed", value: "closed" },
          ],
          admin: { width: "33%" },
        },
      ],
    },
    {
      name: "assignedTo",
      type: "relationship",
      relationTo: "users",
      filterOptions: { roles: { in: ["super_admin", "office_coordinator", "clergy_approver"] } },
    },
    {
      type: "row",
      fields: [
        { name: "name", type: "text", required: true, ...submitted, admin: { ...submitted.admin, width: "34%" } },
        { name: "email", type: "email", required: true, ...submitted, admin: { ...submitted.admin, width: "33%" } },
        { name: "phone", type: "text", ...submitted, admin: { ...submitted.admin, width: "33%" } },
      ],
    },
    { name: "message", type: "textarea", ...submitted },
    {
      name: "preferredLocale",
      type: "select",
      label: "Language of the form",
      options: locales.map((code) => ({ label: code, value: code })),
      ...submitted,
      admin: { ...submitted.admin, description: "Reply in this language where possible." },
    },
    {
      type: "collapsible",
      label: "Sunday School / volunteer details",
      admin: { initCollapsed: true, condition: (data) => ["sunday_school", "volunteer"].includes(data?.type) },
      fields: [
        { name: "childName", type: "text", ...submitted },
        { name: "childAge", type: "number", min: 0, max: 25, ...submitted },
        { name: "interests", type: "text", hasMany: true, ...submitted },
        { name: "availability", type: "textarea", ...submitted },
      ],
    },
    {
      name: "privacyAccepted",
      type: "checkbox",
      required: true,
      label: "Agreed to the privacy notice",
      ...submitted,
    },
  ],
};
