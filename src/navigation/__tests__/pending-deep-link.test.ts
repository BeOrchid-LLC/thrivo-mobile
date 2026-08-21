import { parseAppDeepLink } from "../pending-deep-link";

describe("parseAppDeepLink", () => {
  it.each([
    ["https://thrivo.fit/dashboard", "/(app)/dashboard"],
    ["https://thrivo.fit/metrics", "/(app)/metrics"],
    ["thrivo://log", "/(app)/log"],
    ["thrivo://settings/subscription", "/(app)/settings/subscription"],
  ])("allows the known destination %s", (url, expected) => {
    expect(parseAppDeepLink(url)).toBe(expected);
  });

  it.each([
    "https://evil.example/metrics",
    "https://thrivo.fit/admin",
    "thrivo://../../settings",
    "javascript:alert(1)",
  ])("rejects unsupported or untrusted destination %s", (url) => {
    expect(parseAppDeepLink(url)).toBeNull();
  });
});
