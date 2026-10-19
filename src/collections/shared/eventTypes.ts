/** Event types from spec §2.4, shared by the Events collection (task 1d) and the EventList block. */
export const EVENT_TYPES = [
  { value: "weekly_service", label: "Weekly service" },
  { value: "monthly_feast", label: "Monthly feast" },
  { value: "annual_feast", label: "Annual feast" },
  { value: "fast", label: "Fast" },
  { value: "special", label: "Special event" },
  { value: "notice", label: "Notice" },
] as const;

export type EventType = (typeof EVENT_TYPES)[number]["value"];
