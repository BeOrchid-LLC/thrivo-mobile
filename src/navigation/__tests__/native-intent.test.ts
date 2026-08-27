import { redirectSystemPath } from "../../../app/+native-intent";

/**
 * The paywall's public link outlives the screen's location in `app/`. Expo
 * Router resolves deep links against the file tree, so a moved screen silently
 * turns a published URL into "Unmatched Route" — this hook is the only thing
 * standing between that and a dead link in a push notification.
 */
describe("redirectSystemPath", () => {
  it.each(["thrivo://settings/subscription", "https://thrivo.fit/settings/subscription"])(
    "keeps the published paywall link working after the screen moved (%s)",
    (url) => {
      expect(redirectSystemPath({ path: url, initial: false })).toBe("/(app)/subscription");
    }
  );

  it("redirects the bare path form too", () => {
    expect(redirectSystemPath({ path: "/settings/subscription", initial: true })).toBe(
      "/(app)/subscription"
    );
  });

  it("passes anything it does not recognise straight through", () => {
    expect(redirectSystemPath({ path: "/foods", initial: false })).toBe("/foods");
    expect(
      redirectSystemPath({ path: "https://evil.example/settings/subscription", initial: false })
    ).toBe("https://evil.example/settings/subscription");
  });
});
