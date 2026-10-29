import type { CollectionAfterChangeHook, CollectionBeforeChangeHook, CollectionConfig, FieldAccess, Validate } from "payload";

import { hasRoleAccess, systemOnly } from "../access";
import { hasStaffRole } from "../access/content";
import { stockholmDateTime, stockholmDay } from "../fields/stockholmDate";
import { locales } from "../i18n/locales";
import { sendDecisionEmail } from "../lib/baptism/emails";
import { BAPTISM_STATUS_VALUES } from "../lib/baptism/state";
import { logCaseEvent } from "../lib/cases/events";
import { enforceBaptismWorkflow, logCaseChanges } from "../lib/cases/hooks";
import { statusEndpoint } from "../lib/baptism/transition";
import { nextReference } from "../lib/reference";

/** Spec §2.12 statuses with admin labels. Allowed transitions: src/lib/baptism/state.ts. */
const STATUS_LABELS: Record<(typeof BAPTISM_STATUS_VALUES)[number], string> = {
  new: "New",
  info_needed: "Information needed",
  clergy_review: "Clergy review",
  scheduling: "Scheduling",
  confirmed: "Confirmed",
  completed: "Completed",
  declined: "Declined",
};
export const BAPTISM_STATUSES = BAPTISM_STATUS_VALUES.map((value) => ({ value, label: STATUS_LABELS[value] }));

const logChanges = logCaseChanges("baptism-requests", {
  assignedTo: "internal.assignedTo",
  notes: { "internal.officeNotes": "Office notes updated", "internal.clergyNotes": "Clergy notes updated" },
  decisions: { "internal.clergyDecision": "Clergy decision" },
  dates: { "internal.scheduledDate": "Scheduled date" },
});

const setReference: CollectionBeforeChangeHook = async ({ data, operation, req }) => {
  if (operation === "create" && !data.reference) data.reference = await nextReference(req.payload, "BAP");
  return data;
};

const logCreated: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation === "create") await logCaseEvent(req.payload, { collection: "baptism-requests", id: doc.id, action: "created", to: doc.status }, req);
  return doc;
};

/** Office staff (and super admins) may correct what the applicant sent, e.g. after "information needed". */
const officeOnly: FieldAccess = ({ req }) => hasStaffRole(req, ["super_admin", "office_coordinator"]);
const clergyOnly: FieldAccess = ({ req }) => hasStaffRole(req, ["super_admin", "clergy_approver"]);
const applicantData = { access: { update: officeOnly } } as const;

/** Archived cases have their personal data removed (retention job), so nothing is required any more. */
const isArchived = (data: unknown) => Boolean((data as { archivedAt?: unknown } | undefined)?.archivedAt);
const needsGuardian = (data: unknown) => {
  const category = (data as { candidate?: { category?: string } } | undefined)?.candidate?.category;
  return Boolean(category) && category !== "adult" && !isArchived(data);
};

/** Spec §2.12: the guardian is required when the candidate is an infant or child. */
const guardianRequired: Validate = (value, { data }) => (needsGuardian(data) && !value ? "Required when the candidate is not an adult." : true);
const guardianConsent: Validate = (value, { data }) =>
  needsGuardian(data) && value !== true ? "The guardian's consent is required when the candidate is not an adult." : true;
const requiredUnlessArchived: Validate = (value, { data }) => (isArchived(data) || (value !== null && value !== undefined && value !== "") ? true : "Required.");

/**
 * BaptismRequests — PRIVATE (spec §2.12, §3): read/update by super_admin, office coordinators and
 * clergy approvers; delete by super_admin. Nobody can create one through the API (REST or
 * GraphQL): the public creates requests only through the site's form action (task 4), which uses
 * overrideAccess on the server.
 */
