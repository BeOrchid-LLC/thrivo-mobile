export { SignInScreen } from "./screens/SignInScreen";
export {
  useAppleSignIn,
  useGoogleSignIn,
  useLogout,
  useRequestMagicLink,
  useSignIn,
  useVerifyMagicLink,
} from "./hooks/useAuth";
export { useDemoAuth, type DemoAuthProvider } from "./hooks/useDemoAuth";
export { SocialAuthButtons, type SocialAuthProvider } from "./components/SocialAuthButtons";
export {
  logout,
  requestMagicLink,
  requestOtp,
  signInWithPassword,
  signInWithSocialIdToken,
  verifyMagicLink,
  verifyOtp,
} from "./api/auth.api";
