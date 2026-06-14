import { SignInScreen } from "@/features/auth";

/** Route delegates to the auth feature screen (app/ stays thin — §3). */
export default function SignIn() {
  return <SignInScreen />;
}
