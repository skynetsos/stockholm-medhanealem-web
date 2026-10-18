import type { GlobalConfig } from "payload";

import { hasRoleAccess } from "../access";
import { labelledLinkFields } from "../fields/link";
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
      fields: [
        ...labelledLinkFields(),
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
