// Jest setup: runs after the test framework is installed.
// @testing-library/react-native v12.4+ ships its matchers automatically via the
// jest-expo preset's environment; add global mocks for native modules here.

// Silence the native-animation warning that fires under the test renderer.
jest.mock("react-native/Libraries/Animated/NativeAnimatedHelper", () => ({}));
