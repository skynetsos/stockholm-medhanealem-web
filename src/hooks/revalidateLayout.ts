import { revalidateTag } from "next/cache";
import type { CollectionAfterChangeHook, GlobalAfterChangeHook, PayloadRequest } from "payload";

export const LAYOUT_TAG = "layout-globals";

function revalidateLayoutTag(req: PayloadRequest) {
  if (req.context?.disableRevalidate) return;
  try {
    revalidateTag(LAYOUT_TAG);
  } catch (error) {
    // Outside a Next.js request (scripts, tests) there is no cache to revalidate.
    req.payload.logger.debug({ msg: "revalidateTag skipped", error: String(error) });
  }
}

/** Refresh cached header/footer data on every locale after a global is saved. */
export const revalidateLayout: GlobalAfterChangeHook = ({ doc, req }) => {
  revalidateLayoutTag(req);
  return doc;
};

/** Same, for collections whose documents appear in the header/footer (e.g. the logo image). */
export const revalidateLayoutOnChange: CollectionAfterChangeHook = ({ doc, req }) => {
  revalidateLayoutTag(req);
  return doc;
};
