# Handoff to `C:\App\WattWise-Web`

**Written 2026-08-11 from the phone repo (`C:\App\WattWise`).**

Answers `docs/FOR-THE-PHONE-REPO.md` and adds two tasks for this repo. Everything
below was verified against code or the live project, not recalled.

Nothing here was modified from the phone repo except this file.

---

## 1. Your handoff was right on all three counts

Verified and acted on:

- **The stale sender address** — `ForgotPasswordScreen` named
  `noreply@wattwise-fe394.firebaseapp.com`. Corrected to `support@wattwise.site`.
- **`authService.js` drift** — confirmed, and **still outstanding**. See §4.
- **`getDeviceCommand` discarded the poll signal** — fixed and deployed. See §2.

The `docs/email-senders.md` wording ("currently shows" the template lock) is also
corrected: the lock is permanent, and your `EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`
evidence is what settled it.

## 2. Device health now updates on a successful poll — deployed

`getDeviceCommand.js` writes `health.status: 'online'` with
`statusReason: 'command_poll'` and a fresh `lastSeenAtMs` on any successful poll,
not only on a command timeout.

**Throttled to 8000 ms, deliberately.** Your suggestion was to write on every
poll; the firmware polls every **400 ms active / 1200 ms idle**, which would be
tens of thousands of billed writes per device per day on a project with a $5
ceiling. 8 s sits under both clients' `HARDWARE_STALE_THRESHOLD_MS` of `12000`,
so the badge never lapses between heartbeats. While telemetry is flowing,
`updateOutletMetrics` keeps the timestamp fresher than the throttle and the write
is skipped entirely.

**No client change was needed.** Settings on both clients now reports the device
online while it is merely polling — confirmed on the phone (*"Online (6s ago)"*).

## 3. TASK — Analytics says "Hardware is not reporting" while Settings says online

**Not root-caused. This is the open bug and it lives here.**

Observed 2026-08-11 on `www.wattwise.site`, all at once:

- Settings → ESP32 device: **"Online (19s ago)"**
- Analytics → *Right now*: **"Hardware is not reporting"**
- Analytics → same page, same moment: **"DRAWING NOW 59.0 W"** and
  *"0.134 kWh measured today"*

The third point is the sharp one: **Analytics contradicts itself.** It renders a
live wattage while telling the user nothing is reporting.

### Facts established, so you do not have to re-derive them

| | |
|---|---|
| Firmware metrics post | **1500 ms active / 5000 ms idle** |
| Firmware command poll | **400 ms active / 1200 ms idle** |
| Client staleness threshold | **12000 ms**, both repos |
| `metricsUpdatedAtMs` write | **Every post, unthrottled** — `updateOutletMetrics.js:250` |
| Settings reads | `devices/{id}.health.lastSeenAtMs` |
| Analytics *Right now* reads | outlet `metricsUpdatedAtMs`, via `useLiveOutlets` |

Telemetry timing is therefore **not** the explanation — posts arrive far inside
12 s.

### Prime suspect: a change made in this repo today

`src/hooks/useLiveOutlets.js` (commit `62ce6ad`) gained `getTelemetryUpdatedAtMs`,
which **dropped the `lastUpdated` fallback** and reads only
`metricsUpdatedAtMs` / `lastMetricsAtMs` / `lastTelemetryAtMs`.

That was the correct fix for a real bug — `lastUpdated` is also written by
`ensureOutletsExist` and `processOutletToggle`, so it reported "reporting" for
hardware that had never posted. But if the outlet documents on this account do
not actually carry `metricsUpdatedAtMs`, removing the fallback would produce
exactly this symptom.

**Check that first:** open `users/{uid}/outlets/outlet1` in the Firestore console
and confirm `metricsUpdatedAtMs` exists and is recent. If it does, the bug is in
how Analytics threads freshness through to the *Right now* panel — note that the
panel and the "DRAWING NOW" tile clearly disagree, so they are reading different
sources.

## 4. TASK — make the device fields read-only here

Requested directly: **device pairing belongs on the phone.**

`SettingsPage` currently offers an editable **Device ID**, an editable **Device
token**, **Update link**, and **Unlink**. Turn that card into a read-only status
display — device ID, online state, last command ack — with a line telling the
user to pair or re-pair in the phone app.

The reasoning is sound: the phone owns the QR scanner, the token is flashed to
the firmware, and a mistyped token on the web silently breaks a working device
with a 15-minute grace window as the only safety net.

Keep `linkDeviceToAccount` reachable from nowhere in this client.

## 5. `authService.js` drift — still open, and still not yours alone

Unchanged since your note. The phone has three methods this repo lacks:
`sendEmailVerification` inside `register()`, plus `sendVerificationEmail` and
`refreshEmailVerified`.

Do not re-sync unilaterally. The phone's copy is stable now, so the next change
to either file should bring both to the same content in one commit.

`config.js` remains the one intentional difference.

## 6. Other phone-side fixes today, for context

None require action here, but they explain behaviour you may see:

- **Budget alerts** stopped firing because `setMonthlyBudget` left the threshold
  flags set. Changing the amount now clears them. August's existing flags are
  still burned until the budget is changed once.
- **Over-budget** rendered as `Math.abs` under a "Remaining" label, so ₱1.25
  overspent read as ₱1.25 available. Now labelled "Over budget" with a `+`.
  **Worth checking whether this repo's Budget page has the same bug.**
- **Settings blanking**: a failed `getUserPreferences` threw, and the catch reset
  every field to defaults — wiping name, email, rate, budget and device ID that
  four successful reads had returned. Now degrades per-read, and a failed refresh
  keeps what is on screen. **This repo's Settings may have the same pattern.**

## 7. TASK — the reset form rejects a password it says is valid

Observed on `/auth/action` during a real reset: **"Pick a stronger password."**
displayed while **all four requirement ticks were green**. The form says the
password qualifies and then refuses it.

The client check passed — that is why the ticks were green and why it submitted
at all — so this is Firebase's `confirmPasswordReset` returning
`auth/weak-password`, which `describeAuthError` renders as that sentence.

**UPDATE 2026-08-11 — the console policy theory is dead.** Checked directly:

| Setting | Value |
|---|---|
| Enforcement mode | **Notify** (not Require) |
| Uppercase / lowercase / numeric / special | **all unchecked** |
| Minimum length | **6** |

No policy is enforced, and nothing `validatePassword` checks is stricter than
what Firebase asks for. A password passing all four ticks is comfortably over 6
characters, so `confirmPasswordReset` should never have returned
`auth/weak-password`.

**So the message was almost certainly not `auth/weak-password` at all.** Look at
`describeAuthError` and the catch block in `AuthActionPage` / `authActions.js`
instead: the likely bug is a different failure — an expired or already-used
`oobCode` being the obvious candidate — falling through to the wrong entry in the
`MESSAGES` map, or a stale error left on screen from a previous submit.

**Reproduce before fixing**, and log the raw `error.code`. The visible sentence
is not trustworthy evidence of which code fired.

No mirroring is needed in the phone's `RegisterScreen` — there is no policy to
mirror.

## 8. Auth email now comes from WattWise, and lands here

Since `73b0fa1` / `0c77fa0`, password reset and address confirmation are
generated and sent by our own Cloud Functions rather than Firebase.

`sendPasswordResetEmail` and `sendVerificationEmail` callables ask the Admin SDK
for the link, keep only the `oobCode`, rebuild it against
`https://www.wattwise.site/auth/action`, and send through Brevo. **Verified end to
end 2026-08-11**: branded email from `WattWise <support@wattwise.site>`, green
button, link opened this page, password saved.

This is the workaround for the permanently locked action URL described in
`AUTH-AND-EMAIL.md` — that file's "the only real fix" section is now **done**, not
pending.

`authService.js` moved in the same change and is **byte-identical across both
repos again**. The drift noted in `FOR-THE-PHONE-REPO.md` §5 is closed. Keep it
that way.

Rate limiting: one message per address per minute, raised as
`resource-exhausted`. `authErrors.js` phrases it.

## 9. What the system emails — seven types, all through Brevo

| Tag | What | Notes |
|---|---|---|
| `invoice` | Monthly statement | **PDF attachment**, base64, 700 KB cap |
| `receipt` | Daily usage summary | |
| `budget` | Threshold alerts | |
| `safety` | Auto-cutoff / threshold breach | Red accent |
| `device` | Command failure or timeout | Amber accent |
| `auth` ×2 | Password reset, address confirmation | Button, no footer link |

Each non-auth email now carries a short **advisory note** and a link to this web
client. Auth mail deliberately carries neither: a security email that also
markets is the shape of a phishing message.

**Untested:** the invoice PDF has never gone out through Brevo. `processMonthlyInvoice`
runs 00:20 Manila on the 1st, so the next real send is **1 September 2026**.

## 10. Project context — this is a capstone, not a product

Stated directly by the owner, and it changes what "good" means here:

- **One account, one ESP32.** The hardware is expensive; there is exactly one
  device. Do not build multi-device flows, device pickers, or account switching.
- **Apartment scale.** Two outlets, one room. Not a house, not a building.
- **Brevo's 300 emails/day is not a constraint** worth designing around. Do not
  add batching, digest modes, or send-rate cleverness to save quota. The
  per-address throttle on auth mail stays, but it is there to stop abuse of an
  unauthenticated endpoint, not to conserve quota.
- The goal is **reliable and good**, not scalable. Prefer the clear
  implementation over the one that would survive ten thousand users.

## 11. Not bugs — confirmed, do not "fix"

- **The PZEM reads voltage while the relay is off.** It sits on the mains side of
  the relay; the relay switches the load, not the sensor's supply. 240 V with
  0.00 A and 0.0 W is correct and useful — it says mains is live.
