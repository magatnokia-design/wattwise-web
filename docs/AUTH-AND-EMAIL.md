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
| App emails (bills, receipts, alerts) | Configured and deployed; end-to-end send not yet confirmed |
| Email verification at registration | ✅ Built in the **phone** repo; needs an EAS build to ship |
| Branded action page (`/auth/action`) | ✅ Built here; **not yet live** — see "Remaining step" |
| Auth email template wording | 🔒 Blocked — Firebase shows *"Email template updates are currently unavailable for this project"*, a temporary lock |

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

1. **Authentication → Settings → Authorized domains** → add `wattwise.site` and
   `www.wattwise.site`.
2. **Authentication → Templates → ✏️ → Customise action URL** →
   `https://www.wattwise.site/auth/action`

⚠️ **Order matters, and this is currently blocked.** The template screen is under
the Firebase lock noted above, so step 2 cannot be done yet. That is fine — the
page has to exist and be deployed first regardless. Setting the action URL
before the page is live **404s every password reset and verification link in
flight**.

To test before the URL is switched, paste a real link's query onto this domain
by hand:

```
https://www.wattwise.site/auth/action?mode=resetPassword&oobCode=<code-from-a-real-email>
```

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
