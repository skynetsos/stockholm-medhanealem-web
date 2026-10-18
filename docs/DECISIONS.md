# Decisions Log

## Open questions

## Resolved decisions

### Q-001 — Sender email address (2026-10-18) — approved by Biruk
- **Question:** Which address do outgoing emails (form acknowledgements, office notifications) come from?
- **Decision:** `no-reply@medhanealem.se` (`EMAIL_FROM`). Production needs the domain verified in Resend (DNS records on medhanealem.se).
- **Follow-up when email is wired:** set **Reply-To** to the office address (`SiteSettings.officeEmail`) so replies reach the office, not the no-reply box.

### Q-002 — Local S3 server: RustFS instead of MinIO (2026-10-18) — approved by Biruk
- **Question:** Spec §1.1 names MinIO for local S3. MinIO no longer publishes community images: `minio/minio` and `minio/mc` return "not found" on Docker Hub.
- **Decision:** `rustfs/rustfs:1.0.3` for local dev only (ports 9000 API, 9001 console). Production uses EU object storage (Hetzner/R2). The bucket is created by a one-off `amazon/aws-cli` container.

### D-001 — Next.js pinned to 15.4.x (2026-10-18) — approved by Biruk
- **Question:** The spec says "Next.js 15". The latest 15.x is 15.5.28, but Payload 3.91.0 (`@payloadcms/next`) only supports `>=15.4.11 <15.5.0` or `>=16.3.3` on the Next 15/16 lines.
- **Decision:** Pin `next@15.4.11` (exact) with `react@19.1.0`. Revisit when Payload adds 15.5 support or when we choose to move to Next 16.

### D-002 — pnpm build-script allow-list (2026-10-18)
- pnpm blocks dependency install scripts by default. `pnpm-workspace.yaml` allows only `esbuild`, `sharp` and `unrs-resolver`, which download native binaries needed by Next, Payload and ESLint.

## Dependencies added beyond the stack

| Package | Why |
|---|---|
| `sharp` | Required by Payload for image resizing (Media sizes in §2.8). Pinned to 0.34.5 to match Next's copy. |
| `graphql` | Required peer dependency of `payload` and `@payloadcms/next`. |
| `vitest` | Unit/integration test runner named in spec §9; added now so `pnpm test` runs from task 1. |
| `@eslint/eslintrc`, `eslint-config-next` | ESLint flat-config bridge and Next rules from create-next-app. |
