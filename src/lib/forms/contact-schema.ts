import { INQUIRY_LIMITS, type InquiryErrorCode, parseInquiry } from "./inquiry-schema";

/** The contact form's fields (Phase 1 task 6): the "contact" inquiry schema (D-033). */
export const CONTACT_LIMITS = INQUIRY_LIMITS;
export type ContactField = "name" | "email" | "phone" | "message" | "privacyAccepted";
export type ContactErrorCode = InquiryErrorCode;

export const parseContact = (raw: Record<string, unknown>) => parseInquiry("contact", raw);
