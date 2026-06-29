// Jest setup: runs after the test framework is installed.
// @testing-library/react-native v13 ships its matchers automatically via the
// jest-expo preset's environment. Add global mocks for native modules here.
//
// NOTE: the previous manual mock of
// `react-native/Libraries/Animated/NativeAnimatedHelper` was removed in the
// SDK 54 upgrade — that internal path moved in RN 0.81 and jest-expo's preset
// already mocks the native animation module, so the warning it silenced no
// longer fires.

// Observability SDKs reference native modules and ship untranspiled ESM; mock
// them so any suite importing `@/lib` (which re-exports monitoring/analytics)
// runs without a native runtime. The seams are no-ops in tests (no env keys).
jest.mock("@sentry/react-native", () => ({
  init: jest.fn(),
  wrap: (component: unknown) => component,
  captureException: jest.fn(),
  setUser: jest.fn(),
}));

jest.mock("posthog-react-native", () => ({
  __esModule: true,
  default: jest.fn().mockImplementation(() => ({
    identify: jest.fn(),
    capture: jest.fn(),
    reset: jest.fn(),
  })),
}));

export {};
