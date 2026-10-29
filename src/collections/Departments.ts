import type { CollectionConfig } from "payload";

import { staffContentAccess } from "../access/content";
import { CACHE_TAGS, revalidateTags } from "../hooks/revalidate";
import { RESERVED_DEPARTMENT_SLUGS } from "../lib/content-paths";
import { validateSlugFormat } from "../lib/pages";

/** Spec §3 (same row as Pages): editors and super_admin manage; clergy/office read; translators edit text. */
const { access, editorsOnlyField } = staffContentAccess({
  readers: ["super_admin", "clergy_approver", "office_coordinator", "editor", "translator"],
  editors: ["super_admin", "editor"],
  deleters: ["super_admin", "editor"],
  publicWhere: () => true,
});
const structural = { access: { update: editorsOnlyField } };

const revalidation = revalidateTags(CACHE_TAGS.departments);

/** Sunday School departments (spec §2.7), shown at /sunday-school/<slug>. */
export const Departments: CollectionConfig = {
  slug: "departments",
  labels: { singular: "Department", plural: "Departments" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "slug", "leaderName", "order"],
    description: "Sunday School departments. A department page is shown once it has a summary or text.",
  },
  access,
  defaultSort: "order",
  defaultPopulate: { name: true, slug: true },
  hooks: { afterChange: revalidation.afterChange, afterDelete: revalidation.afterDelete },
  fields: [
    {
      type: "row",
      fields: [
        { name: "name", type: "text", required: true, localized: true, admin: { width: "60%" } },
        {
          name: "slug",
          type: "text",
          required: true,
          unique: true,
          ...structural,
          admin: { width: "40%", description: "Address: /sunday-school/<slug>" },
          validate: (value: unknown) =>
            (RESERVED_DEPARTMENT_SLUGS as readonly unknown[]).includes(value) ? `"${String(value)}" is used by the site itself; choose another address.` : validateSlugFormat(value),
        },
      ],
    },
    { name: "summary", type: "textarea", localized: true, admin: { description: "One or two sentences for the overview page." } },
    { name: "body", type: "richText", localized: true },
    { name: "leaderName", type: "text", localized: true, label: "Leader", admin: { description: "Optional." } },
    { name: "image", type: "upload", relationTo: "media", ...structural },
    {
      name: "order",
      type: "number",
      defaultValue: 100,
      ...structural,
      admin: { position: "sidebar", description: "Lower numbers are shown first." },
    },
  ],
};
