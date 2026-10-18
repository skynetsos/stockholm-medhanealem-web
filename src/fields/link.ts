import type { Field, GroupField } from "payload";

/**
 * A link that is either an internal site path (locale-independent, e.g. "/visit") or an external URL.
 * Internal paths are prefixed with the visitor's locale when rendered. Phase 1 adds "page" (relation).
 */
export type LinkValue = {
  type?: "internal" | "external" | null;
  path?: string | null;
  url?: string | null;
  newTab?: boolean | null;
};

export const validateInternalPath = (value: unknown): true | string => {
  if (typeof value !== "string" || value === "") return "Enter a path such as /visit";
  if (!value.startsWith("/")) return "Path must start with /";
  if (/^\/(am|en|sv)(\/|$)/.test(value)) return "Leave out the language: use /visit, not /en/visit";
  if (/\s/.test(value)) return "Path cannot contain spaces";
  return true;
};

export const validateExternalUrl = (value: unknown): true | string => {
  if (typeof value !== "string" || value === "") return "Enter a full URL starting with https://";
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:"
      ? true
      : "Only http(s) and mailto links are allowed";
  } catch {
    return "Enter a full URL starting with https://";
  }
};

export function linkField(name = "link"): GroupField {
  return {
    name,
    type: "group",
    fields: [
      {
        type: "row",
        fields: [
          {
            name: "type",
            type: "radio",
            defaultValue: "internal",
            options: [
              { label: "Page on this site", value: "internal" },
              { label: "External link", value: "external" },
            ],
          },
          { name: "newTab", type: "checkbox", label: "Open in new tab" },
        ],
      },
      {
        name: "path",
        type: "text",
        admin: { condition: (_, sibling) => sibling?.type !== "external", placeholder: "/visit" },
        validate: (value: unknown, { siblingData }: { siblingData: Partial<LinkValue> }) =>
          siblingData?.type === "external" ? true : validateInternalPath(value),
      },
      {
        name: "url",
        type: "text",
        admin: { condition: (_, sibling) => sibling?.type === "external", placeholder: "https://" },
        validate: (value: unknown, { siblingData }: { siblingData: Partial<LinkValue> }) =>
          siblingData?.type === "external" ? validateExternalUrl(value) : true,
      },
    ],
  };
}

/** Label (localized) + link, the building block for menus. */
export function labelledLinkFields(): Field[] {
  return [{ name: "label", type: "text", required: true, localized: true }, linkField()];
}
