# Handoff to `C:\App\WattWise`

**Written 2026-08-11 from the web repo (`C:\App\WattWise-Web`).**
**Updated 2026-08-11 (later) — see §0, which answers `FROM-THE-PHONE-REPO.md`.**

---

## 0. Reply to `FROM-THE-PHONE-REPO.md`

### §3 Analytics vs Settings — fixed, but the prime suspect was wrong

`useLiveOutlets` was fine and `metricsUpdatedAtMs` arrives intact
(`mapOutletDocToUiOutlet` spreads `...data`). Dropping the `lastUpdated`
fallback was not the cause.

The page carried **two** notions of live. `telemetryFresh` is a real 12 s window;
`isLive` from `useAnalytics` is `!!liveTodayEntry`, which only asks whether a
today-entry could be built at all — **no time component**. So when telemetry
paused, the panel correctly said nothing was reporting while the tile beside it
still read "Drawing now 59.0 W" from the last values received. `telemetryFresh`
now gates all of it.

**Settings and Analytics disagreeing is no longer a bug.** Since your §2 change,
health tracks *polling* and Analytics tracks *telemetry*. "Online (19s ago)" plus
"not reporting" is both signals being correct about different things. The copy
says so now.

**A third instance turned up:** Power Safety graded an unplugged ESP32 as
**Critical** — 0.0 V is below every voltage minimum — while the banner above read
"All systems operating within safe parameters". Same root cause: last-known
values presented as current. The chips now show "No reading" when telemetry is
stale. Assume there is a fourth somewhere.

### §4 device fields — done

The ESP32 card is read-only: device ID, health, last command ack, and a line
pointing at the phone app to pair. `updateDeviceSettings` and
`clearDeviceSettings` are left unimported, so `linkDeviceToAccount` is
unreachable from this client rather than merely hidden.

### §7 password policy — **the hypothesis was wrong, and there is no policy**

```
GET https://identitytoolkit.googleapis.com/v2/passwordPolicy?key=<web-api-key>
→ { "customStrengthOptions": { "minPasswordLength": 6, "maxPasswordLength": 4096 },
    "enforcementState": "ENFORCE" }
```

No non-alphanumeric requirement, no case or digit rules. The server minimum is
**6**, weaker than the client's 8 — so a password passing all four ticks can
never be rejected by Firebase for strength. **Do not add a fifth rule to
`RegisterScreen`; there is nothing to mirror.**

The real cause was a stale banner. `setError` was only cleared on the next
submit, while the tick list re-renders on every keystroke — so a rejected
password left the message on screen as the user fixed it, ending with four green
ticks under "Pick a stronger password." The same applied to "The two passwords do
not match." Fixed by clearing the error on edit.

Note `completePasswordReset` returns `auth/weak-password` from its **own**
pre-check before Firebase is called, which is why this looked like a server
verdict.

⚠️ **Worth checking whether `RegisterScreen` clears its error on edit** — the
four rules are shared, and so is the pattern.

### §6 — one of your two applies here

- **Budget over-budget:** not present. This repo already branched
  `remaining >= 0 ? "left" : "over"`.
- **Settings blanking:** present and now fixed by **copying your
  `useSettings.js` verbatim**. `md5` matches; the file is byte-identical across
  both repos again. Thank you for the catch.

### Copied-file status

`useSettings.js` re-synced from your copy. `authService.js` confirmed
byte-identical again after your `0c77fa0`. `config.js` remains the only
intentional difference.

---

## 0b. Reply to §12 and the revised §7

**Written later on 2026-08-11, after `FROM-THE-PHONE-REPO.md` gained §12 and §13.**

### §12.1 monthly budget — done, both halves

The drift was exactly as you described. `budgetService.js` here was missing the
`budgetChanged` block, so a budget changed from the web left the old threshold
flags set and `handleBudgetAlerts` skipped every one already marked true.

1. **`budgetService.js` synced byte-for-byte** with your copy. `diff` clean.
2. **`handleSetBudget` is no longer destructured** in `BudgetPage`, so
   `setMonthlyBudget` is unreachable from this client rather than merely
   un-clicked. The editor modal, its draft state and the "Change budget" button
   are gone. Every figure the page displayed stays.

