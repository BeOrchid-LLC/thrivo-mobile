# Reminder scheduling — design options and the decisions needed

**Scope:** Step 3 of [remaining-scope-plan.md](remaining-scope-plan.md) ·
**Status:** Decision 2 answered in code — **on-device scheduling is implemented
and shipping**. Decision 1 is still open.

> **Update.** Reminders now fire from the device (`scheduleDailyReminders` in
> `src/lib/notifications.ts`, re-armed by `useReminderScheduling`). This is *not*
> the option recommended below — server-side push remains the better end state —
> but it was the only one that could deliver anything: the backend scheduler is
> unconfirmed and the project still has no FCM/APNs credentials, so on Android
> `getExpoPushTokenAsync` throws and nothing can be pushed at all. The push
> registration is still performed, best-effort, so the backend can take over by
> simply starting to send; the only change needed here then is to stop arming
> local triggers. The `notifyTimes` field is what gets scheduled, which is
> Decision 1 Option A in practice — but the Settings *Daily food log reminder*
> row still writes a different field and still does nothing, so 3.1 is unchanged
> and one screen is still lying to the user.

The PRD's acceptance criterion is one sentence:

> A reminder set for 8am arrives at 8am in the user's timezone, on a real device.

Nothing in this repo can satisfy that yet, and the reason is not missing code —
it is two decisions that have never been written down. This document states both
precisely, records what is actually in the codebase today so neither is argued
from memory, and recommends an answer to each.

There are two decisions, and they are independent:

1. **Which stored field is the reminder schedule?** Two exist. They are written
   by two different screens, live behind two different endpoints, and nothing
   reconciles them.
2. **Where does scheduling happen** — on the device, or on the server?

---

## Verified current state

Everything below was read from the code, not assumed.

### The app's half of Step 3 is done

- `useTimezoneSync` (`src/hooks/useTimezoneSync.ts`) keeps `user.timezone`
  matching the device on sign-in and on every foreground, sending only when the
  value actually differs.
- `usePushRegistration` (`src/hooks/usePushRegistration.ts`) re-registers the
  Expo push token on sign-in, on every foreground, and on rotation, and never
  prompts — it registers only when permission is already granted.
- `expo-notifications` is configured with a `default` Android channel
  (`app.json`), and taps are routed via `addNotificationResponseListener`.

### Scheduling (superseded — see the update at the top)

*As originally written:* `scheduleNotificationAsync` had **no call sites**; every
delivery decision was the backend's, which was coherent but unconfirmed and
invisible from inside this repo.

*Now:* `src/lib/notifications.ts` arms one repeating `DAILY` trigger per slot in
`notifyTimes`, cancelling its own previous ones first so re-arming is idempotent.
`useReminderScheduling` re-arms on sign-in, on any change to `notifyTimes`, and
on every foreground (which covers the OS clearing schedules, an app upgrade, and
permission granted in OS settings after the fact). `useLogout` and
`useDeleteAccount` cancel, so the next user on the device does not inherit
someone else's nudges. Push registration still happens, best-effort.

### There are two reminder-time fields, not one

| | `user.notifyTimes` | `settings.dailyFoodLogReminderTime` |
| --- | --- | --- |
| Shape | `string[] \| null`, up to 3, `HH:mm` or `HH:mm:ss` | single `string`, non-null, `HH:mm:ss` |
| Endpoint | `PATCH /users/me` (`updateProfilePayload`) | `PATCH /users/me/settings` (`updateUserSettingsPayload`) |
| Written by | `NotificationsStep` — onboarding step 7, and Settings → **Meal reminders**, which deep-links the same screen in `revisit` mode via `/(app)/settings/edit/notifications` | `SettingsScreen` → **Notifications** section → *Daily food log reminder* row |
| Has an on/off switch | No | Yes — `dailyFoodLogReminderEnabled` |
| Sent to `POST /push/register` | **Yes** | No |
| Emits `thrivo.reminder_set` | Yes, tagged `reminder: "notifyTimes"` | Yes, tagged with the settings field name |

Two further facts decide most of the argument:

