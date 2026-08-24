# thrivo-mobile

React Native + Expo mobile app for Thrivo — the primary product surface. A thin,
fast client over the Thrivo backend (`/api/v1`); it owns UX and device
capabilities and defers shared business rules to the server.

**Stack:** Expo (SDK 54) · Expo Router · TanStack Query · Zustand · react-hook-form
+ Zod · NativeWind · Clerk (passwordless email code) · RevenueCat · PostHog ·
Sentry · TypeScript (strict).

Working conventions and a guide to every document in `docs/`: [`CLAUDE.md`](CLAUDE.md).

## Getting started

```bash
npm install
cp .env.example .env        # EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is the one you must set
npm run dev                 # Metro bundler (expo start)
npm run ios                 # build + run iOS
npm run android             # build + run Android
```

Config is validated with Zod at startup (`src/config/env.ts`) and the app throws
on invalid values rather than booting misconfigured. `EXPO_PUBLIC_API_URL`
defaults to `https://api.thrivo.fit`, so the variable you actually have to
provide is the Clerk publishable key. Sentry, PostHog and RevenueCat keys are
optional in development but **required in a production build** — a release
without them fails at bootstrap by design.

`EXPO_PUBLIC_*` values are inlined at build time, so changing one needs a
rebuild, not a Metro reload.

## Scripts

```bash
npm run typecheck        # tsc --noEmit
npm run lint             # eslint
npm run format           # prettier --write
npm run check:no-raw-hex # CI guard: no #hex outside src/theme
npm run checks           # all four — run before opening a PR
npm test                 # jest (unit + component)
npm run test:watch
```

## Project structure

```
app/                       # Expo Router routes (thin; delegate to features)
  _layout.tsx              # root providers + the single auth/onboarding guard
  (auth)/                  # unauthenticated group
  (onboarding)/            # authed-but-not-onboarded
  (app)/                   # authenticated tabs (free + premium content gate)
src/
  api/                     # endpoints contract + typed callApi (only network I/O)
  contracts/               # re-exports @beorchid-llc/thrivo-contracts (the source of truth)
  components/              # shared themed UI primitives
  features/<feature>/      # {api,hooks,screens,components} per feature
  stores/                  # Zustand: session / ui / onboarding-draft
  hooks/                   # cross-feature hooks (permissions, entitlement, session init)
  lib/                     # device adapters: secure-store, storage, notifications,
                           #   analytics (PostHog), monitoring (Sentry),
                           #   subscription (RevenueCat)
  config/                  # Zod-validated env
  theme/                   # design tokens — the only styling source
  navigation/              # typed route param lists
  utils/                   # units (lb↔kg), local-day date helpers
```

Native `ios/` and `android/` are **generated** by CNG from `app.json` and its
config plugins, and are gitignored. Regenerate with
`npx expo prebuild -p ios --clean`; never hand-edit them.

### The endpoints contract

`src/api/endpoints.ts` declares every backend route in one typed `ENDPOINTS`
object (path · method · `auth` flag · request/response Zod schemas). Request and
response **types are inferred from the schemas**, so the runtime contract and
static types cannot drift. The single `callApi(endpoint, options)` dispatcher
(`src/api/client.ts`) is the only module that performs network I/O — it builds
the request, injects the Bearer token, validates the response against the
contract, and throws a typed `ApiError`.

## Conventions

- No `fetch` in components — go through a feature hook → API layer.
- No hardcoded colors/spacing/type — use `src/theme` tokens. Raw `#hex` outside
  `src/theme/` fails `npm run check:no-raw-hex`.
- Server data lives in TanStack Query; UI/session state in Zustand; never both.
- Navigation params carry IDs only; fetch on mount.
- Secrets only in `expo-secure-store`; never AsyncStorage or logs. `EXPO_PUBLIC_*`
  is inlined into the bundle — never put a secret there.
- Analytics events are `thrivo.<object>_<action>`, added to the closed
  `AnalyticsEvent` union in `src/lib/analytics.ts`.

## Documentation

| Doc | What it covers |
| --- | --- |
| [CLAUDE.md](CLAUDE.md) | Working conventions and an index of every doc below |
| [docs/remaining-scope-plan.md](docs/remaining-scope-plan.md) | Ordered remaining scope to launch, with verified status per item |
| [docs/naming-conventions-plan.md](docs/naming-conventions-plan.md) | Platform-wide naming conventions and this repo's audit against them |
| [docs/eas-builds-and-updates.md](docs/eas-builds-and-updates.md) | Build profiles, OTA channels, device testing |
| [docs/catalog-first-food-itemid-and-sheet-macros.md](docs/catalog-first-food-itemid-and-sheet-macros.md) | Food search, `foodItemId`, and the macro sheets |
| [docs/android-native-splash-fix-plan.md](docs/android-native-splash-fix-plan.md) | Android native splash and cold-start behaviour |
