import { APIError, type GlobalBeforeChangeHook, type GlobalConfig } from "payload";

import { hasRoleAccess } from "../access";
import { labelledLinkFields, linkField } from "../fields/link";

import { revalidateLayout } from "../hooks/revalidateLayout";

/**
 * Home page sections (Phase 1 task 4). Each is hidden automatically when it has no content.
 * The urgent announcement bar is not listed: it sits at the top of every page (D-016).
 */
export const HOME_SECTIONS = [
  { value: "hero", label: "Hero" },
  { value: "nextService", label: "Next service" },
  { value: "upcomingHolyDays", label: "Upcoming holy days" },
  { value: "latestNotice", label: "Latest announcement" },
  { value: "about", label: "About the church" },
  { value: "sundaySchool", label: "Sunday School" },
  { value: "gallery", label: "Latest gallery" },
  { value: "visit", label: "Visit us" },
] as const;

const uniqueSections: GlobalBeforeChangeHook = ({ data }) => {
  const sections = ((data?.sections ?? []) as { section?: string }[]).map((s) => s.section);
  const duplicate = sections.find((s, i) => s && sections.indexOf(s) !== i);
  if (duplicate) {
    const label = HOME_SECTIONS.find((s) => s.value === duplicate)?.label ?? duplicate;
    throw new APIError(`"${label}" is listed twice; each section can appear once.`, 400);
  }
  return data;
};

/** Spec §2.15 / §3: editors and super_admin edit the home page; everyone reads it. */
export const Homepage: GlobalConfig = {
  slug: "homepage",
  label: "Home page",
  admin: { group: "Settings" },
  access: {
    read: () => true,
    update: hasRoleAccess("super_admin", "editor"),
  },
  hooks: {
    beforeChange: [uniqueSections],
    // Home page content is cached with the layout data; refresh both on save.
    afterChange: [revalidateLayout],
  },
  fields: [
    {
      type: "tabs",
      tabs: [
        {
          label: "Hero",
          fields: [
            {
              name: "hero",
              type: "group",
              label: false,
              fields: [
                { name: "image", type: "upload", relationTo: "media" },
                { name: "heading", type: "text", localized: true },
                { name: "subheading", type: "textarea", localized: true },
                { name: "ctas", type: "array", label: "Buttons", maxRows: 2, fields: labelledLinkFields() },
              ],
            },
          ],
        },
        {
          label: "Sections",
          fields: [
            {
              name: "sections",
              type: "array",
              label: "Sections, in order",
              admin: {
                description:
                  "Drag to reorder; remove a row to hide a section. Sections without content are hidden automatically.",
              },
              defaultValue: HOME_SECTIONS.map((s) => ({ section: s.value })),
              fields: [{ name: "section", type: "select", required: true, options: HOME_SECTIONS.map((s) => ({ ...s })) }],
            },
            {
              name: "featuredEvents",
              type: "relationship",
              relationTo: "events",
              hasMany: true,
              maxRows: 5,
              admin: {
                description: "Optional: pin up to 5 events to the holy-days section; otherwise the next ones are shown.",
              },
            },
          ],
        },
        {
          label: "Teasers",
          fields: [
            {
              name: "about",
              type: "group",
              label: "About the church",
              fields: [
                { name: "heading", type: "text", localized: true },
                { name: "text", type: "textarea", localized: true },
                { name: "image", type: "upload", relationTo: "media" },
                linkField("link", { required: false }),
              ],
            },
            {
              name: "sundaySchool",
              type: "group",
              label: "Sunday School",
              fields: [
                { name: "heading", type: "text", localized: true },
                { name: "text", type: "textarea", localized: true },
                { name: "image", type: "upload", relationTo: "media" },
              ],
            },
          ],
        },
      ],
    },
  ],
};

