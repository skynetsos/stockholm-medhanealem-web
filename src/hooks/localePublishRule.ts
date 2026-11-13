import { APIError, type CollectionBeforeChangeHook } from "payload";

import { hasText } from "../lib/translations/coverage";

/**
 * Spec Phase 3 task 1 (D-041): publishing a page in a language requires that language's own title
 * and body. Payload saves one language at a time (the one chosen in the admin's language menu), so a
 * page published while editing English must have English title and text; the other languages keep
 * falling back to Amharic on the site until they are translated.
 */
export const requireLocaleContentToPublish: CollectionBeforeChangeHook = ({ data, req }) => {
  if (!data || data._status !== "published") return data;
  const missing = [!hasText(data.title) && "title", !hasText(data.layout) && "text"].filter(Boolean);
  if (missing.length) {
    throw new APIError(
      `To publish in ${req.locale ?? "this language"}, the page needs its own ${missing.join(" and ")} in that language. Save as draft until it is translated.`,
      400,
    );
  }
  return data;
};
