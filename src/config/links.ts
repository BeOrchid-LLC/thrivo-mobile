/**
 * Canonical external URLs (marketing + legal). Centralized so screens never
 * hardcode a domain and every surface points at one source of truth.
 *
 * The legal pages are published on the public site (thrivo-public) under
 * `/legal/*`. Apple/Google review the policy and cancellation links during
 * submission, and a health app legally requires a real privacy policy — so
 * these must resolve, not just exist as constants.
 */
const SITE_URL = "https://thrivo.fit";

/**
 * Legal pages live under `/legal/*` on the public site. Verified live —
 * the bare `/privacy`, `/terms` and `/cancellation` paths return 404, and
 * Apple checks the privacy policy link during review.
 */
export const LEGAL_LINKS = {
  privacy: `${SITE_URL}/legal/privacy`,
  terms: `${SITE_URL}/legal/terms`,
  cancellation: `${SITE_URL}/legal/cancellation`,
} as const;

export const links = {
  site: SITE_URL,
  support: "mailto:support@thrivo.fit",
  legal: LEGAL_LINKS,
} as const;
