# Auth & email — password reset, senders, OTP

Written 2026-08-11. Covers three requests: fix password reset, set up
`wattwise@` / `support@` senders, and add OTP to registration and login.

**Read the repo-ownership table at the bottom first.** Most of this work lives in
the phone repo (`C:\App\WattWise`), not here — the backend is shared, and this
site has no registration flow at all.

---

## 1. Password reset link doesn't work

### What actually happens today

`authService.resetPassword()` calls `sendPasswordResetEmail(auth, email)` with
**no `actionCodeSettings`**. So the link points at Firebase's default handler:

```
https://wattwise-fe394.firebaseapp.com/__/auth/action
  ?mode=resetPassword&oobCode=<one-time>&apiKey=<web key>&lang=en
```

**This email does not come from the `firestore-send-email` extension.** Firebase
Auth sends it with its own mailer from `noreply@wattwise-fe394.firebaseapp.com`.
Changing `DEFAULT_FROM` in the extension has no effect on it. Two separate
systems — see section 2.

### Likely causes, most probable first

**1. The web API key is restricted to Android apps.** ⚠️ Prime suspect.
The handler URL carries `apiKey=` and is opened in a *browser*. A key restricted
to Android apps rejects that request, and the page fails.
→ Google Cloud Console → Credentials → the key → Application restrictions.
Must be **None**, or **HTTP referrers** including `wattwise-fe394.firebaseapp.com`.
A key allows exactly one restriction type — if the Android app needs its own,
create a **second** key for web.

**2. The link expired or was already used.** `oobCode` is single-use and expires
in 1 hour by default. A second click after resetting shows the same failure as a
broken link.
→ Request a fresh link and use it immediately.

**3. A custom action URL is set on the template.** Console → Authentication →
Templates → Password reset → ✏️ → "Customize action URL". If this points at a
page that was never built, every link 404s.
→ Clear it to use Firebase's default handler.

**4. Gmail link scanning.** Less likely (reset needs a POST to consume), but
forwarding the mail or opening it through a scanner proxy can mangle the URL.
→ Open it in a normal browser, not the Gmail preview pane.

**Diagnosing:** the exact on-screen error identifies the cause immediately —
`auth/invalid-action-code` (2), `auth/argument-error` or a blank page (1 or 3),
`Requests from this Android client application are blocked` (1).

### Optional: land resets on wattwise.site

Nice-to-have, not required. Pass `actionCodeSettings` with
`url: 'https://www.wattwise.site/auth/action'`, add `wattwise.site` and
`www.wattwise.site` to Console → Authentication → Settings → **Authorized
domains**, and build a route here that reads `oobCode` and calls
`verifyPasswordResetCode` / `confirmPasswordReset`. Without the authorized-domain
entry this fails with `auth/unauthorized-continue-uri`.

---

## 2. `wattwise@` and `support@` senders

### There are two independent email systems

| System | Sends | "From" configured at |
|---|---|---|
| **Firebase Auth** | password reset, email verification | Console → Authentication → Templates |
| **`firestore-send-email` ext.** | receipts, invoices, device-command alerts | `DEFAULT_FROM` in `extensions/firestore-send-email.env` (phone repo) |

Currently: `DEFAULT_FROM=WattWise <magatnokia@gmail.com>`.

### The Gmail constraint

Gmail SMTP will only send from the authenticated account or a **verified alias**.
You cannot simply write `support@wattwise.site` into `DEFAULT_FROM` — Gmail
rejects or silently rewrites it.

You own `wattwise.site`, so:

1. **Route mail for the domain.** Cloudflare Email Routing is free — forward
   `wattwise@wattwise.site` and `support@wattwise.site` to your Gmail. (Google
   Workspace also works and is paid.)
2. **Gmail → Settings → Accounts and Import → "Send mail as"** → add each
   address → confirm the verification mail that arrives via the forward.
3. **Update `DEFAULT_FROM`** in the extension env, then redeploy the extension.
4. **Per-message senders:** the extension honours a `from` field on each `mail`
   document, so `functions/src/lib/mailQueue.js` can send receipts as `wattwise@`
   and failure/support mail as `support@`. Set `replyTo: support@` on both.
5. **Firebase Auth's sender is separate** — Console → Authentication → Templates
   → ✏️ → sender name/address. A custom *domain* there needs domain verification
   in the same screen.

