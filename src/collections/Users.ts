import type { CollectionConfig } from "payload";

// Minimal auth collection so Payload boots; roles and MFA land in Phase 0 task 4.
export const Users: CollectionConfig = {
  slug: "users",
  auth: true,
  admin: {
    useAsTitle: "email",
  },
  fields: [],
};
