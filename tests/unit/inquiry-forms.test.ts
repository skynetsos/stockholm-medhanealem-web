import { describe, expect, it } from "vitest";

import { isContentGatedPath, sectionPaths, SUNDAY_SCHOOL_JOIN_PATH } from "../../src/lib/content-paths";
import { isInquiryForm, parseInquiry } from "../../src/lib/forms/inquiry-schema";

const contact = { name: "Abebe Kebede", email: "abebe@example.org", phone: "", privacyAccepted: "on" };

describe("inquiry forms (spec §2.14, Phase 2 task 7)", () => {
  it("accept only the public forms", () => {
    expect(["contact", "sunday_school", "marriage", "funeral", "volunteer"].every(isInquiryForm)).toBe(true);
    expect(isInquiryForm("pastoral")).toBe(false);
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

  it("marriage and fitihat: a message of at least 10 characters, like the contact form", () => {
    for (const form of ["marriage", "funeral"] as const) {
      expect(parseInquiry(form, { ...contact, message: "We plan to marry in May." }).ok).toBe(true);
      expect(parseInquiry(form, { ...contact, message: "Hi" })).toEqual({ ok: false, errors: { message: "messageShort" } });
    }
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
