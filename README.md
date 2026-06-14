# thrivo-mobile

React Native + Expo mobile app for Thrivo — the primary product surface. A thin,
fast client over the Thrivo backend (`/api/v1`); it owns UX and device
capabilities and defers shared business rules to the server.

**Stack:** Expo (SDK 51) · Expo Router · TanStack Query · Zustand · react-hook-form
+ Zod · TypeScript (strict).

Architecture reference: [`../docs/MOBILE_ARCHITECTURE.md`](../docs/MOBILE_ARCHITECTURE.md).
Workspace conventions: [`../CLAUDE.md`](../CLAUDE.md).

## Getting started

```bash
npm install
cp .env.example .env        # set EXPO_PUBLIC_API_URL
npx expo start              # Metro bundler
npm run android             # build + run Android
npm run ios                 # build + run iOS
```

`EXPO_PUBLIC_API_URL` is required and validated with Zod at startup
(`src/config/env.ts`) — the app throws on a missing/invalid value.

## Scripts

```bash
npm run typecheck     # tsc --noEmit
npm run lint          # eslint
npm run format        # prettier --write
npm run checks        # typecheck + lint + format:check
npm test              # jest (unit + component)
npm run test:watch
```

## Project structure

```
app/                       # Expo Router routes (thin; delegate to features)
  _layout.tsx              # root providers + the single auth/onboarding guard
  (auth)/                  # unauthenticated group (login required — ADR-0006)
  (onboarding)/            # authed-but-not-onboarded (S3–S8)
  (app)/                   # authenticated tabs (free + premium content gate)
src/
  api/                     # endpoints contract + typed callApi (only network I/O)
  contracts/               # local Zod schemas (future @thrivo/contracts swap point)
  components/              # shared themed UI primitives
  features/<feature>/      # {api,hooks,screens,components} per feature
  stores/                  # Zustand: session / ui / onboarding-draft
  hooks/                   # cross-feature hooks (permissions, entitlement, session init)
  lib/                     # device adapters: secure-store, storage, notifications,
                           #   analytics/monitoring/subscription (stubbed)
  config/                  # Zod-validated env
  theme/                   # design tokens — the only styling source
  navigation/              # typed route param lists
  utils/                   # units (lb↔kg), local-day date helpers
```

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
- No hardcoded colors/spacing/type — use `src/theme` tokens.
- Server data lives in TanStack Query; UI/session state in Zustand; never both.
- Navigation params carry IDs only; fetch on mount.
- Secrets only in `expo-secure-store`; never AsyncStorage/logs.