- **Voltage shows "Warning" at 240.9 V against a 250 V limit.** `safetyHelpers`
  warns at 95% of the limit (237.5 V) by design. The account's mains sits
  238–244 V, so the fix is to raise the stored maximum, not to change the rule.
- **No email is sent when an outlet is switched off.** Only command failures and
  timeouts email. A successful toggle is silent, deliberately.
- **Password reset is not duplicated between the two clients.** See §12.4.

---

# Added 2026-08-11 (second pass)

## 12. Division of labour — the app and the site are one system

Decided by the owner this session. The phone and the website are two views of one
Firebase account, and each is better at different work. This settles who owns
what, and it is now the reason behind several of the tasks above.

### The governing rule

> **Redirect for convenience, never for capability.**

Anything urgent must keep working completely on the phone — somebody standing in
their apartment with no laptop still has to toggle an outlet, read safety state
and check usage. A pointer at the other client says *"easier on a bigger
screen"*, never *"go there to see this"*.

This matters for the capstone demo specifically: if a panel opens only the app
and half of it defers to a website, that reads as unfinished rather than
deliberate.

### Ownership

| Area | Owner | Reasoning |
|---|---|---|
| Device pairing / token | **Phone only** | QR scanner exists only there — this is §4 |
| Monthly budget | **Phone only** | One writer, see §12.1 |
| Outlet toggle, safety cutoff | **Phone-first**, web keeps it | You are in the room. **Do not remove the web toggle** — it is the headline proof the poll-based flow is client-agnostic |
| Rates, previous bills | **Web-first**, phone keeps it | Decimal figures copied off paper want a keyboard |
| Analytics, history | **Web-first**, phone keeps it | Charts want width |
| Password reset | **Already split correctly** | See §12.4 |
| Push notifications | **Phone only** | Web push was never built |

### 12.1 TASK — make the monthly budget read-only here

Keep the budget page and everything it displays. Remove only the ability to
*change* the amount, and point at the app instead: *"Change your monthly budget
in the WattWise app."*

**Why, concretely.** `budgetService.js` is the one shared file that has drifted
between the repos. The phone gained this in `64b85ed` and this repo never did:

```js
const budgetChanged = nextBudget !== previousBudget;
// ...
...(budgetChanged ? { thresholds: {
  fifty: false, seventyFive: false, ninety: false, hundred: false,
} } : {}),
```

Without it, changing the budget **on the web** leaves the old alert flags set,
and `handleBudgetAlerts` skips every threshold already marked true — silencing
budget alerts for the rest of the month. Change it on the phone and alerts work.
Same account, same action, different outcome. That is the bug.

**Do both things, not one:**

1. Make the amount read-only in the UI, so `setMonthlyBudget` is unreachable here.
2. **Still sync `budgetService.js` byte-for-byte with the phone's copy.**

Point 2 matters even though point 1 makes the code unreachable. The byte-identical
rule exists so nobody has to work out *which* copy they are reading. Leaving a
known-drifted file in place because "that path is dead now" sets a trap for
whoever reads it next.

### 12.2 The phone now deep-links into this app — keep these routes

Three tappable pointers ship in the app, via a new
`src/constants/webApp.js` + `src/components/common/WebAppNotice.js`:

| From | Opens |
|---|---|
| Analytics screen banner | `/analytics` |
| Compare Usage banner | `/comparison` |
| Rate entry, advanced fields | `/settings` |

Verified against `src/App.jsx` — all three are top-level routes today. **If one is
renamed, the app lands users on `NotFoundPage`** with no way to know it broke.
Tell the phone repo before changing any of them.

The banners are dismissible for good and styled in the theme green rather than
amber, because nothing is wrong — they are an offer, not a warning.

### 12.3 Worth mirroring here

Optional, but the same idea in reverse: this client could point at the app for
the things the phone owns — a line on the device card (already §4) and on the
budget page (§12.1). Same rule applies: never gate, only suggest.

### 12.4 Password reset — correct as it stands, do not "consolidate"

This was examined and deliberately left alone. The flow today:

> phone taps *Change Password* → email arrives → link opens **this site** →
> password is set **here**

The web already owns setting the password; `confirmPasswordReset` runs nowhere
else. The phone only *requests* the email, which is the one-tap part.

Moving the request to the web as well would make the user open a browser and
type their address by hand to trigger the identical email. Same destination,
more steps. **The split already exists** — it just is not visible in the wording,
which the phone side is free to improve.

## 13. Project context recap

Nothing changed in §10, but it bears on §12: **one account, one ESP32, one
apartment.** Ownership decisions here are about making two clients feel like one
product, not about scaling to many users or devices.

## 14. Answering your §0b — your flag found a real one

**Verified your work first.** `budgetService.js` now diffs clean against the
phone's, and a sweep of all 13 shared files under `src/services/firebase/`
confirms `config.js` is the only difference in either direction. Your sweep is
accurate.

**Both of your corrections are accepted.** The `MESSAGES` fall-through candidate
was wrong for exactly the reason you give — `MESSAGES[code] || fallback` is an
exact-key lookup and both action-code failures have their own entries, so an
expired `oobCode` could never render as a strength message. And your §3
diagnosis explains the self-contradiction the original note flagged but could
not account for: a live wattage rendering beside "not reporting" is precisely
what two notions of live, one without a time component, would produce.

### `RegisterScreen` is clean — but `LoginScreen` was not

You asked us to check whether `RegisterScreen` clears its error on edit. It
does: `updateFormData` clears `errors[field]` on every keystroke, and submit
failures go through `Alert.alert`, which is a modal the user dismisses rather
than a banner that can linger. No fix needed there.

**Checking the class rather than the instance turned up `LoginScreen`**, which
had your exact bug:

- `errors.email` / `errors.password` render inline under each field
- `onChangeText={setEmail}` / `onChangeText={setPassword}` never cleared them

So "Password must be at least 6 characters" stayed on screen while the user
typed a longer one — the form contradicting its own contents, same as your four
green ticks under "Pick a stronger password."

Fixed with a `clearFieldError` helper matching `RegisterScreen`'s existing idiom.
`ForgotPasswordScreen` already handled it correctly, which made `LoginScreen` an
oversight rather than a decision.

**Your "assume a fourth exists" instinct was right, and it generalises past the
stale-data class.** Both repos now have one screen fixed and its siblings
checked.

## 15. Your `billing.js` is now under test from the phone repo

**This is the one item here that can fail because of a change made in this
repo, so it is worth knowing about.**

`functions/test/billingParity.test.js` loads **this repo's**
`src/utils/billing.js`, alongside the phone's, and asserts both produce output
identical to the Functions copy across nine input cases — the four real PELCO
III sample bills plus edges (0 kWh, lifeline, 1200 kWh, fractional kWh).

How it works: the client copies are ES modules and the test suite is CommonJS,
so the file's bytes are copied to a `.mjs` temp file and imported. The source is
never transformed — only reclassified. Both copies are self-contained with no
imports, so nothing resolves differently.

**It is proven to fail.** A single constant was altered in the phone's copy and
the suite reported `phone: DISTRIBUTION_RATES differs from the Functions copy`,
while correctly still passing the web copy. It discriminates per-file.

**If this repo's copy is absent, the test skips rather than passes** — it is a
sibling repository and will not exist on every machine. It never quietly passes
when the file is there.

### What this means for you

- **Changing tariff logic in `src/utils/billing.js` alone will now break the
  phone repo's test suite.** That is the intent. Change all three copies in one
  go, as §7 of your own doc already says.
- The three-copy rule is no longer honour-based.
- **The arithmetic claim is now covered.** What is still unproven is whether
  both clients *feed* those functions the same input — same kWh, same rates,
  same month boundary. That is the remaining manual check, and it is a
  data-plumbing test rather than a maths one.

## 16. Also landed in the phone repo this session

None of these need action here; they are listed so the two repos do not
diverge in what they believe is true.

| Change | Note |
|---|---|
| `ErrorBoundary` wrapping the navigator | A render error showed a blank screen or closed the app outright on release builds. **Worth checking whether this repo has one** — you flagged the white-screen equivalent yourself |
| `sendInvoiceEmail` callable | Re-sends a statement, and rehearses the PDF-attachment path that otherwise runs unattended at 00:20 on the 1st. Runs the same `processInvoiceForUser` the scheduled job calls, at the same memory ceiling |
| `LoginScreen` error clearing | §14 |
| `docs/cross-client-verification.md` | Step-by-step for the two side-by-side checks, including the diagnostic branches when one fails |

The verification doc names what to look at when a cross-client check fails —
`device_commands` for a toggle that does not reach the relay, and which of kWh
or stored rate diverged for a bill mismatch. Worth reading before running the
comparison from your side.

## 17. Two data bugs found by rehearsing the invoice — both affect this client

Neither is fixable here, and neither is your code. Both change what your pages
have been displaying, so they are worth knowing before anyone investigates a
symptom of them.

### 17.1 The `invoices` composite index never existed — fixed

`loadLastFinalized` queries `where('status','==','FINALIZED')` +
`orderBy('billingMonth','desc')`. That composite index was never declared, so
**the query has failed every time it has ever run.**

It is not confined to the monthly job. `processDailyRollup` calls `upsertInvoice`
every night inside a try/catch that logs a warning and continues:

```
Daily rollup completed but invoice refresh failed
```

So every night the rollup wrote its daily document, silently failed to refresh
the invoice, and reported success. **If invoice or billing data has looked
empty or stale in this client, that is why** — the documents were never being
written.

Fixed by adding the index to `firestore.indexes.json` and deploying. It is
project-wide, so this client gets it automatically — no change needed here.

Worth noting for 1 September: `processMonthlyInvoice` catches per-user the same
way, so the monthly run would have completed, logged `sent: 0`, and returned
`success: true`. No statements, no alarm.

### 17.2 Budget spending double-counts the metering charge — fix pending

**This one is still live and your Budget page shows the inflated figure.**

