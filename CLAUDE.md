# CLAUDE.md — WattWise Web

Guidance for Claude Code working in this repo (`C:\App\WattWise-Web`).

## What this project is

The browser version of **WattWise**, a smart energy monitoring app for a
2-outlet ESP32 setup. A user signs in and does everything the Android app does:
live telemetry, toggle both outlets, schedules, budget, safety thresholds,
usage history, and PELCO III billing.

**The phone app lives at `C:\App\WattWise` and is the source of truth.** Read
from it constantly. Never modify it — it is a separate, already-shipped project.

**There is no backend work here.** Firebase Cloud Functions, Firestore rules,
and the ESP32 firmware already exist, are already deployed, and are already
running against live hardware. This repo is a second *client* against that
backend, nothing more.

The ESP32 posts telemetry to `updateOutletMetrics` and polls `getDeviceCommand`
over plain HTTP. It has no idea whether a phone or a browser queued the command
it picks up. That is why this works at all.

---

## Read first

- **`docs/AUTH-AND-EMAIL.md`** before touching anything auth or email related.
  Outbound mail moved to **Brevo SMTP** on 2026-08-11, and several obvious-looking
  routes (Gmail aliases, Cloudflare, Resend) are documented dead ends. That file
  also explains why there is no login OTP, and why `AuthActionPage` sits outside
  `AuthGate`.
- **`C:\App\WattWise\docs\email-senders.md`** is the authoritative record for the
  mail pipeline as a whole — the backend, the extension, and the SMTP config all
  live in the phone repo.
- **`C:\App\WattWise\docs\FRESH-MACHINE.md`** to rebuild a development machine from
  nothing. It covers both repos: installs, the three browser logins, the `npm ci`
  locations, the ESP32 toolchain, and what does and does not survive a wipe. This
  repo's share is small - `npm ci` and `vercel link` - but the runbook lives with
  the phone app because the Hub does.

## THE GOLDEN RULE

> **Copy the data layer verbatim. Rewrite only the UI.**

The phone app's service layer is already browser code — it uses the Firebase
**web** SDK (`firebase` v12). It needs no porting. Copying it is not laziness;
it is the only way to guarantee this client agrees with a backend that is
already live.

