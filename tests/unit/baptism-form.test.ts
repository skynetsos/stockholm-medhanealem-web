import { describe, expect, it } from "vitest";

import { baptismRequestPaths, BAPTISM_REQUEST_PATH, isContentGatedPath } from "../../src/lib/content-paths";
import { firstStepWithError, parseBaptism, parseBaptismStep } from "../../src/lib/forms/baptism-schema";

const applicant = { applicantName: "Abebe Kebede", applicantEmail: "abebe@example.org", applicantPhone: "", parishRelationship: "member" };
const child = {
  candidateName: "Liya Abebe",
  dateOfBirth: "2025-06-01",
  category: "child",
  guardianName: "Abebe Kebede",
  guardianRelationship: "Father",
  guardianConsent: "on",
  preferredPeriod: "",
  notes: "",
};

describe("baptism request form: steps (spec Phase 2 task 4)", () => {
  it("checks the applicant step", () => {
    expect(parseBaptismStep("applicant", applicant)).toEqual({});
    expect(parseBaptismStep("applicant", { applicantEmail: "x", applicantPhone: "abc" })).toEqual({
      applicantName: "required",
      applicantEmail: "email",
      applicantPhone: "phone",
      parishRelationship: "choice",
    });
  });

  it("requires the guardian and their consent unless the candidate is an adult", () => {
    expect(parseBaptismStep("candidate", child)).toEqual({});
    expect(parseBaptismStep("candidate", { ...child, guardianName: "", guardianRelationship: " ", guardianConsent: undefined })).toEqual({
      guardianName: "required",
      guardianRelationship: "required",
      guardianConsent: "consent",
    });
    expect(parseBaptismStep("candidate", { ...child, category: "adult", guardianName: "", guardianConsent: undefined })).toEqual({});
  });

  it("checks the date of birth", () => {
    const tomorrow = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    expect(parseBaptismStep("candidate", { ...child, dateOfBirth: "" })).toEqual({ dateOfBirth: "required" });
    expect(parseBaptismStep("candidate", { ...child, dateOfBirth: "2025-02-30" })).toEqual({ dateOfBirth: "date" });
    expect(parseBaptismStep("candidate", { ...child, dateOfBirth: "1899-12-31" })).toEqual({ dateOfBirth: "date" });
    expect(parseBaptismStep("candidate", { ...child, dateOfBirth: tomorrow })).toEqual({ dateOfBirth: "dateFuture" });
  });

  it("needs the privacy consent on the review step", () => {
    expect(parseBaptismStep("review", {})).toEqual({ privacyAccepted: "privacy" });
    expect(parseBaptismStep("review", { privacyAccepted: "on" })).toEqual({});
  });

  it("parses the whole request, dropping guardian details for an adult", () => {
    const adult = parseBaptism({ ...applicant, ...child, category: "adult", privacyAccepted: "on" });
    expect(adult).toMatchObject({ ok: true, data: { category: "adult", guardianName: "", guardianConsent: false, privacyAccepted: true } });
    const refused = parseBaptism({ ...applicant, applicantEmail: "", ...child, notes: "x".repeat(2001) });
    expect(refused).toEqual({ ok: false, errors: { applicantEmail: "required", notes: "tooLong", privacyAccepted: "privacy" } });
    expect(firstStepWithError(refused.ok ? {} : refused.errors)).toBe("applicant");
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
