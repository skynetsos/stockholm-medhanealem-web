import { APIError, type CollectionBeforeChangeHook, type CollectionConfig } from "payload";

import { staffContentAccess } from "../access/content";
import { CACHE_TAGS, revalidateTags } from "../hooks/revalidate";
import { defaultLocale } from "../i18n/locales";
import { hasRichText } from "../lib/richtext";

/**
 * Spec §3 (Clergy row): super_admin and clergy manage profiles (incl. delete); editors create and
 * edit; office reads; translators edit text. The public sees published profiles only.
 */
const { access, editorsOnlyField } = staffContentAccess({
  readers: ["super_admin", "clergy_approver", "office_coordinator", "editor", "translator"],
  editors: ["super_admin", "clergy_approver", "editor"],
  deleters: ["super_admin", "clergy_approver"],
  publicWhere: () => ({ published: { equals: true } }),
});
const structural = { access: { update: editorsOnlyField } };

type RelationValue = number | { id: number } | null | undefined;
const idOf = (v: RelationValue) => (v && typeof v === "object" ? v.id : (v ?? null));

/**
 * Spec §2.6: a profile can only be published with a photo and a bio in the default language
 * (Amharic), so the public site never shows "photo missing" placeholders. The photo must also have
 * publication permission, otherwise it would be hidden on the site anyway.
 */
const publishGuard: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (!data?.published) return data;
  const problems: string[] = [];

  const photoId = idOf(data.photo ?? originalDoc?.photo);
  if (!photoId) {
    problems.push("add a photo");
  } else {
    const photo = await req.payload
      .findByID({ collection: "media", id: photoId, depth: 0, overrideAccess: true, req })
      .catch(() => null);
    if (!photo?.permissionObtained) problems.push('tick "Permission to publish" on the photo');
  }

  let amharicBio: unknown = data.bio;
  if (req.locale && req.locale !== defaultLocale) {
    amharicBio = originalDoc?.id
      ? (
          await req.payload.findByID({
            collection: "clergy",
            id: originalDoc.id,
            locale: defaultLocale,
            fallbackLocale: false,
            depth: 0,
            overrideAccess: true,
            req,
          })
        ).bio
      : null;
  }
  if (!hasRichText(amharicBio)) problems.push("write the bio in Amharic (አማርኛ)");

  if (problems.length) throw new APIError(`To publish this profile, ${problems.join(" and ")}.`, 400);
  return data;
};

const revalidation = revalidateTags(CACHE_TAGS.clergy);

export const Clergy: CollectionConfig = {
  slug: "clergy",
  labels: { singular: "Clergy member", plural: "Clergy" },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "title", "order", "published"],
    description: "Profiles for the Clergy page. Publishing needs a photo (with permission) and an Amharic bio.",
  },
  access,
  defaultSort: "order",
  hooks: {
    beforeChange: [publishGuard],
    afterChange: revalidation.afterChange,
    afterDelete: revalidation.afterDelete,
  },
  fields: [
    {
      type: "row",
      fields: [
        { name: "name", type: "text", required: true, localized: true, admin: { width: "60%" } },
        {
          name: "title",
          type: "text",
          localized: true,
          admin: {
            width: "40%",
            description: "As the church writes it, e.g. ቀሲስ, መልአከ ሰላም, ዲያቆን (and the English form in English).",
          },
        },
      ],
    },
    { name: "bio", type: "richText", localized: true },
    { name: "photo", type: "upload", relationTo: "media", ...structural },
    {
      name: "order",
      type: "number",
      defaultValue: 100,
      ...structural,
      admin: { position: "sidebar", description: "Lower numbers are shown first." },
    },
    {
      name: "published",
      type: "checkbox",
      defaultValue: false,
      ...structural,
      admin: { position: "sidebar", description: "Show on the public site." },
    },
  ],
};