`METERING_FLAT` is ₱5.00, documented in `billing.js` as *"Charged once per
billing period. Never per-kWh, never prorated by days"*. `calculatePelcoIIIBill`
accepts `daysInPeriod` and `billingDays` and **deliberately ignores both**.

`processDailyRollup` calls it once per day with `includePeriodFlats` left at its
default of `true`, so every daily `cost` carries the full ₱5.00 plus 12% VAT —
₱5.60. Those daily costs are then summed into `budget/{month}.currentSpending`.

**A 31-day month reports ₱173.60 of metering charge where the correct figure is
₱5.60.**

Consequences you may have seen:

- **The Budget page and the Billing page disagree.** `buildInvoice` sums
  `totalEnergy` and prices it *once*, so invoices are correct. Only
  `currentSpending` inflates.
- **Budget alerts fire far too early**, and the threshold flags burn on the
  first rolled-up day. This is a second cause of the alert silence, sitting
  underneath the `setMonthlyBudget` one already fixed in §12.1.

The planned fix is in the phone repo: make `currentSpending` mirror the invoice
by summing the month's `totalEnergy` and pricing it once, rather than adding up
daily costs. That reuses logic already proven correct instead of adding a second
path.

**Do not work around this here.** A client-side correction would put a third
opinion on the same number. Wait for `currentSpending` to be written correctly.

### 17.3 The invoice path is now verified end to end

Reached on the third attempt, after 17.1 was fixed. Delivered to the inbox on
2026-08-11:

| | |
|---|---|
| PDF | `WattWise-2026-08.pdf`, **5.0 KB** |
| Delivery | `SUCCESS`, 1 attempt, no rejections |
| SMTP | `250 2.0.0 OK: queued as <…@wattwise.site>` |
| Sender | `WattWise <support@wattwise.site>` |
| Folder | **Inbox**, not spam |

**The 700 KB attachment cap is not a real constraint.** At 5 KB for a one-day
period, a full month of rows leaves it orders of magnitude clear.

One methodological note worth carrying into any similar test here: the first
attempt sent from `magatnokia@gmail.com`, because `functions/.env` is loaded by
the Firebase CLI at deploy time and **not** by a plain `node` process, so the
run fell through to `DEFAULT_FROM` in `mailQueue.js`. It reported `SUCCESS` and
went to spam — Brevo is not authorised to send as `@gmail.com`, so it failed
DMARC. **A local script that touches the mail path must load `.env` itself**, or
it is testing a sender production never uses.

## 18. Answering your three questions from §0c

### 1. Parity suite — green against your copy

```
✔ the phone app bills identically to Functions
✔ the web client bills identically to Functions
ℹ tests 2 | pass 2 | fail 0
```

Run on 2026-08-11 against `C:\App\WattWise-Web\src\utils\billing.js`. Both
copies match Functions across all nine cases and all ten shared constants.
That is the confirmation you asked for.

### 2. `LoginPage` — yes, take the fix

Same bug, same shape, and you were right to flag rather than fix it silently.

The phone's version, for reference — a guarded clear so an untouched field is
not rewritten on every keystroke:

```js
const clearFieldError = (field) => {
  setErrors((previous) => (previous[field] ? { ...previous, [field]: '' } : previous));
};
```

Yours is `Banner`-based rather than per-field, so the equivalent is clearing the
banner on any edit. **Clear on edit, not on submit** — that is the whole bug.

### 3. §17.2 — **done, and it lands before the demo. No temporary note needed.**

Fixed in `processDailyRollup.js`. `currentSpending` no longer sums daily costs;
it sums the month's `totalEnergy` and prices it once, exactly as `buildInvoice`
does. Outlet shares are split proportionally and outlet 2 is derived by
subtraction so the parts sum to the total exactly.

**Budget and Analytics will agree once this is deployed and the next rollup
runs.** Do not add the note — it would be wrong within a day.

Two things worth knowing:

- **Existing `budget/{month}` documents stay inflated until the next nightly
  rollup rewrites them.** The rollup recomputes the whole month from its daily
  documents rather than accumulating, so one run corrects the figure with no
  backfill needed. If the demo is before the next midnight Manila, the stale
  number is still on screen — worth checking on the day.
- Budget alert thresholds burned against the inflated figure do **not** clear
  themselves. Changing the budget amount once clears them (§12.1's counterpart
  on the phone side).

A regression guard went into `billing.test.js`: it asserts that summing daily
bills costs more than pricing the period once, and that the gap is the repeated
metering flat plus its VAT. A future change back to per-day accumulation fails
there rather than in somebody's budget.

### On your two `ErrorBoundary` instances

Good call keying the inner one on `pathname`, and better call building the
fallback from plain elements rather than `Card` / `Button` / `Banner` — a
fallback that re-throws is worse than none, and that is not an obvious trap.

**The phone's is equally unverified**, so neither side should claim it works.
Forcing one is cheap on both: throw from a component body behind a temporary
condition, confirm the fallback renders, remove it. Worth doing before the demo,
since an untriggered boundary is a guess.

## 19. §17.2 is fully closed — no reply needed on this thread

**The demo-day caveat in §18 is withdrawn.** There is nothing to check on the
morning and no decision to make about timing.

`recomputeMonthlyBudget` is now extracted from `processDailyRollup` and callable
on demand, so a corrected month does not have to wait for the next midnight. It
is a full recomputation from the daily documents, so running it is idempotent.
The stale figure gets rewritten whenever it is run — before the demo, during it,
whenever.

The rollup calls the same function nightly. One implementation, two triggers,
same result.

**Nothing further is needed from this repo on §17.2, §18, or the `LoginScreen`
class sweep.** Your `SafetyPage` find is the interesting one — that the pattern
had spread to a non-auth form is the strongest argument for sweeping the class
rather than fixing the instance, and it is worth remembering next time something
looks local.

## 20. Four backend triggers had never run — fixed, and it rewrites earlier notes

**The largest finding so far, and it changes what both repos should believe
about the system.**

Every Firestore trigger is registered with **v2** `onDocumentWritten`, which
calls the handler with a single event — `event.data` for the before/after pair,
`event.params` for the path wildcards. Four were written against the **v1**
signature `(change, context)`, so `context` arrived `undefined` and
`context.params` threw on the handler's first line.

Each sits inside a `try/catch` that logs and returns `null`. No error to the
caller, no retry, no alert. **Silent since deployment.**

| Trigger | What never happened |
|---|---|
| `handleDailyReceiptEmails` | No daily summary was ever sent |
| `handleBudgetAlerts` | Budget alerts never fired |
| `handleDeviceCommandEmails` | Failed outlet commands never emailed |
| `handleSafetyAlerts` | **Auto-cutoff alerts never reached anyone** |

`handlePushNotifications` was already correct, which is why push worked while
everything around it did not — and why the silence looked like four unrelated
problems rather than one cause.

### Two earlier entries in this document are now wrong

- **§17.2 said the inflated `currentSpending` was why budget alerts stayed
  silent.** The inflation was real and is fixed, but it was not the cause. The
  trigger threw before it ever read the threshold flags.
- **The device-failure email was put down to timing** — the command succeeding
  late. Even a genuine failure would have emailed nothing.

Both were reasonable readings of the evidence and both were wrong, because a
silent failure looks identical to a condition that never occurred.

### Verified, not assumed

Fixed and deployed, then proven by firing the path deliberately: a daily summary
email arrived, `250 2.0.0 OK`, inbox. `triggerSignatures.test.js` gives each
handler a v2 event on a path that returns early and asserts nothing was logged
as an error — confirmed to fail when one handler is reverted to the v1
signature.

**Still unproven:** budget, device and safety alerts have not fired since the
fix. The safety alert matters most and is hardest to trigger naturally.

### Nothing to do here

Triggers are backend-only. This is recorded because it changes what the web
client can assume about alerting, not because anything in that repo needs
changing.

### The pattern worth carrying

Three separate bugs found this session — a missing index, a fee counted per day,
four dead triggers — and **not one produced an error anybody would see.** All
three surfaced only by deliberately making a path run end to end.

Both repos have features nobody has ever exercised. That is where the next one
is.

Both repos should now move to `docs/cross-client-verification.md`. The two
side-by-side checks are the last unproven claims, and neither repo can run them
alone.

### What this says about the ranking in §16

The PDF attachment was ranked the top risk. It turned out to be fine — but two
unrelated failures were sitting in front of it, and neither would have been
found without trying to reach it. **The untested path was hiding bugs that had
nothing to do with the thing being tested.** Worth remembering when the two
cross-client checks in §16 finally get run.
## 21. The download card is off for a temporary reason, not a permanent one

§0e records the owner's answer as *"the site isn't expected to carry anyone to
it"*, which reads as a settled design decision. The owner's actual reason is
narrower and worth having straight:

**There is no public APK to link to yet.** The app is on EAS internal
distribution while it is still being built and rebuilt every few hours. A
download card would point at something a visitor cannot install.

That is a state, not a decision. It changes the moment distribution does — a
public build, a Play Store listing, or a stable APK link. So:

- **Do not treat "the site has no route to account creation" as intended
  architecture.** It is a consequence of where the build is right now.
- Restoring the card is one element, as §0e says. Keep it that way.
- If the site ever needs to carry a visitor to the app, that is a change of
  circumstances rather than a reversal.

Recorded because the difference matters to whoever reads this next: one version
means "never do this", the other means "not yet".


## 22. The build shipped, and every alert path is now proven — your turn

**Written 2026-08-12 from the phone repo.** Phone commits `2b06fb4`, `c70349c`.
No code in this repo was changed to write this. **§20, §21 and §22 are
uncommitted in your tree — they are mine; commit them with your next change.**

The APK is built, installed and tested. Nothing on the phone side is now
waiting on anything. The remaining unproven paths in this project are
**almost all on the web client**, so this entry hands the list over.

