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
| Branded action page (`/auth/action`) | ✅ Built **and verified end-to-end** on 2026-08-11 with a real `oobCode` — form rendered, password saved, "Password updated". **Not yet reached by Firebase's emails** — see "Remaining step" |
| Auth email template wording | 🔒 Blocked — Firebase shows *"Email template updates are currently unavailable for this project"*, and the ✏️ dialog errors on Save |

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

## Remaining step to make it live

Two console changes, in this order:

1. ~~**Authentication → Settings → Authorized domains** → add `wattwise.site` and
   `www.wattwise.site`.~~ ✅ Done.
2. **Authentication → Templates → ✏️ → Customise action URL** →
   `https://www.wattwise.site/auth/action` ← **the only thing still outstanding.**

Until step 2 is set, every reset and verification email points at
`https://wattwise-fe394.firebaseapp.com/__/auth/action?...` and the branded page
built here is simply never reached. Two costs, not just cosmetics:

- Firebase's hosted page takes a new password behind **one field with no
  confirmation and no strength rules**, so a user can set a password there that
  `RegisterScreen` and `/auth/action` would both have rejected.
- The journey leaves `wattwise.site` at the moment a user is being asked to
  trust it with a password.

⚠️ Order mattered: setting the action URL before the page was live would have
404'd every link in flight. The page is deployed now, so that risk is gone.
Rollback is just clearing the field.

### The console cannot save this — use the API

The ✏️ → **Customise action URL** dialog errors on Save. Two things say the
console's own state is wrong rather than the setting being unwritable:

- The dialog shows **From: `noreply@wattwise-fe394.firebaseapp.com`**, greyed
  out, while real mail arrives from `support@wattwise.site`. It is not
  reflecting the Brevo SMTP config.
- Save posts the **whole** template blob — sender, subject, body, action URL
  together. The body is under the lock above, so the write is rejected as a
  unit even though only the URL was touched.

The underlying field is `notification.sendEmail.callbackUri` on the Identity
Platform config, and it takes a targeted write with an `updateMask` — which
touches the URL and nothing else.

Run this in **Google Cloud Shell** (console.cloud.google.com, the `>_` icon —
`gcloud` is preinstalled and already authenticated, so nothing is installed
locally and no token is copied anywhere):

```bash
PROJECT=wattwise-fe394

# 1. Read first. Check notification.sendEmail — method, smtp.senderEmail, callbackUri.
curl -s "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT/config" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "X-Goog-User-Project: $PROJECT"

# 2. Write only the action URL.
curl -s -X PATCH \
  "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT/config?updateMask=notification.sendEmail.callbackUri" \
  -H "Authorization: Bearer $(gcloud auth print-access-token)" \
  -H "X-Goog-User-Project: $PROJECT" \
  -H "Content-Type: application/json" \
  -d '{"notification":{"sendEmail":{"callbackUri":"https://www.wattwise.site/auth/action"}}}'
```

Rollback is the same PATCH with `"callbackUri":""`.

Reading the failure, if it fails:

| Response | Meaning |
|---|---|
| `200` echoing the new `callbackUri` | Done. Trigger a real reset and check the link host. |
| `400 INVALID_ARGUMENT` naming the URI | The host is not an authorized domain. `www.wattwise.site` already is — check for a typo. |
| `403 PERMISSION_DENIED` | Account is not Owner / lacks `firebaseauth.configs.update`. |
| The same "currently unavailable" lock | The lock covers config writes too, not just the template body. Nothing left but Firebase Support — quote the project ID and the exact message. |

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