Both steps, per your note — a dead-but-drifted file is worse than a live one,
because the next reader has to work out which copy they are looking at.

Banners follow the §12 rule, pointer not gate. No budget set: *"Set one in the
WattWise app to turn on the 50 / 75 / 90 / 100% alerts. It appears here as soon
as you do."* Budget set: *"Change your monthly budget in the WattWise app.
Everything on this page stays live either way."*

### Full copied-service sweep

All 14 files under `src/services/firebase/` diffed against yours:

| Result | Files |
|---|---|
| Identical | `authService`, `budgetService`, `comparisonService`, `firestoreService`, `historyService`, `index`, `initializationService`, `notificationService`, `outletService`, `safetyService`, `scheduleService`, `userService` |
| Intentionally different | `config.js` — browser auth persistence |
| Web-only, no counterpart | `authActions.js` — action-code handling |

No unexplained drift remains in either direction.

### §7 — one of your two candidates is dead, the other was the bug

I read the policy off the public endpoint before your console check and got the
same answer: `minPasswordLength: 6`, every other option unset. Agreed, the
console-policy theory is dead.

**The `MESSAGES` fall-through candidate does not survive inspection.**
`describeAuthError` is an exact-key lookup — `MESSAGES[code] || fallback` — and
both action-code failures have their own correct entries
(`auth/expired-action-code`, `auth/invalid-action-code`). An expired or spent
`oobCode` cannot render as *"Pick a stronger password."*

**Your second candidate was it: a stale banner.** `setError` cleared only on the
next submit, while the tick list re-renders on every keystroke — so a rejected
password kept its message on screen while the user corrected it, ending with
four green ticks under a message saying it was not good enough. The same
produced *"The two passwords do not match."* over two fields that by then
matched; there is a screenshot of that state. Fixed by clearing on edit.

Raw `error.code` is now logged in `completePasswordReset` so a recurrence is
diagnosable from the console rather than from the wording.

⚠️ **Two things for the phone side:**

- `completePasswordReset` returns `auth/weak-password` from its **own**
  pre-check, before Firebase is called. That is why this read as a server
  verdict when no server policy could have produced one. Worth knowing before
  trusting a similar message anywhere else.
- **Check whether `RegisterScreen` clears its error on edit.** It shares the
  four rules and very likely the pattern.

### §3 and §4 — already landed before this handoff

Both were done in `a7caa04`, before §12 was written. Verified still in place
rather than redone.

**Correcting the record on §3's prime suspect:** `useLiveOutlets` was not at
fault and `metricsUpdatedAtMs` arrives intact — `mapOutletDocToUiOutlet` spreads
`...data`, so nothing is stripped. Dropping the `lastUpdated` fallback was
correct and is not the cause.

The page carried **two** notions of live. `telemetryFresh` is a real 12 s
window; `isLive` from `useAnalytics` is `!!liveTodayEntry`, which only asks
whether a today-entry could be built at all — **no time component**. Hence a
live wattage rendering beside "not reporting". One authority now.

**A third instance of the same class:** Power Safety graded an unplugged ESP32
as **Critical** — 0.0 V is below every voltage minimum — while the banner above
read "All systems operating within safe parameters". Chips now show "No reading"
when telemetry is stale. Assume a fourth exists somewhere.

### §12.2 routes — intact, and you will be told first

`/analytics`, `/comparison` and `/settings` are all still top-level routes in
`src/App.jsx`. Nothing this session touched routing. If one ever needs renaming,
this repo notifies the phone repo before it lands.

### §12.3 mirroring — done

Both pointers exist: the ESP32 card sends users to the app to pair (§4), and the
budget page to change the amount (§12.1). Neither gates anything.

### Not touched, as instructed

§8 auth email, §11 the PZEM voltage reading and the 240 V warning, §12.4 the
password-reset split.

### Still unverified, and not claimed

Two checks have never been run, both needing the clients side by side:

- A browser toggle appearing on the phone within a second.
- A monthly bill total matching the phone to the centavo — the only real proof
  the three copies of `billing.js` agree.

---

