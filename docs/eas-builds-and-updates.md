# EAS Builds & Updates — Operations Guide (thrivo-mobile)

How to build, install, run, and ship the Thrivo app with EAS — written for a setup where the
dev machine **can't run an emulator alongside Metro**, so all device testing happens on real phones.

Project facts:

- **Expo account / owner:** `beorchid-llc`
- **EAS project id:** `d24d4616-0673-459c-9d34-ced491ef777e`
- **Bundle id / package:** `com.beorchid.thrivo` (iOS + Android)
- **Update channels:** `development`, `preview`, `production` (mapped in `eas.json`)
- **Updates URL:** `https://u.expo.dev/d24d4616-0673-459c-9d34-ced491ef777e` (`app.json` → `updates.url`)
- **runtimeVersion policy:** `appVersion` (a build only accepts updates while `app.json` `version` is unchanged)

---

## 1. Mental model (read this once)

There are **two ways code gets onto a phone**:

1. **A native build** (`eas build`) — compiles the native app (APK/IPA) with all native modules baked in.
   Slow (cloud, minutes), required whenever **native** things change.
2. **An OTA update** (`eas update`) — ships only the **JS/asset bundle** to an already-installed build.
   Instant, free, no rebuild — but can only change JS, never native code.

> **The one rule:** JS-only change → `eas update`. Native change → `eas build`. (What counts as "native"
> is in §6.)

And there are **two ways to load JS during active development**:

- **Metro dev server** (`expo start --dev-client`) — live Fast Refresh while you code. This is your loop.
- **EAS Update** — for getting a snapshot to teammates who aren't running your Metro.

---

## 2. Prerequisites (one-time)

```bash
npm i -g eas-cli            # the EAS CLI (global)
eas login                   # log into the beorchid-llc Expo account
eas whoami                  # confirm you're logged in
```

The project is already linked (`app.json` → `extra.eas.projectId`), so no `eas init` needed.

---

## 3. The three build profiles

Defined in `eas.json`. Pick by audience:

| Profile         | Who / why                                   | Distribution        | Loads JS from                          | Channel       |
| --------------- | ------------------------------------------- | ------------------- | -------------------------------------- | ------------- |
| **development** | You, while coding                           | internal (APK)      | **Metro** (live) — or `development` OTA | `development` |
| **preview**     | Teammates / stakeholders testing a snapshot | internal (APK/link) | `preview` OTA (or Metro if dev-client) | `preview`     |
| **production**  | App Store / Play Store                      | store               | `production` OTA                       | `production`  |

> A build is permanently tied to its channel at build time. To change channels you rebuild.

---

## 4. Development builds (your daily driver)

A development build is a custom version of "Expo Go" that contains **your** native modules (camera,
secure-store, Reanimated, etc.). It's the only way Expo Go-style live reload works once the app has
native modules beyond the stock Expo Go set.

### Build it (cloud, ~minutes)

```bash
eas build --profile development --platform android   # APK you can sideload
eas build --profile development --platform ios       # needs an Apple dev account + registered device
```

When it finishes, EAS prints an install link/QR. Install the APK on your phone.

### Run it live (the loop)

```bash
npm run dev:client          # = expo start --dev-client
```

1. Phone + laptop on the **same Wi-Fi**.
2. Open the **Thrivo (dev)** app → its launcher auto-detects your Metro server (or scan the terminal QR,
   or "Enter URL manually").
3. Edit a file → **save → Fast Refresh** updates the phone instantly.
4. **Shake the phone** (or press `m` in the terminal) for the dev menu: reload, element inspector,
   performance monitor, toggle Fast Refresh.

Network won't connect (corporate/guest Wi-Fi isolation)? Tunnel it:

```bash
npx expo start --dev-client --tunnel
```

### When do you rebuild a development build?

Only on **native** changes (§6). Pure JS/component/style work never needs a rebuild — Metro handles it.

---

## 5. Preview builds (for teammates, no Metro needed)

A preview build is a standalone internal APK that loads its JS from the **`preview`** update channel — so
teammates install it once and then receive your `eas update` pushes without rebuilding.

### Build + distribute (one-time per native change)

