/**
 * Canonical external URLs (marketing + legal). Centralized so screens never
 * hardcode a domain and every surface points at one source of truth.
 *
 * NOTE: the legal pages must be authored and published on the public site
 * (thrivo-public) before store submission — Apple/Google review the policy and
 * cancellation links, and a health app legally requires a real privacy policy.
 */
const SITE_URL = "https://thrivo.fit";

export const LEGAL_LINKS = {
  privacy: `${SITE_URL}/privacy`,
  terms: `${SITE_URL}/terms`,
  cancellation: `${SITE_URL}/cancellation`,
} as const;

export const links = {
  site: SITE_URL,
  support: "mailto:support@thrivo.fit",
  legal: LEGAL_LINKS,
} as const;
