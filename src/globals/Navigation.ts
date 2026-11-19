import type { GlobalConfig } from "payload";

import { hasRoleAccess } from "../access";
import { labelledLinkFields, linkField } from "../fields/link";
import { revalidateLayout } from "../hooks/revalidateLayout";

export const Navigation: GlobalConfig = {
  slug: "navigation",
  label: "Navigation",
  admin: { group: "Settings" },
  access: {
    read: () => true,
    update: hasRoleAccess("super_admin", "editor"),
  },
  hooks: { afterChange: [revalidateLayout] },
  fields: [
    {
      name: "headerItems",
      type: "array",
      label: "Main menu",
      maxRows: 9,
      admin: {
        description:
          "An item with a sub-menu opens a dropdown (its own link is then not used, as on the reference layout, D-049). " +
          "An item is hidden when its link leads to a page without content and none of its sub-menu items are shown.",
      },
      fields: [
        { name: "label", type: "text", required: true, localized: true },
        // Optional: a dropdown heading needs no link of its own (D-049).
        linkField("link", { required: false }),
        {
          name: "children",
          type: "array",
          label: "Sub-menu",
          fields: labelledLinkFields(),
        },
      ],
    },
    {
      name: "headerCTAs",
      type: "array",
      label: "Header buttons",
      admin: { description: "Shown as a pill at the end of the menu (e.g. Give)." },
      maxRows: 2,
      fields: [
        ...labelledLinkFields(),
        {
          name: "style",
          type: "select",
          defaultValue: "primary",
          options: [
            { label: "Primary (filled)", value: "primary" },
            { label: "Secondary (outline)", value: "secondary" },
          ],
        },
      ],
    },
  ],
};
