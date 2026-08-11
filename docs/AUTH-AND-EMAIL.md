# Auth & email

Current as of 2026-08-11. **Supersedes the earlier version of this file**, which
recommended Cloudflare Email Routing and Gmail "Send mail as" aliases. Both of
those routes were tried and are dead ends — see "Routes that failed" below, and
do not re-suggest them.

## Where things stand

| | Status |
|---|---|
| Outbound mail provider | **Brevo SMTP**, `wattwise.site` authenticated by DKIM + DMARC |
| Firebase Auth emails (reset, verify) | ✅ Working — inbox, not spam |
| Confirmed sender | `WattWise <support@wattwise.site>`, subject *"Reset your password for WattWise"*. Verified against a real reset on 2026-08-11. The phone repo's older `noreply@wattwise-fe394.firebaseapp.com` is stale — do not quote it to users |
| Authorized domains | ✅ Done — `wattwise.site`, `www.wattwise.site`, `wattwise-black.vercel.app` all added alongside the three defaults |
| App emails (bills, receipts, alerts) | Configured and deployed; end-to-end send not yet confirmed |
| Email verification at registration | ✅ Built in the **phone** repo; needs an EAS build to ship |
| Branded action page (`/auth/action`) | ✅ Built **and verified end-to-end** on 2026-08-11 with a real `oobCode` — form rendered, password saved, "Password updated". **Firebase's emails still do not point at it** — see below |
| Auth email templates *and* the action URL | 🔒 **Permanently blocked on this project.** The API returns `EMAIL_TEMPLATE_UPDATE_NOT_ALLOWED`; the whole `notification.sendEmail` path is read-only. Firebase policy on newer projects, not an outage — see "The action URL cannot be set" |

The authoritative record lives in the phone repo at
`C:\App\WattWise\docs\email-senders.md`. Read it before touching anything email
related — the backend, the extension, and the SMTP config all live there.

## What this repo owns

**`src/pages/AuthActionPage.jsx`** — handles the one-time codes in Firebase's
emails (`resetPassword`, `verifyEmail`, `recoverEmail`) on our own domain,
instead of Firebase's unbranded page at `wattwise-fe394.firebaseapp.com`.

**`src/services/firebase/authActions.js`** — the Firebase calls behind it.

⚠️ **These are deliberately separate from `src/services/firebase/authService.js`.**
That file is a byte-identical copy of the phone app's and must stay that way;
drift is a defect. The phone never handles action codes at all — its emails open
a browser — so none of this has a phone counterpart to keep in sync.

The route is mounted at `/auth/action` **outside `AuthGate`**, in both
directions. A signed-out user resetting a password has no session, and a
signed-in user confirming their address would be bounced to the dashboard by
`AuthGate`'s `!requireAuth` branch before the code was ever spent.

## The action URL cannot be set on this project

🔒 **Settled on 2026-08-11. Do not retry any of it.**

`https://www.wattwise.site/auth/action` works — verified end to end with a real
`oobCode`. Firebase's emails just never point at it, because
`notification.sendEmail.callbackUri` is frozen at
`https://wattwise-fe394.firebaseapp.com/__/auth/action`.

### What was tried, and the exact failure

The console dialog (**Authentication → Templates → ✏️ → Customise action URL**)
errors on Save. The first theory was that the console posts the whole template
blob — sender, subject, body, action URL together — and was being rejected over
the body. It was worth testing because the console's own state is visibly wrong:
the dialog shows **From: `noreply@wattwise-fe394.firebaseapp.com`** greyed out,
while real mail comes from `support@wattwise.site`.

So the field was written directly, with an `updateMask` scoped to that one key:

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

A `GET` on the same config returns fine (`CUSTOM_SMTP`, `smtp-relay.brevo.com`,
`support@wattwise.site`), so this is not permissions and not the console. **The
whole `notification.sendEmail` path is read-only on this project.**

