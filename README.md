# WattWise Web

The browser client for **WattWise**, a smart energy monitor for a 2-outlet ESP32
setup. Sign in and do everything the Android app does — live telemetry, toggle
both outlets, schedules, budget, safety thresholds, usage history, and PELCO III
billing — on a layout that has room to show it.

This is a **second client against a backend that is already live**. There is no
backend code here. The Cloud Functions, Firestore rules and ESP32 firmware
already exist and already run against real hardware. The phone app at
`C:\App\WattWise` is the source of truth and is never modified.

---

## How this repo relates to the phone app

The phone app's service layer already uses the Firebase **web** SDK, so it needed
no porting. It was **copied verbatim** — that is the only way to guarantee this
client agrees with a backend that is already deployed.

### Copied unchanged (verified byte-identical)

| Path | What it is |
|---|---|
| `src/services/firebase/` (13 files) | The Firestore schema, in executable form |
| `src/services/notifications/activePushToken.js` | Required by `authService` |
| `src/utils/billing.js` | PELCO III tariff math |
| `src/utils/datetime.js`, `src/utils/liveUsage.js` | Pure JS |
| `src/constants/colors.js` | Theme tokens |
| `src/hooks/useAuth.js` | Auth state + account self-repair |
| `src/screens/*/hooks/*.js` | All 8 screen hooks — none imported `react-native` |
| `src/screens/*/utils/*.js` | `historyHelpers`, `scheduleHelpers`, `comparisonHelpers`, `budgetHelpers`, `safetyHelpers`, `settingsHelpers`, `notificationHelpers` |

Copied files keep the phone app's directory depth (`src/screens/<Name>/…`) so
their relative imports resolve without a single edit.

### The one edit to a copied file

`src/services/firebase/config.js` — auth persistence only:

```js
// Phone app: initializeAuth(app, { persistence: getReactNativePersistence(AsyncStorage) })
// Here:     getAuth(app) + setPersistence(auth, browserLocalPersistence)
```

`firebaseConfig` itself is byte-identical. Same project, same region.

### Rewritten

Everything that imported `react-native`: all screens and components. Plus
`useDismissibleNotice` (AsyncStorage → localStorage). New UI lives in
`src/components/` and `src/pages/`.

### Sign-in only — no registration on the web

There is **no `/register` route**, deliberately. An account must be created in
the mobile app first, because that is where the ESP32 is paired to it; a
web-created account would have no hardware to talk to and would show a
permanently empty dashboard. `/register` redirects to `/login` so old links do
not 404.

Password reset **is** available on the web (`/forgot-password`) — it recovers an
existing account rather than creating one.

---

## Stack

- **Vite + React + React Router** — an authenticated dashboard with no SEO
  surface; a static SPA is the right shape.
- **Plain CSS Modules** — the theme is ~15 tokens in `src/styles/theme.css`,
  mirrored from the copied `colors.js`.
- **Recharts** for charts.

Green/white only. Primary `#10B981`. The two chart greens are validated for
colour-blind separation (ΔE 18.9 deutan); because `#10B981` sits under 3:1
against white, every chart ships a legend, axis labels and a table view.

---

## Running locally

```powershell
npm install
npm run dev      # http://localhost:5173
npm run build    # -> dist/
npm run preview
```

No `.env` file. The Firebase web config is not a secret — it ships in every
client bundle, including the already-published Android app. Access is enforced
by Firestore rules (`request.auth.uid`), not by hiding the config.

---

## Deploying to Vercel via GitHub

`vercel.json` is committed and already correct: `dist` output, and a rewrite of
everything to `/index.html` so deep links survive a refresh.

1. Push this repo to GitHub.
2. In Vercel: **Add New → Project → Import** the repo.
3. Framework preset auto-detects as **Vite**. Leave build command
   `npm run build` and output directory `dist`. No environment variables.
4. Deploy.

### Two things you MUST do in the Firebase console, or sign-in fails

Neither is optional, and both fail in ways that look like an app bug.

**1. Authorize the Vercel domain for Auth.**
Firebase Console → **Authentication → Settings → Authorized domains → Add
domain**. Add:

