# Thrivo Mobile — Remaining Scope Plan

**Source:** "PRDs Thrivo + Toplance" (Thrivo — Remaining Scope PRD)
**Scope of this document:** `thrivo-mobile` only · **Date:** 2026-08-21 · **Status:** proposed

The PRD also contains a second product, **Toplance** — a B2B visa/relocation
platform built from scratch. It shares no code with this repo and belongs in
`toplance-backend` / `toplance-web` per the agreed repository convention. It is
noted here only so nobody looks for it in this repo; see
[naming-conventions-plan.md](naming-conventions-plan.md).

---

## Definition of done (from the PRD)

> A real person can sign up, use the free product, pay for premium, cancel in two
> taps, and delete their account — on a real iPhone and a real Android — and the
> app is submitted to both stores.

Everything below is ordered so that blockers and inputs come first, dependencies
before dependents, and verification and submission last.

---

## Step 0 — Confirm before building

Two inputs are named in the PRD as things we must not assume. Both are worth
raising now, because they gate work that appears later in this plan.

| # | To confirm | Why it blocks |
| --- | --- | --- |
| 0.1 | **Correct pricing and trial values** (the team will provide from their records) | RevenueCat products, the paywall copy, and the trial logic in Step 2 all encode these. Guessing means rebuilding the store products. |
| 0.2 | **Apple Developer account status** | The PRD states iOS submission is blocked until it is active. This is already biting: a local device build currently fails with *"Signing for 'Thrivo' requires a development team"*, and no team on the dev machine owns `com.beorchid.thrivo`. Simulator builds are unaffected. |

Also worth confirming early, though not called out in the PRD: whether
`checkin_submitted` stays in the analytics funnel (see Step 6).

---

## Step 1 — Account deletion — *complete in this repo*

**Hard blocker for App Store approval.** Built and covered by tests.

- Settings flow, confirmation, re-authentication, full backend deletion
  (including the Clerk identity), and honest pending/error states.
- **Accept:** a user deletes their account and all their data is gone; nothing
  orphaned.

**Implemented:** Settings → Delete account entry, a review stage listing exactly
what is lost, re-authentication, and the deletion itself. `DELETE /users/me`
(already in `thrivo-contracts`, previously unwired) is the authoritative call;
Clerk `user.delete()` runs as a backstop; then sign-out and a full device purge
of preferences, the queued offline writes, and the dehydrated query cache. A
backend failure aborts without touching Clerk or local state. Premium users are
warned that deletion does not cancel billing — only the store can do that.

Re-auth uses Clerk **session reverification**, not email-address verification;
the latter fails with "already been verified" on an account whose email was
verified at sign-up.

**Left to confirm (not code):**

- Does the backend's `DELETE /users/me` also remove the Clerk identity? The
  client backstop covers it either way, so nothing is orphaned, but it should be
  confirmed rather than assumed — Edward.
- Can the same email sign up again afterwards? Depends on the backend not
  soft-deleting behind a unique email constraint. One manual test settles it.
- Sign-out does **not** clear `offlineBarcodeScans`. Deletion now does, but if
  user A signs out and user B signs in on the same device, A's queued scans could
  replay into B's log. Narrower, and the fix is debatable — clearing on sign-out
  discards legitimate queued data for someone signing straight back in.

---

## Step 2 — Payments (RevenueCat) — *mobile side complete*

The largest item, and the one that unlocks the premium product. Apple and Google
require in-app purchase for mobile subscriptions, so this is **app-store billing,
not Stripe**.

- Monthly and annual plans; card-required trial; purchase, restore, cancel.
- Entitlement states drive what is unlocked.
- Confirmation email on purchase.
- **Accept:** a test user can start a trial, be charged correctly, restore on a
  second device, and cancel in two taps.

**Implemented in this repo — nothing further is buildable here until §Blocked
below is unblocked.**

*SDK and configuration*

- `react-native-purchases@10.7.2` installed; `ios/` regenerated. Native module —
  it needs a new dev-client build and **cannot ship as an OTA update**.
- `src/lib/subscription.ts` — the previously stubbed `SubscriptionAdapter` is now
  a real RevenueCat implementation, with a no-op fallback when no key is present
  so development and Expo Go still boot.
