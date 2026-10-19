import { type Access, APIError, type CollectionBeforeChangeHook, type FieldAccess, type PayloadRequest, type Where } from "payload";

import { isStaff } from "./index";
import { hasRole, type Role } from "./roles";

/**
 * Shared access rules for public content with drafts (Pages, Teachings, …), following spec §3:
 * - `readers` see drafts; everyone else only sees published documents
 * - `editors` create and update; `deleters` delete; `publishers` may publish
 * - translators update only the languages assigned to them, and only as drafts
 */
export type ContentRoles = {
  readers: Role[];
  editors: Role[];
  deleters: Role[];
  publishers: Role[];
};

type StaffUser = { roles?: string[] | null; translatorLocales?: string[] | null };

export const staffUser = (req: PayloadRequest) => req.user as StaffUser | null;

export const hasStaffRole = (req: PayloadRequest, roles: Role[]) => isStaff(req) && hasRole(staffUser(req), ...roles);

/** A translator working in one of their assigned languages. */
export const isTranslatorForLocale = (req: PayloadRequest) =>
  isStaff(req) &&
  hasRole(staffUser(req), "translator") &&
  Boolean(req.locale && staffUser(req)?.translatorLocales?.includes(req.locale));

/**
 * Content without drafts (Events, Announcements): staff `readers` see everything; the public sees
 * what `publicWhere` allows (true = all, or a query such as "inside its publish window").
 */
export function staffContentAccess(roles: Omit<ContentRoles, "publishers"> & { publicWhere: () => Where | true }) {
  const read: Access = ({ req }) => (hasStaffRole(req, roles.readers) ? true : roles.publicWhere());
  const create: Access = ({ req }) => hasStaffRole(req, roles.editors);
  const update: Access = ({ req }) => hasStaffRole(req, roles.editors) || isTranslatorForLocale(req);
  const remove: Access = ({ req }) => hasStaffRole(req, roles.deleters);
  const editorsOnlyField: FieldAccess = ({ req }) => hasStaffRole(req, roles.editors);
  return { access: { read, create, update, delete: remove }, editorsOnlyField };
}

export function contentAccess(roles: ContentRoles) {
  const read: Access = ({ req }) => (hasStaffRole(req, roles.readers) ? true : { _status: { equals: "published" } });
  const create: Access = ({ req }) => hasStaffRole(req, roles.editors);
  const update: Access = ({ req }) => hasStaffRole(req, roles.editors) || isTranslatorForLocale(req);
  const remove: Access = ({ req }) => hasStaffRole(req, roles.deleters);

  /** Structural fields (address, category, …): editors only, never translators. */
  const editorsOnlyField: FieldAccess = ({ req }) => hasStaffRole(req, roles.editors);

  /** Only `publishers` may set a document to published (translators and others save drafts). */
  const publishersOnly: CollectionBeforeChangeHook = ({ data, req }) => {
    if (req.user && data?._status === "published" && !hasStaffRole(req, roles.publishers)) {
      throw new APIError("You can save drafts; publishing is done by someone with publishing rights.", 403);
    }
    return data;
  };

  /** Admin: show the Publish button only to `publishers` (the hook above is the real enforcement). */
  const publishButton = {
    path: "/components/admin/RolePublishButton#RolePublishButton",
    clientProps: { publisherRoles: roles.publishers },
  };

  return { access: { read, create, update, delete: remove }, editorsOnlyField, publishersOnly, publishButton };
}
