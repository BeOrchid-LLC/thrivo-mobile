import { LEGAL_LINKS, links } from "../links";

/**
 * Legal links are the one class of URL that fails silently *and* blocks release:
 * a wrong path still compiles, still renders, still opens a browser — it just
 * shows a 404. Apple checks the privacy policy link during review, and a health
 * app is legally required to have a working one.
 *
 * These pin the shape. The paths match the routes actually built in
 * thrivo-public's `app/(legal)/*` — flat top-level routes, no `/legal/*`
 * prefix. A previous version of this test asserted `/legal/*` and was wrong;
 * that path 404s on the real site.
 */
describe("external links", () => {
  it("points legal pages at the routes that actually serve them", () => {
    expect(LEGAL_LINKS.privacy).toBe("https://thrivo.fit/privacy-policy");
    expect(LEGAL_LINKS.terms).toBe("https://thrivo.fit/terms-of-service");
    expect(LEGAL_LINKS.cancellation).toBe("https://thrivo.fit/cancellation-policy");
    expect(LEGAL_LINKS.deletion).toBe("https://thrivo.fit/delete-account");
  });

  it("uses absolute https URLs — Linking cannot open a relative path", () => {
    for (const url of Object.values(LEGAL_LINKS)) {
      expect(url).toMatch(/^https:\/\//);
    }
  });

  it("keeps support reachable as a mailto", () => {
    expect(links.support).toMatch(/^mailto:.+@.+\..+/);
  });
});
