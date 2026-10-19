import { APIError, type CollectionBeforeChangeHook, type CollectionConfig, type FieldHook } from "payload";

import { staffContentAccess } from "../access/content";
import { stockholmDateTime, stockholmDay } from "../fields/stockholmDate";
import { CACHE_TAGS, revalidateTags } from "../hooks/revalidate";
import { formatIsoDate, gregorianToJdn, stockholmDate, toEthiopian } from "../lib/ethiopian-calendar";
import { ethiopianAnchor, occursOn, type Recurrence } from "../lib/events/recurrence";
import { EVENT_TYPES } from "./shared/eventTypes";

/** Spec §3 (Events row): editors and super_admin manage events; clergy/office read; translators edit text. */
const { access, editorsOnlyField } = staffContentAccess({
  readers: ["super_admin", "clergy_approver", "office_coordinator", "editor", "translator"],
  editors: ["super_admin", "editor"],
  deleters: ["super_admin", "editor"],
  publicWhere: () => true,
});
const structural = { access: { update: editorsOnlyField } };

type OverrideRow = {
  date?: string | null;
  action?: "cancel" | "move" | "notice" | null;
  newStart?: string | null;
  newEnd?: string | null;
};

const fail = (message: string): never => {
  throw new APIError(message, 400);
};

/**
 * Keeps an event consistent before saving:
 * - end is after start; `until` is after start
 * - monthly/yearly rules store their Ethiopian day/month (defaulting to the first occurrence's)
 * - every per-date override targets a real occurrence of the series, at most once per date;
 *   a "move" has a new start (and an end after it)
 */
const validateEvent: CollectionBeforeChangeHook = ({ data }) => {
  if (!data?.start) return data;
  const start = new Date(data.start).getTime();
  if (data.end && new Date(data.end).getTime() < start) fail("The end must be after the start.");

  const recurrence: Recurrence = data.recurrence ?? {};
  const frequency = recurrence.frequency ?? "none";
  if (recurrence.until && new Date(recurrence.until).getTime() < start) fail('"Repeat until" must be after the start.');
  if (frequency === "monthly" || frequency === "yearly") {
    const anchor = ethiopianAnchor({ start: data.start, recurrence: { ...recurrence, frequency } });
    data.recurrence = {
      ...recurrence,
      ethiopianDay: anchor.day,
      ethiopianMonth: frequency === "yearly" ? anchor.month : null,
    };
    if (anchor.day < 1 || anchor.day > 30) fail("The Ethiopian day must be between 1 and 30.");
    if (frequency === "yearly" && (anchor.month < 1 || anchor.month > 13)) fail("The Ethiopian month must be between 1 and 13.");
  } else {
    data.recurrence = { ...recurrence, frequency, ethiopianDay: null, ethiopianMonth: null };
  }

  const seen = new Set<number>();
  for (const [i, row] of ((data.overrides ?? []) as OverrideRow[]).entries()) {
    const label = `Date change ${i + 1}`;
    if (!row.date) fail(`${label}: choose the date.`);
    const day = stockholmDate(row.date!);
    const key = gregorianToJdn(day);
    if (seen.has(key)) fail(`${label}: ${formatIsoDate(day)} already has a change.`);
    seen.add(key);
    if (!occursOn({ start: data.start, recurrence: data.recurrence }, day)) {
      fail(`${label}: the event does not take place on ${formatIsoDate(day)}.`);
    }
    if (row.action === "move") {
      if (!row.newStart) fail(`${label}: a moved occurrence needs its new start.`);
      if (row.newEnd && new Date(row.newEnd).getTime() < new Date(row.newStart!).getTime()) {
        fail(`${label}: the new end must be after the new start.`);
      }
    }
  }
  return data;
};

/** Ethiopian date of the (first) occurrence, computed on read: "YYYY-MM-DD" (Ethiopian calendar). */
const computeEthiopianDate: FieldHook = ({ siblingData }) =>
  siblingData?.start ? formatIsoDate(toEthiopian(stockholmDate(siblingData.start))) : null;

const revalidation = revalidateTags(CACHE_TAGS.events);

