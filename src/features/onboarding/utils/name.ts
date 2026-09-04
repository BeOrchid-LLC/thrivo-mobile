import type { User } from "@/contracts";

/** The server's last-resort name when the identity provider supplies none. */
const SEEDED_NAME_FALLBACK = "Thrivo user";

type NamedUser = Pick<User, "name" | "email">;

/**
 * Whether `user.name` is still the value the server seeded, rather than one a
 * person typed.
 *
 * The backend creates the row with `principal.name ?? email-local-part ??
 * "Thrivo user"` (identity.service.ts), so `name` is **never empty** — "is it
 * set?" cannot answer "did they answer the name step?". This can, by asking the
 * narrower question: is it still exactly what sign-up put there?
 *
 * Fails open: if the server changes how it seeds, nothing matches here and a
 * seeded name reads as a typed one — the same behaviour as before this existed.
 *
 * The one case it gets wrong is a person whose first name really is their email's
 * local part. They see the field unprefilled and the step unticked until the next
 * step advances the counter, which is why callers pair this with `onboardingStep`.
 */
export function isSeededName(user?: NamedUser | null): boolean {
  const name = user?.name?.trim();
  if (!name || name === SEEDED_NAME_FALLBACK) return true;
  return name === user?.email?.split("@")[0]?.trim();
}

/** The user's name, but only if a person actually typed it. */
export function typedName(user?: NamedUser | null): string | undefined {
  return isSeededName(user) ? undefined : user?.name?.trim();
}
