# Naming Conventions — thrivo-mobile Plan

**Status:** proposed · **Date:** 2026-08-21 · **Scope:** thrivo-mobile only

Platform-wide naming conventions were locked down for the shared BeOrchid
foundations. This document records those conventions, assesses what thrivo-mobile
already complies with, and lists the concrete work this repo owes.

> Conventions are treated as fixed going forward. Any change after adoption
> **must be agreed in writing**, because other products on the shared foundation
> depend on them.

---

## 1. The conventions

### Database

- Shared identity lives in the core schema: `core.users`, `core.organizations`,
  `core.memberships`.
- Each app gets its own schema: `<app>.*` — e.g. `thrivo.*`, `toplance.*`.
- App tables reference `core.user_id` / `core.org_id` rather than maintaining
  their own user records.
- Table names: lowercase, `snake_case`, plural — e.g. `thrivo.food_logs`.

### Analytics events

- `app.object_action`, all lowercase — e.g. `thrivo.meal_logged`,
  `toplance.document_uploaded`.
- No per-app variant formats.

### Repositories

- `<app>-<surface>` — `thrivo-backend`, `thrivo-mobile`, `thrivo-admin`,
  `thrivo-public`; likewise `toplance-backend`, `toplance-web`.

### Environments

- **Staging and production only.** Nothing else.

---

## 2. Where thrivo-mobile stands

| Area | Status | Notes |
| --- | --- | --- |
| Repository name | ✅ Compliant | `thrivo-mobile` already matches `<app>-<surface>`. No change. |
| Database | ➖ Not applicable directly | The app holds no schema. It talks to the backend over HTTPS (`src/config/env.ts` → `apiUrl`, `apiPrefix: "/api/v1"`). Exposure is indirect, via contract field names. |
| Analytics events | ❌ **Non-compliant — flagged** | Event names carry no `thrivo.` prefix. See §3. |
| Environments | ⚠️ Needs a decision | EAS ships three channels: `development`, `preview`, `production`. See §5. |

---

## 3. Analytics — the thing to flag now

`src/lib/analytics.ts` declares the funnel as a closed union:

```ts
export type AnalyticsEvent =
  | "signup"
  | "paywall_view"
  | "trial_start"
  | "subscription_start"
  | "cancellation"
  | "food_logged"
  | "checkin_submitted";
```

Two mismatches against the convention:

1. **No app prefix.** Convention requires `thrivo.<object>_<action>`; these are
   bare `object_action`.
2. **`food_logged` vs. the cited example `thrivo.meal_logged`.** ✅ **Resolved.**
   The Thrivo Remaining Scope PRD specifies `food_logged`, matching the backend
   and contracts (`thrivo.food_logs`, `src/features/food-logging`). Use
   `thrivo.food_logged`.

**Why this is cheap to fix right now:** `analytics.track()` has **zero call
sites** in the codebase today. Only `init()`, `identify()`, and `reset()` are
wired (`app/_layout.tsx:191`, `src/hooks/useSessionInit.ts:87`,
`src/lib/bootstrap.ts:32`). No events have ever been emitted, so there is **no
historical PostHog data to migrate and no dashboard to rewrite**. The rename is a
single-file edit to a type union.

### Proposed renames

| Current | Proposed |
| --- | --- |
| `signup` | `thrivo.signup` |
| `paywall_view` | `thrivo.paywall_viewed` |
| `trial_start` | `thrivo.trial_started` |
| `subscription_start` | `thrivo.subscription_started` |
| `cancellation` | `thrivo.subscription_cancelled` |
| `food_logged` | `thrivo.food_logged` |
| `checkin_submitted` | `thrivo.checkin_submitted` *(not in the PRD list — confirm)* |

Note the convention's `object_action` ordering implies past-tense verbs
(`meal_logged`, `document_uploaded`). `paywall_view` and `trial_start` are
noun-noun and read inconsistently; the proposals above normalise them.

**Prefix location:** ✅ **Resolved.** The Thrivo Remaining Scope PRD spells the
required events out as `thrivo.signup`, `thrivo.food_logged`, etc. — the prefix
lives in the **event name**, not in a PostHog project or property dimension.

The PRD also expands the funnel beyond the current union (adding
`onboarding_completed`, `barcode_scanned`, `upgrade_prompt_shown`, and
`reminder_set`). The authoritative list and its mapping onto the existing union
live in [remaining-scope-plan.md](remaining-scope-plan.md) §Step 6.