- `src/config/env.ts` — `EXPO_PUBLIC_REVENUECAT_IOS_KEY` /
  `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, required in production builds under the
  same fail-fast policy as Sentry and PostHog. Only the running platform's key is
  required.

*Identity*

- Tied to the Clerk user id on session restore (`src/hooks/useSessionInit.ts`) and
  cleared on sign-out (`src/lib/bootstrap.ts`). This is what makes
  restore-on-a-second-device work and stops the next user on a shared device
  inheriting premium.

*Live entitlement sync*

- `useBillingSync` subscribes to RevenueCat's customer-info listener, so
  renewals, lapses, refunds, upgrades, Ask-to-Buy approvals, and purchases made
  on another device reach the app immediately instead of at the next poll. It
  triggers a server re-read rather than trusting the pushed value.

*Purchase, trial, restore, cancel*

- `useOfferings` — live, storefront-localised store prices. Packages that do not
  map to `monthly`/`annual` are hidden, since a plan the backend cannot record
  would strand the purchase.
- Trial eligibility is read from the **store's** introductory offer, not our
  `trialUsed` flag — the store is authoritative and a user who already consumed
  the offer is simply charged full price.
- `useRestorePurchases` plus a Restore action on the paywall (required by App
  Store review), with explicit feedback for both "premium restored" and "nothing
  found".
- Purchase failures after the sheet opens surface a toast stating the user was
  not charged; a dismissed sheet is treated as a non-event, not an error.
- A completed purchase is confirmed with a toast; a dismissed sheet stays silent.
- Cancellation routes to the store's own subscription settings.
- The paywall has three honest states — loading, purchasable, and unavailable
  (with the underlying reason in dev builds and a Try again action). It never
  renders a disabled button that silently swallows taps.

*Analytics* — `thrivo.paywall_viewed`, `thrivo.upgrade_prompt_shown` (from
`PremiumGate`), `thrivo.trial_started`, `thrivo.subscription_started`, and
`thrivo.subscription_cancelled` all emit.

*Tests* — 34 covering the billing seam, the paywall, and live sync.

**Bugs found and fixed while wiring this up** (all were silent failures):

| Symptom | Cause |
| --- | --- |
| Paywall permanently empty | An empty product list from a keyless run was persisted to AsyncStorage and rehydrated as a legitimate "nothing for sale" |
| Entitlement never unlocked after paying | `PREMIUM_ENTITLEMENT_ID` was `premium`; the dashboard identifier is `Thrivo Premium` |
| Previous user's premium on a shared device | `configure()` was called per sign-in, but the SDK only configures once — switching users needs `logIn()` |
| "No identity" after every Fast Refresh | Readiness was tracked in JS module state, which resets while the native SDK stays configured |
| Purchase button inert | Rendered disabled-but-normal when no product resolved |
| Completed purchase looked like nothing happened | No success confirmation |

### Blocked — required to finish, none of it in this repo

Ordered by what blocks what. Items 2.1–2.3 must land before the acceptance
criterion can be tested at all.

| # | Item | Owner | Blocks |
| --- | --- | --- | --- |
| ~~2.1~~ | ~~RevenueCat project~~ — ✅ **done.** Project `Thrivo`, entitlement `Thrivo Premium`, offering `default` with `$rc_monthly` / `$rc_annual`. iOS key in `.env`. | — | done |
| 2.2 | **Store products.** ✅ iOS done — both App Store products exist, are attached to the offering's packages *and* to the entitlement, and StoreKit returns them. ⬜ Android not started (no Play products, no `goog_` key). | product | — |
| 2.3 | **RevenueCat → backend webhook.** The app mirrors the plan opportunistically, but entitlement must be authoritative server-side. Without this, a determined user can hold premium the backend never granted, and cancellations/refunds/expiries never reach us. | Edward | acceptance |
| 2.4 | Confirmation email on purchase (PRD requirement). Best driven off the same webhook. | Edward | acceptance |
| 2.5 | Real pricing and trial length (item 0.1) fed into the store products. | product | 2.2 |
| 2.6 | **Sandbox tester account** (App Store Connect → Users and Access → Sandbox), signed in on the device under Settings → Developer. Needs the Apple Developer membership active. This is the only thing standing between the current build and a real end-to-end purchase. Apple provides no shared test account — there is no equivalent of Stripe's `4242` card. | product | real purchase |

### What I still need

1. **A sandbox tester account** (2.6) — the last blocker on a real purchase.
2. **A decision on the webhook** (2.3). Until it exists, entitlement is only as
   reliable as the app's mirror call, and renewals, refunds, and expiries never
   reach the backend at all.
3. **Confirmation that $14.99 / $150 are the agreed prices** and that the trial
   length in App Store Connect matches what was promised.
4. **The Android key** (`goog_…`) plus Play products, when Android is in scope.

Resolved since this plan was written: the SDK keys, the entitlement identifier
(`Thrivo Premium`, not `premium`), and the package types (standard
`$rc_monthly` / `$rc_annual`).

### Acceptance status

| PRD criterion | Status |
| --- | --- |
| Test user can start a trial | ✅ Verified end to end against the RevenueCat Test Store. Real Apple purchase needs a sandbox tester (2.6). |
| Charged correctly | ⬜ Needs a sandbox tester (2.6); prices need confirming (2.5). |
| Restore on a second device | ✅ Code complete and wired to the Clerk user id. Not yet exercised on two real devices. |
| Cancel in two taps | ✅ Settings → Cancel → store subscription settings. |
| Confirmation email | ⬜ Not started — 2.4, backend, driven off the webhook. |

**Verified working on device (simulator, Test Store):** offerings load with live
prices, the purchase sheet opens, a completed purchase confirms and mirrors to
the backend, a dismissed sheet is a non-event, a failed purchase says the user
was not charged, and restore reports both outcomes.

**Design note:** the backend stays the source of truth for entitlement.
`useEntitlement()` still reads `GET /subscriptions/me`, and no feature gates on a
value returned from the billing seam. Cancellation is deliberately *not* recorded
locally when billing is live — the user may back out on the store screen, and
showing "cancelled" for a subscription that still renews is worse than showing
nothing.

---

## Step 3 — Timezone-aware reminders

- Deliver at each user's chosen local times; today reminders fire globally at a
  single UTC time.
- Handle permission grant/denial, timezone changes, and token refresh.
- **Accept:** a reminder set for 8am arrives at 8am in the user's timezone, on a
  real device.

**Current state:** notification preferences already exist in onboarding
(`src/features/onboarding/screens/NotificationsStep.tsx`) and settings;
`expo-notifications` and `expo-localization` are both installed, so the device
side is in place. The scheduling logic is what changes.

**Notes:** decide explicitly whether scheduling is local (on-device, via
`expo-notifications`) or server-side (push at the right UTC instant per user).
Server-side needs the user's IANA timezone stored and refreshed when it changes;
local scheduling survives no-network but needs re-arming on timezone change and
on app upgrade. This is a backend-coordination item either way.

---

## Step 4 — Remaining food-logging features — build, or formally cut from v1

The PRD accepts either outcome, as long as the app and the spec agree.

| Feature | Current state (verified) |
| --- | --- |
| Custom-food entry on mobile | Not present |
| Copy-a-day / copy-a-meal | Not present |
| Quick-add calories | Not present as a distinct flow |

- **Accept:** each works end to end, **or** is removed so the app and the spec
  agree.

**Notes:** this is the cheapest place to protect the timeline. Recommend deciding
build-vs-cut per feature *before* Step 6, because each one that ships may deserve
its own analytics event. Barcode scanning and search/logging already work, so the
core loop is not at risk either way.

---

## Step 5 — Psychology check-ins

- Mood-aware daily tip (today the same tip is returned regardless of mood),
  positive-mood encouragement, milestones, and the full 30-tip bank.
- **Accept:** selecting a low vs. positive mood returns appropriately different
  responses.

**Current state:** `src/features/checkin/` exists with a screen, API, and
`useCheckin` hook, so the submission path is built. The tip-selection logic is the
gap, and the 30-tip bank needs to be sourced.

**Notes:** confirm whether tip selection is server-side (backend owns the bank) or
client-side. Server-side is preferable — it lets the bank be edited without an app
release, and matches this app's "defer shared business rules to the server" stance.

---

## Step 6 — Analytics (PostHog) — *complete in this repo*

Placed after Steps 1–5 because several events can only fire once the flows they
describe exist. The seam itself is already in place.

**Current state (verified):** all 11 events fire. The union is renamed to the
agreed convention and every event has a call site, guarded by a test that walks
the source and fails if any required event stops being emitted — both failure
modes here are silent, so the check has to be mechanical.

**The PRD resolves the two open questions in
[naming-conventions-plan.md](naming-conventions-plan.md) §3** — it confirms the
`thrivo.` prefix belongs in the event name, and it settles `food_logged` (not
`meal_logged`).

Required events, all `thrivo.`-prefixed:

| PRD event | Emitting? | Where it belongs |
| --- | --- | --- |
| `thrivo.paywall_viewed` | ✅ | `SubscriptionPlansScreen` |
| `thrivo.upgrade_prompt_shown` | ✅ | `PremiumGate` |
| `thrivo.trial_started` | ✅ | `useStartTrial` |
| `thrivo.subscription_started` | ✅ | `usePurchaseSubscription` |
| `thrivo.subscription_cancelled` | ✅ | `useCancelSubscription` |
| `thrivo.signup` | ✅ | `OtpVerifyScreen` — sign-up path only, after the Clerk session finalizes |
| `thrivo.onboarding_completed` | ✅ | `useSaveOnboardingStep` — final step only |
| `thrivo.food_logged` | ✅ | `offline-mutations` registration, so replayed offline writes count once |
| `thrivo.barcode_scanned` | ✅ | `LogFoodScreen` — on decode, deduped by the existing scan guard |
| `thrivo.reminder_set` | ✅ | `SettingsScreen` — a confirmed time, not a dismissed picker |
| `thrivo.checkin_submitted` | ✅ | `useCreateCheckin` (not in the PRD list — kept; confirm) |

- **Accept:** a test run produces correctly named events in the dashboard.

**Open question:** the existing union also has `checkin_submitted`, which the PRD
list does not mention. Recommend keeping it as `thrivo.checkin_submitted` — Step 5
makes check-ins a real feature — but this should be confirmed rather than assumed.

**Notes:** keep `AnalyticsEvent` a closed union; it is the enforcement point for
the naming convention.

---

## Step 7 — Clean up the UI

Deliberately placed after the feature work, so cleanup happens once against the
final set of screens rather than twice.

The PRD leaves this open-ended, so it needs a concrete list before it can be
estimated or accepted. Suggest walking the app and agreeing the specific screens
in writing.

**Notes:** the repo already enforces design consistency — `src/theme` is the only
styling source and `npm run check:no-raw-hex` fails the build on raw `#hex`
outside it. Cleanup should resolve into tokens rather than one-off values. One
known item: `expo prebuild` currently warns that `userInterfaceStyle` in
`app.json` prevents the dark-mode splash from working correctly.

