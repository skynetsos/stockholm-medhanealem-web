import { readdirSync, readFileSync } from "fs";
import path from "path";
import { describe, expect, it } from "vitest";

/**
 * The browser only receives the message namespaces listed in PublicDocument (task 10). A client
 * component using another namespace would show raw keys, so keep the list complete.
 */
function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? files(path.join(dir, e.name)) : e.name.endsWith(".tsx") ? [path.join(dir, e.name)] : [],
  );
}

describe("client message namespaces", () => {
  it("cover every namespace used by a client component", () => {
    const listed = readFileSync("src/components/layout/PublicDocument.tsx", "utf8")
      .match(/CLIENT_NAMESPACES = \[([^\]]+)\]/)![1]
      .match(/"(\w+)"/g)!
      .map((s) => s.replaceAll('"', ""));
    const used = files("src")
      .map((f) => readFileSync(f, "utf8"))
      .filter((source) => source.startsWith('"use client"'))
      .flatMap((source) => [...source.matchAll(/useTranslations\("(\w+)"\)/g)].map((m) => m[1]));
    expect([...new Set(used)].filter((ns) => !listed.includes(ns))).toEqual([]);
  });
});
