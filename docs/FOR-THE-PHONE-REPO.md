# Handoff to `C:\App\WattWise`

**Written 2026-08-11 from the web repo (`C:\App\WattWise-Web`).**

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