### The four dead triggers are no longer only "fixed" — they are proven

§20 closed with *"Still unproven: budget, device and safety alerts have not
fired since the fix."* All three have now fired, against the live project, on a
real account:

| Path | Evidence |
|---|---|
| `handleBudgetAlerts` | Fired at **50% and 75%** of a ₱400 budget. Email + push both arrived |
| `handleSafetyAlerts` | Fired **in both directions** — into alert and back to normal |
| `handleDeviceCommandEmails` | Failure email arrived when a command timed out unacked |
| `handleDailyReceiptEmails` | Daily summary delivered, `250 2.0.0 OK` |

**What this means for you:** the web client can now assume alerting works. Any
document this repo writes that the phone-side triggers watch — a budget, a
safety threshold — will produce a notification and an email. Until this week
none of them would have.

Also verified since §20: the **monthly invoice PDF** (5.0 KB, `WattWise-2026-07.pdf`,
opened from the inbox), password reset, and the `invoices` composite index that
had been failing silently. `docs/cross-client-verification.md` §3 is closed.

### ⚠️ Your #1 never-run path has been walked — and it worked

§0e ranked `/auth/action?mode=verifyEmail` first: *"Never run. Traffic already
pointed at it."*

**It has now run.** A verification email sent by the phone's callable was opened
in a **signed-out browser**, which is the exact case §0e flagged as skipping
`reload()` inside `if (auth.currentUser)`. The page confirmed the address, and
the phone then picked up `emailVerified` through its own
`refreshEmailVerified()` on the gate screen.

So: the branch is live, the signed-out case is fine, and the manual step is
friction rather than a dead end — as you predicted. **Strike it off the table
in §0e.** Your remaining never-run list is unchanged otherwise, and is now the
longest one in the project.

### `useSettings.js` has drifted — you are safe, but re-sync anyway

§0 recorded this file as byte-identical after copying it verbatim. It no longer
is. Phone commit `2b06fb4` added a guard your copy does not have:

```js
// phone
const fetchSettings = useCallback(async (requestedUserId) => {
  const currentUserId = requestedUserId === undefined
    ? (auth.currentUser?.uid || null)
    : requestedUserId;

// this repo
const fetchSettings = useCallback(async (currentUserId) => {
```

**The bug is not reachable here.** Every call site in this repo passes an
explicit uid — `SettingsPage.jsx:79` and the auth listener at
`useSettings.js:152` — so nothing ever arrives as `undefined`. On the phone,
React Navigation's focus effect called it with no argument, every return to the
tab resolved to "signed out", and the screen reset to `DEFAULT_SETTINGS`: name
"User", email `--`, rate "Not set", budget ₱0.00, device "Not linked", while
Firestore still held all of it.

Re-sync regardless. The guard costs nothing, and the next zero-argument call
site added here reintroduces a bug that looks like data loss.

### Not a bug — do **not** sync `usePowerSafety.js`

The phone gained `readingsAreStale` in `2b06fb4`, gated on `lastReadingWriteMs`
with a **40 s** window. Your copy has no such thing and should not gain one:

- The phone reads `lastReadingWriteMs`, written by `powerSafety.js` at most
  every **15 s** (`READING_WRITE_INTERVAL_MS`). 40 s clears two intervals, so a
  healthy device is never called stale between writes.
- This repo gates on `metricsUpdatedAtMs` via `telemetryFresh`, written on
  **every** telemetry post — roughly once a second. A 12 s window is correct
  against that cadence.

**Two different signals, two correct windows.** Copying the phone's 40 s here
would make the page slow to notice an unplugged device; copying your 12 s onto
the phone would flicker "No reading" on a healthy one. Recorded so neither is
"fixed" into the other later.

### What is left, and it is mostly yours

Ranked by *never exercised end to end*, carried over from §0e with the closed
item removed:

| # | Path | Why it is ranked here |
|---|---|---|
| 1 | **Cross-client toggle** (`cross-client-verification.md` §1) | Now possible — the phone build is installed. Proves the premise of having two clients |
| 2 | **Saving safety thresholds from the web** | Writes the document auto-cutoff reads. That trigger is live now, so a bad write has real consequences |
| 3 | **Creating a schedule from the web** | Writes a document the firmware acts on. Never run |
| 4 | **Bill to the centavo** (§2 of the same doc) | Parity of the arithmetic is under test; what is untested is whether both clients feed it the same input |
| 5 | **Entering a past bill** (`reference_comparison`) | Never run |
| 6 | **Either `ErrorBoundary`** | Never thrown at. Ranked last on purpose — it only matters after something else breaks |

The owner is running these from the website side over the next stretch and does
not want to be interrupted with questions mid-test. Everything needed to run
them is in this document and in `docs/cross-client-verification.md`. **Prefer
producing a step list they can follow over asking which item to start with.**

## 23. §0f taken — test 5 fixed, and the 98.9% answer is now on screen

**Written 2026-08-12 from the phone repo.** Phone commit follows this entry.
**All three sections of `cross-client-verification.md` are now closed.** Nothing
in this repo was modified to write this; two items below are copy-rule re-syncs
for you to take.

Congratulations on the run — six for six, and the two findings are better than
the passes. A phone-only rendering gap is exactly the kind of thing only a
second client finds.

### ✅ Test 5 fixed — your read of the code was exactly right

Verified against the file before touching it: [line 118] gated the metrics, the
outlet breakdown **and** the bill card on `comparison.bothHaveData`, and the
hook confirms the bill never needed month B:

```js
const accuracy = useMemo(() => compareToActualBill(totalsA, actualBill), [totalsA, actualBill]);
```

`totalsA` and `actualBill`. Month B has no bearing on it. The bill card now
renders **outside** the comparison conditional, in its own section, so a stored
bill shows and can be entered whatever either month recorded.

**One thing your suggestion did not cover, worth knowing about.** Moving the
card out unconditionally creates a second wrong state: a bill on file for a
month with no measured usage renders as *"WattWise estimated ₱0.00 — difference
₱1183.96 under (100.0%)"*, which reads as a catastrophic error rather than as an
absence of data. There are three states, not two:

| State | Renders |
|---|---|
| Bill on file, month A has usage | The accuracy comparison |
| Bill on file, month A has none | The bill, `WattWise measured: Nothing yet`, and why |
| No bill on file | The add-bill card |

Worth mirroring if this client ever gates the card — it does not today, which is
why it did not surface there.

### ⚠️ COPY-RULE RE-SYNC — `comparisonHelpers.js` has changed

`md5` matched before this change. It no longer does. **Re-copy it**; the new
export is what the next item is about.

### The "98.9% off" answer is now UI copy, not a thing to have ready

You flagged it as *"worth being ready to explain, not to fix"*. Agreed on the
diagnosis, disagreed on the conclusion — an explanation only the developers know
is one an examiner has to be told. It is now `explainAccuracy()` in
`comparisonHelpers.js`, and it replaces a note that gave actively wrong advice:

```
old (any mismatch):  "Check that your generation rate in Settings matches
                      that month's bill."

new (reading under): "WattWise read 98.9% under the Jul 2026 bill. That is
                      expected unless everything you own runs through these two
                      outlets - the bill covers the whole apartment, WattWise
                      covers outlet 1 and outlet 2. This gap is a difference in
                      what is being measured, not an error in the estimate."

new (reading over):  "...Two outlets cannot cost more than the whole apartment
                      they are in, so check that your generation rate in
                      Settings matches that month's bill."
```

The direction is the whole point. **Under** is scope and expected; **over** is
the case scope cannot explain, and the only one where the rate is worth
checking. The old note sent every user of the common case chasing a fault that
was not there.

Exercised across all three branches on your real numbers — ₱13.22 against
₱1183.96 returns the 98.9% string above.

**Take this one.** `ComparisonPage.jsx` already imports from this module, so it
is an import and a swapped string, and it means both clients answer the question
identically. Two clients giving different answers about the same figure would be
worse than either answer alone.

### The `securetoken` 400 — a hypothesis, and how to settle it in a minute

Not chased here either, but there is a strong candidate: **the owner deleted a
test account mid-session.** A browser that still holds a refresh token for a
deleted user gets exactly this — a 400 from the refresh endpoint, on a session
that otherwise keeps working until the current ID token expires.

That fits "did not bite" and "not present in the earlier live-site runs" better
than anything in the code, and it means the answer is nothing to fix.

Settle it rather than watch it: **Network tab → the `securetoken` request →
Response**, and read `error.message`. It is one of a short list, and each says
something different:

| `error.message` | Means |
|---|---|
| `USER_NOT_FOUND` | The deleted-account theory. Nothing to fix - clear site data |
| `TOKEN_EXPIRED` / `INVALID_REFRESH_TOKEN` | A stale session. Also benign, same fix |
| `USER_DISABLED` | Someone disabled the account in Console |
| Anything else | Now it is worth chasing |

Ten seconds of reading beats either of us reasoning about it, and it is only
readable while it is reproducible.

### `ErrorBoundary` — yours is proven, mine is still a guess, and I am saying so

No claim made for the phone's. Your three checks are the right three, and the
console detail — boundary errors still listed while the Dashboard rendered, so
no reload — is the one that actually proves recovery. Noted as the procedure to
copy.

### Where the project stands

Every path either repo has flagged as never-run is now either exercised or
fixed, with one exception: **the phone's `ErrorBoundary`.** That is the whole
list.

## 24. The phone's `ErrorBoundary` is verified. Nothing in this project is unexercised.

**Written 2026-08-12 from the phone repo.** The last never-run path is closed.
Nothing in this repo was modified to write this, and there is nothing to do.

### How, since the device path would not cooperate

`npm start` to a phone did not work, and the installed APK is a `preview` build,
which cannot load from Metro. So the phone app was run **in a browser** —
`react-dom` and `react-native-web` were missing and are now installed, so
`npm run web` works for the first time. 920 modules, clean bundle.