- `your-project.vercel.app`
- any custom domain you attach
- Vercel preview URLs are `*-<hash>-<scope>.vercel.app` and are **not** covered
  by the production entry — add the ones you actually use, or test on production

Symptom if you skip it: sign-in fails with `auth/unauthorized-domain`. The app
surfaces this with a plain-English message rather than the raw code.

**2. Check the API key's application restriction.**
A Google Cloud API key allows exactly **one** application-restriction type. If
`AIzaSyD0jBN6PpEPyWuw1On83_T9BIXWhhCoqMo` is restricted to **Android apps**, it
will reject requests from this website.

Google Cloud Console → **APIs & Services → Credentials** → open the key:

- If restriction is **None**, or already **HTTP referrers**, add your Vercel
  domains to the referrer list and you are done.
- If it is restricted to **Android apps**, do **not** change it — that would
  break the shipped phone app. Create a **second** key restricted by HTTP
  referrer, and change the single `apiKey` line in
  `src/services/firebase/config.js`. Everything else in `firebaseConfig` stays
  exactly as it is: the same `projectId` is what keeps this client pointed at the
  hardware's data.

Symptom if you skip it: `auth/api-key-not-valid` or `requests-from-referer-…-are-blocked`.

> **Never create a new Firebase project.** The ESP32 posts to
> `asia-southeast1-wattwise-fe394.cloudfunctions.net`. A new project means this
> app watches an empty database while the hardware talks to the old one — and
> nothing errors, it just looks permanently empty.

---

## Deploying to Firebase Hosting (alternative)

`firebase.json` and `.firebaserc` are committed and point at `wattwise-fe394`.

```powershell
npm run build
firebase deploy --only hosting
```

Hosting on `wattwise-fe394.web.app` is authorized for Auth by default, so the
domain step above does not apply there.

---

## Verifying against real hardware

Test the deployed site, signed in as a real account, ESP32 powered on. **Item 2
is the one that proves the whole architecture.**

1. Sign in, then hard-refresh (F5). You stay signed in.
2. **Toggle `outlet1` in the browser → the physical relay switches, and the phone
   app reflects it within a second.**
3. Live telemetry moves without refreshing (`onSnapshot` working).
4. A bill total on web matches the same month on the phone **to the centavo**.
   If it does not, `billing.js` was modified — restore the verbatim copy.
5. Paste a route (e.g. `/analytics`) into a fresh tab and land on that page.

### Why the toggle works at all

The ESP32 polls `getDeviceCommand` over plain HTTP and has no idea whether a
phone or a browser queued the command it picks up.

Toggling never writes `status` directly. It calls
`outletService.updateOutletStatus`, which wraps the `processOutletToggle`
callable. That path writes `pendingStatus` + `pendingStatusUntilMs`, which stop
the ~1/sec telemetry stream from overwriting the new status before the device
polls — without it **the outlet visibly flips back off within a second.** It also
retries transient failures and reconciles by re-reading Firestore when the
network drops a response the server already acted on.

The UI updates optimistically: the switch moves on click and the `onSnapshot`
that follows reconciles it. The round trip to `asia-southeast1` is real.

---

## Hard constraints (inherited — do not relax)

- **Exactly 2 outlets** (`outlet1`, `outlet2`). No "add another outlet" flow.
- **Green/white theme only**, from the copied `colors.js`.
- **No mock or dummy data, ever.** `0` or real Firebase data. An empty dashboard
  is correct until hardware reports.
- **PELCO III is the billing basis** and is visible to the user — see the block
  breakdown on Analytics. Block 1 is user-entered in Settings; Blocks 2 and 3 are
  ERC constants. Rates: <https://www.pelco3.org/rates.php>
- `calculatePelcoIIIBill` and `RATE_PROFILES` come from the copied `billing.js`.
  The phone app and Cloud Functions each keep their own copy — that is **three**
  that must agree. Changing tariff logic means changing all three.
- Appliance detection is **suggestion-first**: nothing is renamed without the
  user confirming.
- Never write to `device_commands`, or to outlet `status`, directly.
