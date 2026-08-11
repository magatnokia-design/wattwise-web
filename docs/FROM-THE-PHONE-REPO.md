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

### What this says about the ranking in §16

The PDF attachment was ranked the top risk. It turned out to be fine — but two
unrelated failures were sitting in front of it, and neither would have been
found without trying to reach it. **The untested path was hiding bugs that had
nothing to do with the thing being tested.** Worth remembering when the two
cross-client checks in §16 finally get run.
