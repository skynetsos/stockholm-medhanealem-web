import type { Block } from "payload";

import { EVENT_TYPES } from "../collections/shared/eventTypes";
import { labelledLinkFields } from "../fields/link";
import { parseVideoUrl } from "../lib/video";

/**
 * Page layout blocks (spec §2.2). The block list itself is shared by all languages; the text inside
 * each block is localized. Rendering components live in src/components/blocks (Phase 1 task 5).
 */

const optionalHeading = { name: "heading", type: "text", localized: true } as const;

export const RichTextBlock: Block = {
  slug: "richText",
  labels: { singular: "Text", plural: "Text blocks" },
  fields: [{ name: "content", type: "richText", localized: true, required: true }],
};

export const TwoColumnBlock: Block = {
  slug: "twoColumn",
  labels: { singular: "Two columns", plural: "Two-column blocks" },
  fields: [
    { name: "left", type: "richText", localized: true, required: true },
    {
      name: "right",
      type: "richText",
      localized: true,
      admin: { description: "Leave empty to show the image instead." },
    },
    { name: "image", type: "upload", relationTo: "media" },
    {
      name: "imagePosition",
      type: "radio",
      defaultValue: "right",
      options: [
        { label: "Image right", value: "right" },
        { label: "Image left", value: "left" },
      ],
      admin: { condition: (_, sibling) => Boolean(sibling?.image) },
    },
  ],
};

export const ImageGalleryBlock: Block = {
  slug: "imageGallery",
  labels: { singular: "Image gallery", plural: "Image galleries" },
  fields: [
    optionalHeading,
    {
      name: "images",
      type: "upload",
      relationTo: "media",
      hasMany: true,
      required: true,
      minRows: 1,
      admin: { description: 'Only images with "Permission to publish" are shown on the site.' },
    },
  ],
};

export const CallToActionBlock: Block = {
  slug: "callToAction",
  labels: { singular: "Call to action", plural: "Calls to action" },
  fields: [
    { name: "heading", type: "text", localized: true, required: true },
    { name: "text", type: "textarea", localized: true },
    {
      name: "links",
      type: "array",
      minRows: 1,
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

export const FaqBlock: Block = {
  slug: "faq",
  labels: { singular: "FAQ", plural: "FAQs" },
  fields: [
    optionalHeading,
    {
      name: "items",
      type: "array",
      minRows: 1,
      fields: [
        { name: "question", type: "text", localized: true, required: true },
        { name: "answer", type: "richText", localized: true, required: true },
      ],
    },
  ],
};

export const ClergyGridBlock: Block = {
  slug: "clergyGrid",
  labels: { singular: "Clergy grid", plural: "Clergy grids" },
  fields: [
    optionalHeading,
    {
      name: "limit",
      type: "number",
      min: 1,
      max: 24,
      admin: { description: "Leave empty to show all published clergy, in their set order." },
    },
  ],
};

export const EventListBlock: Block = {
  slug: "eventList",
  labels: { singular: "Event list", plural: "Event lists" },
  fields: [
    optionalHeading,
    {
      name: "types",
      type: "select",
      hasMany: true,
      options: EVENT_TYPES.map((t) => ({ ...t })),
      admin: { description: "Leave empty to include all types." },
    },
    { name: "limit", type: "number", min: 1, max: 20, defaultValue: 5 },
  ],
};

export const VideoEmbedBlock: Block = {
  slug: "videoEmbed",
  labels: { singular: "Video", plural: "Videos" },
  fields: [
    {
      name: "url",
      type: "text",
      required: true,
      admin: { description: "YouTube or Vimeo link. Visitors load the video only after clicking (privacy)." },
      validate: (value: unknown) =>
        parseVideoUrl(typeof value === "string" ? value : "") ? true : "Enter a YouTube or Vimeo video link (https://…)",
    },
    {
      name: "title",
      type: "text",
      localized: true,
      required: true,
      admin: { description: "Short description of the video (used by screen readers)." },
    },
    { name: "caption", type: "textarea", localized: true },
  ],
};

export const pageBlocks: Block[] = [
  RichTextBlock,
  TwoColumnBlock,
  ImageGalleryBlock,
  CallToActionBlock,
  FaqBlock,
  ClergyGridBlock,
  EventListBlock,
  VideoEmbedBlock,
];