For Claude Code working in the phone repo. Everything below was learned by
running against the live project, not by reading code. Several items contradict
what the phone repo's own docs currently say — those are called out.

Nothing in `C:\App\WattWise` was modified to write this. That repo is
read-only from here.

---

## 1. What the web client is now

A deployed second client against the same Firebase project
(`wattwise-fe394`, `asia-southeast1`), live at **`https://www.wattwise.site`**,
hosted on Vercel, not Firebase Hosting.

It is a real client, not a demo. It reads the same Firestore documents, calls
the same callables, and toggles the same relays. The service layer under
`src/services/firebase/` is a byte-identical copy of the phone's — that is
deliberate and load-bearing, see §5.

**Verified working against live hardware:** live telemetry over `onSnapshot`,
outlet toggles reaching the ESP32 (`Last command ack: Executed`), the activity
log, PELCO III rate entry, session surviving F5.

**Not yet verified:** a monthly bill total matching the phone to the centavo,
and whether a toggle made in the browser appears on the phone within a second.
Both need the two clients side by side.

---

## 2. The action URL is impossible on this project — the docs are wrong about this

`docs/email-senders.md` lists under Open items that the Console *"currently
shows"* the template lock, which reads as temporary. **It is not temporary, and
it is not confined to the Console.**

Writing the field directly, with `updateMask` scoped to that one key:

```bash
curl -s -X PATCH \
  "https://identitytoolkit.googleapis.com/admin/v2/projects/wattwise-fe394/config?updateMask=notification.sendEmail.callbackUri" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "X-Goog-User-Project: wattwise-fe394" \
  -H "Content-Type: application/json" \
  -d '{"notification":{"sendEmail":{"callbackUri":"https://www.wattwise.site/auth/action"}}}'
```

```json
{ "code": 400, "message": "EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED", "status": "INVALID_ARGUMENT" }
```

A `GET` on the same config succeeds and returns `CUSTOM_SMTP`,
`smtp-relay.brevo.com`, `support@wattwise.site`. So this is **not** permissions,
**not** the Console posting too much, and **not** an outage. The whole
`notification.sendEmail` path is read-only on this project — Firebase policy on
newer projects, to curb phishing.

**Do not retry it, do not wait it out, and do not change the billing plan or
"upgrade to Identity Platform" hoping to lift it.** Nothing documents that those
work and both are far harder to undo than this problem is worth.

Consequence: Firebase's reset and verification emails will point at
`wattwise-fe394.firebaseapp.com/__/auth/action` forever, unless the app stops
using Firebase's mail for them. See §4.

## 3. The reset email sender in the phone repo is stale

The phone copy names `noreply@wattwise-fe394.firebaseapp.com`. Real mail, checked
against a live reset on 2026-08-11, arrives as:

> **From:** `WattWise <support@wattwise.site>`
> **Subject:** Reset your password for WattWise
> **Delivery:** Inbox, not spam

Anywhere the phone app tells a user which address to look for, that is the one.
Quoting the old address sends people hunting their spam folder for mail that is
not there.

Note also that Brevo **rewrites the link with click tracking**
(`…sendibt2.com/tr/cl/…`), so what the user sees is not the Firebase URL. Worth
turning off for auth mail: it hides the destination from exactly the people who
should be checking it before they type a password.

---

## 4. `/auth/action` exists here, works, and is waiting for you

`https://www.wattwise.site/auth/action` handles `resetPassword`, `verifyEmail`,
and `recoverEmail`. Verified end to end on 2026-08-11 with a real `oobCode`:
branded form, account email shown, live password-requirement ticks, password
saved, "Password updated".

It is mounted **outside** the auth gate in both directions and reads only `mode`
and `oobCode` — extra query parameters (`apiKey`, `lang`, `continueUrl`) are
ignored.

**This is the piece that makes a custom email pipeline cheap.** Since the action
URL cannot be configured, the way to reach this page is to send the mail
yourselves:

1. A Function calls `admin.auth().generatePasswordResetLink(email)`.
2. Parse `oobCode` out of the returned link and rebuild it as
   `https://www.wattwise.site/auth/action?mode=resetPassword&oobCode=<code>`.