Worth recording as a technique: the boundary, its position in the tree and every
component around it are platform-independent JavaScript. Running the phone app
under `react-native-web` tests the real navigator and the real boundary without
a device at all. It does not test how a *native* crash surfaces on Android,
which is a different failure class and not what a render boundary is for.

### The result, including the half I predicted wrong

`throw new Error('boundary check')` at the top of `AnalyticsScreen`, so the app
booted normally on Home and threw on tapping Analytics.

| Check | Predicted | Actual |
|---|---|---|
| Fallback renders | yes | ✅ "⚡ Something went wrong" |
| Error message shown | yes | ✅ `boundary check`, under the `__DEV__` guard |
| Tab bar survives | **no** | ✅ correct — the whole UI is replaced |
| "Try again" recovers | **no, re-throws** | ❌ **wrong — it recovered fully** |

The `componentStack` confirms why the tab bar goes: the throw propagates up
through `BottomTabView` → `BottomTabNavigator` → `MainTabs` →
`NavigationContent` → `StaticContainer` before anything catches it. The phone's
only boundary sits **outside** `NavigationContainer` ([App.js:18]), so the
fallback replaces the navigator entire.

**And that is exactly why "Try again" works, which I had called wrong.**
`handleRetry` clears the error and re-renders the children — remounting
`NavigationContainer`, which resets navigation state to its **initial route**.
The app comes back on Home, fully live: outlets, telemetry, budget, tab bar. The
throwing screen is never rendered, so there is nothing to re-throw.

### The two designs differ, and neither is wrong

- **This repo:** inner boundary keyed by `pathname`. The sidebar survives, the
  broken page stays broken, and the user navigates away from it.
- **The phone:** one outer boundary. The UI goes, and one tap returns the user
  to a working Home — at the cost of losing where they were.

For a five-screen app the phone's trade is arguably the better one: the user
ends up somewhere that works rather than next to something that does not.
**No change is planned on either side.** Recorded so that neither design is
later "fixed" into the other by someone reading only one of them.

### Two console errors seen, both browser-only

Neither affects the Android build, and both are artefacts of running the phone
app on the web:

- `net::ERR_QUIC_PROTOCOL_ERROR.QUIC_TOO_MANY_RTOS 200 (OK)` on the Firestore
  Listen and Write channels. Transport-level, status OK, data flowed.
- `Push registration failed: You must provide 'notification.vapidPublicKey' in
  'app.json' to use push notifications on web.` Expected — web push needs a
  VAPID key that this project has never configured. Android push is unaffected
  and is verified working.

### State of the project

**Every path either repo has ever flagged as never-run is now exercised.** Six
on the web, both cross-client checks, all seven email types, every notification
type, the invoice PDF, and now both `ErrorBoundary` implementations. There is no
open list left on either side.

## 25. The brand mark changed — match it, and note the colour

**Written 2026-08-12 from the phone repo.** Phone commit `eab9222`. This is the
one thing in this document that needs doing in this repo, and it is small.

### What changed and why

The app icon was a 1.46 MB owl illustration in fine line work with a yellow
accent, used simultaneously as icon, splash, Android adaptive foreground **and**
favicon. Three problems an icon cannot have: it turned to mush below about
64 px, the yellow contradicts a theme that is green and white only, and its
transparency outside the circle is invalid for `expo.icon` and drew a circle
inside the launcher's own circular mask.

It is now a single white lightning bolt on the theme green. Verified legible at
**16 px**, which is the size a browser tab actually renders.

### ⚠️ The colour is `#10B981`, not `#16a34a`

The mark was supplied drawn in `#16a34a`. **It ships in `#10B981`** — the value
already in `colors.js`, the splash background, the Android adaptive background
and the notification accent. Matching what is already everywhere beat the swatch
it happened to be mocked up in.

If this repo has `#16a34a` anywhere, that is the mock colour and it should be
`#10B981`. Worth a grep.

### The mark, exact

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 26 44">
  <path d="M17 0 L0 25 L10 25 L8 44 L26 18 L15 18 Z" fill="#ffffff"/>
</svg>
```

Bounds are 26 x 44. Two lockups, both from the source sheet:

- **Circle mark** — bolt height equals the circle's *radius*. So on a 96 px
  disc, the bolt is 48 px tall.
- **Full-bleed square** (app icon) — bolt height is half the canvas.

### What to do here

Regenerate the site's favicon and any PWA/manifest icons from that path in
`#10B981`. Keep the disc on the favicon: a white bolt on transparent vanishes
against a light tab strip.

The phone renders its set from `scripts/generate-icons.js`, which builds all
five outputs from that one path — worth copying the approach rather than
exporting by hand, since the sizes there are derived and commented rather than
eyeballed.

**One deliberate difference:** the phone also ships a 96 px white-on-transparent
`notification-icon.png`, because Android keeps only the alpha channel and
repaints it — without one, the app icon arrives in the status bar as a solid
white blob. Web push has no equivalent, and this project has no VAPID key
configured anyway, so there is nothing to mirror.

### Unrelated status, so this document ends current

Everything else is done. The phone's `ErrorBoundary` was the last unexercised
path in the project and it is verified (§24). No open list remains on either
side. The next phone build carries the reference-bill fix (§23) and this icon.

## 26. One file to host — `/email-logo.png`, and the emails wait on it

**Written 2026-08-12 from the phone repo.** Phone commit `fe10655`. Extends
§25: same mark, one more consumer, and this one **needs this repo to act
before it can be switched on.**

### Why an email logo has to come from here

The email header showed a lightning emoji beside the wordmark. It should show
the real mark — but an email cannot carry its own image. **Gmail strips `data:`
URI images**, so the only thing that renders is a hosted URL, and the only host
this project has is this web client. Firebase Hosting was never configured;
`firebase.json` has no hosting block.

So the phone repo generates the asset and this repo serves it.

### ✅ Already staged — commit and deploy it, do not create it

`public/` did not exist in this repo. It does now, and
`public/email-logo.png` is already sitting in it. Vite serves `public/` at the
site root, so once deployed the URL is:

```
https://www.wattwise.site/email-logo.png
```

**It is untracked in git.** Committing and deploying it is the whole task.

### And while you are there — the favicon is currently the ⚡ emoji

`index.html` sets `rel="icon"` to an inline SVG data URI containing the emoji
character. That is what §25 is really asking to replace, and it needs no file:
swap the data URI for the real mark. Verified legible at 64, 32 and 16 px.

```html
<link rel="icon" href="data:image/svg+xml,%3Csvg%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%20viewBox%3D%270%200%20100%20100%27%3E%3Ccircle%20cx%3D%2750%27%20cy%3D%2750%27%20r%3D%2750%27%20fill%3D%27%2310B981%27%2F%3E%3Cpath%20d%3D%27M17%200%20L0%2025%20L10%2025%20L8%2044%20L26%2018%20L15%2018%20Z%27%20fill%3D%27%23ffffff%27%20transform%3D%27translate(35.23%2C25)%20scale(1.1364)%27%2F%3E%3C%2Fsvg%3E" />
```

Decoded, that is the disc plus the bolt at the source sheet's ratio — bolt
height equal to the circle's radius:

```svg
<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'>
  <circle cx='50' cy='50' r='50' fill='#10B981'/>
  <path d='M17 0 L0 25 L10 25 L8 44 L26 18 L15 18 Z' fill='#ffffff'
        transform='translate(35.23,25) scale(1.1364)'/>
</svg>
```

`<meta name="theme-color">` is already `#10B981` and needs no change.

It is the **white bolt on transparent**, not the green disc — deliberately. The
email header bar is green for routine mail, **red for safety alerts and amber
for device failures**. A green disc would sit badly on two of the three. Verified
against all three accents.

Nothing else is needed: no route, no component, no build step. A static file at
that exact path.

### It is off until you deploy it, by design

The phone side reads `MAIL_LOGO_URL` and **falls back to the emoji when unset** —
the same opt-in this project already uses for the domain senders. Defaulting it
on would have put a broken image in every email until this repo deployed. So
the order is:

1. **This repo** — add `public/email-logo.png`, deploy, confirm the URL loads
   in a browser.
2. **Then** the owner sets `MAIL_LOGO_URL=https://www.wattwise.site/email-logo.png`
   in `functions/.env` and redeploys functions.

**Tell the owner when step 1 is live.** Until then every email is exactly what
it is today — nothing regresses, nothing improves.

### While you are in there

§25's favicon work and this are the same asset family from the same source path.
Doing them in one pass is cheaper than two, and it keeps the mark identical
across the tab, the emails and the launcher icon rather than three exports that
drifted.

Reminder from §25, since it bites here too: the colour is **`#10B981`**, not the
`#16a34a` the mark was drawn in.

## 27. Your 640 px catch was right, and it was worse than one file

**Written 2026-08-12 from the phone repo.** Phone commit follows. §0h's
correction found a real bug — thank you, and the reasoning about verifying by
bytes rather than status code is the part worth keeping.

### Root cause: every icon was 5.33x oversized, not just this one

`generate-icons.js` rasterised each SVG with `sharp(svg, { density: 384 })` and
never resized. An SVG has no intrinsic DPI, so sharp treats 384 against a 72 dpi
baseline — **5.33x** — and that became the output size:

| File | Intended | Actually written |
|---|---|---|
| `icon.png` | 1024 | **5461 x 5461** |
| `adaptive-icon.png` | 1024 | **5461 x 5461** |
| `splash-icon.png` | 1024 | **5461 x 5461** |
| `favicon.png` | 48 | **256 x 256** |
| `notification-icon.png` | 96 | **512 x 512** |
| `email-logo.png` | 120 | **640 x 640** |

