import { describe, expect, it } from "vitest";

import am from "../../src/messages/am.json";
import en from "../../src/messages/en.json";
import sv from "../../src/messages/sv.json";

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ""): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return typeof value === "string" ? { ...acc, [path]: value } : { ...acc, ...flatten(value, path) };
  }, {});
}

const placeholders = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

const reference = flatten(en);

describe.each([
  ["am", am],
  ["sv", sv],
])("messages/%s.json", (_locale, messages) => {
  const flat = flatten(messages);

  it("has exactly the same keys as en.json", () => {
    expect(Object.keys(flat).sort()).toEqual(Object.keys(reference).sort());
  });

  it("has no empty strings and keeps the same {placeholders}", () => {
    for (const [key, text] of Object.entries(flat)) {
      expect(text.trim(), key).not.toBe("");
      expect(placeholders(text), key).toEqual(placeholders(reference[key] ?? ""));
    }
  });
});

it("Amharic strings are written in Ethiopic script", () => {
  const flat = flatten(am);
  const ethiopic = /[ሀ-፿]/;
  const exempt = new Set(["footer.copyright"]);
  for (const [key, text] of Object.entries(flat)) {
    if (!exempt.has(key)) expect(ethiopic.test(text), key).toBe(true);
  }
});