---

## 4. Database / contracts impact on mobile

The app owns no tables, so the `thrivo` schema migration is backend work. The
mobile-side exposure is confined to what crosses the wire:

- `@beorchid-llc/thrivo-contracts` (`^0.21.1`, mirrored in `src/contracts`) is the
  single point where backend field names reach this repo. If the schema move
  renames identity fields (e.g. to `user_id` / `org_id` sourced from `core.*`),
  it lands here as a contracts version bump.
- **Rule for mobile code:** treat identity ids as **opaque strings**. Never parse,
  slice, or infer structure from a user or org id, and never persist a derived
  form of one. That keeps the `core.*` migration a contracts bump rather than a
  refactor.
- Since Thrivo is pre-launch, there is no production data at risk. The schema move
  is planned collaboratively with this team, not around it.

**Action:** no mobile change required today. Watch for the contracts release that
accompanies the `thrivo` schema move and bump `@beorchid-llc/thrivo-contracts` in
lockstep.

---

## 5. Environments — needs clarification

The convention says **staging and production only**. This repo currently has more
than two names in play:

- `eas.json` build profiles / update channels: `development`, `preview`,
  `production`.
- `package.json` scripts: `update:dev` (`--branch development`),
  `update:preview` (`--branch preview`).
- `.github/workflows/ci.yml`: triggers on `[main, staging]`; job uses
  `environment: production`.
- Git branches: `main`, `staging`.

These are **two different axes** and the plan should not collapse them by
accident:

- **Deployment environments** (which backend/Clerk/PostHog instance a build points
  at): here the repo effectively has staging and production — already compliant in
  substance.
- **EAS build profiles and OTA channels** (how a binary is distributed —
  dev-client, internal testers, store): `development` and `preview` are
  distribution mechanics, not environments.

**Recommendation:** keep two deployment environments (`staging`, `production`) and
map build profiles onto them explicitly, rather than renaming EAS channels — a
dev-client build genuinely cannot be the same artifact as a store build.

Proposed mapping:

| EAS profile / channel | Environment it points at |
| --- | --- |
| `development` | staging |
| `preview` | staging |
| `production` | production |

**Action:** confirm in writing that "staging and production only" governs
*deployment environments* and does not require collapsing EAS build profiles. If
it does require it, `eas.json`, both `update:*` scripts, and the CI workflow all
need renaming together.

---

## 6. Work items

| # | Item | Owner | Blocking on |
| --- | --- | --- | --- |
| 1 | Flag the analytics naming mismatch to platform owners (§3) — before any `track()` call site exists | mobile | — |
| 2 | ~~Settle `food_logged` vs `meal_logged`~~ — ✅ resolved by the PRD: `food_logged` | — | done |
| 3 | ~~Settle where the `app.` prefix lives~~ — ✅ resolved by the PRD: in the event name | — | done |
| 4 | Rename the `AnalyticsEvent` union in `src/lib/analytics.ts` to the agreed names | mobile | #2, #3 |
| 5 | Confirm the environment-vs-build-profile reading (§5) | platform | — |
| 6 | Apply any env renames across `eas.json`, `package.json` scripts, `.github/workflows/ci.yml` | mobile | #5 |
| 7 | Bump `@beorchid-llc/thrivo-contracts` when the `thrivo` schema move ships | mobile | backend |

Items 1, 3 and 5 are the ones that need raising **today** — they are decisions,
not code, and they get more expensive the longer they wait.

---

## 7. Standing rules for this repo

- New analytics events **must** be `thrivo.<object>_<action>`, lowercase, added to
  the `AnalyticsEvent` union in `src/lib/analytics.ts`. The closed union is the
  enforcement point — keep it closed.
- Identity ids from the backend are opaque. Do not derive meaning from them.
- Any future Thrivo surface repo follows `thrivo-<surface>`.
- Deviating from any of the above requires written agreement, not a PR comment.

## References

- `src/lib/analytics.ts` — analytics seam and event union
- `src/config/env.ts` — runtime-validated public config, API URL, PostHog config
- `eas.json`, `.github/workflows/ci.yml` — build profiles, channels, CI environments
- `.env.example` — required public keys per environment