export const BaptismRequests: CollectionConfig = {
  slug: "baptism-requests",
  labels: { singular: "Baptism request", plural: "Baptism requests" },
  admin: {
    group: "Requests",
    useAsTitle: "reference",
    defaultColumns: ["reference", "status", "candidate.category", "preferredPeriod", "internal.assignedTo", "age"],
    listSearchableFields: ["reference", "applicant.name", "applicant.email"],
    description: "Christening requests from the website. Private: only office staff, clergy and super admins can see them.",
    components: { beforeListTable: ["/components/admin/cases/CaseStatusFilters#CaseStatusFilters"] },
  },
  access: {
    read: hasRoleAccess("super_admin", "office_coordinator", "clergy_approver"),
    create: () => false,
    update: hasRoleAccess("super_admin", "office_coordinator", "clergy_approver"),
    delete: hasRoleAccess("super_admin"),
  },
  defaultSort: "-createdAt",
  hooks: { beforeChange: [enforceBaptismWorkflow, setReference], afterChange: [logCreated, logChanges, sendDecisionEmail] },
  endpoints: [statusEndpoint],
  fields: [
    // Current status and the buttons for the next steps this user may take (D-032).
    {
      name: "statusActions",
      type: "ui",
      admin: { position: "sidebar", disableListColumn: true, components: { Field: "/components/admin/cases/CaseStatusActions#CaseStatusActions" } },
    },
    {
      type: "row",
      fields: [
        { name: "reference", type: "text", unique: true, index: true, access: { update: systemOnly }, admin: { readOnly: true, width: "50%" } },
        {
          name: "status",
          type: "select",
          required: true,
          defaultValue: "new",
          index: true,
          options: BAPTISM_STATUSES,
          // Changed only with the status buttons (src/lib/baptism/transition.ts), never by saving the form.
          access: { update: systemOnly },
          admin: { width: "50%", readOnly: true },
        },
      ],
    },
    {
      name: "applicant",
      type: "group",
      ...applicantData,
      fields: [
        {
          type: "row",
          fields: [
            { name: "name", type: "text", validate: requiredUnlessArchived, admin: { width: "34%" } },
            { name: "email", type: "email", validate: requiredUnlessArchived, admin: { width: "33%" } },
            { name: "phone", type: "text", admin: { width: "33%" } },
          ],
        },
        {
          type: "row",
          fields: [
            {
              name: "preferredLocale",
              type: "select",
              label: "Language",
              required: true,
              defaultValue: "am",
              options: locales.map((code) => ({ label: code, value: code })),
              admin: { width: "50%", description: "Emails to the applicant use this language (Amharic or English)." },
            },
            {
              name: "parishRelationship",
              type: "select",
              options: [
                { label: "Member", value: "member" },
                { label: "Attends regularly", value: "regular" },
                { label: "New to the parish", value: "new" },
              ],
              admin: { width: "50%" },
            },
          ],
        },
      ],
    },
    {
      name: "candidate",
      type: "group",
      ...applicantData,
      fields: [
        {
          type: "row",
          fields: [
            { name: "fullName", type: "text", validate: requiredUnlessArchived, admin: { width: "34%" } },
            stockholmDay({ name: "dateOfBirth", admin: { width: "33%" } }),
            {
              name: "category",
              type: "select",
              required: true,
              options: [
                { label: "Infant", value: "infant" },
                { label: "Child", value: "child" },
                { label: "Adult", value: "adult" },
              ],
              admin: { width: "33%" },
            },
          ],
        },
      ],
    },
    {
      name: "guardian",
      type: "group",
      ...applicantData,
      admin: { condition: (data) => data?.candidate?.category !== "adult" },
      fields: [
        {
          type: "row",
          fields: [
            { name: "name", type: "text", validate: guardianRequired, admin: { width: "34%" } },
            { name: "relationship", type: "text", validate: guardianRequired, admin: { width: "33%" } },
            { name: "consentConfirmed", type: "checkbox", label: "Guardian consents", validate: guardianConsent, admin: { width: "33%" } },
          ],
        },
      ],
    },
    { name: "preferredPeriod", type: "text", ...applicantData, admin: { description: 'For example "December 2026".' } },
    { name: "notes", type: "textarea", label: "Notes from the applicant", ...applicantData },
    {
      name: "internal",
      type: "group",
      label: "Internal (staff only)",
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "assignedTo",
              type: "relationship",
              relationTo: "users",
              filterOptions: { roles: { in: ["super_admin", "office_coordinator", "clergy_approver"] } },
              admin: { width: "50%" },
            },
            stockholmDateTime({
              name: "scheduledDate",
              admin: {
                width: "50%",
                description: "Stockholm time.",
                components: { afterInput: [{ path: "/components/admin/cases/EthiopianDateHint#EthiopianDateHint", clientProps: { path: "internal.scheduledDate" } }] },
              },
            }),
          ],
        },
        { name: "officeNotes", type: "richText" },
        {
          name: "clergyDecision",
          type: "select",
          access: { update: clergyOnly },
          options: [
            { label: "Approve", value: "approve" },
            { label: "Decline", value: "decline" },
            { label: "Needs preparation", value: "needs_prep" },
          ],
        },
        { name: "clergyNotes", type: "textarea", access: { update: clergyOnly } },
      ],
    },
    {
      name: "privacyAccepted",
      type: "checkbox",
      label: "Agreed to the privacy notice",
      validate: (value: unknown, { data }: { data: unknown }) => (isArchived(data) || value === true ? true : "Required."),
      access: { update: systemOnly },
      admin: { readOnly: true },
    },
    {
      name: "source",
      type: "group",
      access: { update: systemOnly },
      admin: { readOnly: true },
      fields: [
        {
          type: "row",
          fields: [
            { name: "ipHash", type: "text", label: "IP hash", admin: { width: "34%" } },
            { name: "userAgent", type: "text", admin: { width: "33%" } },
            stockholmDateTime({ name: "submittedAt", admin: { width: "33%" } }),
          ],
        },
      ],
    },
    // "Age" column in the list (days since the case was sent); nothing in the edit view.
    // The audit log of this case, oldest first (D-032).
    { name: "timeline", type: "ui", admin: { disableListColumn: true, components: { Field: "/components/admin/cases/CaseTimeline#CaseTimeline" } } },
    { name: "age", type: "ui", label: "Age", admin: { components: { Cell: "/components/admin/cases/CaseAgeCell#CaseAgeCell" } } },
    stockholmDateTime({
      name: "archivedAt",
      access: { update: systemOnly },
      admin: { readOnly: true, position: "sidebar", description: "Set by the retention job: personal data removed." },
    }),
  ],
};
