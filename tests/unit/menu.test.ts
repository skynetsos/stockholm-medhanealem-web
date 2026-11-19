import { describe, expect, it } from "vitest";

import { menuItems } from "../../src/lib/menu";

const link = (path: string) => ({ type: "internal" as const, path });
const available = ["/our-church", "/our-church/history", "/sunday-school"];

describe("menuItems (D-049 dropdown menu)", () => {
  it("turns items with visible children into dropdowns and leaves out children without a page", () => {
    const items = menuItems(
      [
        { id: "home", label: "Home", link: link("/") },
        {
          id: "church",
          label: "Our Church",
          link: { type: "internal", path: null },
          children: [
            { id: "about", label: "About Us", link: link("/our-church") },
            { id: "theology", label: "Theology", link: link("/our-church/theology") }, // no content yet
            { id: "story", label: "Our Story", link: link("/our-church/history") },
          ],
        },
      ],
      available,
    );
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ kind: "link", label: "Home" });
    expect(items[1]).toMatchObject({ kind: "dropdown", label: "Our Church" });
    expect(items[1].kind === "dropdown" && items[1].children.map((c) => c.label)).toEqual(["About Us", "Our Story"]);
  });

  it("hides a dropdown heading with no visible children and no page of its own", () => {
    const items = menuItems(
      [{ id: "events", label: "Events", link: { type: "internal", path: null }, children: [{ id: "news", label: "Announcements", link: link("/news") }] }],
      available,
    );
    expect(items).toEqual([]);
  });

  it("falls back to the item's own link when none of its children are shown", () => {
    const items = menuItems(
      [{ id: "ss", label: "Ministries", link: link("/sunday-school"), children: [{ id: "x", label: "Choir", link: link("/sunday-school/mezmur") }] }],
      available,
    );
    expect(items).toEqual([{ kind: "link", id: "ss", label: "Ministries", link: link("/sunday-school") }]);
  });

  it("skips items without a label", () => {
    expect(menuItems([{ id: "a", label: "  ", link: link("/") }], available)).toEqual([]);
  });
});
