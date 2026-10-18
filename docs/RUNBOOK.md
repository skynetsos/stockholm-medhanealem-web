# Runbook

## Prerequisites

## Local setup

## Environment variables

### Secrets that must be backed up

Keep these in the church's password manager. Back them up together, and hand them over together at handover:

| Variable | If lost or changed |
|---|---|
| `PAYLOAD_SECRET` | Everyone is signed out (sessions and reset links become invalid). Users can sign in again. |
| `MFA_ENCRYPTION_KEY` | **Every user's two-factor authentication stops working.** Stored authenticator secrets and recovery codes can no longer be checked, so nobody can complete MFA. A super_admin must reset MFA for each user and everyone re-enrols. If no super_admin can get in, a server operator must run the break-glass reset (see below) first. |
| `DATABASE_URI` password, S3 keys, `RESEND_API_KEY`, `CRON_SECRET`, `IP_HASH_SALT` | Can be rotated with the provider; update `.env` and restart. |

**Rotating secrets at handover:** `PAYLOAD_SECRET` can be rotated freely. Only rotate `MFA_ENCRYPTION_KEY` if it may have leaked, and plan the re-enrolment of all privileged users when you do.

### Recovering from a lost `MFA_ENCRYPTION_KEY`

1. Put a new 64-hex-char key in `MFA_ENCRYPTION_KEY` and restart the app.
2. On the server, reset the first super_admin: `ADMIN_EMAIL=<email> pnpm user:reset-mfa`.
3. That super_admin signs in, re-enrols, then uses **Reset MFA** on each other user's page in /admin → Users.
4. Each user re-enrols at their next sign-in and stores their new recovery codes.

## Common commands

## Database backup and restore

## Production build and deployment

## Editor guide

## Troubleshooting