- **`POST /push/register` carries `notifyTimes` and nothing else.** The contract
  is `{ expoPushToken, platform, notifyTimes?: string[] (max 3, strict HH:mm) }`
  (`@beorchid-llc/thrivo-contracts` → `push.js`). The push seam has never had any
  knowledge of `settings.*ReminderTime`.
- **The link between them is one-directional and only a seed.**
  `buildOnboardingPrefill` (`src/features/onboarding/utils/prefill.ts:37`) falls
  back to `[settings.dailyFoodLogReminderTime]` when the profile has no
  `notifyTimes`, purely to pre-fill the picker. Nothing writes the other way, and
  nothing keeps them in step afterwards.

### What that costs today

A user opens Settings, sees **Daily food log reminder — 08:00**, changes it to
09:00, and gets a confirmation. If the backend schedules from `notifyTimes`, the
reminder still fires at the old time and the app has just lied to them. If it
schedules from `dailyFoodLogReminderTime`, then the **Meal reminders** screen —
the one that presents itself as *the* reminder-times screen, with 1–3 slots — is
the one that does nothing. One of those two screens is currently decorative, and
the codebase does not say which.

Two smaller consequences of the same split:

- `thrivo.reminder_set` used to fire only from the `settings.*` picker, so the
  funnel could not see the `notifyTimes` screen at all. **Fixed** — both surfaces
  now emit, tagged with a `reminder` property that tells them apart. Whichever
  screen users actually reach for will show up in the data, which is the cheapest
  input to decision 3.1 below.
- `settings.pushNotificationsEnabled` and `dailyFoodLogReminderEnabled` exist as
  master switches, but the app re-registers the token on every foreground
  regardless of them. Whichever field wins, the enable/disable semantics need to
  be stated too — see the questions at the end.

---

## Decision 1 — which field is the schedule?

### Option A — `notifyTimes` is authoritative *(recommended)*

The profile holds 1–3 daily nudge times; `settings.*ReminderTime` describes other
reminders (the weekly weight check, the email digest) and stops claiming to own
the daily nudge.

- **For:** it is the only field the push seam has ever carried, it is the only
  one that supports the 1–3 times the UI promises, and it sits next to
  `user.timezone` — the two values the backend needs together.
- **Against:** the more discoverable Settings row is the `settings.*` one, so
  this is the option that requires visible UI change.
- **Then in this repo:** the *Daily food log reminder* row's time picker either
  writes `notifyTimes` instead, or the row collapses to a switch and defers its
  time to Meal reminders. Analytics needs no further change — both surfaces
  already emit.

### Option B — `settings.dailyFoodLogReminderTime` is authoritative

The single settings time is the daily nudge; `notifyTimes` is dropped or reduced
to a legacy mirror.

- **For:** it is grouped with its own enable switch and with the other reminders,
  which is the more conventional settings model.
- **Against:** it cannot express 1–3 times, so the Meal reminders screen has to
  lose its multi-slot UI; and `POST /push/register` would need a contract change
  to carry it, or the backend would have to ignore what the app sends there.
- **Then in this repo:** Meal reminders becomes single-time, `notifyTimes` stops
  being written, and the push payload's `notifyTimes` is retired.

### Option C — they are genuinely different reminders

`notifyTimes` = the meal/check-in nudges; `dailyFoodLogReminderTime` = a separate
end-of-day "did you log today?" prompt.

- **For:** possible, and it would make both screens correct as written.
- **Against:** if true, the copy is wrong on both — neither screen tells the user
  the other exists, and *Daily food log reminder* and *Meal reminders* read as
  the same feature. This option is the most work, not the least.
- **Then in this repo:** re-copy both surfaces so the distinction is legible, and
  both feed the backend.

**Recommendation: Option A.** It is the only option that requires no contract
change and no reduction in what the UI already promises, and it matches the one
piece of the system that already had to pick a side — the push registration
payload.

---

## Decision 2 — on-device or server-side scheduling?

