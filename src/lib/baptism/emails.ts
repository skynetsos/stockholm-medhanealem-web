import { createTranslator } from "next-intl";
import type { CollectionAfterChangeHook, Payload, PayloadRequest } from "payload";

import am from "../../messages/am.json";
import en from "../../messages/en.json";
import type { BaptismRequest, SiteSetting } from "../../payload-types";
import { logCaseEvent } from "../cases/events";
import { stockholmDate, toEthiopian } from "../ethiopian-calendar";
import { adminLink, emailSettings, officeRecipients } from "../office-email";

/** Applicant emails are in Amharic or English (spec Phase 2 task 5); Swedish requests get English. */
export type EmailLocale = "am" | "en";
export const emailLocale = (locale: string | null | undefined): EmailLocale => (locale === "am" ? "am" : "en");

export type ApplicantEmail = "acknowledgement" | "confirmed" | "declined";

/** How each email appears in the audit log (staff-facing, English like the admin). */
const LOG_LABEL: Record<ApplicantEmail, string> = {
  acknowledgement: "Acknowledgement",
  confirmed: "Confirmation",
  declined: "Decline notice",
};

const TIME_ZONE = "Europe/Stockholm";
const messages = { am, en } as const;

type Settings = Pick<SiteSetting, "churchName" | "officeEmail" | "phone" | "defaultLocation" | "address">;

/** "Sunday, 6 December 2026" (Amharic: with the Ethiopian date) and "10:00", in Stockholm time. */
export function formatSchedule(iso: string, locale: EmailLocale) {
  const instant = new Date(iso);
  const date = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: TIME_ZONE }).format(instant);
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TIME_ZONE }).format(instant);
  if (locale !== "am") return { date, time };
  const t = createTranslator({ locale, messages: am, namespace: "calendar" });
  const eth = toEthiopian(stockholmDate(instant));
  const ethiopian = t("ethiopianDate", {
    day: String(eth.day),
    month: t(`ethiopianMonths.m${eth.month}` as "ethiopianMonths.m1"),
    year: String(eth.year),
  });
  return { date: `${ethiopian} (${date})`, time };
}

/** Where baptisms take place: the default event location, else the church's address. */
function location(settings: Settings): string | null {
  if (settings.defaultLocation?.trim()) return settings.defaultLocation.trim();
  const a = settings.address;
  const line = [a?.street, [a?.postalCode, a?.city].filter(Boolean).join(" ")].filter((part) => part?.trim()).join(", ");
  return line || null;
}

/**
 * The text of an email to the applicant. Deliberately without personal data: only the reference
 * (spec: "no personal data echoed beyond reference"), the date and place, and the office contact.
 */
export function applicantEmail(
  kind: ApplicantEmail,
  { reference, locale, settings, scheduledDate }: { reference: string; locale: EmailLocale; settings: Settings; scheduledDate?: string | null },
): { subject: string; text: string } {
  const t = createTranslator({ locale, messages: messages[locale], namespace: "baptismEmails" });
  const body: string[] = [];
  if (kind === "acknowledgement") body.push(t("acknowledgement.received", { reference }), "", t("acknowledgement.next"));
  if (kind === "confirmed") {
    body.push(t("confirmed.text", { reference }), "");
    if (scheduledDate) body.push(t("confirmed.when", formatSchedule(scheduledDate, locale)));
    const where = location(settings);
    if (where) body.push(t("confirmed.where", { location: where }));
    body.push("", t("confirmed.prepare"));
  }
  if (kind === "declined") body.push(t("declined.text", { reference }));

  const contact = [settings.officeEmail, settings.phone].filter((c) => c?.trim()).join(" · ");
  const lines = [
    t("greeting"),
    "",
    ...body,
    "",
    contact ? t("contact", { contact }) : t("contactReply"),
    "",
    t("signature", { churchName: settings.churchName ?? "" }).trim(),
    "",
    "—",
    t("footer", { reference }),
  ];
  return { subject: t(`${kind}.subject`, { reference }), text: lines.join("\n") };
}

/**
 * Sends an email to the applicant in their language, with the office as Reply-To, and logs it
 * (CaseEvent `email_sent`, without the address). A failure never undoes the request or the status
 * change: it is logged so staff can contact the applicant themselves.
 */
export async function sendApplicantEmail(payload: Payload, doc: BaptismRequest, kind: ApplicantEmail, req?: Partial<PayloadRequest>): Promise<boolean> {
  const to = doc.applicant?.email;
  if (!to || !doc.reference) return false;
  const locale = emailLocale(doc.applicant?.preferredLocale);
  const log = (action: "email_sent" | "note_added", note: string) =>
    logCaseEvent(payload, { collection: "baptism-requests", id: doc.id, action, note }, req);
  try {
    const settings = await emailSettings(payload, locale);
    const { subject, text } = applicantEmail(kind, { reference: doc.reference, locale, settings, scheduledDate: doc.internal?.scheduledDate });
    await payload.sendEmail({ to, subject, text, replyTo: settings.officeEmail || undefined });
    await log("email_sent", `${LOG_LABEL[kind]} to the applicant (${locale})`);
    return true;
  } catch (error) {
    payload.logger.error({ msg: "Baptism request: email to the applicant failed", reference: doc.reference, kind, error: String(error) });
    await log("note_added", `${LOG_LABEL[kind]} to the applicant could not be sent: contact them directly`).catch(() => undefined);
    return false;
  }
}

/** Tells the office about a new request: the reference and the admin link only (like D-022). */
export async function notifyOfficeOfBaptism(payload: Payload, doc: BaptismRequest): Promise<boolean> {
  const log = (action: "email_sent" | "note_added", note: string) => logCaseEvent(payload, { collection: "baptism-requests", id: doc.id, action, note });
  try {
    const to = officeRecipients(await emailSettings(payload));
    if (!to.length) {
      payload.logger.warn({ msg: "Baptism request: no office email in Site settings; office not notified", reference: doc.reference });
      await log("note_added", "Office not notified: no office email in Site settings");
      return false;
    }
    // Staff-facing (the admin is in English); deliberately without the applicant's details.
    await payload.sendEmail({
      to,
      subject: `New baptism request: ${doc.reference}`,
      text: [
        `A new baptism request (${doc.reference}) was sent on the website.`,
        "",
        `Open it in the admin: ${adminLink("baptism-requests", doc.id)}`,
        "",
        "The applicant's details are only in the admin, so personal data stays out of email.",
      ].join("\n"),
    });
    await log("email_sent", `Office notification (${to.length} recipients)`);
    return true;
  } catch (error) {
    payload.logger.error({ msg: "Baptism request: office email failed (request is saved)", reference: doc.reference, error: String(error) });
    return false;
  }
}

/** Emails the applicant when the office confirms or declines a request (spec Phase 2 task 5). */
export const sendDecisionEmail: CollectionAfterChangeHook<BaptismRequest> = async ({ doc, previousDoc, operation, req }) => {
  if (operation !== "update" || doc.status === previousDoc?.status) return doc;
  if (doc.status === "confirmed" || doc.status === "declined") await sendApplicantEmail(req.payload, doc, doc.status, req);
  return doc;
};
