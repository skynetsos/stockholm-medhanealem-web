import { APIError, type CollectionConfig } from "payload";

import { isSuperAdmin, isSuperAdminField, isSuperAdminOrSelf, ROLES, systemOnly } from "../access";
import { localeNames, locales } from "../i18n/locales";
import { mfaEndpoints } from "../lib/mfa/endpoints";
import { MFA_SESSION_SECONDS } from "../lib/mfa/session";

const roleLabels: Record<(typeof ROLES)[number], string> = {
  super_admin: "Super admin",
  clergy_approver: "Clergy approver",
  office_coordinator: "Office coordinator",
  editor: "Editor",
  translator: "Translator",
  finance: "Finance",
};

/** Hidden MFA state: never returned by the API and never writable except by server code. */
const hiddenSystemField = { hidden: true, access: { create: systemOnly, update: systemOnly } } as const;

export const Users: CollectionConfig = {
  slug: "users",
  auth: {
    tokenExpiration: MFA_SESSION_SECONDS, // 8h sessions (spec §8)
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000,
    cookies: {
      sameSite: "Lax",
      secure: (process.env.NEXT_PUBLIC_SERVER_URL ?? "").startsWith("https://"),
    },
  },
  admin: {
    useAsTitle: "name",
    defaultColumns: ["name", "email", "roles", "active"],
  },
  access: {
    admin: ({ req }) => {
      const user = req.user as { active?: boolean | null; roles?: string[] | null } | null;
      return Boolean(user && user.active !== false && user.roles?.length);
    },
    create: isSuperAdmin,
    read: isSuperAdminOrSelf,
    update: isSuperAdminOrSelf,
    delete: isSuperAdmin,
    unlock: isSuperAdmin,
  },
  endpoints: mfaEndpoints,
  hooks: {
    beforeLogin: [
      ({ user }) => {
        if ((user as { active?: boolean | null }).active === false) {
          throw new APIError("This account is disabled.", 403);
        }
        return user;
      },
    ],
  },
  fields: [
    { name: "name", type: "text", required: true },
    {
      name: "roles",
      type: "select",
      hasMany: true,
      required: true,
      options: ROLES.map((value) => ({ value, label: roleLabels[value] })),
      access: { create: isSuperAdminField, update: isSuperAdminField },
    },
    {
      // Spec §2.1 calls this `locales`; renamed because Payload's localization table is
      // already `users_locales` (see docs/DECISIONS.md D-004).
      name: "translatorLocales",
      label: "Translator locales",
      type: "select",
      hasMany: true,
      options: locales.map((value) => ({ value, label: localeNames[value] })),
      access: { create: isSuperAdminField, update: isSuperAdminField },
      admin: {
        description: "Translators: which languages this user may edit.",
        condition: (data) => Boolean(data?.roles?.includes("translator")),
      },
    },
    {
      name: "active",
      type: "checkbox",
      defaultValue: true,
      access: { create: isSuperAdminField, update: isSuperAdminField },
    },
    {
      name: "mfa",
      type: "group",
      label: "Two-factor authentication",
      admin: { position: "sidebar" },
      fields: [
        {
          name: "enabled",
          type: "checkbox",
          defaultValue: false,
          admin: { readOnly: true },
          access: { create: systemOnly, update: systemOnly },
        },
        {
          name: "enrolledAt",
          type: "date",
          admin: { readOnly: true, date: { pickerAppearance: "dayAndTime" } },
          access: { create: systemOnly, update: systemOnly },
        },
        {
          name: "resetAction",
          type: "ui",
          admin: { components: { Field: "/components/admin/mfa/MfaResetButton#MfaResetButton" } },
        },
        { name: "secret", type: "text", ...hiddenSystemField },
        { name: "pendingSecret", type: "text", ...hiddenSystemField },
        { name: "recoveryCodes", type: "json", ...hiddenSystemField },
        { name: "lastTimeStep", type: "number", ...hiddenSystemField },
        { name: "failedAttempts", type: "number", defaultValue: 0, ...hiddenSystemField },
        { name: "lockedUntil", type: "date", ...hiddenSystemField },
      ],
    },
  ],
};