Every time you are tempted to write a Firestore query by hand, stop and check
whether `C:\App\WattWise\src\services\firebase\` already has it. It almost
certainly does.

### Copy these files unchanged

| From `C:\App\WattWise\` | Why |
|---|---|
| `src/services/firebase/` (all 13 files, plus `invoiceService.js`) | **This is the schema, in executable form.** Already web SDK. This repo carries a cut-down `invoiceService` — `getInvoice` only, since finalizing a month is done from the phone. |
| `src/utils/billing.js` | PELCO III tariff math. Do not reimplement. |
| `src/utils/datetime.js`, `src/utils/liveUsage.js` | Pure JS |
| `src/utils/applianceBreakdown.js` | The per-day appliance attribution and the six-row fold. Mirrors `functions/src/lib/invoice.js` + `invoicePdf.js`, so the emailed statement and both clients itemise a month identically. |
| `src/constants/colors.js` | Theme tokens |
| `src/screens/*/utils/*.js` | `historyHelpers`, `scheduleHelpers`, `comparisonHelpers`, `budgetHelpers`, `safetyHelpers`, `settingsHelpers`, `notificationHelpers` — all pure JS |

### Rewrite these

Anything importing from `react-native`. That is every screen and component.
A desktop layout is the entire reason this repo exists — do not port
`StyleSheet.create` blocks over.

### Web-only additions with no phone counterpart

Not everything here is a port. `src/pages/AuthActionPage.jsx` and
`src/services/firebase/authActions.js` handle the one-time codes in Firebase's
emails — something the phone app never does, because its emails open a browser.
Keep such code **out of** the copied files: adding action-code handling to
`authService.js` would break its byte-for-byte match with the phone app.

### Files that flow the OTHER way — written here, copied to the phone

The Golden Rule has an exception now. Three modules were written in this repo and
then taken **byte-identical** into `C:\App\WattWise\src\screens\Dashboard\utils\`.
They are no longer web-only, and editing one here silently drifts the phone:

| Here | Phone |
|---|---|
| `src/components/dashboard/loadStability.js` | `src/screens/Dashboard/utils/loadStability.js` |
| `src/components/dashboard/outletBadge.js` | `src/screens/Dashboard/utils/outletBadge.js` |

Both are pure JS with no JSX — written that way so `node --test` can reach them,
which is exactly what made them portable to React Native. **The rendering around
them differs; the modules do not.** Change one, report it, re-sync the other.

Check them the same way as the copied files:

```powershell
$w = (Get-Content "<web path>" -Raw) -replace "`r`n","`n"
$p = (Get-Content "<phone path>" -Raw) -replace "`r`n","`n"
$w -eq $p
```

Compare with line endings normalised — git checks out CRLF here and the raw
bytes will differ even when the content matches.

### `switchingTo` keys on different evidence in each direction, deliberately

`liveUsage.js` derives the two transition states asymmetrically, and it looks
like an inconsistency worth "fixing". It is not — collapsing both onto
`pendingStatus` silently breaks auto-cutoff.

- **Switching off** keys on the contradiction itself, `!isOn && isDrawing`. This
  is what covers a safety cutoff: a cutoff opens **no pending window**, because
  `updateOutletMetrics` only ever *deletes* `pendingStatus`. Keyed on the pending
  marker, an auto-cut outlet would never report the transition at all.
- **Switching on** keys on the pending window. An outlet switched on with nothing
  plugged into it draws 0 W, which is an ordinary resting state — keyed on the
  contradiction it would sit claiming a transition forever.

Seven tests in the phone repo hold this down. Recorded here because
`outletBadge.js` is byte-identical across both repos and cannot carry the note.

### The single edit to a copied file

`src/services/firebase/config.js` uses React Native auth persistence. Swap it:

```js
// Phone app: initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
// Here:
import { getAuth, setPersistence, browserLocalPersistence } from 'firebase/auth';
```

Without this, every page refresh logs the user out. Keep `firebaseConfig`
**byte-identical** — see below.

### The one intentional divergence that is NOT an edit

`src/screens/PowerSafetyManagement/hooks/usePowerSafety.js` will show as drifted
against the phone. **Leave it.** The phone's copy gained `readingsAreStale`
gated on `lastReadingWriteMs` with a 40-second window; this repo solves the same
problem in `SafetyPage.jsx` using `telemetryFresh`, gated on
`metricsUpdatedAtMs` with a 12-second window.

Both are correct, because the two signals have different cadences:
`lastReadingWriteMs` is written at most every 15 s, `metricsUpdatedAtMs` on
every telemetry post — roughly once a second. Copying the phone's 40 s here
makes an unplugged device take a minute to notice; copying this repo's 12 s onto
the phone flickers "No reading" on a healthy one.

See `docs/FROM-THE-PHONE-REPO.md` §22.

---

## Non-negotiable: same Firebase project

```js
const firebaseConfig = {
  apiKey: "AIzaSyD0jBN6PpEPyWuw1On83_T9BIXWhhCoqMo",
  authDomain: "wattwise-fe394.firebaseapp.com",
  projectId: "wattwise-fe394",       // an earlier name — do NOT "fix" it
  storageBucket: "wattwise-fe394.firebasestorage.app",
  messagingSenderId: "421489842338",
  appId: "1:421489842338:web:8ff17e69503589123d1ffb"
};
```

**Never create a new Firebase project.** The ESP32 hardware posts to
`asia-southeast1-wattwise-fe394.cloudfunctions.net`. A new project means this
app watches an empty database while the hardware talks to the old one — and
nothing will error, it will just look permanently empty.

Callables **must** be initialised with the region or every call 404s:

```js
export const functions = getFunctions(app, 'asia-southeast1');
```

---

## Firestore layout

All user data is owner-scoped under `users/{userId}`. Rules already enforce
`request.auth.uid` and need no change.

| Path | Notes |
|---|---|
| `users/{uid}` | Profile. Holds `applianceProfiles[]`, `pushTokens[]` (array, `arrayUnion`), `supplyRates`, `deviceId`, `name` |
| `users/{uid}/outlets/{outletId}` | **`outlet1` and `outlet2` only.** Live telemetry + auto-detection state |
| `users/{uid}/device_commands/{commandId}` | Pending/acked commands. **Written by Functions — never write directly** |
| `users/{uid}/history_logs/{logId}` | Event log |
| `users/{uid}/history_daily/{date}` | Daily rollups, `date` = `YYYY-MM-DD` |
| `users/{uid}/budget/{month}` | `month` = `YYYY-MM` |
| `users/{uid}/notifications/{id}` | Creating a doc here triggers a push |
| `users/{uid}/power_safety/settings` | Thresholds + auto-cutoff state |
| `users/{uid}/schedules/{scheduleId}` | Timers |
| `users/{uid}/reference_comparison/{month}` | Manually entered past bills |
| `devices/{deviceId}` | **Top-level.** Device→account binding |

Outlet documents carry `status` (`'on'`/`'off'`), sometimes `isOn` (boolean),
`outletNumber`, and `pendingStatus`/`pendingStatusUntilMs` (a race guard — see
"Toggling" below). For the authoritative telemetry field list, read
`C:\App\WattWise\functions\src\http\updateOutletMetrics.js` — it is the only
writer. Do not guess field names.

---

## Callable functions

All in `asia-southeast1`. Copying the service layer gets you these for free.

`processOutletToggle` · `clearAutoDetection` · `registerApplianceProfile` ·
`removeApplianceProfile` · `linkDeviceToAccount` · `finalizeInvoice` ·
`checkUserExistsByEmail`

### Toggling an outlet — do not shortcut this

Never write `status` to the outlet document directly. Call
`outletService.updateOutletStatus(userId, outletId, boolean)`, which wraps the
`processOutletToggle` callable.

That path is load-bearing and hard-won:
- It writes `pendingStatus` + `pendingStatusUntilMs`, which stop the ~1/sec
  telemetry stream from overwriting the new status before the ESP32 polls its
  command. Without it **the outlet visibly flips back off within a second.**
- It retries transient callable failures and reconciles by re-reading Firestore
  when the network drops a response the server already acted on.

Use an **optimistic UI update** (move the switch on click, reconcile on the
`onSnapshot` that follows). The round trip to `asia-southeast1` is real and the
control feels broken without it.

---

## Inherited hard constraints

These come from the hardware and the parent project. Do not relax them.

- **Exactly 2 outlets** (`outlet1`, `outlet2`). Stable IDs. Never build a
  "add another outlet" flow.
- **Green/white theme only**, from the copied `colors.js`. Primary `#10B981`.
  Minimal UI: white cards, rounded corners, subdued borders, dim-overlay modals.
- **No mock or dummy data, ever.** Use `0` or real Firebase data. An empty
  dashboard is correct until hardware reports.
- **PELCO III is the billing basis** and must be visible to the user. Block 1
  is user-entered; Blocks 2 and 3 are ERC constants. Rate source:
  https://www.pelco3.org/rates.php
- `calculatePelcoIIIBill` and `RATE_PROFILES` from the copied `billing.js` are
  the only billing implementation here. The phone app and Functions each have
  their own copy, deliberately — that is now **three** that must agree. Changing
  tariff logic means changing all three.
- Appliance detection is **suggestion-first**: never auto-rename or auto-act
  without user confirmation.
- **Appliance identity feeds the per-appliance breakdown and nothing else.** No
  bill, budget, or safety decision may come to depend on it. Energy comes from
  the counter, cost from PELCO III applied to that energy, the cutoff from
  measured watts — so a misnamed appliance costs a label and never a peso or a
  relay. This is a constraint, not a disclaimer: it is what makes it honest to
  say identification is unreliable for loads that change operating regime
  mid-run (a phone charger tapering 30 W → 10 W, a fan on three speeds), and it
  stops being true the moment something downstream starts reading the name.
  Mirrors the phone repo's `CLAUDE.md` as of `17472f5`.

---

## Stack

- **Vite + React + React Router.** Not Next.js — this is an authenticated
  dashboard with no SEO surface, and Firebase Hosting serves a static SPA well.
- **Plain CSS Modules.** The theme is ~15 tokens; a CSS framework would fight it.
- **Recharts** for charts. The phone app hand-rolls a bar chart out of Views
  because React Native has no charting primitive — that constraint is gone here.
  (`react-native-chart-kit` appears in the phone app's `package.json` but is
  never imported. Ignore it.)

### Deploy

**Vercel**, not Firebase Hosting. This said Firebase Hosting until 2026-08-28,
when three things settled it: `vercel.json` is committed here, Firebase Auth's
authorised-domains list carries a hand-added `wattwise-black.vercel.app`, and
`vercel link` found an existing project already matched to this git remote
(`magatnokia-designs-projects/wattwise`).

Deploys are git-driven - push to `main` and Vercel builds it. `vercel.json` sets
the build command, `dist` as output, and the SPA rewrite of `/(.*)` to
`/index.html` that every route but `/` needs to survive a refresh.

```powershell
npm run build     # local check only; Vercel runs its own build
vercel            # preview deployment
vercel --prod     # production - deliberate, never automatic
```

**Do not run `firebase deploy --only hosting`.** The `hosting` block in
`firebase.json` is leftover config. Deploying it publishes a second, divergent
copy of the app to `wattwise-fe394.web.app` while `wattwise.site` stays on
Vercel - two live versions, one of which nobody is watching. It is denied in
`.claude/settings.json`.

### API key gotcha

A Google Cloud API key allows exactly **one** application-restriction type.
The phone app's key may be restricted to Android apps — that restriction would
break this site. Create a **second** key restricted by HTTP referrer for web.
Do not edit the existing key's restrictions.

---

## Design brief

The phone app is a single narrow column with an emoji bottom-tab bar. Do not
reproduce that. Target a real desktop dashboard:

- Persistent left sidebar nav instead of bottom tabs
- Both outlet cards side by side above the fold, with live wattage
- Analytics and History get width: real multi-series charts, sortable tables
- Responsive down to tablet; phone web is a nice-to-have, not the target
  (users on phones have the actual app)

---

## Verification

Test against the deployed site, signed in as a real account, ESP32 powered on.
Item 2 is the one that proves the whole architecture:

1. Login survives a hard refresh (F5).
2. **Toggle `outlet1` in the browser → the physical relay switches, and the
   phone app reflects it within a second.**
3. Live telemetry updates without refreshing (`onSnapshot` working).
4. A bill total on web matches the same month on the phone **to the centavo**.
   If it doesn't, `billing.js` was modified or reimplemented — revert to a
   verbatim copy.
5. Deep link: paste a route into a fresh tab and land on that page.

## What not to do

- Don't modify anything in `C:\App\WattWise`.
- Don't write to `device_commands`, or to outlet `status`, directly.
- Don't reimplement billing, or "clean up" the copied service files.
- Don't add outlets, or a non-green theme, or placeholder data.
- **Don't run destructive commands without explicit confirmation first.** Deleting or
  overwriting files, `git push --force`, `git reset --hard`, `git clean` - all of these
  are the user's call, every time, stated explicitly, not inferred from a task that
  would be tidier if they happened. `.claude/settings.json` denies the worst of them
  outright, because a rule a model can talk itself past is not a guardrail. `git clean`
  is on that list specifically because it would delete `.env.local` and `.env`, which
  hold the Vercel OIDC token and the App Check key and exist nowhere else.
- Don't run `vercel --prod` on your own initiative. Production deploys are deliberate.
- **Do not leave a hard-won lesson only in the commit message.** Two of the phone
  repo's most expensive traps were recorded in commit bodies alone and stayed
  invisible until a laptop reset forced them to be rediscovered. If you learn
  something the next person needs, put it in this file, in `docs/`, or beside the
  code it concerns.
