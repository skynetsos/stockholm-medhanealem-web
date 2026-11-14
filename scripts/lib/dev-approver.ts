import type { Payload } from "payload";

/**
 * The placeholder clergy approver for the development review (D-040, D-045): teachings can only be
 * published with an active clergy approver, and the real clergy haven't approved them yet. Never
 * used in production: callers refuse to run with SITE_ENV=production.
 */
export async function developmentApprover(payload: Payload): Promise<number> {
  if (process.env.SITE_ENV === "production") throw new Error("The placeholder approval is for development review only.");
  const email = "not-approved-dev-review@example.invalid";
  const found = await payload.find({ collection: "users", overrideAccess: true, where: { email: { equals: email } }, limit: 1, depth: 0 });
  if (found.docs[0]) return found.docs[0].id;
  const user = await payload.create({
    collection: "users",
    overrideAccess: true,
    data: { email, name: "NOT APPROVED – development review", password: crypto.randomUUID() + "Aa1!", roles: ["clergy_approver"], active: true },
  });
  return user.id;
}
