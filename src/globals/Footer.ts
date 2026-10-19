import type { GlobalConfig } from "payload";

import { hasRoleAccess } from "../access";
import { labelledLinkFields, linkField } from "../fields/link";
import { revalidateLayout } from "../hooks/revalidateLayout";

export const Footer: GlobalConfig = {
  slug: "footer",
  label: "Footer",
  admin: { group: "Settings" },
  access: {
    read: () => true,
    update: hasRoleAccess("super_admin", "editor"),
  },
  hooks: { afterChange: [revalidateLayout] },
  fields: [
    {
      name: "columns",
      type: "array",
      maxRows: 4,
      fields: [
        { name: "heading", type: "text", localized: true, required: true },
        { name: "links", type: "array", fields: labelledLinkFields() },
      ],
    },
    {
      name: "diocese",
      type: "group",
      label: "Diocese link",
      admin: { description: "Nordic & Greece Diocese (eotc-nordics.org)." },
      fields: [{ name: "label", type: "text", localized: true }, linkField("link", { required: false })],
    },
    {
      name: "legalLinks",
      type: "array",
      label: "Legal links (privacy, cookies)",
      maxRows: 4,
      fields: labelledLinkFields(),
    },
  ],
};