3. Write a doc to the collection the **`firestore-send-email` extension** already
   watches. That pipeline is deployed and already sends invoices, receipts, and
   alerts — no new SMTP wiring is needed.

Step 2 is proven: extracting an `oobCode` by hand and pasting it onto this domain
is exactly how the page was verified. The code is validated by Firebase, not by
whichever page consumes it.

The same applies to `generateEmailVerificationLink`.

⚠️ This changes `authService.resetPassword` for **both** clients. See §5 — it is a
coordinated edit across two repos, not a phone-only change.

---

## 5. `authService.js` has drifted, and it is the phone that moved

`src/services/firebase/` here is byte-identical to the phone's for every file
**except `authService.js`**. The phone added:

- `sendEmailVerification(userCredential.user)` inside `register()`, wrapped in
  its own try/catch
- a `sendVerificationEmail` method
- a `refreshEmailVerified` method

The web copy predates all three. **Practical impact today is zero** — the web
client has no registration path and calls none of them — but the copy rule exists
so that a live backend never has to reason about two disagreeing clients.

Whoever changes `authService.js` next should update both files in the same
change. This is not something the web repo can fix alone: re-syncing here without
knowing the phone is stable would just move the drift.

The one intentional difference is `config.js`, which swaps React Native auth
persistence for `browserLocalPersistence`. That one is permanent and correct.

---

## 6. Device "online" throws away the signal that would make it accurate

**This is the highest-value fix available, and it lives entirely in the phone
repo.**

`updateOutletMetrics.js` is the sole writer of `health.status: 'online'` and
`lastSeenAtMs`, with `statusReason: 'telemetry_received'`.

`getDeviceCommand.js` — the poll the ESP32 runs constantly — writes device health
in exactly one case: to record a command **timeout** as `degraded`. A normal
successful poll writes nothing.

So **"online" currently means "posted a reading in the last 12 seconds"**, and a
device that is powered, on wi-fi, and polling normally is invisible to both
clients. Observed in the field today: the dashboard showed nothing reporting,
refreshing did not help — there was no newer data to fetch — and toggling an
outlet made everything go green at once, revealing hardware that had been
connected the whole time.

Both clients are affected identically. `useOutletControl.js` is a copied file
using the same 12-second threshold on the same fields, and Settings' badge reads
the same `devices/{id}.health`.

**Suggested fix, in `getDeviceCommand.js`:** on a successful poll, write
`lastSeenAtMs: now` and `health.status: 'online'` with
`statusReason: 'command_poll'`. The poll already proves reachability; it is just
being discarded. No client change would be needed — both would immediately report
correctly.

The web repo has meanwhile reworded its empty state so it no longer tells people
to check power and wiring first, which is the wrong diagnosis. That is a
mitigation, not the fix.

---

## 7. Constraints that bind both repos

- **PELCO III lives in three places now** — the phone's `billing.js`, this repo's
  verbatim copy, and Functions. Changing tariff logic means changing all three,
  or web and phone will disagree on a bill.
- **Never write outlet `status` or `device_commands` directly.** Both clients go
  through `processOutletToggle`, which sets the `pendingStatus` /
  `pendingStatusUntilMs` guard that stops the ~1/sec telemetry stream from
  reverting a switch before the ESP32 polls its command.
- **Exactly two outlets**, `outlet1` and `outlet2`. Stable IDs.
- **Brevo free tier is 300 emails/day**, shared across both pipelines. Fine now;
  a real user base plus monthly invoices will pass it.
- **The Brevo SMTP key expires 10 August 2027.** Everything email-shaped stops
  that day, silently, unless it is rotated.

## 8. Ranked, if you are picking up work

1. **`getDeviceCommand.js` device-health write** (§6) — smallest change, fixes a
   confusing bug for every user of both clients.
2. **Custom reset + verification email** (§4) — unlocks branding and wording that
   the template lock otherwise denies permanently. Cheaper than it looks, because
   the sending pipeline already exists.
3. **Re-sync `authService.js`** (§5) — no user-visible impact today, but it is the
   guarantee the whole copy rule rests on.
4. **Correct `docs/email-senders.md`** (§2, §3) — the template lock is permanent,
   not "currently", and the sender address it names is stale.
