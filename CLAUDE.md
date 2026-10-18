# Stockholm Medhanealem Website

Read STOCKHOLM-MEDHANEALEM-BUILD-SPEC.md before any work. Follow the current phase only.

## Stack
- Next.js 15 (App Router, TypeScript, strict), Tailwind CSS, next-intl
- Payload CMS 3 embedded in this app at /admin (Postgres adapter, Lexical rich text)
- PostgreSQL 16, pnpm, Docker Compose for local dev
- Email: Resend. Storage: S3-compatible (EU). Error tracking: Sentry.

## Rules
- Locales: am (default), en, sv. All CMS text fields are localized. UI strings live in /messages/{locale}.json.
- Never hardcode Ethiopic or English copy in components; use next-intl keys or CMS content.
- Timezone everywhere: Europe/Stockholm. Store UTC, display local.
- Request records (baptism, inquiries) are PRIVATE: enforced in Payload access control, never exposed via REST/GraphQL to the public, never server-rendered into public pages.
- No placeholder content on public pages. If content is missing, hide the section.
- Accessibility: WCAG 2.2 AA. Every image has alt. Every form field has a label.
- Commit after each task. Run `pnpm lint && pnpm typecheck && pnpm test` before committing.
- Do NOT add dependencies beyond the stack without writing the reason in docs/DECISIONS.md.
- Ethiopic fonts: Noto Sans Ethiopic (self-hosted), fallback Abyssinica SIL, sans-serif.
