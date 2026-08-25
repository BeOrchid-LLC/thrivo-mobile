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

**Cross-account barcode queue — ✅ fixed.** `offlineBarcodeScans` lived under one
device-wide key, so a scan queued by user A replayed into user B's log after a
sign-out/sign-in on the same handset. The queue is now namespaced per user, which
beats clearing it on sign-out: someone who signs back in keeps their own pending
scans and never sees anyone else's. Account deletion wipes every namespace by
prefix, and anything left under the legacy shared key is dropped on read — it has
no recoverable owner, so it cannot be safely attributed to whoever is signed in
now.

A second, quieter failure came out of the same pass: the replay ran only when the
barcode changed, but the owner id arrives from the session store *after* Clerk
restores and `GET /users/me` resolves. A cold start into Log Food therefore saw
`null`, found nothing to replay, and never looked again — the queued scan sat in
storage forever with nothing surfacing it. Both effects now re-run when the id
lands, covered by tests that fail without the fix.

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
| ~~2.3~~ | ~~RevenueCat → backend webhook~~ — ✅ **done.** `POST /webhooks/revenuecat` in `thrivo-backend` (`src/routes/webhooks.ts` → `src/services/billing-webhook.service.ts`, merged via PR #72 to staging 2026-08-23). Auth'd against `REVENUECAT_WEBHOOK_AUTH` (fail-closed), idempotent via a `(provider, event_id)` ledger, maps all lifecycle events (renewals/cancellations/refunds/expiries/billing issues/transfers) to subscription status through the single subscription writer, and handles account-erasure tombstones. Covered by `tests/integration/revenuecat-webhook.test.ts` + unit tests. | Edward | done |
| ~~2.4~~ | ~~Confirmation email on purchase~~ — ✅ **done**, cancellation side already live; **purchase side built 2026-08-24** on `thrivo-backend` branch `fix/revenuecat-purchase-confirmation-email` (uncommitted): fires on a real (non-trial) `INITIAL_PURCHASE` or a trial converting to paid, not on trial start (nothing charged yet). New `purchase_confirmation` email kind, migration, tests passing. | Edward | done |
| 2.5 | Real pricing and trial length (item 0.1) fed into the store products. | product | 2.2 |
| 2.6 | **Sandbox tester account** (App Store Connect → Users and Access → Sandbox), signed in on the device under Settings → Developer. Needs the Apple Developer membership active. This is the only thing standing between the current build and a real end-to-end purchase. Apple provides no shared test account — there is no equivalent of Stripe's `4242` card. | product | real purchase |

### What I still need

1. **A sandbox tester account** (2.6) — the last blocker on a real purchase.
2. **Confirmation that $14.99 / $150 are the agreed prices** and that the trial
   length in App Store Connect matches what was promised.
3. **The Android key** (`goog_…`) plus Play products, when Android is in scope.

Resolved since this plan was written: the SDK keys, the entitlement identifier
(`Thrivo Premium`, not `premium`), the package types (standard
`$rc_monthly` / `$rc_annual`), and the RevenueCat → backend webhook (2.3/2.4).

### Acceptance status

| PRD criterion | Status |
| --- | --- |
| Test user can start a trial | ✅ Verified end to end against the RevenueCat Test Store. Real Apple purchase needs a sandbox tester (2.6). |
| Charged correctly | ⬜ Needs a sandbox tester (2.6); prices need confirming (2.5). |
| Restore on a second device | ✅ Code complete and wired to the Clerk user id. Not yet exercised on two real devices. |
| Cancel in two taps | ✅ Settings → Cancel → store subscription settings. |
| Confirmation email | ✅ Both directions now built from the webhook (2.4, `thrivo-backend`): cancellation confirmation is live, purchase confirmation is code-complete on an uncommitted branch. |

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

- Deliver food-log reminders at each user's chosen local times; the existing
  psychology-tip push remains a separate once-daily flow.
- Handle permission grant/denial, timezone changes, and token refresh.
- **Accept:** a reminder set for 8am arrives at 8am in the user's timezone, on a
  real device.

**Current state:** notification preferences exist in onboarding and settings, and
`expo-notifications` / `expo-localization` are installed.

**Timezone reporting — ✅ fixed (the app's half).** The timezone was only ever set
**once**, during onboarding. Anyone who travelled, moved, or changed their device
setting kept that original value forever — an 8am reminder arriving at 8am in a
city they had left — and anyone who skipped onboarding never sent one at all,
leaving the backend to fall back to a single global UTC time. `useTimezoneSync`
now corrects it on sign-in and on every foreground (a timezone changes while the
app is backgrounded, and there is no event for it), sending only when the value
actually differs.

This is a prerequisite for whichever scheduling design is chosen — the backend
cannot deliver in local time without an accurate timezone either way.

**Push token and permission — ✅ fixed (the app's half).** The token was fetched
and registered exactly once, inside the onboarding notifications step, which left
three silent ways for reminders to stop: the token rotates (reinstall, restore
from backup, OS change) and the backend keeps pushing to a dead address; the user
skipped onboarding and never registered at all; or they granted permission later
in iOS Settings rather than in the app. `usePushRegistration` now re-registers on
sign-in, on every foreground, and on rotation — and deliberately **never
prompts**, only registering when permission is already granted.

That covers the PRD's "handle permission grant/denial, timezone changes, token
refresh" for everything the app controls.

**Decided (2026-08-24) — ✅ both, and both implemented, pending commit/deploy.**
Decision record and options are in
[reminder-scheduling-design.md](reminder-scheduling-design.md).

1. **Which field is the schedule?** → `notifyTimes` — the only field
   `POST /push/register` has ever carried and the only one that supports the
   1–3 times the UI promises. `SettingsScreen.tsx`'s *Daily food log reminder*
   row no longer has its own (dead) time picker — it's now enable/disable only,
   subtitled "Uses the time set in Meal reminders." Tests updated.
2. **On-device or server-side scheduling?** → server-side. Built in
   `thrivo-backend` on branch `feat/meal-reminder-scheduler` (uncommitted): a
   5-minute cron (`send-meal-reminders`, mirrors the existing `weekly-review`
   per-user-timezone SQL pattern) matches each user's local clock against their
   `notifyTimes` slots and sends a generic Expo push, with a `reminder_sends`
   idempotency table (new migration `0042_reminder_sends.sql`) so a slot can
   never double-fire. 5 unit tests passing, typecheck/lint clean.

**Step 3 is now code-complete end to end** — mobile (this repo) and backend —
pending review, commit, and deploy of the backend branch.

**Scheduler behaviour to expect:** invalid timezones are skipped, daylight-saving
gaps are not synthesized, fall-back repeats are deduplicated by the delivery
ledger, and permission denial falls back to the in-app reminder.

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

**Tip selection is settled, and it is the backend's.** The contract says so
outright — `checkin.tip` is documented as the *"server-selected psychology tip
returned for the chosen mood / day"*. That is the right split (the bank can be
edited without an app release, per this app's defer-to-the-server stance), so the
open question in the earlier draft of this plan is closed: there is nothing to
decide, only a bank to source.

**The app's half — ✅ done.** What the split left behind was a screen that
responded identically to every mood: one flat line, *"Thanks for checking in —
feeling bad."*, whether the user had their best day of the month or their worst.
The acceptance criterion could not be met by the backend alone, because the app
had no differentiated response to render into.

- `moodResponse` (`src/features/checkin/utils/mood-response.ts`) maps each mood
  to its own heading and body across three tones — positive / steady / low. This
  is presentation, not a shared business rule, so it lives in the app. **A low and
  a positive mood now read differently before the bank exists**, which is the PRD
  criterion.
- `milestoneFor` (`src/features/checkin/utils/milestones.ts`) celebrates streak
  milestones at 3, 7, 14, 30, 60, 100 and 365 days, derived from the
  `currentStreakDays` the dashboard already reads — the app counts nothing of its
  own, so there is nothing to drift. Only an **exact** hit celebrates; a `>=`
  comparison would re-congratulate the same streak every day afterwards.
- **Bug fixed: the tip did not survive leaving the screen.** The response
  rendered only from `create.data`, so it lasted exactly as long as the mutation
  result. Check in, go to the dashboard, come back — and you were shown the empty
  form again, with the tip the backend had already selected gone for good.
  Today's check-in now comes from history as well, so it is the same view either
  way, with an explicit path back into the form to update it.
- **`tip: null` is handled honestly.** The contract allows it and the card used
  to just render a gap; the mood response now stands on its own.

*Tests:* 13, covering the low-vs-positive difference, the null-tip fallback, the
revisit path, the edit-and-cancel flow, and the exact-hit milestone rule.

**Backend half — ✅ built (2026-08-24), pending commit/deploy.**
`thrivo-backend` branch `fix/mood-aware-tip-selection` (uncommitted):
`selectDailyTip` now takes the submitted mood and rotates over tips tagged for
that mood, falling back to a generic (`mood: null`) tip, then to the full bank,
if the curated set doesn't cover it yet — a `bad`-mood check-in is never handed
an upbeat tip once the bank has `bad`-tagged entries. The broadcast daily nudge
is unaffected (calls with no mood, same as before). A first-draft 30-tip bank
(6 per mood: great/good/ok/low/bad) is seeded alongside the existing 15 generic
tips — **draft copy for review/editing via the admin tip-bank CRUD, not final**.
13 unit tests passing, typecheck/lint clean.

**Still needed:** review/finalize the 30 draft tips (or write real copy from
scratch) via the admin panel, and deploy the branch. The seeder only runs once
on an empty table — an environment that already ran the old 15-tip seed needs
the 30 new ones inserted separately (noted in the code).

**Push relationship:** `psychologyTipPushEnabled` is a separate Settings-only
preference for push delivery. Disabling it does not remove the tip from an
in-app check-in response.

---

## Step 6 — Analytics (PostHog) — *complete in this repo*

Placed after Steps 1–5 because several events can only fire once the flows they
describe exist. The seam itself is already in place.

**Current state (verified):** all 11 events fire from 12 call sites. The union is
renamed to the agreed convention and every event has a real call site, guarded by
a test that walks the source and fails if any required event stops being emitted —
both failure modes here are silent, so the check has to be mechanical.

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
| `thrivo.reminder_set` | ✅ | `SettingsScreen` **and** `NotificationsStep` — a saved schedule, not a dismissed picker or a failed save |
| `thrivo.checkin_submitted` | ✅ | `useCreateCheckin` (not in the PRD list — **kept**, see below) |

- **Accept:** a test run produces correctly named events in the dashboard.

**`thrivo.checkin_submitted` — decided: kept.** It is not in the PRD's list, but
Step 5 turns check-ins into a real feature with a mood-aware response, so a
submission is a funnel step worth counting, and the event already had a call
site. Dropping it would lose data for no gain. The rationale now lives beside the
required-events list in `src/lib/__tests__/analytics-events.test.ts` rather than
as an open question here.

**Funnel hole found and closed.** `thrivo.reminder_set` fired only from the
Settings pickers. The **Meal reminders** screen — onboarding step 7, and the same
screen deep-linked from Settings, which is where most users first set their
reminder times — emitted nothing at all. Both surfaces now emit, carrying a
`reminder` property that distinguishes them (`notifyTimes` vs. the settings
field). That is also the cheapest way to answer decision 3.1 in
[reminder-scheduling-design.md](reminder-scheduling-design.md) empirically:
whichever screen users actually reach for will show up in the data.

**The guard was weaker than it read.** `analytics-events.test.ts` walked the
source for each required event — but the corpus included `lib/analytics.ts`
itself, so an event that was *declared and never emitted* still matched, and the
check quietly proved nothing. The union file is now excluded, so a call site has
to exist somewhere real. The union and the required list are also compared in
both directions, which catches an event added to the union without being agreed —
exactly the drift a closed union exists to prevent.

**Notes:** keep `AnalyticsEvent` a closed union; it is the enforcement point for
the naming convention.

---

## Step 7 — Clean up the UI

Deliberately placed after the feature work, so cleanup happens once against the
final set of screens rather than twice.

**Done — [ui-cleanup-plan.md](ui-cleanup-plan.md) has the full record.** The app
was walked rather than guessed at: 155 arbitrary-value classes across 37 files,
now **92**. The repo already enforced colour (`check:no-raw-hex`); the unguarded
gap was **size**, and that is now closed.

| | Before | After |
| --- | --- | --- |
| Arbitrary radii | 9 | **0** |
| Page gaps in use | 4 (18/20/24/26) | **1** |
| Unnamed tab-bar clearance | 3 | **0** |
| Duplicate colour tokens | 4 | **2** (both intentional aliases) |

- **New token scales:** `sizing` (control/badge/avatar/icon dimensions — the
  44-vs-48 touch-target ambiguity is settled at **48**, which clears both stores'
  minimums) and `rhythm` (one page gap; tab-bar clearance is now a named concern,
  not a mystery `120`). Four role-named radii — `chip`/`tile`/`group`/`panel` —
  fill the steps the Figma screens use that the ramp was missing.
- **Token hygiene:** two duplicate colour tokens merged, one dead token deleted,
  and the `Text` colour API de-trapped — `color="muted"` was *not* `colors.muted`,
  and `gray600` was a second name for the same value.
- **Everything is pixel-preserving except three approved changes** (two tap
  targets 44 → 48, page gaps → 24). Value equality for the other 40 replacements
  was asserted mechanically, and every new token was checked against compiled
  Tailwind output rather than assumed.
- **Verified visually — ✅ done.** Confirmed on a real device (2026-08-24); the
  three approved changes (two tap targets 44 → 48, page gaps → 24) read correctly.

**Tap targets swept too.** All 57 `Pressable` sites checked against the 44pt
floor. The first pass reported 34 offenders and was wrong — it ignored the
`hitSlop` the codebase already uses deliberately; **17 were genuine**, and two of
those were introduced earlier in this same session. Fixed with `min-h-touchTarget`
where growth is correct and `hitSlop` where layout must not move (a calendar cell
would reflow its grid).

What is left in Step 7 needs a design call or a device, not mechanical work:
large-text behaviour at accessibility sizes, three one-off letter-spacing values,
the density-converted hairline borders, and ~92 genuine one-off layout dimensions
that tokenising would only obscure.

**One known item resolved, not deferred.** The plan recorded that `expo prebuild`
warns `userInterfaceStyle` breaks the dark-mode splash. Checked against the
plugin source: that warning fires **only when a dark splash is configured**, and
the `splash.dark` blocks have since been removed from `app.json`. The Android
warning from the same family does not apply either — `expo-system-ui` is a direct
dependency, so the fallback that emits it never runs. `userInterfaceStyle:
"light"` is correct and deliberate: one palette, no `darkMode` in Tailwind.

---

## Step 8 — Real-device testing — ✅ done

Full run-through on physical iOS and Android covering: auth, camera, offline,
notifications, large text, and performance.

**Verified on a real device (2026-08-24).**

**Notes:** several earlier steps could only truly be accepted here — reminders in
a real timezone (Step 3), purchase and restore-on-a-second-device (Step 2), and
notification permissions. See [eas-builds-and-updates.md](eas-builds-and-updates.md)
for the build and distribution loop.

---

## Step 9 — Launch surfaces

Last, because everything here describes the finished product.

- Fix legal links so app and website match; ensure a working
  cancellation/deletion route.
- Real store listings, screenshots, and copy.
- Submit to TestFlight and Play internal testing.

**Legal links — ✅ fixed, corrected again (2026-08-24).** The first fix
(claimed "verified live") was itself wrong: it pointed `src/config/links.ts` at
`/legal/privacy`, `/legal/terms`, `/legal/cancellation` — but the real
thrivo-public app router has no `/legal/*` prefix at all. Re-checked directly
against the `thrivo-public` repo's actual `app/(legal)/*` routes and corrected
to the flat paths that really exist: `/privacy-policy`, `/terms-of-service`,
`/cancellation-policy`, plus a new `deletion` link to `/delete-account`. Pinned
by an updated test.

**Account-deletion + cancellation pages on the website — ✅ built (2026-08-24),
pending commit/deploy.** `thrivo-public` branch
`fix/account-deletion-and-cancellation-pages` (uncommitted): a new
`/delete-account` page (instructional — points to the in-app flow, with an
email fallback for someone without app access), plus `/cancellation-policy`,
which turned out **not to exist at all** despite the site's own footer already
linking to it (a live 404, same bug class as the deletion page). Both added to
nav/footer, both typecheck/lint clean and build successfully as static routes.

**Store listing copy — drafted, not final.** App Store + Play Store name,
subtitle, description, and keywords drafted from the app's real feature set —
delivered as a file for review/edit, not committed anywhere. Screenshots still
need a real device/simulator build to capture; a shot list is included in the
draft.

**Still open here:**

- Commit + push the `thrivo-public` branch, then deploy.
- Review/finalize the drafted store copy; capture real screenshots once a
  device build exists.
- TestFlight / Play internal testing submission — gated on the Apple account.

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
