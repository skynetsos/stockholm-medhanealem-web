import { revalidateTag } from "next/cache";
import type { GlobalAfterChangeHook } from "payload";

export const LAYOUT_TAG = "layout-globals";

/** Refresh cached header/footer data on every locale after a global is saved. */
export const revalidateLayout: GlobalAfterChangeHook = ({ doc, req }) => {
  if (req.context?.disableRevalidate) return doc;
  try {
    revalidateTag(LAYOUT_TAG);
  } catch (error) {
    // Outside a Next.js request (scripts, tests) there is no cache to revalidate.
    req.payload.logger.debug({ msg: "revalidateTag skipped", error: String(error) });
  }
  return doc;
};
