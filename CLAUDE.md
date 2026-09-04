# CLAUDE.md — thrivo-mobile

React Native + Expo app for Thrivo, the primary product surface. A thin, fast
client over the Thrivo backend (`/api/v1`) — it owns UX and device capabilities
and defers shared business rules to the server.

**Stack:** Expo SDK 54 · Expo Router · TanStack Query · Zustand · react-hook-form
+ Zod · NativeWind/Tailwind · Clerk (auth) · PostHog + Sentry · TypeScript (strict).

---

## Documentation index

Every file in `docs/` — read the relevant one before working in that area.

| Doc | Read it when |
| --- | --- |
| [docs/remaining-scope-plan.md](docs/remaining-scope-plan.md) | Planning or picking up delivery work. The ordered remaining scope to launch, derived from the Thrivo Remaining Scope PRD: payments (RevenueCat), account deletion, timezone reminders, food-logging gaps, check-in tips, analytics, UI cleanup, device testing, store submission — each with verified current state and acceptance criteria. |
| [docs/naming-conventions-plan.md](docs/naming-conventions-plan.md) | Touching analytics event names, environment/channel names, repo naming, or anything crossing into the shared BeOrchid `core.*` schema. **Binding conventions — see §Naming below.** |
| [docs/eas-builds-and-updates.md](docs/eas-builds-and-updates.md) | Building, installing, or shipping the app: EAS build profiles, OTA update channels, `runtimeVersion`, dev-client vs. store builds, device testing without an emulator. |
| [docs/reminder-scheduling-design.md](docs/reminder-scheduling-design.md) | Touching reminders, `notifyTimes`, `settings.*ReminderTime`, push registration, or notification scheduling. States the two open decisions — which field is the authoritative schedule, and on-device vs. server-side scheduling — with the verified current state and a recommendation for each. |
| [docs/ui-cleanup-plan.md](docs/ui-cleanup-plan.md) | Doing UI cleanup, or adding a radius/size/spacing value. The counted, file-referenced Step 7 list: what was already resolved into tokens, and the token decisions (sizing scale, page rhythm, radius ramp) still open. |
| [docs/catalog-first-food-itemid-and-sheet-macros.md](docs/catalog-first-food-itemid-and-sheet-macros.md) | Working on food search, food logging, `foodItemId`, catalog/external (OFF) food, favourites, or the add/edit macro sheets. Records the implemented backend↔mobile phase plan and the contracts versions it pinned. |
| [docs/android-native-splash-fix-plan.md](docs/android-native-splash-fix-plan.md) | Touching the Android native splash, `BrandSplash`, `SplashScreen.hideAsync()`, cold-start timing, or the CNG-generated `android/` files. |

Related, outside this repo: `../docs/MOBILE_ARCHITECTURE.md` (architecture
reference) and `../CLAUDE.md` (workspace-wide conventions), when the parent
workspace is checked out.

---

## Commands

```bash
npm install
cp .env.example .env         # EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is required

npm run dev                  # expo start (Metro)
npm run dev:client           # expo start --dev-client
npm run android / npm run ios

npm run typecheck            # tsc --noEmit
npm run lint                 # eslint
npm run format:check
npm run check:no-raw-hex     # CI guard, see Conventions
npm run checks               # all four — run before opening a PR
npm test                     # jest (unit + component)
```

## Layout

```
app/                       # Expo Router routes (thin; delegate to features)
  _layout.tsx              # root providers + the single auth/onboarding guard
  (auth)/                  # unauthenticated group
  (onboarding)/            # authed-but-not-onboarded
  (app)/                   # authenticated tabs (free + premium content gate)
src/
  api/                     # endpoints contract + typed callApi (only network I/O)
  contracts/               # local Zod schemas / @beorchid-llc/thrivo-contracts seam
  components/              # shared themed UI primitives
  features/<feature>/      # {api,hooks,screens,components} per feature
  stores/                  # Zustand: session / ui / onboarding-draft
  hooks/                   # cross-feature hooks (permissions, entitlement, session init)
  lib/                     # device adapters: secure-store, storage, notifications,
                           #   analytics, monitoring, subscription
  config/                  # Zod-validated env
  theme/                   # design tokens — the only styling source
  navigation/              # typed route param lists
  utils/                   # units (lb↔kg), local-day date helpers
```

Path alias: `@/*` → `src/*`.

## The endpoints contract

`src/api/endpoints.ts` declares every backend route in one typed `ENDPOINTS`
object (path · method · `auth` flag · request/response Zod schemas). Types are
**inferred from the schemas**, so the runtime contract and static types cannot
drift. `callApi(endpoint, options)` in `src/api/client.ts` is the only module
that performs network I/O — it builds the request, injects the Bearer token,
validates the response against the contract, and throws a typed `ApiError`.

## Conventions

- No `fetch` in components — go through a feature hook → API layer.
- No hardcoded colors/spacing/type — use `src/theme` tokens. Raw `#hex` outside
  `src/theme/` fails `npm run check:no-raw-hex` (ADR-0021).
- Server data lives in TanStack Query; UI/session state in Zustand; never both.
- Navigation params carry IDs only; fetch on mount.
- Secrets only in `expo-secure-store`; never AsyncStorage or logs.
- `EXPO_PUBLIC_*` values are inlined into the bundle — never put a secret there.
  Config is Zod-validated at startup in `src/config/env.ts`; Sentry and PostHog
  are optional and missing keys disable telemetry without blocking app startup.

## Naming (binding — see docs/naming-conventions-plan.md)

Platform-wide conventions agreed across the shared BeOrchid foundation. Changing
any of these requires written agreement, not a PR comment.

- **Analytics events:** `thrivo.<object>_<action>`, all lowercase. Add every new
  event to the closed `AnalyticsEvent` union in `src/lib/analytics.ts` — that
  union is the enforcement point, keep it closed. ⚠️ The union does **not** yet
  carry the `thrivo.` prefix; the rename is tracked in the plan doc and is cheap
  today because `analytics.track()` has no call sites yet.
- **Identity ids** (`user_id`, `org_id`) come from the shared `core.*` schema and
  are **opaque strings**. Never parse, slice, or derive meaning from them — that
  keeps the upcoming `thrivo` schema migration a contracts bump, not a refactor.
- **Environments:** staging and production only. EAS build profiles
  (`development`, `preview`, `production`) are distribution mechanics, not
  environments — `development` and `preview` both point at staging.
- **Repos:** `<app>-<surface>` (`thrivo-backend`, `thrivo-mobile`, …).

## Workflow

- Feature branch + PR only. Never commit or push without explicit go-ahead, and
  never commit directly to `main` or `staging`.
- Conventional commits: `feat(scope): …`, `fix(scope): …`.
- One concern per PR; a bug found mid-feature gets its own `fix/<topic>` PR.
- `npm run checks` must be clean for touched files before opening a PR.