| | **On-device** (`expo-notifications`, daily trigger) | **Server-side push** (recommended) |
| --- | --- | --- |
| Timezone correctness | Free — the OS fires at local wall-clock time and follows the device across DST and travel with no work | Requires `user.timezone` to be stored and current. **Already solved** by `useTimezoneSync`. |
| Works offline / app never opened | Yes | No — a device with no network gets nothing |
| Content | Static, baked in when scheduled. Cannot say "you're 400 kcal short today" | Personalised at send time from real data |
| Changing copy or cadence | Needs an app release, or at least a re-arm on next launch | Backend change, no release |
| Re-arming | Must re-arm on timezone change, on preference change, on app upgrade, and after the OS clears schedules. Every missed re-arm is a **silent** failure | None — one source of truth |
| iOS 64-notification cap | Real constraint with 3 times/day × N days | Not applicable |
| Analytics | Delivery is invisible to the server | Sends are server-side and countable |
| Backend work | None | Scheduler + per-user timezone maths |
| Verifying the acceptance criterion | Easy | Needs a real device and a real send |

**Recommendation: server-side push**, which is also what the code already assumes
— `POST /push/register` exists precisely so the backend can send, and it matches
this app's stated stance of deferring shared business rules to the server.
Personalised content is the deciding factor: a nudge that says "you haven't
logged lunch" needs data the device does not have while backgrounded.

**Worth considering as a follow-up, not a v1 blocker:** a local fallback for the
offline case — schedule a generic local reminder, and cancel it when a server
push for the same slot arrives. It doubles the re-arming surface, so it should
only be built if offline delivery turns out to matter.

### If server-side is chosen, the mobile side is done

Nothing further is required in this repo. Timezone and token are already kept
current, permissions are handled, and taps route. The remaining work is the
backend scheduler and whatever falls out of Decision 1.

### If on-device is chosen, this repo owns new work

Non-trivial, and listed so it is priced before being chosen:

1. A scheduling module wrapping `scheduleNotificationAsync` with a daily trigger
   per time slot, keyed so it can be cancelled and re-armed idempotently.
2. Re-arm on: sign-in, preference change, timezone change (a `useTimezoneSync`
   hook point already exists), app upgrade, and permission grant.
3. Cancel everything on sign-out and on account deletion — otherwise the next
   user on the device inherits someone else's reminders, the same class of bug
   already fixed for the offline barcode queue in Step 1.
4. An Android channel with the right importance, and iOS 64-notification budget
   management.
5. Tests for the re-arm paths specifically. Every failure mode here is silent —
   the symptom is "reminders stopped" weeks later, with nothing logged.

---

## What is needed to close Step 3

| # | Question | Who | Unblocks |
| --- | --- | --- | --- |
| 3.1 | Is `notifyTimes` or `settings.dailyFoodLogReminderTime` the authoritative daily reminder schedule? (Option A / B / C above) | Edward | Whether changing a time in Settings changes when notifications fire. Until it is answered, one of the two screens is lying to the user. |
| 3.2 | On-device or server-side scheduling? | Edward | The rest of Step 3. If server-side, the mobile side is already complete. |
| 3.3 | Does the backend currently schedule from either field at all, and does it read `user.timezone` when it does? | Edward | Whether this is a design decision or a bug report. |
| 3.4 | What do `pushNotificationsEnabled` and `dailyFoodLogReminderEnabled` gate? Does turning them off stop sends server-side, or is the app expected to stop registering? | Edward | Correct enable/disable behaviour on both screens. |

3.1 and 3.2 are the two blocking ones. 3.3 is a five-minute answer that may
change how the other two are framed.

---

## Reference — the fields as they exist today

```
user.notifyTimes          string[] | null, max 3, /^\d{2}:\d{2}(:\d{2})?$/
user.timezone             string | null (IANA), kept current by useTimezoneSync

settings.pushNotificationsEnabled         boolean
settings.dailyFoodLogReminderEnabled      boolean
settings.dailyFoodLogReminderTime         string
settings.emailFoodLogReminderEnabled      boolean
settings.weightCheckReminderEnabled       boolean
settings.weightCheckReminderDay           monday…sunday
settings.weightCheckReminderTime          string
settings.hydrationReminderEnabled         boolean
settings.hydrationReminderIntervalMinutes number

POST /push/register  { expoPushToken, platform, notifyTimes?: string[] (max 3, HH:mm) }
```
