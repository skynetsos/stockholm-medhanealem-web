import { describe, expect, it } from "vitest";

import { isContentGatedPath, sectionPaths, SUNDAY_SCHOOL_JOIN_PATH } from "../../src/lib/content-paths";
import { isInquiryForm, MARRIAGE_STEPS, parseInquiry, parseInquiryFields } from "../../src/lib/forms/inquiry-schema";

const contact = { name: "Abebe Kebede", email: "abebe@example.org", phone: "", privacyAccepted: "on" };

describe("inquiry forms (spec §2.14, Phase 2 task 7)", () => {
  it("accept only the public forms", () => {
    expect(["contact", "sunday_school", "marriage", "funeral", "pastoral", "volunteer"].every(isInquiryForm)).toBe(true);
    expect(isInquiryForm("baptism")).toBe(false);
  });

  it("Sunday School: needs the child's name and an age from 3 to 18; the message is optional", () => {
    expect(parseInquiry("sunday_school", { ...contact, childName: "Liya", childAge: "7" })).toMatchObject({ ok: true, data: { childName: "Liya", childAge: 7, message: "" } });
    expect(parseInquiry("sunday_school", { ...contact, childName: "", childAge: "2" })).toEqual({ ok: false, errors: { childName: "required", childAge: "childAge" } });
    expect(parseInquiry("sunday_school", { ...contact, childName: "Liya", childAge: "seven" })).toMatchObject({ errors: { childAge: "childAge" } });
    expect(parseInquiry("sunday_school", { ...contact, childName: "Liya", childAge: "" })).toMatchObject({ errors: { childAge: "required" } });
  });

  it("volunteer: at least one known way to help; availability and message optional", () => {
    expect(parseInquiry("volunteer", { ...contact, interests: ["choir", "media"] })).toMatchObject({ ok: true, data: { interests: ["choir", "media"], availability: "" } });
    expect(parseInquiry("volunteer", { ...contact, interests: "choir" })).toMatchObject({ ok: true, data: { interests: ["choir"] } });
    expect(parseInquiry("volunteer", { ...contact, interests: [] })).toEqual({ ok: false, errors: { interests: "interests" } });
    expect(parseInquiry("volunteer", { ...contact, interests: ["hacking"] })).toEqual({ ok: false, errors: { interests: "interests" } });
  });

  const inAYear = new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10);
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);

  it("wedding (D-050): groom, bride and both phones, then email; the date in the future; notes optional", () => {
    const couple = { name: "Dawit", partnerName: "Mahlet", phone: "070 111 22 33", partnerPhone: "070 444 55 66" };
    expect(parseInquiry("marriage", { ...couple, email: "d@example.org", preferredDate: inAYear, privacyAccepted: "on" })).toMatchObject({
      ok: true,
      data: { partnerName: "Mahlet", preferredDate: inAYear, message: "" },
    });
    // "Next" checks only the first step's fields.
    expect(parseInquiryFields("marriage", { name: "Dawit" }, MARRIAGE_STEPS[0].fields)).toEqual({
      partnerName: "required",
      phone: "required",
      partnerPhone: "required",
    });
    expect(parseInquiryFields("marriage", couple, MARRIAGE_STEPS[0].fields)).toEqual({});
    expect(parseInquiry("marriage", { ...couple, email: "d@example.org", preferredDate: yesterday, privacyAccepted: "on" })).toMatchObject({
      errors: { preferredDate: "datePast" },
    });
  });

  it("memorial (fitihat): the departed's name required; the date of passing not in the future", () => {
    const base = { name: "Saba", phone: "070 111 22 33", email: "s@example.org", privacyAccepted: "on" };
    expect(parseInquiry("funeral", { ...base, deceasedName: "Kebede", dateOfPassing: yesterday })).toMatchObject({ ok: true });
    expect(parseInquiry("funeral", { ...base, deceasedName: "", dateOfPassing: inAYear, preferredDate: "2026-02-30" })).toEqual({
      ok: false,
      errors: { deceasedName: "required", dateOfPassing: "dateFuture", preferredDate: "date" },
    });
  });

  it("prayer request: phone required, email optional, a known request type; a priest id or none", () => {
    const base = { name: "Saba", phone: "070 111 22 33", privacyAccepted: "on" };
    expect(parseInquiry("pastoral", { ...base, requestType: "confession" })).toMatchObject({ ok: true, data: { email: "", priest: "" } });
    expect(parseInquiry("pastoral", { ...base, requestType: "sick", priest: "12", email: "s@example.org" })).toMatchObject({ ok: true, data: { priest: "12" } });
    expect(parseInquiry("pastoral", { ...base, phone: "", requestType: "nonsense", priest: "x" })).toEqual({
      ok: false,
      errors: { priest: "choice", phone: "required", requestType: "choice" },
    });
  });

  it("all need contact details and the privacy consent", () => {
    expect(parseInquiry("volunteer", { name: "", email: "x", interests: ["choir"] })).toEqual({
      ok: false,
      errors: { name: "required", email: "email", privacyAccepted: "privacy" },
    });
  });
});

describe("Sunday School registration address (D-033)", () => {
  it("exists with the Sunday School section", () => {
    expect(isContentGatedPath(SUNDAY_SCHOOL_JOIN_PATH)).toBe(true);
    const empty = { departments: [], posts: [], galleries: [], hasVideos: false };
    expect(sectionPaths({ ...empty, hasSundaySchoolIntro: true })).toContain(SUNDAY_SCHOOL_JOIN_PATH);
    expect(sectionPaths({ ...empty, hasSundaySchoolIntro: false })).not.toContain(SUNDAY_SCHOOL_JOIN_PATH);
  });
});
