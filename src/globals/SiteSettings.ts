import type { GlobalConfig } from "payload";

import { isStaff, isSuperAdmin } from "../access";
import { revalidateLayout } from "../hooks/revalidateLayout";

/** Internal-only fields: readable by signed-in staff, never by the public API. */
const staffOnlyRead = { read: ({ req }: { req: Parameters<typeof isStaff>[0] }) => isStaff(req) };

export const SiteSettings: GlobalConfig = {
  slug: "site-settings",
  label: "Site settings",
  admin: { group: "Settings" },
  access: {
    read: () => true,
    update: isSuperAdmin,
  },
  hooks: { afterChange: [revalidateLayout] },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Identity",
          fields: [
            {
              name: "churchName",
              type: "text",
              localized: true,
              admin: { description: "Full approved name, shown in the header and footer." },
            },
            {
              name: "shortName",
              type: "text",
              admin: { description: 'Short label, e.g. "Stockholm Medhanealem".' },
            },
            {
              name: "logo",
              type: "upload",
              relationTo: "media",
              admin: {
                description:
                  'Shown in the header next to the church name. PNG/WebP with a transparent background works best. The image needs "Permission to publish".',
              },
            },
            {
              name: "swedishPublic",
              type: "checkbox",
              defaultValue: false,
              label: "Show Swedish in the language switcher",
              admin: { description: "Turn on once Swedish content is reviewed (Phase 3)." },
            },
          ],
        },
        {
          label: "Contact & location",
          fields: [
            {
              name: "address",
              type: "group",
              fields: [
                {
                  type: "row",
                  fields: [
                    { name: "street", type: "text" },
                    { name: "postalCode", type: "text" },
                    { name: "city", type: "text" },
                  ],
                },
              ],
            },
            { name: "mapUrl", type: "text", label: "Map link" },
            { name: "transitNotes", type: "textarea", localized: true, label: "Public transport directions" },
            { name: "defaultLocation", type: "text", localized: true, admin: { description: "Default event location." } },
            { name: "officeEmail", type: "email", admin: { description: "Public office address (shown on the site)." } },
            { name: "phone", type: "text", admin: { description: "Office phone only, never personal numbers." } },
            {
              name: "socialLinks",
              type: "array",
              fields: [
                {
                  type: "row",
                  fields: [
                    {
                      name: "platform",
                      type: "select",
                      required: true,
                      options: ["facebook", "youtube", "instagram", "tiktok", "telegram", "other"].map((value) => ({
                        value,
                        label: value[0].toUpperCase() + value.slice(1),
                      })),
                    },
                    { name: "url", type: "text", required: true },
                  ],
                },
              ],
            },
            { name: "livestreamUrl", type: "text", label: "Livestream URL" },
          ],
        },
        {
          label: "Requests & privacy",
          fields: [
            {
              name: "officeNotificationEmails",
              type: "array",
              access: staffOnlyRead,
              admin: { description: "Who is emailed when a request arrives. Never shown publicly." },
              fields: [{ name: "email", type: "email", required: true }],
            },
            {
              name: "retentionMonthsBaptism",
              type: "number",
              defaultValue: 24,
              min: 1,
              access: staffOnlyRead,
              admin: { description: "Months after completion before baptism cases are archived (legal review)." },
            },
          ],
        },
      ],
    },
  ],
};
