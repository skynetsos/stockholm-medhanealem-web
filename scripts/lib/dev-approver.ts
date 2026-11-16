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
  if (found.docs[0]) {
    // Active only while publishing (see retireDevelopmentApprover).
    await payload.update({ collection: "users", id: found.docs[0].id, overrideAccess: true, data: { active: true } });
    return found.docs[0].id;
  }
  const user = await payload.create({
    collection: "users",
    overrideAccess: true,
    data: { email, name: "NOT APPROVED – development review", password: crypto.randomUUID() + "Aa1!", roles: ["clergy_approver"], active: true },
  });
  return user.id;
}

/**
 * Deactivates the placeholder approver once the teachings are published (review F-24): it can't
 * approve anything else or sign in, and the published teachings keep their (placeholder) approval.
 */
export async function retireDevelopmentApprover(payload: Payload, id: number): Promise<void> {
  await payload.update({ collection: "users", id, overrideAccess: true, data: { active: false } });
}

/**
 * Runs an import or publish step with the placeholder approver active (if it exists; development
 * only), then deactivates it again. Saving a teaching checks that its approver is active, so the
 * importers need it for the length of their run; afterwards nobody can use it (review F-24).
 */
export async function withDevelopmentApprover<T>(payload: Payload, run: () => Promise<T>): Promise<T> {
  if (process.env.SITE_ENV === "production") return run();
  const found = await payload.find({ collection: "users", overrideAccess: true, where: { email: { equals: "not-approved-dev-review@example.invalid" } }, limit: 1, depth: 0 });
  const id = found.docs[0]?.id;
  if (id) await payload.update({ collection: "users", id, overrideAccess: true, data: { active: true } });
  try {
    return await run();
  } finally {
    const again = await payload.find({ collection: "users", overrideAccess: true, where: { email: { equals: "not-approved-dev-review@example.invalid" } }, limit: 1, depth: 0 });
    if (again.docs[0]) await retireDevelopmentApprover(payload, again.docs[0].id);
  }
}
