import type { DateField } from "payload";

/** The site's only time zone: admins enter local Stockholm times; Payload stores UTC (+ zone). */
export const STOCKHOLM_TIMEZONE = { label: "Stockholm", value: "Europe/Stockholm" };

/** The zone is required exactly when the date is (an optional "new end" may stay empty). */
const timezoneFor = (field: Omit<DateField, "type">) => ({
  supportedTimezones: [STOCKHOLM_TIMEZONE],
  defaultTimezone: STOCKHOLM_TIMEZONE.value,
  required: Boolean(field.required),
});

/** Date + time in Europe/Stockholm. */
export function stockholmDateTime(field: Omit<DateField, "type">): DateField {
  return {
    ...field,
    type: "date",
    timezone: timezoneFor(field),
    admin: { ...field.admin, date: { pickerAppearance: "dayAndTime", timeIntervals: 15, ...field.admin?.date } },
  } as DateField;
}

/** A calendar day in Europe/Stockholm (stored as that day's local midnight, in UTC). */
export function stockholmDay(field: Omit<DateField, "type">): DateField {
  return {
    ...field,
    type: "date",
    timezone: timezoneFor(field),
    admin: { ...field.admin, date: { pickerAppearance: "dayOnly", ...field.admin?.date } },
  } as DateField;
}