That is Firebase policy, not an outage: template editing — the action URL
included — is disabled on newer projects to curb phishing. Waiting will not
clear it, and neither will a narrower `updateMask`. **Do not change the billing
plan or "upgrade to Identity Platform" hoping to lift it** — nothing documents
that it does, and those are far harder to undo than this problem is worth.

### The only real fix: send the mail ourselves

Firebase's documented answer to a locked template is to stop using its mail:

1. A Cloud Function calls `admin.auth().generatePasswordResetLink(email)`.
2. It parses `oobCode` out of the returned link and rebuilds it as
   `https://www.wattwise.site/auth/action?mode=resetPassword&oobCode=<code>`.
3. It sends that through the Brevo SMTP credentials the project already has,
   with our own subject and body.

Step 2 is proven: pasting a hand-extracted `oobCode` onto this domain is exactly
how `/auth/action` was verified. The code is validated by Firebase, not by
whichever page consumes it.

⚠️ **This belongs in the phone repo** (`C:\App\WattWise\functions`) — no backend
code lives here. And it changes `authService.resetPassword` on *both* clients, so
it is a coordinated edit across the two repos, **not** a web-only change.
Rewriting `authService.js` here alone would break the byte-identical rule.

Until then the flow is unbranded, not broken. Two real costs, worth stating:

- Firebase's hosted page takes a new password behind **one field with no
  confirmation and no strength rules**, so a user can set a password there that
  `RegisterScreen` and `/auth/action` would both have rejected.
- The journey leaves `wattwise.site` at the moment a user is asked to trust it
  with a password.

**Not viable, so do not spend time on it:** redirecting
`wattwise-fe394.firebaseapp.com/__/auth/action` from Firebase Hosting.
`/__/*` is a reserved namespace that Hosting serves itself; rewrites and
redirects there do not take effect. `actionCodeSettings.url` does not help
either — it only appends `continueUrl`, it does not move where the link points.

### Testing before the URL is switched

Paste a real link's query onto this domain by hand:

```
https://www.wattwise.site/auth/action?mode=resetPassword&oobCode=<code-from-a-real-email>
```

⚠️ **Do not click the link in the email first.** Opening Firebase's page spends
the code; by the time it is pasted here it returns
`auth/invalid-action-code`. Copy the `oobCode=` value straight out of the link
without following it. The trailing `&apiKey=…&lang=en` are not needed — the page
ignores every parameter except `mode` and `oobCode`.

## Routes that failed — do not retry

**Gmail "Send mail as" alias.** Google removed *"Send through Gmail"* for
external addresses on personal accounts, so verifying `support@wattwise.site`
requires outbound SMTP for the domain. Namecheap's free forwarding is
receive-only and provides none. Circular.

**Cloudflare Email Routing.** Unnecessary — DNS is at **Namecheap**, which
already had free email forwarding enabled (`eforward1-5.registrar-servers.com`).
Moving nameservers would also have risked the live Vercel deployment.

**Resend.** Verified the domain on DKIM alone but refused to enable sending
without an `MX` record on `send.wattwise.site`. Namecheap hides the MX record
type while MAIL SETTINGS is *Email Forwarding*, and switching to *Custom MX*
risks the forwarding that delivers `support@` to the inbox.

**Brevo works because it authenticates on TXT records only** — no MX — so the
existing forwarding was never touched.

## Login OTP — deliberately not built

A code checked *after* `signInWithEmailAndPassword` is security theatre: that
call returns a valid ID token the moment the password matches, and an attacker
holding the password can query Firestore directly, ignoring the UI. Real MFA
needs an Identity Platform upgrade (paid) or a server-side rebuild of
authentication. The proportionate answer — email verification at registration —
is built instead.

Do not add a post-login OTP screen without reading this paragraph first.

## Note on DNS

`wattwise.site` nameservers are at **Namecheap** (`dns1/dns2.registrar-servers.com`),
not Cloudflare and not Vercel. The site itself resolves to Vercel by CNAME. Root
MX must keep pointing at `eforward1-5.registrar-servers.com` or inbound mail to
`support@wattwise.site` stops.
