# UI cleanup — the concrete list

**Scope:** Step 7 of [remaining-scope-plan.md](remaining-scope-plan.md) ·
**Status:** Batches 1–6 applied.

The PRD leaves Step 7 open-ended ("clean up the UI"), which makes it impossible
to estimate or to accept. This is the concrete list, derived by walking the app
rather than by guessing: every item below is a counted, file-referenced finding
with a proposed resolution and a stated risk.

**Method.** Every `className` in `app/` and `src/` was scanned for arbitrary
values — the `foo-[12px]` escape hatch that bypasses the token scale — plus every
inline `style` object carrying a numeric literal, and every colour token in
`src/theme/colors.ts` compared by value. Counts are exact at the time of writing.

**What is already enforced, and is not at issue.** `src/theme` is the only
styling source; `npm run check:no-raw-hex` fails the build on a raw `#hex`
outside it, and passes today. `tailwind.config.ts` derives colours, spacing,
radii and the type scale from `src/theme`, so NativeWind classes and runtime JS
token access cannot drift. The gap is not raw colour — it is **size**: radii,
control heights, letter spacing and page rhythm all have escape hatches with no
guard.

**Headline number:** 155 arbitrary-value classes across 37 files at the start;
**92** after Batches 1–5.

---

## Batch 1 — exact token matches ✅ *applied*

11 classes wrote a pixel value that an existing token already named
(`rounded-[16px]` → `rounded-lg`, `rounded-[10px]` → `rounded-md`,
`rounded-t-[24px]` → `rounded-t-xl`), plus one redundant radius on a `<Card>`
that already carried `rounded-lg`. Provably pixel-identical.

---

## Batch 2 — the radius ramp ✅ *applied*

**Decision taken: extend the ramp, do not snap.** Snapping would have moved
corners by 2–4px on eight surfaces that nobody can check on a device right now.

The four missing steps are named by **role**, not slotted into the t-shirt ramp.
Inserting 12 and 14 between `md` and `lg` would have renumbered `lg` and `xl` and
silently reshaped the **22 surfaces already using them** — the exact failure the
change was meant to prevent.

