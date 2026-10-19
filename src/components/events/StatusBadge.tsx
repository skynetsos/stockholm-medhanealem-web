import { getTranslations } from "next-intl/server";

import type { OccurrenceStatus } from "@/lib/events/expand";

/** "Cancelled" / "Moved" label next to an occurrence; nothing for a normal date. */
export async function StatusBadge({ status }: { status: OccurrenceStatus }) {
  if (status === "scheduled") return null;
  const t = await getTranslations("events");
  return (
    <span
      className={`inline-block rounded px-2 py-0.5 text-sm font-semibold ${
        status === "cancelled" ? "bg-error text-white" : "bg-primary text-cream"
      }`}
    >
      {t(status)}
    </span>
  );
}
