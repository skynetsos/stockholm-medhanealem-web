import { describe, expect, it } from "vitest";

import { allowedTransitions, BAPTISM_STATUS_VALUES, checkTransition, isFinal } from "../../src/lib/baptism/state";

const office = { roles: ["office_coordinator"] };
const clergy = { roles: ["clergy_approver"] };
const admin = { roles: ["super_admin"] };
const editor = { roles: ["editor"] };

describe("baptism status machine (spec Phase 2 task 2)", () => {
  it("allows exactly the spec's transitions", () => {
    const all = Object.fromEntries(BAPTISM_STATUS_VALUES.map((from) => [from, allowedTransitions(from)]));
    expect(all).toEqual({
      new: ["info_needed", "clergy_review", "declined"],
      info_needed: ["clergy_review", "declined"],
      clergy_review: ["scheduling", "info_needed", "declined"],
      scheduling: ["confirmed", "info_needed"],
      confirmed: ["completed", "scheduling"],
      completed: [],
      declined: [],
    });
    expect(isFinal("completed")).toBe(true);
    expect(isFinal("declined")).toBe(true);
    expect(isFinal("confirmed")).toBe(false);
  });

  it("refuses skipping steps and leaving a final status", () => {
    expect(checkTransition("new", "confirmed", office)).toEqual({ ok: false, reason: "invalid" });
    expect(checkTransition("new", "scheduling", office)).toEqual({ ok: false, reason: "invalid" });
    expect(checkTransition("completed", "confirmed", admin)).toEqual({ ok: false, reason: "invalid" });
    expect(checkTransition("declined", "new", admin)).toEqual({ ok: false, reason: "invalid" });
  });

  it("lets only clergy approvers decide a case under clergy review", () => {
    expect(allowedTransitions("clergy_review", clergy)).toEqual(["scheduling", "info_needed", "declined"]);
    expect(allowedTransitions("clergy_review", office)).toEqual([]);
    expect(allowedTransitions("clergy_review", admin)).toEqual([]);
    expect(checkTransition("clergy_review", "scheduling", office)).toEqual({ ok: false, reason: "role" });
  });

  it("leaves every other step to the office and super admins", () => {
    expect(allowedTransitions("new", office)).toEqual(["info_needed", "clergy_review", "declined"]);
    expect(allowedTransitions("scheduling", admin)).toEqual(["confirmed", "info_needed"]);
    expect(allowedTransitions("new", clergy)).toEqual([]);
    expect(allowedTransitions("confirmed", clergy)).toEqual([]);
    expect(allowedTransitions("new", editor)).toEqual([]);
    expect(allowedTransitions("new", { roles: ["clergy_approver", "office_coordinator"] })).toHaveLength(3);
  });
});
