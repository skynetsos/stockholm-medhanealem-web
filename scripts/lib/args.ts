/**
 * `payload run` does not forward command-line arguments to scripts, so script inputs
 * come from environment variables, e.g. ADMIN_EMAIL=... pnpm user:reset-mfa
 */
export function input(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}
