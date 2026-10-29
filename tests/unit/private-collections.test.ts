/**
 * Request records are never server-rendered into public pages (CLAUDE.md, spec §3): no code behind
 * the public site may load them. Staff see them only in the Payload admin.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");
const PUBLIC_CODE = ["src/app/(frontend)", "src/app/api", "src/app/robots.ts", "src/app/sitemap.ts", "src/components", "src/lib/cms", "src/middleware.ts"];
const PRIVATE_SLUGS = ["baptism-requests", "case-events", "inquiries"];
/** Admin components render only inside the signed-in Payload admin (with access control). */
const ADMIN_ONLY = path.join("src", "components", "admin");

function files(entry: string): string[] {
  const full = path.join(ROOT, entry);
  if (!statSync(full).isDirectory()) return [full];
  return readdirSync(full).flatMap((name) => files(path.join(entry, name)));
}

describe("private collections", () => {
  it("are never read by the code behind public pages", () => {
    const offenders = PUBLIC_CODE.flatMap(files)
      .filter((file) => /\.(ts|tsx)$/.test(file) && !path.relative(ROOT, file).startsWith(ADMIN_ONLY))
      .flatMap((file) => {
        const source = readFileSync(file, "utf8");
        return PRIVATE_SLUGS.filter((slug) => new RegExp(`collection:\\s*["']${slug}["']`).test(source)).map(
          (slug) => `${path.relative(ROOT, file)} → ${slug}`,
        );
      });
    expect(offenders).toEqual([]);
  });
});
