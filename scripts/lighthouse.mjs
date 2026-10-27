// Lighthouse on the pages the spec names (Phase 1 task 10, exit checklist: performance,
// accessibility and SEO ≥ 90 on mobile): home, calendar, a teaching page. Default Lighthouse
// mobile profile (Moto G Power emulation, slow 4G, 4× CPU slowdown).
//
//   pnpm lighthouse                       # against http://localhost:3100 (the e2e server)
//   LH_BASE_URL=https://staging.… pnpm lighthouse
//
// Run it against a production build with SITE_ENV=production; otherwise the site is noindex on
// purpose (D-023) and the SEO score says so. Reports: lighthouse-reports/*.html and *.json.
import { spawnSync } from "child_process";
import { mkdirSync, readFileSync } from "fs";
import path from "path";
import { chromium } from "@playwright/test";

const base = (process.env.LH_BASE_URL ?? "http://localhost:3100").replace(/\/$/, "");
const pages = (process.env.LH_PAGES ?? "/am,/am/worship/calendar,/am/our-faith/e2e-fasting").split(",");
const MIN = 90;
const outDir = path.resolve("lighthouse-reports");
mkdirSync(outDir, { recursive: true });

let failed = false;
for (const page of pages) {
  const name = page.replace(/^\//, "").replaceAll("/", "_") || "root";
  const out = path.join(outDir, name);
  // Lighthouse's own CLI script run by Node directly: no shell, so paths with spaces stay intact.
  const result = spawnSync(
    process.execPath,
    [
      path.resolve("node_modules/lighthouse/cli/index.js"),
      `${base}${page}`,
      "--only-categories=performance,accessibility,best-practices,seo",
      "--output=json",
      "--output=html",
      `--output-path=${out}`,
      `--chrome-path=${chromium.executablePath()}`,
      "--chrome-flags=--headless=new --no-sandbox",
      "--quiet",
    ],
    { stdio: ["ignore", "ignore", "inherit"] },
  );
  if (result.status !== 0) {
    console.error(`Lighthouse failed for ${page}`);
    failed = true;
    continue;
  }
  const report = JSON.parse(readFileSync(`${out}.report.json`, "utf8"));
  const score = (id) => Math.round((report.categories[id]?.score ?? 0) * 100);
  const metric = (id) => report.audits[id]?.displayValue ?? "-";
  const scores = { performance: score("performance"), accessibility: score("accessibility"), "best practices": score("best-practices"), seo: score("seo") };
  const low = ["performance", "accessibility", "seo"].filter((k) => scores[k] < MIN);
  if (low.length) failed = true;
  console.log(
    `${page.padEnd(32)} ${Object.entries(scores).map(([k, v]) => `${k} ${v}`).join("  ")}` +
      `  | LCP ${metric("largest-contentful-paint")}  TBT ${metric("total-blocking-time")}  CLS ${metric("cumulative-layout-shift")}` +
      (low.length ? `  ✗ under ${MIN}: ${low.join(", ")}` : "  ✓"),
  );
}
process.exit(failed ? 1 : 0);
