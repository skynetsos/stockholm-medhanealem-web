import { type Access, APIError, type CollectionBeforeChangeHook, type CollectionConfig, type FieldAccess, type PayloadRequest } from "payload";

import { hasRole, isStaff, type Role } from "../access";
import { pageBlocks } from "../blocks";
import { labelledLinkFields } from "../fields/link";
import { CACHE_TAGS, revalidateTags } from "../hooks/revalidate";
import { PAGE_SECTIONS, RESERVED_TOP_LEVEL_SLUGS, validateSlugFormat } from "../lib/pages";

type StaffUser = { roles?: string[] | null; translatorLocales?: string[] | null };

const user = (req: PayloadRequest) => req.user as StaffUser | null;

/** Spec §3: who may see drafts (everyone else only sees published pages). */
const PAGE_READERS: Role[] = ["super_admin", "clergy_approver", "office_coordinator", "editor", "translator"];
const PAGE_EDITORS: Role[] = ["super_admin", "editor"];

const isPageEditor = (req: PayloadRequest) => isStaff(req) && hasRole(user(req), ...PAGE_EDITORS);

/** Translators (without an editor role) may only edit the languages assigned to them. */
const isTranslatorForLocale = (req: PayloadRequest) =>
  isStaff(req) &&
  hasRole(user(req), "translator") &&
  Boolean(req.locale && user(req)?.translatorLocales?.includes(req.locale));

const readPages: Access = ({ req }) =>
  isStaff(req) && hasRole(user(req), ...PAGE_READERS) ? true : { _status: { equals: "published" } };

const updatePages: Access = ({ req }) => isPageEditor(req) || isTranslatorForLocale(req);

/** Structure (address, section) is editors-only; translators change text. */
const editorsOnlyField: FieldAccess = ({ req }) => isPageEditor(req);

/** Translators save drafts; an editor reviews and publishes (proposal §7). */
const translatorsSaveDraftsOnly: CollectionBeforeChangeHook = ({ data, req }) => {
  if (req.user && !isPageEditor(req) && data?._status === "published") {
    throw new APIError("Translators can save drafts; an editor publishes the page.", 403);
  }
  return data;
};

const revalidation = revalidateTags(CACHE_TAGS.pages, CACHE_TAGS.layout);

export const Pages: CollectionConfig = {
  slug: "pages",
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "section", "slug", "_status", "updatedAt"],
    listSearchableFields: ["title", "slug"],
  },
  access: {
    read: readPages,
    create: ({ req }) => isPageEditor(req),
    update: updatePages,
    delete: ({ req }) => isPageEditor(req),
  },
  versions: {
    drafts: true,
    maxPerDoc: 50,
  },
  // Links to a page only need where it lives, not its whole layout.
  defaultPopulate: { title: true, slug: true, section: true },
  indexes: [{ fields: ["section", "slug"], unique: true }],
  hooks: {
    beforeChange: [translatorsSaveDraftsOnly],
    afterChange: revalidation.afterChange,
    afterDelete: revalidation.afterDelete,
  },
  fields: [
    { name: "title", type: "text", required: true, localized: true },
    {
      type: "row",
      fields: [
        {
          name: "section",
          type: "select",
          required: true,
          defaultValue: "other",
          options: PAGE_SECTIONS.map((s) => ({ ...s })),
          access: { update: editorsOnlyField },
          admin: { width: "50%" },
        },
        {
          name: "slug",
          type: "text",
          required: true,
          index: true,
          access: { update: editorsOnlyField },
          admin: {
            width: "50%",
            description: 'Address within the section, e.g. "history" → /our-church/history. Use "index" for the section\'s main page.',
          },
          validate: async (value: unknown, { req, id, data }: { req: PayloadRequest; id?: number | string; data: { section?: string } }) => {
            const format = validateSlugFormat(value);
            if (format !== true) return format;
            const slug = value as string;
            const section = data?.section ?? "other";
            if (section === "other" && RESERVED_TOP_LEVEL_SLUGS.has(slug)) {
              return `"/${slug}" is used by the site itself; choose another slug or a section.`;
            }
            const clash = await req.payload.find({
              collection: "pages",
              where: {
                and: [
                  { slug: { equals: slug } },
                  { section: { equals: section } },
                  ...(id ? [{ id: { not_equals: id } }] : []),
                ],
              },
              draft: true,
              limit: 1,
              depth: 0,
              overrideAccess: true,
              req,
            });
            return clash.totalDocs > 0 ? "Another page in this section already uses this slug." : true;
          },
        },
      ],
    },
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
                { name: "heading", type: "text", localized: true, admin: { description: "Defaults to the page title." } },
                { name: "subheading", type: "textarea", localized: true },
                { name: "ctas", type: "array", label: "Buttons", maxRows: 2, fields: labelledLinkFields() },
              ],
            },
          ],
        },
        {
          label: "Content",
          fields: [{ name: "layout", type: "blocks", blocks: pageBlocks }],
        },
        {
          label: "SEO",
          fields: [
            {
              name: "seo",
              type: "group",
              label: false,
              fields: [
                {
                  name: "title",
                  type: "text",
                  localized: true,
                  maxLength: 70,
                  admin: { description: "Search-result title. Defaults to the page title." },
                },
                { name: "description", type: "textarea", localized: true, maxLength: 160 },
                { name: "ogImage", type: "upload", relationTo: "media", label: "Share image" },
              ],
            },
          ],
        },
      ],
    },
  ],
};
