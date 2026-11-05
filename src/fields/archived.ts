import type { Validate } from "payload";

/**
 * Cases archived by the retention job (D-035) have their personal data removed, so fields that are
 * otherwise required may be empty once `archivedAt` is set.
 */
export const isArchived = (data: unknown) => Boolean((data as { archivedAt?: unknown } | undefined)?.archivedAt);

export const requiredUnlessArchived: Validate = (value, { data }) =>
  isArchived(data) || (value !== null && value !== undefined && value !== "") ? true : "Required.";
