import { LEGAL_LINKS, links } from "../links";

/**
 * Legal links are the one class of URL that fails silently *and* blocks release:
 * a wrong path still compiles, still renders, still opens a browser — it just
 * shows a 404. Apple checks the privacy policy link during review, and a health
 * app is legally required to have a working one.
 *
 * These pin the shape. The paths were verified live against thrivo.fit: the bare
 * `/privacy`, `/terms` and `/cancellation` return 404, `/legal/*` return 200.
 */
describe("external links", () => {
  it("points legal pages at the /legal namespace that actually serves them", () => {
    expect(LEGAL_LINKS.privacy).toBe("https://thrivo.fit/legal/privacy");
    expect(LEGAL_LINKS.terms).toBe("https://thrivo.fit/legal/terms");
    expect(LEGAL_LINKS.cancellation).toBe("https://thrivo.fit/legal/cancellation");
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