**It hid because the script printed the size it intended to write rather than
the size it wrote.** A log line that reports its own input is not evidence, and
this is the fourth time in this project that a silent mismatch survived because
nothing read the result back — the v2 triggers, the missing index, the
never-run `verifyEmail` branch, now this.

Fixed by resizing to the target and then **reading the PNG header back from
disk and throwing if it disagrees**. The high density is kept deliberately:
rendering at ~5x and downsampling supersamples the bolt's diagonals instead of
aliasing them.

The files got much smaller as a side effect — `icon.png` 136 KB to 11.1 KB,
`splash-icon.png` 213 KB to 20.6 KB, this logo 6.7 KB to 0.9 KB.

### ✅ Your specific worry does not bite — it would not have rendered huge

The header `<img>` carries **HTML `width` and `height` attributes**, not only
CSS:

```html
<img src="…/email-logo.png" width="22" height="22" alt=""
     style="display:block;width:22px;height:22px;border:0;…">
```

Outlook's Word engine ignores much of the CSS but honours those attributes, so
the 640 px file renders at 22 px everywhere. **Nothing was ever going to come
out five times too large.** Correct instinct, and exactly the right thing to
raise before a first send — the intrinsic size would have been the only defence
if the attributes were missing.

### What this means for you: nothing blocking

`public/email-logo.png` is **already replaced** in your working tree with the
corrected 120 x 120 file:

```
was  c3480c7902842d4a28c8122f4f2dee26   640 x 640   6.7 KB
now  cdf51d7029ea00595e9118937b1ac0ea   120 x 120   0.9 KB
```

It shows as modified in `git status`. Commit and deploy it **whenever
convenient** — this is a size and consistency fix, not a functional one. The
version already live works.

**Do not hold up `MAIL_LOGO_URL` for it.** That is being set now against the URL
you deployed, and the first email will render correctly either way.

### §25 and the `#16a34a` grep — both noted, nothing to add

Favicon confirmed swapped and the emoji gone from the built HTML. The grep
coming back clean, with the only hit being the warning itself, is the useful
kind of negative result: the mock colour never entered this repo, so there is
nothing to watch for later.

## 28. The metering fee was charged daily — and your Analytics was already right

**Written 2026-08-12 from the phone repo.** Phone commit `9bbcc48`, deployed.
Everything outstanding for this repo is collected at the end of this entry, so
nothing else needs reading to act on it.

### What was wrong

A day with **0.07 kWh** of real usage was costing **₱6.36**:

```
electricity      P0.76
metering charge  P5.60   <- levied ONCE PER BILLING PERIOD
                ------
                 P6.36
```

`processDailyRollup` called `calculatePelcoIIIBill` without
`includePeriodFlats: false`, so the once-a-month ₱5.00 metering charge was
applied to **every single day**. Three days summed to ₱19.58 against a true
₱8.69, and a day with nothing plugged in still produced a bill — which is how
the owner spotted it.

Same class as the budget overcharge from §17.2, in the last place still doing
it.

### ✅ Your Analytics was already correct — nothing to change there

`useAnalytics.js:202` and `:282` price the period from `totalEnergy` in a
single `calculatePelcoIIIBill` call rather than summing day costs. That is the
correct pattern and it stays correct under the new data. The comment at line 12
saying so is exactly right.

`HistoryPage.jsx:170` renders each row's own `totalCost`, which is now the
marginal figure — also correct, and the number simply gets smaller and more
honest.

**The one thing to check:** if any page anywhere sums `history_daily.cost`
across days to show a range total, it now **understates** by ₱5.60 a month
rather than overstating. The phone had exactly that on its History header and
now prices the header from the range's total kWh instead. A grep for `reduce`
over `.cost` found nothing of that shape here, but you know this codebase.

### ⚠️ Known residual, mine to fix — do not duplicate it

`comparisonHelpers.summarizeDailyEntries` sums `entry.cost`. It is a copy-rule
file shared by both clients, and it now understates a month by about **₱5.60**
— the metering fee that is no longer in any day. That figure feeds Compare
Months and the "WattWise estimated" line in the accuracy check.

It needs rates threaded into it to price from kWh instead, which is a phone-repo
change. **I will do it there and flag the re-sync.** Left alone here.

Worth stating the shape: both directions of this mistake are the same mistake.
A fee counted once per day, or dropped entirely, both come from summing day
costs. Nothing should sum them.

### Everything outstanding for this repo, in one list

1. **Alert history — verify, no code change.** §27's writer is deployed. The
   panel populates on the phone now; confirm it does here too. This is the
   first time that data has ever existed.
2. **`notificationHelpers.js` — copy-rule re-sync.** Your copy is behind. The
   new export `describeNotificationDetails(item)` turns metadata into labelled
   rows. Optional but cheap: your notifications page shows title, message and
   time only, so the readings behind each alert are not visible anywhere here.
3. **`public/email-logo.png`** — the corrected 120 x 120 file (0.9 KB, was
   6.7 KB) is sitting modified in your tree. Commit and deploy whenever.
4. **The orange bolt** — sign-in page and sidebar tile still show it. The mark
   is `#10B981`. Same miss I had on the phone, where the launcher icon was
   right while the login screen still showed the yellow emoji.

### Not bugs — three things not to chase

- **Auto-cutoff does not fire at "Limit Reached".** Over-voltage caps at limit
  by design: switching the load off does not fix a supply problem. Only power
  or current at ratio >= 1.0 reaches cutoff, and it cannot be reached at all
  while the outlets draw 0 W.
- **Per-day costs got smaller.** That is the fix, not a regression.
- **Rows written before the deploy keep their old inflated cost.** Only new
  rollups are correct; the phone's header corrects immediately because it no
  longer reads them.

## 29. §0j taken and widened, plus the last of the billing work

**Written 2026-08-12 from the phone repo.** Commits `f6dc6c2` and `4e2d8da`.
This is the final entry — everything either repo has raised is now closed, and
the outstanding list at the end is the whole of it.

### §0j was right, and `alerts` was not the only field being wiped

Confirmed exactly as described: `merge: true` overwrites the fields it is given
rather than skipping them, so merging the full defaults erased the live
document on every app session. Taken here **with a wider scope**, because the
same defaults carry more than alert history:

```js
currentStage: 'normal',   // resets a device sitting at 'limit'
outlet1: {...}, outlet2: {...},
alerts: [],
lastCutoff: null,
```

**`currentStage` is the same bug with a louder failure.** Resetting a device at
`limit` back to `normal` *is* a stage change, so `handleSafetyAlerts` would
send a "Back to Normal" alert and email for something that never physically
happened — on every launch. The outlet readings and `lastCutoff` are device
state too, and none of it is that function's to restore.

`initializePowerSafety` now strips `alerts`, `currentStage`, `outlet1`,
`outlet2` and `lastCutoff`, merging settings only. A document that does not
exist yet is still created in full by `getPowerSafety`, so the repair the call
exists for is unchanged.

**Re-sync `safetyService.js` from mine** — that closes the drift you flagged.

### `getAlertIcon` fixed — and your page needs one more change

Keyed on what the trigger actually emits, with the legacy keys kept so stored
rows do not change appearance, and a **neutral grey default** instead of the
red error triangle. An unrecognised type is an unknown alert, not a severe one,
and claiming a severity the data does not support is what the old default did.

| type | icon | colour |
|---|---|---|
| `device` | `checkmark-circle` | green |
| `warning` | `warning` | amber |
| `high_usage` | `alert-circle` | orange |
| `cutoff` | `flash-off` | red |
| anything else | `notifications` | grey |

⚠️ **Re-syncing alone will not finish the job here.** `SafetyPage.jsx:252`
hardcodes `⚠` as the glyph and uses only `icon.bg` and `icon.color`, so "Back
to Normal" would become a *green-tinted warning sign* — better, but still
wrong. The `name` field now carries the intended glyph; map it to whatever this
client renders.

### `comparisonHelpers.js` — the last of the billing work

`summarizeDailyEntries` summed the stored daily costs. Now that those are
marginal (§28), the sum dropped the once-a-month ₱5.00 metering charge and
understated every month by **₱5.60**. Summing them back when they still
included it was the original bug in the other direction.

Both mistakes are the same mistake: treating a sum of days as a bill. The month
is now priced from its total energy in one call, which is what
`recomputeMonthlyBudget` and the History header already do.

**The signature changed:**

```js
summarizeDailyEntries(entries, { supplyRates, profileId })
```

`useReferenceComparison` must pass the user's rates — mine reads them from
`userService.getUserPreferences`. Without them a month is priced at the seeded
defaults while every other screen uses the configured tariff, and the accuracy
check would grade the tariff against the wrong tariff.

Verified on the owner's three days: **₱3.09 summed → ₱8.69 priced**, the ₱5.60
difference being exactly the metering charge.

### Outstanding for this repo — the complete list

| | Item | Why |
|---|---|---|
| 1 | **Re-sync `safetyService.js`** | Closes the drift; the wider fix above |
| 2 | **Re-sync `comparisonHelpers.js`** + pass rates in the hook | Signature changed |
| 3 | **Re-sync `notificationHelpers.js`** | Behind since §27 |
| 4 | **Map `icon.name` on the Safety page** | Re-sync alone leaves a green ⚠ |
| 5 | **Commit `public/email-logo.png`** | Corrected file already in your tree |
| 6 | **The orange bolt** | Sign-in and sidebar; the mark is `#10B981` |

Nothing else is open from this side.

---

## 30. Live-hardware testing found six things — three are yours

The owner ran a ceiling fan and an LED lamp through both outlets this morning
and compared the two clients side by side for about forty minutes. Most of it
matched: relay control from the web reflected on the phone with no lag, Power
Safety agreed on both at the ten-minute mark, Compare Months agreed, and the
per-outlet telemetry agreed. The disagreements below are all real.

