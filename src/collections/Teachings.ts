import { APIError, type CollectionBeforeChangeHook, type CollectionConfig, type FieldAccess } from "payload";

import { contentAccess, hasStaffRole } from "../access/content";
import { systemOnly } from "../access";
import { CACHE_TAGS, revalidateTags } from "../hooks/revalidate";
import { validateSlugFormat } from "../lib/pages";

/** Spec §2.3 categories. Christening, marriage and fitihat are also shown under Sacraments. */
export const TEACHING_CATEGORIES = [
  { value: "christening", label: "Christening (ክርስትና)" },
  { value: "marriage", label: "Marriage (ጋብቻ)" },
  { value: "fitihat", label: "Fitihat / funeral (ፍትሐት)" },
  { value: "mysteries", label: "The five mysteries" },
  { value: "sacraments", label: "The seven sacraments" },
  { value: "fasting", label: "Fasting" },
  { value: "prayers", label: "Prayers" },
  { value: "faq", label: "Questions & answers" },
] as const;

/**
 * Spec §3 (Teachings row): clergy and super_admin create, publish and delete; editors create and
 * edit but never publish; office reads; translators edit drafts in their own languages.
 */
const { access, editorsOnlyField, publishersOnly, publishButton } = contentAccess({
  readers: ["super_admin", "clergy_approver", "office_coordinator", "editor", "translator"],
  editors: ["super_admin", "clergy_approver", "editor"],
  deleters: ["super_admin", "clergy_approver"],
  publishers: ["super_admin", "clergy_approver"],
});

const clergyOnly: FieldAccess = ({ req }) => hasStaffRole(req, ["clergy_approver"]);

type RelationValue = number | string | { id: number | string } | null | undefined;
const idOf = (value: RelationValue) => (value && typeof value === "object" ? value.id : (value ?? null));
const changed = (a: unknown, b: unknown) => JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);

/**
 * Doctrinal content needs clergy approval (spec §2.3):
 * - a clergy member who publishes approves it (recorded automatically);
 * - nothing is published without an approver, who must be an active clergy_approver;
 * - if someone other than clergy changes the title or text, the approval is withdrawn for that
 *   version (the live, approved version stays online until clergy approve and publish the new one).
 */
const clergyApproval: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (!data) return data;
  const isClergy = hasStaffRole(req, ["clergy_approver"]);

  if (req.user && !isClergy && originalDoc && (changed(data.title, originalDoc.title) || changed(data.body, originalDoc.body))) {
    data.approvedBy = null;
    data.approvedAt = null;
  }

  if (data._status === "published" && isClergy && !idOf(data.approvedBy)) {
    data.approvedBy = req.user!.id;
  }

  const approverId = idOf(data.approvedBy);
  if (approverId) {
    const approver = await req.payload
      .findByID({ collection: "users", id: approverId, depth: 0, overrideAccess: true, req })
      .catch(() => null);
    if (!approver || approver.active === false || !approver.roles?.includes("clergy_approver")) {
      throw new APIError("The approver must be an active clergy member (role: clergy approver).", 400);
    }
    if (approverId !== idOf(originalDoc?.approvedBy) || !data.approvedAt) {
      data.approvedAt = new Date().toISOString();
    }
  } else {
    data.approvedAt = null;
  }

  if (data._status === "published" && !approverId) {
    throw new APIError("A clergy member must approve this teaching before it can be published.", 400);
  }
  return data;
};

const revalidation = revalidateTags(CACHE_TAGS.teachings);

export const Teachings: CollectionConfig = {
  slug: "teachings",
  labels: { singular: "Teaching", plural: "Teachings" },
  admin: {
    useAsTitle: "title",
    components: { edit: { PublishButton: publishButton } },
    defaultColumns: ["title", "category", "approvedBy", "_status", "updatedAt"],
    listSearchableFields: ["title", "slug"],
    description:
      "Faith teachings. Publishing requires approval by a clergy member; changes by others need re-approval.",
  },
  access,
  versions: { drafts: true, maxPerDoc: 50 },
  defaultPopulate: { title: true, slug: true, category: true },
  hooks: {
    beforeChange: [publishersOnly, clergyApproval],
    afterChange: revalidation.afterChange,
    afterDelete: revalidation.afterDelete,
  },
  fields: [
    { name: "title", type: "text", required: true, localized: true },
    {
      type: "row",
      fields: [
        {
          name: "category",
          type: "select",
          required: true,
          options: TEACHING_CATEGORIES.map((c) => ({ ...c })),
          access: { update: editorsOnlyField },
          admin: { width: "50%" },
        },
        {
          name: "slug",
          type: "text",
          required: true,
          unique: true,
          access: { update: editorsOnlyField },
          admin: { width: "50%", description: 'Address, e.g. "seven-sacraments" → /our-faith/seven-sacraments.' },
          validate: (value: unknown) => validateSlugFormat(value),
        },
      ],
    },
    { name: "body", type: "richText", required: true, localized: true },
    {
      name: "approvedBy",
      type: "relationship",
      relationTo: "users",
      // No filterOptions: Payload would re-check the stored approver with the *editor's* read access
      // (staff can only read their own user), breaking saves by a second clergy member. The
      // clergyApproval hook enforces that the approver is an active clergy_approver instead.
      access: { create: clergyOnly, update: clergyOnly },
      admin: {
        position: "sidebar",
        description: "Set automatically when a clergy member publishes. Cleared when someone else edits the text.",
      },
    },
    {
      name: "approvedAt",
      type: "date",
      access: { create: systemOnly, update: systemOnly },
      admin: { position: "sidebar", readOnly: true, date: { pickerAppearance: "dayAndTime" } },
    },
  ],
};
