import type { Department } from "../payload-types";
import { hasRichText } from "./richtext";

/** A department gets its own page once it has a summary or text (D-013). */
export const hasDepartmentContent = (d: Pick<Department, "summary" | "body">) => Boolean(d.summary?.trim() || hasRichText(d.body));
