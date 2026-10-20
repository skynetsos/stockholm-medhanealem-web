import { nodemailerAdapter } from "@payloadcms/email-nodemailer";
import { resendAdapter } from "@payloadcms/email-resend";
import type { Config } from "payload";

/**
 * Outgoing email (spec §1: Resend). With RESEND_API_KEY set (staging/production) mail goes through
 * Resend; without it, over SMTP to Mailpit locally (SMTP_HOST/SMTP_PORT, see .env.example). With
 * neither, Payload only logs emails to the console.
 */
export function emailAdapter(): Config["email"] {
  const defaultFromAddress = process.env.EMAIL_FROM || "no-reply@medhanealem.se";
  const defaultFromName = process.env.EMAIL_FROM_NAME || "Stockholm Medhanealem";

  if (process.env.RESEND_API_KEY) {
    return resendAdapter({ apiKey: process.env.RESEND_API_KEY, defaultFromAddress, defaultFromName });
  }
  if (process.env.SMTP_HOST) {
    return nodemailerAdapter({
      defaultFromAddress,
      defaultFromName,
      // Mailpit: plain SMTP, no auth, local only.
      transportOptions: { host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 1025), secure: false, ignoreTLS: true },
      skipVerify: true,
    });
  }
  return undefined;
}
