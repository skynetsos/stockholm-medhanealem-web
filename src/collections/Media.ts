import type { Access, CollectionConfig } from "payload";

import { hasRole, hasRoleAccess, isStaff, type Role } from "../access";
import { revalidateLayoutOnChange } from "../hooks/revalidateLayout";

/** Roles that manage media (spec §3: CRUD). Translators may only read; finance has no access. */
const MEDIA_EDITORS: Role[] = ["super_admin", "clergy_approver", "office_coordinator", "editor"];
const MEDIA_READERS: Role[] = [...MEDIA_EDITORS, "translator"];

/**
 * Staff who may see media see all of it. Everyone else (the public site, anonymous API calls,
 * file downloads) only ever gets images whose publication permission is recorded.
 */
const readMedia: Access = ({ req }) => {
  if (isStaff(req) && hasRole(req.user as { roles?: string[] }, ...MEDIA_READERS)) return true;
  return { permissionObtained: { equals: true } };
};

export const Media: CollectionConfig = {
  slug: "media",
  labels: { singular: "Media item", plural: "Media" },
  admin: {
    useAsTitle: "alt",
    defaultColumns: ["filename", "alt", "permissionObtained", "containsMinors", "updatedAt"],
    description:
      "Only images with \"Permission to publish\" ticked appear on the public site. Never upload photos of other churches.",
  },
  access: {
    read: readMedia,
    create: hasRoleAccess(...MEDIA_EDITORS),
    update: hasRoleAccess(...MEDIA_EDITORS),
    delete: hasRoleAccess(...MEDIA_EDITORS),
  },
  hooks: { afterChange: [revalidateLayoutOnChange] },
  upload: {
    // Files live in S3 (see payload.config.ts) and are served through Payload, so the read
    // access rule above also protects the file URLs.
    // No SVG: an uploaded SVG is served from our own domain and can carry scripts.
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/avif"],
    focalPoint: true,
    adminThumbnail: "thumbnail",
    imageSizes: [
      { name: "thumbnail", width: 400 },
      { name: "card", width: 800 },
      { name: "hero", width: 1600 },
      { name: "og", width: 1200, height: 630, position: "centre" },
    ],
  },
  fields: [
    {
      name: "alt",
      type: "text",
      required: true,
      localized: true,
      admin: { description: "Describe the image for people who can't see it (required in every language you publish)." },
    },
    { name: "caption", type: "textarea", localized: true },
    { name: "credit", type: "text", admin: { description: "Photographer or source." } },
    {
      name: "permissionObtained",
      type: "checkbox",
      label: "Permission to publish",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description: "Tick only when the church has permission to publish this image (and from parents/guardians if minors appear).",
      },
    },
    {
      name: "containsMinors",
      type: "checkbox",
      label: "Shows children (under 18)",
      defaultValue: false,
      admin: {
        position: "sidebar",
        description: "Requires written permission from a parent or guardian before \"Permission to publish\" is ticked.",
      },
    },
  ],
};
