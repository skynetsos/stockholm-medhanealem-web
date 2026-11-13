import type { Access, CollectionConfig } from "payload";

import { hasRole, hasRoleAccess, isStaff, type Role } from "../access";

/** Same roles as Media (spec §3). */
const AUDIO_EDITORS: Role[] = ["super_admin", "clergy_approver", "office_coordinator", "editor"];

/**
 * Staff see every recording; the public only those attached to a video/recording entry (the audio
 * player on /media/videos), which is when an editor has published it there (D-042).
 */
const readAudio: Access = ({ req }) => {
  if (isStaff(req) && hasRole(req.user as { roles?: string[] }, ...AUDIO_EDITORS, "translator")) return true;
  return { attached: { equals: true } };
};

/**
 * Sermon and liturgy recordings (spec Phase 3 task 3: "audio player for sermons", D-042), stored
 * with the other uploads and served from this site, so playing them loads nothing from elsewhere.
 * Shown through an entry in "Videos & recordings" with type "Audio".
 */
export const Audio: CollectionConfig = {
  slug: "audio",
  labels: { singular: "Audio recording", plural: "Audio recordings" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "filename", "attached", "updatedAt"],
    description: "MP3, M4A or Ogg recordings. To show one on the site, add it to an entry in Videos & recordings with type Audio.",
  },
  access: {
    read: readAudio,
    create: hasRoleAccess(...AUDIO_EDITORS),
    update: hasRoleAccess(...AUDIO_EDITORS),
    delete: hasRoleAccess(...AUDIO_EDITORS),
  },
  upload: {
    mimeTypes: ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/ogg"],
  },
  fields: [
    { name: "title", type: "text", required: true, localized: true, admin: { description: "For staff; the site shows the entry's title." } },
    {
      name: "attached",
      type: "checkbox",
      defaultValue: false,
      admin: { readOnly: true, position: "sidebar", description: "Set automatically while a Videos & recordings entry uses this file." },
    },
  ],
};
