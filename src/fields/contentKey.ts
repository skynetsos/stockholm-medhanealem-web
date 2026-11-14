import type { TextField } from "payload";

/**
 * Key of an item that comes from the church's written content (docs/content, D-045). The importer
 * finds the item by this key, so a corrected document updates it instead of adding a copy, even
 * after an editor changes its title or address. Set only by the importer (system).
 */
export const contentKeyField: TextField = {
  name: "contentKey",
  type: "text",
  unique: true,
  index: true,
  access: { update: () => false, create: () => false },
  admin: {
    position: "sidebar",
    readOnly: true,
    condition: (data) => Boolean(data?.contentKey),
    description: "Imported from the church's written content (docs/content). Re-importing a corrected text updates this item.",
  },
};
