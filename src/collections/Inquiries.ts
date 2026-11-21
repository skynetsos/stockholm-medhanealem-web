import type { CollectionBeforeChangeHook, CollectionConfig, Validate } from "payload";

import { hasRoleAccess, systemOnly } from "../access";
import { isArchived, requiredUnlessArchived } from "../fields/archived";
import { stockholmDateTime, stockholmDay } from "../fields/stockholmDate";
import { locales } from "../i18n/locales";
import { dataRequestEndpoints } from "../lib/cases/data-requests";
import { logCaseChanges } from "../lib/cases/hooks";
import { nextReference } from "../lib/reference";

/** Spec §2.14 inquiry types. Phase 1 uses "contact" (the Visit page form); the others come in Phase 2. */
export const INQUIRY_TYPES = [
  { value: "contact", label: "Contact form" },
  { value: "pastoral", label: "Prayer request" },
  { value: "marriage", label: "Marriage" },
  { value: "sunday_school", label: "Sunday School" },
  { value: "volunteer", label: "Volunteer" },
  { value: "funeral", label: "Funeral (fitihat)" },
] as const;

const setReference: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation === "create" && !data.reference) data.reference = await nextReference(req.payload, "INQ", new Date(), req);
  return data;
};

/** Prayer requests may come with a phone number only (D-050); every other form needs an email. */
const emailRequired: Validate = (value, { data }) => {
  const d = data as { type?: string; phone?: string | null } | undefined;
  if (isArchived(data) || value) return true;
  return d?.type === "pastoral" && d.phone ? true : "Required.";
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
    defaultColumns: ["reference", "type", "status", "name", "assignedTo", "age"],
    listSearchableFields: ["reference", "name", "email"],
    description: "Messages from the website. Private: only office staff, clergy and super admins can see them.",
    components: { beforeListTable: ["/components/admin/cases/CaseStatusFilters#CaseStatusFilters"] },
  },
  access: {
    read: hasRoleAccess("super_admin", "office_coordinator", "clergy_approver"),
    create: () => false,
    update: hasRoleAccess("super_admin", "office_coordinator"),
    delete: hasRoleAccess("super_admin"),
  },
  defaultSort: "-createdAt",
  // Status changes and assignments go to the audit log (CaseEvents); any status may follow any other.
  hooks: { beforeChange: [setReference], afterChange: [logCaseChanges("inquiries", { assignedTo: "assignedTo" })] },
  endpoints: dataRequestEndpoints("inquiries"),
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
        { name: "name", type: "text", validate: requiredUnlessArchived, ...submitted, admin: { ...submitted.admin, width: "34%" } },
        { name: "email", type: "email", validate: emailRequired, ...submitted, admin: { ...submitted.admin, width: "33%" } },
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
    // D-050: the wedding, memorial and prayer request forms after the reference layout.
    {
      type: "collapsible",
      label: "Wedding details",
      admin: { condition: (data) => data?.type === "marriage" },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "partnerName",
              type: "text",
              label: "Bride's full name",
              ...submitted,
              admin: { ...submitted.admin, width: "50%", description: "The groom is the name above." },
            },
            { name: "partnerPhone", type: "text", label: "Bride's phone", ...submitted, admin: { ...submitted.admin, width: "50%" } },
          ],
        },
      ],
    },
    {
      type: "collapsible",
      label: "Memorial (fitihat) details",
      admin: { condition: (data) => data?.type === "funeral" },
      fields: [
        {
          type: "row",
          fields: [
            { name: "deceasedName", type: "text", label: "Name of the departed", ...submitted, admin: { ...submitted.admin, width: "50%" } },
            stockholmDay({ name: "dateOfPassing", label: "Date of passing", ...submitted, admin: { ...submitted.admin, width: "50%" } }),
          ],
        },
      ],
    },
    stockholmDay({
      name: "preferredDate",
      label: "Date asked for",
      ...submitted,
      admin: {
        ...submitted.admin,
        condition: (data) => ["marriage", "funeral"].includes(data?.type),
        description: "Wedding date or date of the memorial service, as asked.",
      },
    }),
    {
      type: "collapsible",
      label: "Prayer request",
      admin: { condition: (data) => data?.type === "pastoral" },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "requestType",
              type: "select",
              label: "About",
              options: [
                { label: "Confession", value: "confession" },
                { label: "Prayer for the sick", value: "sick" },
                { label: "Home visit / holy water", value: "home_blessing" },
                { label: "Comfort and counselling", value: "comfort" },
                { label: "A blessing", value: "blessing" },
                { label: "Appointment with a priest", value: "appointment" },
                { label: "Something else", value: "other" },
              ],
              ...submitted,
              admin: { ...submitted.admin, width: "50%" },
            },
            { name: "priest", type: "relationship", relationTo: "clergy", label: "Priest asked for", ...submitted, admin: { ...submitted.admin, width: "50%" } },
          ],
        },
      ],
    },
    // "Age" column in the list (days since the case was sent); nothing in the edit view.
    // Export / erase for data subject requests, super admins only (D-036).
    {
      name: "dataRequests",
      type: "ui",
      admin: { position: "sidebar", disableListColumn: true, components: { Field: "/components/admin/cases/DataRequestActions#DataRequestActions" } },
    },
    // The audit log of this case, oldest first (D-032).
    { name: "timeline", type: "ui", admin: { disableListColumn: true, components: { Field: "/components/admin/cases/CaseTimeline#CaseTimeline" } } },
    { name: "age", type: "ui", label: "Age", admin: { components: { Cell: "/components/admin/cases/CaseAgeCell#CaseAgeCell" } } },
    {
      name: "privacyAccepted",
      type: "checkbox",
      required: true,
      label: "Agreed to the privacy notice",
      ...submitted,
    },
    stockholmDateTime({
      name: "archivedAt",
      access: { update: systemOnly },
      admin: { readOnly: true, position: "sidebar", description: "Set when personal data was removed (retention job or erasure on request)." },
    }),
  ],
};
