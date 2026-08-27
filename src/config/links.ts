/**
 * Canonical external URLs (marketing + legal). Centralized so screens never
 * hardcode a domain and every surface points at one source of truth.
 *
 * The legal pages are published on the public site (thrivo-public). Apple/
 * Google review the policy, cancellation, and deletion links during
 * submission, and a health app legally requires a real privacy policy — so
 * these must resolve, not just exist as constants.
 */
const SITE_URL = "https://thrivo.fit";

/**
 * Legal pages live as flat top-level routes on the public site — there is no
 * `/legal/*` prefix. A previous version of this file claimed the opposite
 * ("verified live") and was wrong: `/legal/privacy` etc. 404 on the real
 * thrivo-public app router, which only has `/privacy-policy`,
 * `/terms-of-service`, `/cancellation-policy`, and `/delete-account`. Matches
 * the routes actually built in thrivo-public's `app/(legal)/*`.
 */
export const LEGAL_LINKS = {
  privacy: `${SITE_URL}/privacy-policy`,
  terms: `${SITE_URL}/terms-of-service`,
  cancellation: `${SITE_URL}/cancellation-policy`,
  deletion: `${SITE_URL}/delete-account`,
} as const;

export const links = {
  site: SITE_URL,
  support: "mailto:support@thrivo.fit",
  legal: LEGAL_LINKS,
} as const;