export const Events: CollectionConfig = {
  slug: "events",
  labels: { singular: "Event", plural: "Events" },
  admin: {
    useAsTitle: "title",
    defaultColumns: ["title", "type", "start", "recurrence.frequency", "cancelled", "featured"],
    listSearchableFields: ["title"],
    description: "Services, feasts, fasts and notices. Times are Stockholm time.",
  },
  access,
  hooks: {
    beforeChange: [validateEvent],
    afterChange: revalidation.afterChange,
    afterDelete: revalidation.afterDelete,
  },
  fields: [
    { name: "title", type: "text", required: true, localized: true },
    {
      type: "row",
      fields: [
        { name: "type", type: "select", required: true, options: EVENT_TYPES.map((t) => ({ ...t })), ...structural },
        {
          name: "allDay",
          type: "checkbox",
          defaultValue: false,
          ...structural,
          admin: { style: { alignSelf: "flex-end" } },
        },
      ],
    },
    {
      type: "row",
      fields: [
        stockholmDateTime({ name: "start", required: true, index: true, ...structural, admin: { width: "50%" } }),
        stockholmDateTime({ name: "end", ...structural, admin: { width: "50%" } }),
      ],
    },
    {
      name: "ethiopianDate",
      type: "text",
      virtual: true,
      admin: { readOnly: true, description: "Ethiopian calendar date of the start (year-month-day), computed automatically." },
      hooks: { afterRead: [computeEthiopianDate] },
    },
    { name: "description", type: "textarea", localized: true },
    {
      name: "location",
      type: "text",
      localized: true,
      admin: { description: "Leave empty to use the default location from Site settings." },
    },
    {
      name: "livestreamUrl",
      type: "text",
      label: "Livestream link",
      ...structural,
      validate: (value: unknown) => {
        if (!value) return true;
        try {
          return new URL(String(value)).protocol === "https:" ? true : "Use an https:// link";
        } catch {
          return "Enter a full link starting with https://";
        }
      },
    },
    {
      name: "recurrence",
      type: "group",
      label: "Repeats",
      admin: {
        description:
          "Monthly and yearly repeat on the Ethiopian calendar (e.g. the 27th of every month). Movable feasts such as Fasika are added as separate events each year.",
      },
      fields: [
        {
          type: "row",
          fields: [
            {
              name: "frequency",
              type: "select",
              defaultValue: "none",
              options: [
                { label: "Does not repeat", value: "none" },
                { label: "Every week (same weekday)", value: "weekly" },
                { label: "Every Ethiopian month (same day)", value: "monthly" },
                { label: "Every Ethiopian year (same month and day)", value: "yearly" },
              ],
              ...structural,
            },
            {
              name: "ethiopianDay",
              type: "number",
              min: 1,
              max: 30,
              ...structural,
              admin: {
                condition: (_, sibling) => ["monthly", "yearly"].includes(sibling?.frequency),
                description: "Defaults to the Ethiopian day of the start date.",
              },
            },
            {
              name: "ethiopianMonth",
              type: "number",
              min: 1,
              max: 13,
              ...structural,
              admin: {
                condition: (_, sibling) => sibling?.frequency === "yearly",
                description: "1 = Meskerem … 13 = Pagume. Defaults to the start date's month.",
              },
            },
          ],
        },
        stockholmDay({
          name: "until",
          label: "Repeat until",
          ...structural,
          admin: { condition: (_, sibling) => Boolean(sibling?.frequency && sibling.frequency !== "none") },
        }),
      ],
    },
    {
      name: "overrides",
      type: "array",
      label: "Changes to single dates",
      labels: { singular: "Date change", plural: "Date changes" },
      admin: {
        description:
          "Cancel, move or add a notice to one occurrence without changing the rest of the series (e.g. no Kidase on one Sunday).",
        initCollapsed: true,
      },
      fields: [
        {
          type: "row",
          fields: [
            stockholmDay({ name: "date", required: true, ...structural, admin: { width: "50%" } }),
            {
              name: "action",
              type: "select",
              required: true,
              defaultValue: "cancel",
              options: [
                { label: "Cancel this date", value: "cancel" },
                { label: "Move this date", value: "move" },
                { label: "Add a notice for this date", value: "notice" },
              ],
              ...structural,
              admin: { width: "50%" },
            },
          ],
        },
        {
          type: "row",
          fields: [
            stockholmDateTime({
              name: "newStart",
              label: "New start",
              ...structural,
              admin: { width: "50%", condition: (_, sibling) => sibling?.action === "move" },
            }),
            stockholmDateTime({
              name: "newEnd",
              label: "New end",
              ...structural,
              admin: { width: "50%", condition: (_, sibling) => sibling?.action === "move" },
            }),
          ],
        },
        {
          name: "note",
          type: "text",
          localized: true,
          admin: { description: "Shown with this date on the site, e.g. the reason or where to go instead." },
        },
      ],
    },
    {
      name: "cancelled",
      type: "checkbox",
      defaultValue: false,
      ...structural,
      admin: { position: "sidebar", description: "Cancels the whole event or series (shown struck through with a notice)." },
    },
    {
      name: "featured",
      type: "checkbox",
      defaultValue: false,
      ...structural,
      admin: { position: "sidebar", description: "Highlight on the home page." },
    },
  ],
};
