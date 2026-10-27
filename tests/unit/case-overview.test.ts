import { describe, expect, it } from "vitest";

import { caseAgeDays, caseListHref, currentFilter } from "../../src/lib/cases/overview";

/** Payload parses list addresses with qs; this is the shape it hands to the list view. */
const parsed = (href: string) => {
  const where: { and: Record<string, Record<string, string>>[] } = { and: [] };
  for (const [key, value] of new URL(href, "http://x").searchParams) {
    const [, index, field, op] = key.match(/^where\[and\]\[(\d+)\]\[([^\]]+)\]\[(\w+)\]$/)!;
    where.and[Number(index)] = { ...where.and[Number(index)], [field]: { [op]: value } };
  }
  return { where: { and: where.and.filter(Boolean) } };
};

describe("case list filters (spec Phase 2 task 6)", () => {
  it("link to a status, the open cases, and the open cases assigned to someone", () => {
    expect(caseListHref("baptism-requests")).toBe("/admin/collections/baptism-requests");
    expect(decodeURIComponent(caseListHref("baptism-requests", { status: "clergy_review" }))).toBe(
      "/admin/collections/baptism-requests?where[and][0][status][equals]=clergy_review",
    );
    expect(decodeURIComponent(caseListHref("baptism-requests", { status: "open", assignedTo: 7 }))).toBe(
      "/admin/collections/baptism-requests?where[and][0][status][in]=new,info_needed,clergy_review,scheduling,confirmed&where[and][1][internal.assignedTo][equals]=7",
    );
    expect(decodeURIComponent(caseListHref("inquiries", { status: "open", assignedTo: 7 }))).toContain("[assignedTo][equals]=7");
  });

  it("recognise the filter the list shows", () => {
    for (const filter of [{ status: "new" }, { status: "open" }, { status: "open", assignedTo: "7" }]) {
      expect(currentFilter("baptism-requests", parsed(caseListHref("baptism-requests", filter)))).toEqual({ assignedTo: undefined, ...filter });
    }
    expect(currentFilter("inquiries", {})).toEqual({ status: undefined, assignedTo: undefined });
    // As Next.js hands the query to the page: flat keys.
    const flat = Object.fromEntries(new URL(caseListHref("baptism-requests", { status: "open", assignedTo: 3 }), "http://x").searchParams);
    expect(currentFilter("baptism-requests", flat)).toEqual({ status: "open", assignedTo: "3" });
  });

  it("count age in Stockholm calendar days", () => {
    const now = new Date("2026-10-27T10:00:00.000Z");
    expect(caseAgeDays("2026-10-27T05:00:00.000Z", now)).toBe(0);
    // 23:30 UTC on 26 October is already 27 October in Stockholm.
    expect(caseAgeDays("2026-10-26T23:30:00.000Z", now)).toBe(0);
    expect(caseAgeDays("2026-10-26T21:00:00.000Z", now)).toBe(1);
    expect(caseAgeDays("2026-09-27T10:00:00.000Z", now)).toBe(30);
  });
});