### Deliverability warning

Gmail SMTP caps around 500 messages/day on a personal account and has no SPF/DKIM
alignment for `wattwise.site`, so mail from a custom address over Gmail relay
tends to land in spam. For anything beyond demo volume, move the extension to a
transactional provider (Resend, SendGrid, Mailgun) with SPF + DKIM on
`wattwise.site`.

Worth folding into the same job: **the `firestore-send-email` extension is
retired 31 March 2027**, so a provider migration is coming regardless.

---

## 3. OTP on registration and login

### Registration — this site has none

`/register` redirects to `/login` (`src/App.jsx:75`). Registration is
**Android-only**. Any registration OTP is entirely phone-app + backend work; there
is nothing to change here.

### The real gap: `emailVerified` is never checked

`grep emailVerified` returns **zero hits** in both repos. Accounts are usable
immediately with an address nobody proved they own — someone can register as
`someone-else@gmail.com` and receive their bills.

**Recommended fix — free, built in, no custom code:**

1. Phone `RegisterScreen`: call `sendEmailVerification(user)` right after
   `createUserWithEmailAndPassword`.
2. Gate the app on `user.emailVerified` (phone `AppNavigator`, and `AuthGate` in
   `src/App.jsx` here), with a "resend email" affordance.
3. Customise the verification template alongside the reset template in section 2.

This achieves exactly what registration OTP is *for* — proving the address is
real — with none of the custom code below.

**If a 6-digit code is specifically required** (e.g. the capstone rubric says
"OTP"), that is a custom build in `functions/`: a callable that generates a code,
stores a **hash** plus expiry in Firestore, and queues the mail; a second callable
that verifies it. It needs rate limiting (per-account and per-IP), a short TTL
(5–10 min), and an attempt cap, or it is weaker than the link it replaced.

### Login OTP — read this before building it

**A code checked *after* `signInWithEmailAndPassword` is security theater.** That
call returns a valid ID token the moment the password matches. An attacker who
has the password already holds a working credential and can talk to Firestore
directly, ignoring your UI entirely. Hiding the dashboard behind an OTP screen
stops nobody.

Three honest options:

| Option | Real security | Cost |
|---|---|---|
| **(a) Firebase MFA** via Identity Platform upgrade (TOTP / SMS second factor) | ✅ Genuine | Paid product tier; SMS costs per message |
| **(b) Custom flow** — callable verifies the password server-side via the Identity Toolkit REST API, withholds the token, emails a code, mints a custom token only after verification | ✅ Genuine | You are rebuilding authentication. Real risk of introducing a worse hole than you closed |
| **(c) Skip login OTP.** Email verification on register + a password policy | Adequate for this threat model | Free, hours not weeks |

**Recommendation: (c).** For a 2-outlet apartment monitor on a $5 budget, (c) is
the proportionate answer, and email verification is the change that actually
closes a live gap. If MFA is a hard requirement, (a) with TOTP — an authenticator
app, no SMS fees. Do not ship (b) under deadline pressure.

---

## Repo ownership

`C:\App\WattWise` is the phone app **and the shared backend**. It is currently
off limits, so everything marked 🔒 is documented here but not implemented.

| Change | Where | Status |
|---|---|---|
| Diagnose the reset link (API key / template / expiry) | Firebase + Google Cloud Console | Config only — no code |
| `DEFAULT_FROM` → `wattwise@wattwise.site` | 🔒 `extensions/firestore-send-email.env` | Needs phone repo |
| Per-message `from` / `replyTo` | 🔒 `functions/src/lib/mailQueue.js` | Needs phone repo |
| Auth email sender name/address | Firebase Console | Config only |
| Domain mail routing + Gmail alias verification | Cloudflare + Gmail | Manual setup |
| `sendEmailVerification` on register | 🔒 phone `RegisterScreen.js` | Needs phone repo — no web register exists |
| Gate access on `emailVerified` | 🔒 phone `AppNavigator.js` **+** `src/App.jsx` here | Web half can be done now |
| Custom OTP generate/verify callables | 🔒 `functions/` | Needs phone repo |
| Reset link lands on wattwise.site | Both repos | New route here + `actionCodeSettings` there |

**Nothing here is blocked by the web repo.** Everything is either Console
configuration or work in the phone repo. Unfence `C:\App\WattWise` and the
email-sender and verification work is roughly a day.
