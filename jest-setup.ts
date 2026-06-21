// Jest setup: runs after the test framework is installed.
// @testing-library/react-native v13 ships its matchers automatically via the
// jest-expo preset's environment. Add global mocks for native modules here.
//
// NOTE: the previous manual mock of
// `react-native/Libraries/Animated/NativeAnimatedHelper` was removed in the
// SDK 54 upgrade — that internal path moved in RN 0.81 and jest-expo's preset
// already mocks the native animation module, so the warning it silenced no
// longer fires.

export {};
