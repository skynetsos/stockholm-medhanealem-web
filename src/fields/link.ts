import type { Field, GroupField } from "payload";

/** The parts of a Page a link needs to build its URL (populated relationship). */
export type LinkedPage = { slug?: string | null; section?: string | null };

/**
 * A link to a CMS page (preferred: follows renames and disappears while the page is unpublished),
 * a site path (locale-independent, e.g. "/visit", for app routes such as the calendar) or an
 * external URL. Internal links are prefixed with the visitor's locale when rendered.
 */
export type LinkValue = {
  type?: "page" | "internal" | "external" | null;
  page?: number | LinkedPage | null;
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

/**
 * @param options.required  false for optional links (e.g. a teaser's "read more"): an empty link is
 *   then valid and simply hidden on the site. Menu items keep the default (required).
 */
export function linkField(name = "link", { required = true }: { required?: boolean } = {}): GroupField {
  const empty = (value: unknown) => value === undefined || value === null || value === "";
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
              { label: "CMS page", value: "page" },
              { label: "Path on this site", value: "internal" },
              { label: "External link", value: "external" },
            ],
          },
          { name: "newTab", type: "checkbox", label: "Open in new tab" },
        ],
      },
      {
        name: "page",
        type: "relationship",
        relationTo: "pages",
        admin: {
          condition: (_, sibling) => sibling?.type === "page",
          description: "The link is hidden on the site while the page is unpublished.",
        },
        validate: (value: unknown, { siblingData }: { siblingData: Partial<LinkValue> }) =>
          siblingData?.type !== "page" || value || !required ? true : "Choose a page",
      },
      {
        name: "path",
        type: "text",
        admin: { condition: (_, sibling) => !sibling?.type || sibling.type === "internal", placeholder: "/visit" },
        validate: (value: unknown, { siblingData }: { siblingData: Partial<LinkValue> }) =>
          (!siblingData?.type || siblingData.type === "internal") && !(empty(value) && !required)
            ? validateInternalPath(value)
            : true,
      },
      {
        name: "url",
        type: "text",
        admin: { condition: (_, sibling) => sibling?.type === "external", placeholder: "https://" },
        validate: (value: unknown, { siblingData }: { siblingData: Partial<LinkValue> }) =>
          siblingData?.type === "external" && !(empty(value) && !required) ? validateExternalUrl(value) : true,
      },
    ],
  };
}

/** Label (localized) + link, the building block for menus. */
export function labelledLinkFields(): Field[] {
  return [{ name: "label", type: "text", required: true, localized: true }, linkField()];
}
