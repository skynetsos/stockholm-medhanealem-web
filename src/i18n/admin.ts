import type { NestedKeysStripped } from "@payloadcms/translations";

/**
 * Custom strings for the Payload admin UI (staff only). Public-site strings live in
 * /messages/{locale}.json via next-intl.
 */
export const adminTranslations = {
  en: {
    mfa: {
      enrolTitle: "Set up two-factor authentication",
      enrolIntro:
        "Your role requires a second step at sign-in. Scan this QR code with an authenticator app (for example Google Authenticator, Microsoft Authenticator or 1Password), then enter the 6-digit code it shows.",
      qrAlt: "QR code for your authenticator app",
      manualKey: "Can't scan? Enter this key manually:",
      codeLabel: "6-digit code",
      confirm: "Confirm",
      verifyTitle: "Two-factor authentication",
      verifyIntro: "Enter the 6-digit code from your authenticator app.",
      verify: "Verify",
      useRecovery: "Use a recovery code instead",
      useApp: "Use authenticator app code instead",
      recoveryLabel: "Recovery code",
      recoveryTitle: "Save your recovery codes",
      recoveryIntro:
        "Each code works once if you lose access to your phone. They will not be shown again. Store them somewhere safe, such as a password manager or printed in a locked place.",
      recoverySaved: "I have saved these codes",
      continue: "Continue to admin",
      signOut: "Sign out",
      loading: "Loading…",
      recoveryRemaining: "Recovery codes remaining: {{count}}",
      resetTitle: "Reset two-factor authentication",
      resetHelp:
        "Use this if the user lost their phone. They will be signed out and must set up two-factor authentication again at next sign-in.",
      resetButton: "Reset MFA",
      resetConfirm: "Reset two-factor authentication for this user and sign them out everywhere?",
      resetDone: "MFA reset. The user must enrol again at next sign-in.",
      statusEnabled: "Enabled",
      statusDisabled: "Not set up",
      error_unauthenticated: "Your session has ended. Please sign in again.",
      error_forbidden: "You are not allowed to do this.",
      error_already_enrolled: "Two-factor authentication is already set up.",
      error_not_enrolled: "Two-factor authentication is not set up yet.",
      error_no_pending_setup: "Setup expired. Reload the page to get a new QR code.",
      error_invalid_code: "That code is not valid. Check your app and try again.",
      error_locked: "Too many failed attempts. Try again in 15 minutes.",
      error_no_session: "Your session could not be found. Please sign in again.",
      error_not_found: "User not found.",
      error_unknown: "Something went wrong. Please try again.",
    },
  },
};

export type AdminTranslations = typeof adminTranslations.en;
export type AdminTranslationKeys = NestedKeysStripped<AdminTranslations>;
