import { APIError, type CollectionBeforeChangeHook, type CollectionConfig } from "payload";

import { staffContentAccess } from "../access/content";
import { stockholmDay } from "../fields/stockholmDate";
import { CACHE_TAGS, revalidateTags } from "../hooks/revalidate";
import { validateSlugFormat } from "../lib/pages";

/** Spec §3 (Pages row): editors and super_admin manage galleries; the public sees published ones. */
const { access, editorsOnlyField } = staffContentAccess({
  readers: ["super_admin", "clergy_approver", "office_coordinator", "editor", "translator"],
  editors: ["super_admin", "editor"],
  deleters: ["super_admin", "editor"],
  publicWhere: () => ({ published: { equals: true } }),
});
const structural = { access: { update: editorsOnlyField } };

type RelationValue = number | { id: number } | null | undefined;
const idOf = (v: RelationValue) => (v && typeof v === "object" ? v.id : v);

/** A published gallery must have at least one image the public may see (spec §2.8 permission). */
const publishGuard: CollectionBeforeChangeHook = async ({ data, req }) => {
  if (!data?.published) return data;
  const ids = ((data.images ?? []) as RelationValue[]).map(idOf).filter((id): id is number => typeof id === "number");
  const permitted = ids.length
    ? await req.payload.count({
        collection: "media",
        where: { and: [{ id: { in: ids } }, { permissionObtained: { equals: true } }] },
        overrideAccess: true,
        req,
      })
    : { totalDocs: 0 };
  if (permitted.totalDocs === 0) {
    throw new APIError('To publish a gallery, it needs at least one image with "Permission to publish".', 400);
  }
  return data;
};

const revalidation = revalidateTags(CACHE_TAGS.galleries);

/** Photo galleries (spec §2.9), shown at /media/galleries/<slug>. */
export const Galleries: CollectionConfig = {
  slug: "galleries",
  labels: { singular: "Gallery", plural: "Galleries" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "date", "published"],
    description: 'Only images with "Permission to publish" are shown; check photos of children carefully.',
  },
  access,
  defaultSort: "-date",
  defaultPopulate: { title: true, slug: true, date: true },
  hooks: {
    beforeChange: [publishGuard],
    afterChange: revalidation.afterChange,
    afterDelete: revalidation.afterDelete,
  },
  fields: [
    {
      type: "row",
      fields: [
        { name: "title", type: "text", required: true, localized: true, admin: { width: "60%" } },
        {
          name: "slug",
          type: "text",
          required: true,
          unique: true,
          ...structural,
          admin: { width: "40%", description: "Address: /media/galleries/<slug>" },
          validate: (value: unknown) => validateSlugFormat(value),
        },
      ],
    },
    stockholmDay({ name: "date", required: true, index: true, ...structural }),
    { name: "description", type: "textarea", localized: true },
    { name: "images", type: "upload", relationTo: "media", hasMany: true, required: true, minRows: 1, ...structural },
    {
      name: "published",
      type: "checkbox",
      defaultValue: false,
      ...structural,
      admin: { position: "sidebar", description: "Show on the public site." },
    },
  ],
};