---

## Step 8 — Real-device testing

Full run-through on physical iOS and Android covering: auth, camera, offline,
notifications, large text, and performance.

**Notes:** several earlier steps can only truly be accepted here — reminders in a
real timezone (Step 3), purchase and restore-on-a-second-device (Step 2), and
notification permissions. Blocked on iOS by item 0.2. See
[eas-builds-and-updates.md](eas-builds-and-updates.md) for the build and
distribution loop.

---

## Step 9 — Launch surfaces

Last, because everything here describes the finished product.

- Fix legal links so app and website match; ensure a working
  cancellation/deletion route.
- Real store listings, screenshots, and copy.
- Submit to TestFlight and Play internal testing.

**Current state:** `src/config/links.ts` already points at `/privacy`, `/terms`,
and `/cancellation` on the site — these need verifying against what the website
actually serves, and a deletion route needs adding to match Step 1.

---

## Out of scope (v2)

Recorded so it is not accidentally built: moderated community food database, USDA
bulk import, recipes/meal planning, voice logging, photo food recognition,
wearable/health integrations, real-time admin dashboards.

---

## Working constraints

- React Native / Expo SDK 54, NativeWind. Backend PostgreSQL + Hono. Auth is Clerk
  (passwordless one-time code). Node v22, npm. Deploys via Coolify.
- **Work against staging, never production directly** — consistent with the
  staging/production environment convention.
- Coordinate with Edward (web/backend) and Amaan (infrastructure).

## Suggested parallelisation

Steps 1 and 2 are independent and are the two longest poles — start both first.
Step 3 needs backend coordination, so raise its design question early even if the
work starts later. Steps 4 and 5 are self-contained. Step 6 should close out once
the flows it measures exist.