```bash
eas build --profile preview --platform android
```

Share the resulting link/QR with teammates (internal distribution — no store needed). They install once.

### Ship JS changes to them (repeat, instant)

```bash
npm run update:preview       # = eas update --branch preview --auto
```

Their app fetches the update on next launch (cold start). No rebuild, no reinstall.

---

## 6. EAS Update (OTA) — how it actually works

- **Branch** = a line of updates you publish to (`eas update --branch preview`).
- **Channel** = what a build listens to (set in `eas.json`). By default channel `preview` follows branch
  `preview`. So: build on the `preview` channel → it receives whatever you publish to the `preview` branch.
- **runtimeVersion** gates compatibility. Ours is `appVersion`, so the runtime = `app.json` `version`
  (currently `1.0.0`). An update only reaches builds whose `version` matches. **This is the safety latch:**
  it stops a JS update from landing on a build whose native layer can't run it.

### Publishing

```bash
eas update --branch preview --message "tweak dashboard copy"
# or the script:
npm run update:preview
npm run update:dev
```

### "Native" changes that REQUIRE a rebuild (not just an update)

- Adding/removing/upgrading a native module (anything with native code, e.g. a new `expo-*` or
  `react-native-*` package — like the recent `react-native-worklets`).
- Editing `app.json` native config: `plugins`, permissions, `scheme`, `newArchEnabled`, icons/splash,
  bundle id, `runtimeVersion`.
- Changing env values that are **baked at build time** (`EXPO_PUBLIC_*`) — e.g. Google client IDs (§ auth).

When you make a native change: bump `version` in `app.json`, **rebuild**, redistribute. OTA then resumes
for the new version.

> Want EAS to detect native changes automatically instead of relying on the version bump? Switch
> `runtimeVersion.policy` to `"fingerprint"` — it hashes the native project and only serves updates to
> builds with a matching fingerprint. More foolproof, slightly more magic.

### Important: the build must be made AFTER updates were configured

The `updates.url` is embedded at build time. The very first dev build (made before EAS Update was wired)
won't pull OTA — that's fine, you use Metro for it. Any build from now on will.

---

## 7. The low-spec-laptop workflow (no emulator)

- **You, coding:** `npm run dev:client` + your installed dev build on your phone. Laptop runs only Metro.
- **Teammates testing:** one `preview` build distributed once; you `npm run update:preview` to push JS.
- **Releases:** `eas build --profile production` → `eas submit`.

You never need an Android emulator or iOS simulator on the laptop.

---

## 8. Command cheat sheet

```bash
# Auth / status
eas login
eas whoami
eas build:list                       # recent builds + statuses
eas update:list --branch preview     # recent updates on a branch

# Build
eas build --profile development --platform android
eas build --profile preview --platform android
eas build --profile production --platform all

# Run locally (live)
npm run dev:client                   # expo start --dev-client
npx expo start --dev-client --tunnel # if same-Wi-Fi fails

# OTA
npm run update:dev                   # eas update --branch development
npm run update:preview               # eas update --branch preview

# Credentials (keystore, SHA-1 for Google, etc.)
eas credentials                      # interactive; pick Android/iOS

# Submit to stores
eas submit --profile production --platform android
```

---

## 9. Troubleshooting

| Symptom                                          | Likely cause / fix                                                                                  |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------------- |
| Dev app can't find Metro                         | Different Wi-Fi / AP isolation → `--tunnel`. Or stale server (a zombie Metro on :8081) — restart.    |
| "No development build installed"                 | You opened Expo Go, not the dev build. Install the `development` APK from `eas build`.               |
| OTA update never applies                         | Build predates `updates.url`; or `version` changed (runtimeVersion mismatch); or wrong channel/branch. |
| OTA applied but native feature crashes           | You shipped JS that needs a native change — rebuild instead.                                          |
| Google sign-in button missing / "not configured" | `EXPO_PUBLIC_GOOGLE_*_CLIENT_ID` unset at build time — see the auth setup notes. Rebuild after setting. |
| Android build OK but Google OAuth fails          | The signing key's SHA-1 isn't registered in the Google Android OAuth client — get it via `eas credentials`. |
```