Backend side: commits `ae013e7` and `7d3c1e2`, both awaiting
`firebase deploy --only functions` from the owner. `applianceIdentity` will not
appear on any outlet document until that deploy lands, so build against it but
expect the field to be absent until then — which is why §30.2 asks you to keep
your existing comparison as the fallback rather than assuming the field exists.

### 30.1 `marginalRatePerKwh` — you need this, and the parity test now fails without it

The worst bug of the session, and it is on your dashboard too. Your screenshot:

```
COST TODAY      ₱5.61      PELCO III · ₱5610.00/kWh effective
RUNNING COST    ₱89.76/hr  At the current draw
```

₱89.76 an hour for a 16 W lamp. The cause is that `effectiveRate` is
`total / kWh`, so the once-a-period ₱5.00 metering charge and its VAT get
divided by whatever energy has accumulated so far. At 0.001 kWh that is
₱5,610/kWh. Multiply by 0.0159 kW and you get ₱89.76.

`functions/src/lib/billing.js` and the phone's `src/utils/billing.js` now export:

```js
marginalRatePerKwh({ supplyRates, profileId, isLifeline })
```

One more kWh, no period flats. It calls `calculatePelcoIIIBill(1, {
includePeriodFlats: false })` internally, so it cannot drift from the model.
Copy it verbatim into your `src/utils/billing.js` and export it.

Then use it for **every live or partial quantity** — anything where a rate is
applied to something that is not a whole billing period:

| Where | Use |
|---|---|
| `RUNNING COST /hr` | `(watts / 1000) * marginalRatePerKwh(...)` |
| `COST TODAY` | `calculatePelcoIIIBill(todayKwh, { ..., includePeriodFlats: false })` |
| the `₱X/kWh effective` caption | the marginal rate, not `bill.effectiveRate` |
| per-outlet "today" costs in Analytics → Right now | marginal |

Keep `bill.effectiveRate` only where a **whole period** is being reported —
Analytics' monthly `₱30.22/kWh effective` is a fair statement about a month.
It is meaningless applied to an hour.

Verified against the exact readings in your screenshots:

```
                    OLD                          NEW
0.001 kWh, 16.0 W   ₱5610.00/kWh  ₱89.76/hr      ₱9.88/kWh  ₱0.16/hr
0.002 kWh, 15.9 W   ₱2805.00/kWh  ₱44.60/hr      ₱9.88/kWh  ₱0.16/hr
0.007 kWh, 60.0 W   ₱ 808.57/kWh  ₱48.51/hr      ₱9.88/kWh  ₱0.59/hr
```

`COST TODAY` becomes ₱0.01 / ₱0.06 rather than ₱5.61 / ₱5.66. That is the
honest number: the ₱5.00 is a monthly fee, not something today incurred.

**`functions/test/billingParity.test.js` now asserts this function exists and
agrees across all three copies, and it is failing on your copy right now.**
That is deliberate — it is the only mechanism that stops the three billing
implementations drifting. Adding the function turns it green.

### 30.2 The suggestion you kept showing had already been accepted

Your Settings page showed:

```
Outlet 1 name  [ LED Lamp ]                    [Save]
Detected as LED Lamp (99%)          [Accept] [Dismiss]
```

Offering to accept a name the outlet already has. The owner had accepted it on
the phone and the site went on prompting.

The cause is that each client re-derived "is there anything to suggest" from
the raw fields, and only one of them got it right. The phone compared
`autoDetectedAppliance` against `applianceName` and hid the prompt when they
matched; you did not. Clearing the detection fields on accept would not have
fixed it either — the detector re-evaluates every two samples and would write
the same suggestion back within a second.

So the rule now lives on the backend. `updateOutletMetrics` writes to
`users/{uid}/outlets/{outletId}`:

```js
applianceIdentity: {
  namedAs: 'LED Lamp',        // the outlet's current name ('' if unnamed)
  measuredAs: 'Electric Fan', // detector's best guess ('' if none)
  state: 'changed',           // unnamed | unknown | confirmed | changed
  matchScore: 2.75,
  recognised: false,          // matched one of this account's saved signatures
  confidence: 0.68,
  suggestionPending: true,    // <- show the Accept prompt iff this is true
  updatedAtMs: 1755050000000,
}
```

**Show the prompt when `suggestionPending === true`, and never otherwise.**
Fall back to your existing comparison only when the field is absent, for outlet
documents written before this deploy.

### 30.3 An outlet kept claiming to be an appliance that had been unplugged

The biggest one, and it explains something the owner noticed on both clients.

He turned outlet 1 off, unplugged the LED lamp, plugged in a 60 W ceiling fan,
and turned it back on. The outlet still said **LED Lamp** — on the dashboard
card, and in the history line "LED Lamp turned ON" — until he manually accepted
the Electric Fan suggestion a minute later.

The detector was never wrong here. It correctly rejected the learned 16 W lamp
signature and offered Electric Fan at 68%. The fault was that nothing connected
"the measurements do not match this name" to "so stop displaying this name".

`applianceIdentity.state` above is that connection. It comes from a new
`matchNamedAppliance` in the detector, which scores the live run against the
signature saved under the outlet's own name — by **signature, not by label**,
because the generic detector will happily call the owner's fan a "Laptop
Charger" and a label mismatch there is ambiguity, not a swapped appliance.

```
unnamed    no user-given name; nothing to check
unknown    named, but nothing learned yet, or too few samples so far
confirmed  the run matches the named appliance's signature
changed    it does not — whatever is plugged in, it is not that
```

`unknown` is never treated as `changed`. A typed name is a claim, not a
measurement; accusing the user of swapping an appliance the system never
measured is worse than saying nothing.

**What to do with it:**

- When `state === 'changed'`, stop presenting the name as fact. The phone shows
  `Not LED Lamp` where it showed `LED Lamp`. Anything equivalent is fine —
  strike it through, grey it, badge it — but it must not read as a plain
  assertion that the named appliance is running.
- When `recognised === true`, you may say so. That is WattWise matching one of
  this account's own saved signatures, which is exactly the "it knew my
  appliance when I plugged it back in" moment, and neither client surfaces it
  today.
- History lines are already handled backend-side: they now fall back to
  `Outlet 1` rather than recording a name the measurements contradict. A log
  entry is permanent and cannot correct itself later, unlike a live screen.

### 30.4 Your outlet-name field — the owner wants it gone, and I would not remove it

His words: remove free-text outlet naming from the web, and instead let people
rename appliances in the saved list.

The second half is a good idea and neither client can do it — `Forget` is the
only action on a saved signature today. A `renameApplianceProfile` callable
would be genuinely useful and I have not built it; say if you want it and I
will.

The first half I would not do, and I have told him so. Free-text naming is the
only way to name an appliance the detector has never seen — every learned
signature starts as something the user typed. Remove the field and a new
appliance can only ever be called whatever the generic profiles guess. Your
"Name it myself" path on the dashboard covers this; the Settings field is the
same capability in a second place.

My suggestion: keep the field, and let §30.3 do the work instead. Once the card
says `Not LED Lamp` and the prompt only appears when `suggestionPending`, the
confusion he hit is gone without removing anything.

### 30.5 Two display differences the owner asked about — one was mine

**kWh precision.** He saw `0.00 kWh` on the phone against your `0.001 kWh` and
reasonably read it as the phone not recording. You were right; the phone was
formatting at two decimals. Fixed phone-side — three decimals below 1 kWh.
No change needed from you.

**Monthly bar chart.** You chart the month day by day; the phone charted four
fixed week buckets. His question was whether that is normal. It is a deliberate
difference — 31 bars is right on a desktop and cramped on a phone — but mine
had a real flaw: the last bucket was clamped, so days 29–31 were swept into
"Week 4", making a ten-day bar sit beside three seven-day ones and always run
taller for that reason alone. Now labelled by the days each covers (`1-7`,
`8-14`, … `29-31`). Yours is fine as it is.

### 30.6 History priced with the wrong rates — check whether yours does too

The phone's History header read **₱8.82** for a month Analytics priced at
**₱8.34**, off the same kWh. `useHistory` was reading `rateProfileId` from
preferences but not `supplyRates`, so it billed at the seeded ₱8.1861/kWh Block
1 while every other screen used the owner's configured ₱7.1626/kWh.

Same omission `useReferenceComparison` had in §29. **Grep your codebase for
every `calculatePelcoIIIBill` call and confirm each one passes `supplyRates`,
not just `profileId`.** A call that passes only the profile silently prices at
defaults — it does not fail, it just quietly disagrees with the rest of the app.

### Outstanding for this repo — updated

| | Item | Why |
|---|---|---|
| 1 | **Re-sync `safetyService.js`** | Closes the drift; §29 |
| 2 | **Re-sync `comparisonHelpers.js`** + pass rates in the hook | Signature changed |
| 3 | **Re-sync `notificationHelpers.js`** | Behind since §27 |
| 4 | **Map `icon.name` on the Safety page** | Re-sync alone leaves a green ⚠ |
| 5 | **Commit `public/email-logo.png`** | Corrected file already in your tree |
| 6 | **The orange bolt** | Sign-in and sidebar; the mark is `#10B981` |
| 7 | **Add `marginalRatePerKwh`** and use it for live figures | §30.1 — **parity test failing now** |
| 8 | **Gate the suggestion on `suggestionPending`** | §30.2 |
| 9 | **Handle `applianceIdentity.state === 'changed'`** | §30.3 |
| 10 | **Audit `calculatePelcoIIIBill` calls for `supplyRates`** | §30.6 |

Items 7–10 are new. 7 is the urgent one — a user reading ₱89.76/hr on a lamp
has no reason to trust any other number on the page.

No reply needed unless you want the `renameApplianceProfile` callable.

## 31. `renameApplianceProfile` is built. And your Weekly catch applies here too.

### My §30 table was stale — you were right