| Token | Value | Role |
| --- | --- | --- |
| `chip` | 8 | inset chip inside a control (`Segmented`'s active segment) |
| `tile` | 12 | small square tile — icon holders, `InsightPill` |
| `group` | 14 | grouped/bordered container — `RadioGroup`, sheet lists, time rows |
| `panel` | 20 | large bordered panel — the onboarding feature panel |

`rounded-[2px]` on the 4px onboarding progress bar became `rounded-pill`: at half
the bar's height the radius clamps identically. **Zero arbitrary radii remain.**

---

## Batch 3 — sizing tokens ✅ *applied*

`spacing` stops at 32, so every control height and icon box in the app was an
arbitrary value. New `src/theme/sizing.ts`, wired into `height` / `width` /
`minHeight` / `minWidth` — deliberately *not* into `spacing`, so `h-control`
exists without also minting a meaningless `p-control`.

| Token | Value | Role |
| --- | --- | --- |
| `touchTarget` | 48 | minimum hit area for anything tappable |
| `control` / `controlLg` | 48 / 52 | standard / taller control height |
| `badge` / `badgeLg` | 48 / 52 | circular icon badge |
| `avatar` | 64 | profile avatar |
| `tile` | 44 | decorative icon tile — *not* a tap target |
| `iconSm` / `icon` / `iconMd` | 22 / 24 / 36 | icon boxes |

**The 44-vs-48 ambiguity is settled at 48** — Android's minimum, comfortably
above Apple's 44pt floor, so one number satisfies both stores. Applied to the two
genuine tap targets (`SettingsScreen:483`, `ProgressScreen:458`).

`SelectCard`'s 44×44 was deliberately **not** grown. It is a decorative icon tile
inside a card — the card is the tap target, not the tile — so enlarging it would
have been layout churn with no accessibility gain. It became `tile: 44` instead.

`control` and `badge` are both 48 and kept separate on purpose: a control height
and a circular icon badge are not the same decision, and one may move without the
other.

---

## Batch 4 — page rhythm ✅ *applied*

New `src/theme/rhythm.ts` and a `rhythm` prop on `<Screen>` with three presets
(`default`, `form`, `tabbed`).

**One correction to the plan as proposed.** Blanket presets would have shifted
several screens by **+16px**, not the 2–6px estimated: screens with no explicit
`paddingTop` fall back to `padded`'s 16, so handing them a preset with
`paddingTop: 32` moves them twice as far as advertised. Presets were applied only
where the screen already set `paddingTop: 32`; elsewhere just the gap normalised.

- Four page gaps (18 / 20 / 24 / 26) → one. The `26` was the suspected typo.
- `paddingBottom: 120` → `rhythm.tabBarClearance`. It is not "a lot of bottom
  padding" — it is the height of a thing content must not sit under, and a future
  tab-bar change should find it in one place.

---

## Batch 5 — token hygiene ✅ *applied*

| Was | Now | Why |
| --- | --- | --- |
| `gray.2` (#F4F6F9) | folded into `light` | identical value, no semantic distinction |
| `stepText` (#737373) | deleted | **dead** — zero call sites |
| `Text color="gray600"` | folded into `muted` | identical value (both gray 600), a second name for one thing |
| `Text color="mutedText"` | renamed `subtle` | read as a synonym for `muted` while resolving to a *different* colour |

`primary`/`success` and `accent`/`warning` share values and were **kept** — those
are legitimate semantic aliases, not accidents.

**A grep-vs-typecheck lesson worth recording.** `gray600` looked dead to a text
search, because its one call site was dynamic:
`color={option.locked ? "gray600" : "dark"}` in `select-sheet.tsx`. `tsc` caught
it the moment the union entry was removed. Any future token removal should be
driven by the compiler, not by grep.

---

## Result

| | Before | After |
| --- | --- | --- |
| Arbitrary-value classes | 155 | **92** |
| Arbitrary radii | 9 | **0** |
| Page gaps in use | 4 (18/20/24/26) | **1** |
| Unnamed tab-bar clearance | 3 | **0** |
| Duplicate colour tokens | 4 | **2** (both intentional aliases) |

Typecheck, lint (0 errors), prettier, `check:no-raw-hex` and 340 tests all clean.

**Every change is pixel-preserving except three, all of them approved:** the two
tap targets 44 → 48, and the page gaps normalising to 24. Value equality for the
other 40 replacements was asserted mechanically, and each new token was verified
against compiled Tailwind output rather than assumed.

**What this could not verify.** No device or simulator was available, so nothing
here has been looked at. The pixel-preservation argument is arithmetic and
compiler output, which is strong for the 40 mechanical replacements and is *not*
a substitute for eyes on the three approved changes.

---

## Batch 6 — tap targets ✅ *applied*

A systematic sweep of all 57 `Pressable` / `TouchableOpacity` call sites against
the 44pt floor (WCAG 2.2 AA / Apple HIG).

**The first pass reported 34 offenders and was wrong.** The codebase already
mitigates deliberately with `hitSlop` — `BackButton` carries a comment citing
WCAG 2.2 AA — and the sweep did not account for it. Re-running with `hitSlop`
awareness, then hand-verifying, left **17 genuine defects**.

The real pattern was `Pressable` wrapping *only* a `<Text>`: roughly 18px of hit
area, on links people are meant to tap.

| Fix | Where | Why that fix |
| --- | --- | --- |
| `min-h-touchTarget justify-center` | 9 text links and list rows — `AuthSwitchLink`, `SearchResultsSheet` ×2, `EditFoodLogSheet`, `LogItemSheet`, `MealLog`, `TargetStep`, `FilterChips`, `CheckinScreen` ×2 | `min-height` only grows what is already too small, so nothing that already cleared the floor moves |
| `min-h-touchTarget` on rows | `LogFoodScreen` water rows and manual-add | same |
| `hitSlop={4}` | `ProgressScreen` calendar cell (36×36) | growing the box would reflow the 7-column grid; lifting the hit area does not |
| `hitSlop={12}` | `LogFoodScreen` delete-water icon button | icon-only button, must not move |

**Two of the defects were mine**, introduced earlier in this session: the
"Change how you're feeling" and "Cancel" links on the check-in screen were bare
text with no hit area at all.

**Verified false positives, left alone:** `PageHeader` and `SettingsScreen` wrap
full-height rows; `LogFoodScreen`'s quick-action tile is a 42px circle plus a
caption (~62px tall). Flagging them would have been churn.

**Deliberately not changed:** `Segmented`'s 33px segment (39px including the
container). iOS's own `UISegmentedControl` is 32pt, so this is the platform norm
rather than a defect, and growing it to 48 would be a visible design change.

---

## Still open

Everything here needs either a design call or a running device — none of it is
mechanical:

- **Large-text / dynamic-type behaviour.** Fixed-height controls plus scaled text
  is where layout breaks. Partly auditable statically now that heights are
  tokens, but really needs a device at the largest accessibility sizes.
- **Three one-off letter-spacing values** (`8px`, `0.44px`, `-0.5px`). Each is a
  single display heading, so they need a design decision, not a token.
- **Hairline borders.** `border-[1.333px]` ×4 and `border-[0.667px]` ×3 are
  density-converted Figma values. `StyleSheet.hairlineWidth` is the idiomatic
  answer and `Card` already uses it — but it renders thinner, so this is a
  visible change and a design call.
- **The residual 92 arbitrary classes.** Mostly genuine one-off layout dimensions
  (`basis-[46%]`, `min-h-[190px]`, `w-[132px]`). Tokenising them would invent
  names nobody would reach for; they are noted, not queued.

---

## Not an issue — resolved

**The `userInterfaceStyle` splash warning.** Recorded in the plan as an open
item: *"`expo prebuild` warns that `userInterfaceStyle` in `app.json` prevents
the dark-mode splash from working correctly."*

Verified against the plugin source
(`@expo/prebuild-config` → `withIosSplashInfoPlist.js:38`): that warning fires
**only when a dark splash is configured** — `splash.dark.image`,
`.tabletImage`, `.backgroundColor` or `.tabletBackgroundColor`. The three
`splash.dark` blocks have since been removed from `app.json`, so the condition no
longer holds and the warning is gone.

The Android-side warning from the same family
(`withAndroidUserInterfaceStyle.js:16`, *"Install expo-system-ui…"*) also does
not apply: `expo-system-ui@~6.0.9` is a direct dependency, so the versioned
plugin is used and the unversioned fallback that emits the warning never runs.

`userInterfaceStyle: "light"` is correct and deliberate — `src/theme` has one
palette, Tailwind has no `darkMode` configured, and `app/_layout.tsx:307`
documents the reasoning. Nothing to do.

---

## Suggested order

Batch 5 first (smallest, and it removes ambiguity the other batches would
otherwise encode), then Batch 3 (largest win, and Batch 6's tap-target audit
depends on it), then Batch 4, then Batch 2. Batch 2 is last because it is the
only one that is purely cosmetic.
