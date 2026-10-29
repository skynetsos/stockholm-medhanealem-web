import type { Payload } from "payload";

import { type InquiryContext, inquiryRateLimiter, type InquiryResult, submitInquiry } from "./inquiry";

/** The contact form on /visit (Phase 1 task 6): an inquiry of type "contact" (D-033). */
export const contactRateLimiter = inquiryRateLimiter;
export type ContactResult = InquiryResult;

export const submitContact = (payload: Payload, raw: Record<string, unknown>, context: InquiryContext, deps?: Parameters<typeof submitInquiry>[4]) =>
  submitInquiry(payload, "contact", raw, context, deps);
