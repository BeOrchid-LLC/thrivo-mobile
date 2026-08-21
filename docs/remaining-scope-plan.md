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

## Step 1 — Account deletion

**Hard blocker for App Store approval.** No dependencies, so it can start
immediately and in parallel with Step 2.

- Settings flow, confirmation, re-authentication, full backend deletion
  (including the Clerk identity), and honest pending/error states.
- **Accept:** a user deletes their account and all their data is gone; nothing
  orphaned.

**Current state (verified):** no deletion surface exists anywhere in `src/` or
`app/` — this is a from-scratch build. `src/features/settings/screens/SettingsScreen.tsx`
is where the entry point belongs, alongside the existing Legal section.

**Notes:** re-authentication has to go through Clerk, and the backend deletion
must remove the Clerk identity too, or the user can never sign up again with the
same email. Coordinate the backend endpoint with Edward.

---

## Step 2 — Payments (RevenueCat) — *mobile side implemented*

The largest item, and the one that unlocks the premium product. Apple and Google
require in-app purchase for mobile subscriptions, so this is **app-store billing,
not Stripe**.

- Monthly and annual plans; card-required trial; purchase, restore, cancel.
- Entitlement states drive what is unlocked.
- Confirmation email on purchase.
- **Accept:** a test user can start a trial, be charged correctly, restore on a
  second device, and cancel in two taps.

**Implemented in this repo:**

- `react-native-purchases@10.7.2` installed; `ios/` regenerated (native module,
  so it needs a new dev-client build and cannot ship as an OTA update).
- `src/lib/subscription.ts` — the previously stubbed `SubscriptionAdapter` is now
  a real RevenueCat implementation, with a no-op fallback when no key is present
  so development and Expo Go still boot.
- `src/config/env.ts` — `EXPO_PUBLIC_REVENUECAT_IOS_KEY` /
  `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY`, required in production builds under the
  same fail-fast policy as Sentry and PostHog.
- Store identity tied to the Clerk user id on session restore
  (`src/hooks/useSessionInit.ts`) and cleared on sign-out (`src/lib/bootstrap.ts`)
  — this is what makes restore-on-a-second-device work.
- `useOfferings` (live localised store prices), `useRestorePurchases`, and
  purchase/trial hooks that charge through the store and then mirror the plan to
  the backend.
- Paywall shows real store prices, a Restore purchases action (App Store
  requirement), and routes cancellation to the store's own settings.

**Still required, outside this repo:**

| # | Item | Owner |
| --- | --- | --- |
| 2.1 | RevenueCat project + `premium` entitlement, `monthly`/`annual` packages in the current offering | product/infra |
| 2.2 | Store products in App Store Connect and Play Console, with the card-required trial as an introductory offer | product |
| 2.3 | **RevenueCat → backend webhook.** The app mirrors the plan opportunistically, but entitlement must be authoritative server-side; without this a determined user can hold premium the backend never granted | Edward |
| 2.4 | Confirmation email on purchase (PRD requirement) | Edward |
| 2.5 | Real pricing/trial values (item 0.1) fed into the store products | product |

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

## Step 6 — Analytics (PostHog)

Placed after Steps 1–5 because several events can only fire once the flows they
describe exist. The seam itself is already in place.

**Current state (verified):** `src/lib/analytics.ts` is wired and initialised, but
**`analytics.track()` has zero call sites** — no event has ever been emitted. So
there is no historical data to migrate and the event names can still be set
correctly at no cost.

**The PRD resolves the two open questions in
[naming-conventions-plan.md](naming-conventions-plan.md) §3** — it confirms the
`thrivo.` prefix belongs in the event name, and it settles `food_logged` (not
`meal_logged`).

Required events, all `thrivo.`-prefixed:

| PRD event | Status in `AnalyticsEvent` union |
| --- | --- |
| `thrivo.signup` | exists as `signup` — needs prefix |
| `thrivo.onboarding_completed` | **missing — add** |
| `thrivo.food_logged` | exists as `food_logged` — needs prefix |
| `thrivo.barcode_scanned` | **missing — add** |
| `thrivo.paywall_viewed` | exists as `paywall_view` — rename + prefix |
| `thrivo.upgrade_prompt_shown` | **missing — add** |
| `thrivo.trial_started` | exists as `trial_start` — rename + prefix |
| `thrivo.subscription_started` | exists as `subscription_start` — rename + prefix |
| `thrivo.subscription_cancelled` | exists as `cancellation` — rename + prefix |
| `thrivo.reminder_set` | **missing — add** |

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