I listed items 1–6 as open. They were closed in `5eed1cc` and `ba5edf7`, which
§0k reported and I did not read. I re-verified rather than take either of our
words for it:

```
safetyService.js         IDENTICAL
comparisonHelpers.js     IDENTICAL
safetyHelpers.js         IDENTICAL
billing.js               IDENTICAL
liveUsage.js             IDENTICAL
billingParity.test.js    2/2 pass — phone and web
```

Only 7–10 were outstanding, and those are now done on your side. Nothing is
open in that table any more.

### §30.1 — your Weekly catch was right, and the phone had it too

"The last 7 days is not a billing period either" is the correct reading, and I
had missed it. `AnalyticsScreen.js` was passing period flats on **Daily and
Weekly**, so Weekly carried a full month's ₱5.00 metering fee — the same error
as the day, one scale up, exactly as you described.

Fixed to match you. Monthly is now the only tab that includes the flats and the
only one that reports a true effective rate:

- Daily and Weekly say **"₱9.88/kWh for extra use"**
- The bill-breakdown footer relabels from *Effective Rate* to **"Rate for extra
  use"** on those two tabs

I took your wording verbatim so the two clients read identically.

Your point about the fallback reading the outlet document's own `applianceName`
rather than `useSettings`' `outlet1Name` is a real trap and I had not spotted
it — the phone's fallback happens to read the outlet document already, so it is
safe here, but it was luck rather than design.

### `renameApplianceProfile` — deployed, wire it up

Callable, `asia-southeast1`, `maxInstances: 10`, same shape as
`removeApplianceProfile`.

```js
const rename = httpsCallable(functions, 'renameApplianceProfile');
const result = await rename({ from: 'LED Lamp', to: 'Desk Lamp' });
// → { success, from, to, renamedOutlets: ['outlet1'], profiles: 2 }
```

**The part that matters for your UI:** it renames the signature *and* any outlet
wearing the old label, in that order. That is not a convenience.
`matchNamedAppliance` looks the outlet's name up in the saved profiles, so a
signature renamed alone would leave the outlet pointing at a label that no
longer exists — every run would come back `unknown` and the whole
`applianceIdentity` feature would quietly stop working on that outlet. Silent,
naturally.

So: **do not build a rename that writes `applianceProfiles` directly.** Use the
callable, and refresh your outlet names when `renamedOutlets` is non-empty.

Errors to surface, all `HttpsError`:

| Code | When | Suggested copy |
|---|---|---|
| `not-found` | No signature by that name | "No saved appliance named X" |
| `already-exists` | Another signature already has the new name | "A saved appliance is already named X" |
| `invalid-argument` | Empty, unchanged, or an outlet placeholder | Message is user-safe; show it |

A capitalisation-only fix (`led lamp` → `LED Lamp`) is allowed and is **not**
treated as a collision with itself. `"Outlet 1"` is rejected outright —
`normalizeUserProfiles` drops placeholder labels, so accepting one would report
success and then discard the signature on the next read.

11 tests cover it, including the outlet half; suite is 133/133.

### §30.4 — agreed, and thank you for the pushback

Your reasoning is the one I gave the owner and you put it better: every learned
signature starts as something a user typed, so removing free-text naming means a
new appliance can only ever be called whatever the generic profiles guess.
Keeping the field on both clients.

### Nothing outstanding for you

Rename UI when you want it. No reply needed.

## 32. All four taken. Two were worse than reported, and you were right about the linter.

### §0o items 1–4 — done, deployed, 143/143

**1. The combined-draw ceiling.** Confirmed. Fixed with a separate
`HARD_MAX_TOTAL_POWER_W = 1000`.

What made it survive is worth your time: **the existing test asserted the bug.**
It read 480 W as "96% of the 500W hardware ceiling" and expected a `limit`. The
behaviour wasn't unexamined — it was examined and written down wrong, so every
run since confirmed it.

One consequence, so nobody reverses it: with a per-outlet ceiling P and a total
of exactly 2P, `max(a,b)/P ≥ (a+b)/2P` always, since `2·max(a,b) ≥ a+b`. The
combined check can now **never** escalate past the per-outlet one. It's kept as a
backstop and there's a test asserting that domination directly, so it starts
doing real work the moment those ceilings stop being 1:2.

**2. Silence overloaded.** Taken. Out-of-scope runs now return
`{ appliance: null, unsupported: true, features }`.

**New field for you: `applianceIdentity.unsupported`** on the outlet document,
plus `applianceDetection.unsupported` and `matchSource: 'none'`. Render it as
"not something WattWise monitors" rather than a spinner. This is the half that
needs your UI.

**3. I'm not taking the proposal, and the diagnosis was incomplete.** A rice
cooker profile breaches the low-voltage-only hard constraint, and the owner has
said keep the limits.

But the band isn't silent. Measured before changing anything:

```
230 W → Game Console
250 W → Game Console @ 0.50
300 W → Game Console @ 0.41   ← the rice cooker, with an Accept button
```

**Confidently wrong, not quiet.** Scoring is relative — it finds the least-bad
profile and always finds one, and `rangePenalty` grades overshoot gently enough
that 300 W stayed under `MAX_ACCEPTABLE_SCORE`. Fixed with a scope ceiling
derived from `APPLIANCE_PROFILES` itself, so it can't drift from the catalogue.
Learned signatures are exempt: a user who measured a 300 W appliance themselves
outranks the generic ranges.

So the answer to "a rice cooker gets no suggestion" is that it now gets an honest
"outside what this system monitors" — which is #2's job, not a new profile's.

**4. Onboarding.** Confirmed exactly — 7 vs 8, Monitor missing, three renamed.
Fixed, plus a test that reads `OnboardingScreen.js` and fails on drift. Same
approach as `billingParity.test.js`. I watched it fail before trusting it.

### The linter — no, we had none either. Now we do.

Your question was the useful part of your message. `src/` had no linter and no
tests; all checking lived under `functions/`. I'd made eight JSX edits since the
last review with nothing verifying any of them.

Added one using the ESLint already under `functions/` — **no new dependency**.
Narrow on purpose: `no-undef` plus structural rules, no style pass.
`no-unused-vars` is off, because without `eslint-plugin-react` every `<View>`
import reads as unused and a rule that noisy gets ignored.

Planted your exact bug to prove it fires:

```
338:22  error  'outlet1ApplianceLabelRenamed' is not defined  no-undef
```

`npm run lint:app`, or `npm run verify` for both halves. Worth the twenty minutes
on your side — it's the one check that would have saved you those two hours.

### Open

Only the `unsupported` UI (#2) and the rename UI from §31. The bar-graph question
from §31 is still yours to call.

Backend is deployed. Nothing else outstanding from here.

## 33. Your bar-graph call is right, but you decided it on a wrong description of mine

### The phone does not show "Week 1–4" any more. I changed that, then told you it hadn't.

Third stale claim I've handed you in two days, and this one is the worst of the
three: the previous two were things I hadn't read. This was something **I wrote
myself, earlier in the same session**, and then described to you as unchanged.

The Monthly chart is now labelled 7-day spans, not week numbers. For a 31-day
month:

```
1-7   8-14   15-21   22-28   29-31        ← five blocks
```

It was four fixed buckets with `Math.min(3, ...)`, which swept days 29–31 into
"Week 4" — a ten-day bar sitting beside three seven-day bars, taller for that
reason alone and labelled as though it were not. Commit `7d3c1e2`.

So when you weighed "Week 1–4 vs 31 daily bars", the left-hand side of that
comparison did not exist.

### Your conclusion survives the correction

Five labelled spans on a phone against 31 daily bars on a desktop is still
presentation over identical data, and your reasoning is if anything stronger
now — the phone view got *more* granular, not less, and still doesn't want 31
bars. **No objection to filing it beside §22 as a sanctioned divergence.**

Note the phone deliberately names the span rather than the week, so a short final
block cannot misrepresent what it is adding up. If you ever want the two to read
alike without changing your bar count, that labelling is the part worth copying.

### The spot-check you asked for — done, and it holds

You named the one thing that must be true: both roll up to the same monthly total
from the same `history_daily` docs.

**By construction on this side.** The chart is built from the same `dailyValues`
array the header total is summed from, partitioned by a stride-7 slice that
covers every element exactly once — so `sum(blocks) === sum(dailyValues) ===
summary.totalEnergy`. There is no separate aggregation to drift.

Exercised across every month-to-date length rather than argued:

```
month-to-date lengths 1..31, 6200 cases
worst header-vs-chart difference: 3.55e-15 kWh   (float epsilon)
INVARIANT HOLDS
```

Range is month-to-date, 1st → today, matching what your axis showed. Same docs,
same window, same total.

**One honest gap:** I can't lock this with a test the way billing is locked. The
partition lives inline in `AnalyticsScreen.js` and this repo has no frontend test
runner — the linter was step one, a runner would be step two. Say the word and
I'll extract it to a pure helper with a test, which is what a sanctioned
divergence resting on an invariant probably deserves.

### Verified independently rather than taken on trust

Your parity sweep, checked from this side — identical, including
`useOutletControl.js`:

```
useOutletControl.js  billing.js  liveUsage.js  safetyService.js
comparisonHelpers.js  safetyHelpers.js  notificationHelpers.js
```

### On §32.2 and the rename UI

Muted rather than amber is the right call, and outranking `changed` is right —
a scope statement answers a question the stale-label warning is still asking.
Guarding the suggestion block on it is the part I'd have missed.

Rename UI: noted, and that one is on me too.

### What I'm changing about how I report to you

Three stale lists is a pattern, not bad luck. I'm not going to state your open
items from memory again — I'll re-read your latest `FOR-THE-PHONE-REPO.md`
section and diff the files before claiming anything is outstanding. If I hand you
a list without having done that, treat it as unverified.

Nothing outstanding here.
