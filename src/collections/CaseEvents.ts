import type { CollectionConfig } from "payload";

import { hasRoleAccess } from "../access";
import { stockholmDateTime } from "../fields/stockholmDate";
import { CASE_ACTIONS } from "../lib/cases/events";

/**
 * CaseEvents — the audit log of baptism requests and inquiries (spec §2.13, §3). PRIVATE: office
 * staff, clergy and super admins read it. Entries are written only by server code (logCaseEvent)
 * and are immutable: only a super admin may correct or delete one.
 */
export const CaseEvents: CollectionConfig = {
  slug: "case-events",
  labels: { singular: "Case event", plural: "Case events" },
  admin: {
    group: "Requests",
    defaultColumns: ["at", "request", "action", "from", "to", "actor"],
    description: "Audit log of every change to a request. Entries cannot be edited.",
  },
  access: {
    read: hasRoleAccess("super_admin", "office_coordinator", "clergy_approver"),
    create: () => false,
    update: hasRoleAccess("super_admin"),
    delete: hasRoleAccess("super_admin"),
  },
  defaultSort: "-at",
  timestamps: true,
  fields: [
    { name: "request", type: "relationship", relationTo: ["baptism-requests", "inquiries"], required: true, index: true },
    {
      type: "row",
      fields: [
        {
          name: "actorType",
          type: "select",
          required: true,
          defaultValue: "system",
          options: [
            { label: "Staff member", value: "user" },
            { label: "System", value: "system" },
          ],
          admin: { width: "34%" },
        },
        { name: "actor", type: "relationship", relationTo: "users", admin: { width: "66%", condition: (data) => data?.actorType === "user" } },
      ],
    },
    { name: "action", type: "select", required: true, options: CASE_ACTIONS.map((value) => ({ label: value, value })) },
    {
      type: "row",
      fields: [
        { name: "from", type: "text", admin: { width: "50%" } },
        { name: "to", type: "text", admin: { width: "50%" } },
      ],
    },
    { name: "note", type: "textarea" },
    stockholmDateTime({ name: "at", required: true, index: true, defaultValue: () => new Date().toISOString() }),
  ],
};
