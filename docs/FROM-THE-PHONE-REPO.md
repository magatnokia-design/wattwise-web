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

## 7. Not bugs — confirmed, do not "fix"

- **The PZEM reads voltage while the relay is off.** It sits on the mains side of
  the relay; the relay switches the load, not the sensor's supply. 240 V with
  0.00 A and 0.0 W is correct and useful — it says mains is live.
- **Voltage shows "Warning" at 240.9 V against a 250 V limit.** `safetyHelpers`
  warns at 95% of the limit (237.5 V) by design. The account's mains sits
  238–244 V, so the fix is to raise the stored maximum, not to change the rule.
- **No email is sent when an outlet is switched off.** Only command failures and
  timeouts email. A successful toggle is silent, deliberately.
