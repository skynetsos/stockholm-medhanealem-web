import { z } from "zod";

/**
 * zod for the forms, set up for the Content Security Policy (D-037): without `jitless`, zod tests
 * whether it may compile validators with `Function(…)`; the policy forbids that (no 'unsafe-eval'),
 * and the test shows as a CSP violation in the browser. Validation works the same either way.
 */
z.config({ jitless: true });

export { z };
