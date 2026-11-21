import { describe, expect, it } from "vitest";

import { baptismRequestPaths, BAPTISM_REQUEST_PATH, isContentGatedPath } from "../../src/lib/content-paths";
import { categoryFor, firstStepWithError, parseBaptism, parseBaptismStep } from "../../src/lib/forms/baptism-schema";

const details = {
  candidateName: "Liya Abebe",
  dateOfBirth: "2025-06-01",
  preferredPeriod: "",
  baptismalName: "",
  gender: "female",
  placeOfBirth: "Stockholm",
  fatherName: "Abebe Kebede",
  motherName: "Hana Tesfaye",
  godparentName: "",
  priestName: "",
  applicantName: "Abebe Kebede",
  applicantPhone: "070 123 45 67",
  applicantEmail: "abebe@example.org",
  guardianRelationship: "Father",
  guardianConsent: "on",
};
const adultDetails = { ...details, dateOfBirth: "1990-03-03", guardianRelationship: "", guardianConsent: undefined };

describe("baptism request form: two groups, then review (spec Phase 2 task 4, D-050)", () => {
  it("checks the details step in the reference layout's fields", () => {
    expect(parseBaptismStep("details", details)).toEqual({});
    expect(parseBaptismStep("details", { applicantEmail: "x", applicantPhone: "abc" })).toEqual({
      candidateName: "required",
      dateOfBirth: "required",
      gender: "choice",
      placeOfBirth: "required",
      fatherName: "required",
      motherName: "required",
      applicantName: "required",
      applicantPhone: "phone",
      applicantEmail: "email",
    });
  });

  it("works out infant / child / adult from the date of birth", () => {
    expect(categoryFor("2026-01-01", "2026-11-21")).toBe("infant");
    expect(categoryFor("2025-11-21", "2026-11-21")).toBe("child");
    expect(categoryFor("2008-11-22", "2026-11-21")).toBe("child");
    expect(categoryFor("2008-11-21", "2026-11-21")).toBe("adult");
  });

  it("requires the parent's relationship and consent unless the person is an adult", () => {
    expect(parseBaptismStep("details", { ...details, guardianRelationship: " ", guardianConsent: undefined })).toEqual({
      guardianRelationship: "required",
      guardianConsent: "consent",
    });
    expect(parseBaptismStep("details", adultDetails)).toEqual({});
  });

  it("checks the date of birth", () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    expect(parseBaptismStep("details", { ...details, dateOfBirth: "" })).toEqual({ dateOfBirth: "required" });
    expect(parseBaptismStep("details", { ...details, dateOfBirth: "2025-02-30" })).toEqual({ dateOfBirth: "date" });
    expect(parseBaptismStep("details", { ...details, dateOfBirth: "1899-12-31" })).toEqual({ dateOfBirth: "date" });
    expect(parseBaptismStep("details", { ...details, dateOfBirth: tomorrow })).toEqual({ dateOfBirth: "dateFuture" });
  });

  it("needs the privacy consent on the review step", () => {
    expect(parseBaptismStep("review", {})).toEqual({ privacyAccepted: "privacy" });
    expect(parseBaptismStep("review", { privacyAccepted: "on" })).toEqual({});
  });

  it("parses the whole request, dropping guardian details for an adult", () => {
    const adult = parseBaptism({ ...adultDetails, privacyAccepted: "on" });
    expect(adult).toMatchObject({ ok: true, data: { category: "adult", guardianRelationship: "", guardianConsent: false, privacyAccepted: true } });
    expect(parseBaptism({ ...details, privacyAccepted: "on" })).toMatchObject({ ok: true, data: { category: "child", gender: "female" } });
    const refused = parseBaptism({ ...details, applicantEmail: "", priestName: "x".repeat(101) });
    expect(refused).toEqual({ ok: false, errors: { applicantEmail: "required", priestName: "tooLong", privacyAccepted: "privacy" } });
    expect(firstStepWithError(refused.ok ? {} : refused.errors)).toBe("details");
    expect(firstStepWithError({ privacyAccepted: "privacy" })).toBe("review");
  });
});

describe("request form address (D-029)", () => {
  it("exists only while requests are open and the baptism page exists", () => {
    expect(isContentGatedPath(BAPTISM_REQUEST_PATH)).toBe(true);
    expect(baptismRequestPaths(["/sacraments/baptism"], true)).toEqual([BAPTISM_REQUEST_PATH]);
    expect(baptismRequestPaths(["/sacraments/baptism"], false)).toEqual([]);
    expect(baptismRequestPaths(["/sacraments/marriage"], true)).toEqual([]);
  });
});
