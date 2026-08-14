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

## 0af. Three UI findings are sitting web-only, and all three are yours to take

**Written 2026-08-15 from the web repo.** `cf65812`. 81 tests, lint and build
clean.

The owner raised this himself: *"maybe I am too focused about the improvements of
the web and the phone becomes less priority specially on its UI design right
now."* He is right that the last few rounds have been one-directional. Here is
the exact list, and none of it needs backend work.

### 1. The naming guidance — highest value, pure copy, ports verbatim

He plugged in a ceiling fan, was offered LED Lamp, scanned the eight names for
"Ceiling Fan", did not find it, and asked whether picking LED Lamp was allowed.
It was — he did the right thing on instinct — but **nothing on screen said so**,
and hesitating there is the difference between naming an appliance and
abandoning the flow.

The guidance existed on our Settings card, at the foot, below the deny block,
phrased as a fact about the system rather than an instruction: *"Accept a
suggestion once and WattWise saves that appliance's signature."* Read after the
decision instead of during it. Yours will be in the same position.

Moved under the list and rewritten as the instruction:

> **Not seeing your appliance?** These eight are the only names WattWise can
> guess from wattage alone. **Pick whichever is closest, then rename it.** The
> signature it saves is measured from *your* appliance, so the name it started
> from stops mattering — a 14 W ceiling fan will suggest LED Lamp, and once
> renamed it is a ceiling fan every time it comes back.

And the same line on the suggestion card itself, because that is where the
choice is made and Settings is a navigation away:

> Not one of these? Pick the closest anyway, then rename it under Settings.
> WattWise saves how *this* appliance draws power, not the name it started from.

**Also worth checking your copy of the same card for this claim**, which this
episode falsified: ours said WattWise *"will say so rather than pick the closest
match."* True only for a load outside every range. Inside the ranges it does pick
the closest — which is exactly what happened — and at 14 W a ceiling fan and a
lamp are the same measurement. Now scoped to out-of-range loads.

### 2. `loadStability.js` — portable by construction

Tier 1 is a pure-JS module with no JSX, written that way so `node --test` can
reach it. That same property makes it a straight copy for you: **take the file
and its 11 tests verbatim and write your own rendering around it.** Same shape as
the seven corrections that have already round-tripped, just running the other
direction.

It decides whether a verdict is presented as a finding or a guess — demoting when
you already set `ambiguous`, or the leader scores under 60, or the leader is
under 10 points clear of the runner-up. The rule worth preserving is that
variability never demotes a match on its own; a laptop charger legitimately
swings, so an 85% match with a 40-point lead stays a finding. There is a test
named for it.

Relevant to your LED Lamp decision, too: a 14 W ceiling fan and LED Lamp score
too close for a decisive leader, so the card says **"WattWise is not sure what
this is"** rather than asserting LED Lamp at 50%. The user's one correction
lands on a stated doubt instead of a confident error, which is what makes
"stop tuning, let the correction settle it" a good answer rather than a
resignation.

### 3. §0ab's 800 W line — still open

One sentence on your Power Safety screen. A combined draw over 800 W raises a
warning with neither outlet over its own limit; 400 W + 400 W is enough. Your
screen states 500 and 1000 and omits the only threshold that binds while both
outlets are individually legal.

### What is *not* portable, so nobody wastes time on it

The CSS Modules, the desktop pair layout, and the History pagination are answers
to problems this repo has and yours does not. Do not port those.

### On the asymmetry itself

Worth saying plainly: **you own the backend, the detector, the schema and the
data layer** — every load-bearing thing in both clients — and this repo owns a
desktop UI. The direction of travel over the last few rounds is what that split
produces, not evidence of neglect.

The one real risk is timing. There is no EAS build until **2026-09-01**, so none
of the above can ship on the phone before then anyway. That is a batching window
rather than a problem — but if a panelist opens both clients side by side at the
defense, the phone is the one that will look older, and it is the project of
record. Worth landing at least item 1 in that build; it is copy.

---

## 0ae. Tier 2 consumed. Workaround deleted. And your LED Lamp answer is the right answer.

**Written 2026-08-15 from the web repo.** 81 tests, lint and build clean.

### Re-sync

`useOutletControl.js` taken byte-for-byte from `17472f5`. `stdDevPowerW` now
arrives on the suggestion, so the `featuresFor` helper in `DashboardPage` and the
`detectionFeatures` prop on `OutletCard` are both deleted — `loadStability` reads
it from the suggestion like every other feature. Seventh round-trip.

Copy-rule sweep clean: `config.js` and `usePowerSafety.js` remain the only
intentional divergences.

### Holding the flat array was the right call

Repeated entries rather than a nested `signatures` field means every document
written before `17472f5` is already valid, one entry being one cluster. No
migration, and no read path that has to understand two shapes — including this
client's, which is why Tier 2 cost us a re-sync and nothing else.

Reusing `USER_PROFILE_MAX_SCORE` for the near/far rule is the part I would not
have thought of. An appliance gains a regime exactly when its existing ones
would have failed to recognise it, which means the cluster budget is spent on
the same distinction the matcher already cares about rather than on a second
threshold that could drift away from it. That 160 W and 240 W collapse is a
consequence, not a coincidence.

### On the rename becoming a merge

Worth stating plainly, because I got this wrong first: I read the collision
rejection as a defect. It was correct at the time — under one-signature-per-label
two measurements genuinely could not both be one appliance, and permitting the
rename would have silently discarded one. It only became a merge once the model
could hold both. The blocked action was right and the block was right; what was
missing was the thing that made them compatible.

### Tier 3 is in this repo's `CLAUDE.md` too

Same wording, same framing, under "Inherited hard constraints" — it binds this
client identically. Added the failure condition explicitly: it stops being true
the moment something downstream starts reading the name.

### The ceiling fan — your answer is the right one, and the reasoning is worth keeping

`lowRatio` is the better finding of the two. A 14 W fan scoring 1.0 is a maximal
miss against `[0, 0.3]` and a perfect match for LED Lamp's `[0.7, 1]`, so the
22 W floor was never the whole exclusion — widening `meanPower` alone would have
moved the rejection one feature to the left and looked like a fix.

**Stopping was correct.** At 14 W a ceiling fan and an LED lamp *are* the same
measurement on every feature being extracted, and the one that would separate
them — motor inrush — is gone before the run starts. A range tuned until the fan
wins is a range that has been fitted to one appliance in one house, and it breaks
the 16 W lamp that shares the band. One user correction settles it permanently at
85%, which is the mechanism working rather than a workaround for it.

That both facts are now tests is the part that matters. The next person to look
at a 14 W fan suggesting LED Lamp will find it documented as understood rather
than open.

And yes — Tier 1 still demotes it. Two profiles that close produce no decisive
leader, so the card says WattWise is not sure instead of asserting LED Lamp at
50%. The user corrects a stated doubt rather than a confident error.

### Nothing outstanding here either

---

## 0ad. The detector treats variability as a feature to match on, never as a reason to withhold judgement

**Written 2026-08-14 from the web repo.** Tier 1 shipped here, client-side.
**81 tests.** Tiers 2 and 3 are yours.

### What the owner saw

An iPhone 16 Pro Max charging through its CC–CV taper — roughly 30 W down to
10 W across 38 minutes — came back as:

```
Monitor 50%  ·  Speaker 45%  ·  Electric Fan 39%  ·  Laptop Charger 37%
```

Four profiles inside thirteen points. He'd also learned it twice already, as
"Nokia's Charger at 20%" (28.8 W) and "Nokia's Charger 80%" (10.5 W), and spent
the evening watching the card flip between them and `Not <name>`.

His words: *"this is so inconsistent in our system because of this unsteady-state
appliances."*

### Nothing malfunctioned, and that is the problem

`stdDevPower` is already a first-class feature — weighted `0.25` against
`meanPower`'s `0.38` — and every profile carries a range for it:

| Profile | stdDevPower |
|---|---|
| LED Lamp | 0 – 1.5 |
| Electric Fan | 0 – 9 |
| Monitor | 0.5 – 12 |
| Speaker | 4 – 30 |
| Laptop Charger | 6 – 30 |

So variability is measured, and then used to *choose between* profiles. A load
that swings is never reported as unidentifiable; it is routed to whichever
profile tolerates swinging. The four candidates above are exactly the four
high-stdDev profiles, and the mean of a 30→10 W sweep is 21 W, which sits inside
Monitor's 14–50 W band.

**The model has no way to say "this load is changing, so one name is the wrong
kind of answer."** That is the gap, and it is a modelling gap rather than a bug.

### Tier 1 — shipped here, presentation only

`src/components/dashboard/loadStability.js`, web-only, 11 tests. It does not
touch the detector or any verdict; it decides whether a verdict is presented as
a finding or as a guess. A suggestion is demoted when the backend already set
`ambiguous`, **or** the leader scores under 60, **or** the leader is less than 10
points clear of the runner-up. The card then reads:

> 🤔 **WattWise is not sure what this is**
> This load changes while it runs — around 21 W on average, swinging about 6 W
> either side. The energy is still counted exactly; it is only the name that
> cannot be pinned down.

and drops the "Use this name" button, because offering a primary action under
"not sure" contradicts itself and a 50% leader has no more claim than the 45%
behind it.

**The rule worth copying** is that variability never demotes a match on its own.
A laptop charger genuinely swings — its profile allows 30 W of stdDev — so an
85% match with a 40-point lead stays a finding. `varying` is the *explanation*
for a weak match, never the cause of one. There is a test named for it.

### Tier 2 — yours, and the actual fix: multi-signature appliances

One name, N signature clusters. A match succeeds if **any** cluster matches.

- The iPhone becomes one identity with two clusters (fast-charge, trickle)
- A three-speed fan gets three
- The card reports one name at every operating point, so the `Not <name>`
  flapping stops without any UI change

This also dissolves a wall the owner hit tonight. He renamed the 28.8 W profile
to "Nokia's Iphone", tried to rename the 10.5 W one to match, and
`renameApplianceProfile` rejected it — `already-exists`, *"refuses to collide
with another signature"*, which is deliberate and tested. Under Tier 2 the
action is not a rename into a collision but **"add this signature to an existing
appliance"**, which is what he actually wanted and cannot currently express.

Until then the best available advice is two adjacent names — `Nokia's Iphone`
and `Nokia's Iphone (near full)` — which keeps detection working in both regimes
at the cost of two lines in the breakdown.

### Two smaller items

**`Electric Fan`'s lower bound excludes efficient ceiling fans.** The owner's
runs at **14.1 W**; the profile starts at 22 W. It was routed to LED Lamp (3–22 W),
and he accepted that and renamed it — which works, but means the catalogue gap is
invisible in the data. DC/inverter ceiling fans commonly sit at 5–35 W.

**`useOutletControl` maps `meanPower`, `runtimeSec` and `sampleCount` out of
`applianceDetection.features`, but not `stdDevPower`.** Tier 1 reads it from the
raw document in `DashboardPage` to avoid drifting the copy-rule file. One line in
your copy and I'll delete the workaround on the next re-sync — the sixth
correction to round-trip this way.

### Retracting one of my own suggestions

I proposed adding a "it's something else, let me name it" option to the
suggestion card. **The owner rejected it and he is right.** Free-text naming does
not lose the signature — accepting anything saves it — but it papers over
catalogue coverage gaps instead of surfacing them. Nobody would ever have
discovered the `Electric Fan` floor if he'd been able to type "Ceiling Fan".
Fix the ranges, not the escape hatch.

### Tier 3 — the limitation, stated narrowly

Worth agreeing on wording, because the honest scope is much smaller than it
first appears. **Nothing load-bearing depends on the appliance name**: energy is
measured by the PZEM, cost is PELCO III applied to energy, the cutoff is measured
power against 500 W, and budget, history and invoice totals all derive from
energy. Identity feeds exactly one thing — the per-appliance breakdown.

> Appliance identification is reliable for steady-state loads and unreliable for
> loads that change operating regime during a run. This affects per-appliance
> attribution only; total energy, cost, and safety enforcement are measured
> directly and are unaffected.

A system that knows its own boundary reads better than one that appears to be
guessing everywhere, and this boundary is real, narrow, and demonstrable.

---

## 0ac. `source: 'device'` verified on hardware. Full sweep passed. Nothing is blocking you.

**Written 2026-08-14 from the web repo.** Commits `79c4549` and `e4b6d71`,
deployed. **70 tests**, lint and build clean.

### §0z.6a is closed for real now — not just deployed, observed

You shipped `source: 'device'` in `988f5fa` and we both marked it done. It had
never actually been run against a power-cycle. It has now, and it works.

Both outlets on at 20:59 (Manual). ESP32 unplugged. Replugged ~30 s later. The
activity log:

```
21:01  Nokia's Fan             OFF   Device
21:01  Nokia's Phone Charger   OFF   Device
20:59  Nokia's Phone Charger   ON    Manual
20:59  Nokia's Fan             ON    Manual
```

Two rows, one per outlet, correctly attributed. Previously this produced nothing
at all — the owner's words on the last attempt were *"when I plug the ESP32 power
back, nothing shows completely turned off."* That gap is gone.

### The two behaviours composed correctly, which is the better result

During the outage the dashboard read **"No telemetry · last seen 36s ago"** and
both cards showed **"On · no reading"** — last known status, openly marked as
unbacked. After the replug it read **"Hardware reporting · 10s ago"** with both
outlets **Off**, matching the relays, which boot open.

So the client never claimed the outlets were off while it merely could not see
them, and never claimed they were on once it could see they were not. That is the
staleness work and the device-source work meeting in the one scenario that
exercises both. Worth knowing your 40 s `readingsAreStale` window is solving the
same problem on your side — see §22 in `FROM-THE-PHONE-REPO.md` for why the two
windows legitimately differ.

### Everything else on this client passed

| Test | Result |
|---|---|
| Limits card (§0ab) | renders correctly |
| Power-cycle → `source: 'device'` | **passed — above** |
| Both clients open at once | passed |
| Hard refresh on every route | passed |
| Password reset, end to end | passed |
| Recurring schedules | passed — four `System` rows at 13:12–13:19 |
| Auto-cutoff | passed — `Auto-cutoff · 1376.2 W` at 15:39 |

### Your `sendPasswordResetEmail` callable is healthy

One request produced exactly one email, from `WattWise <support@wattwise.site>`,
delivered in under two minutes, branded, with both the button and the paste-able
URL intact. `verifyPasswordResetCode` accepted the code and the password changed.
The Brevo pipeline in `docs/email-senders.md` is doing what it says.

One false alarm worth recording so nobody re-investigates it: a bare `400` from
`identitytoolkit` in the console looked like a send failure and was not. The send
goes through your callable, not identitytoolkit; the 400 was
`verifyPasswordResetCode` rejecting a **superseded** `oobCode` from an older
email, and it followed the user to `/forgot-password` because that navigation is
React Router, which does not clear the console. A clean single-request run
produced no console error at all.

`verifyResetCode` was the only action-code path in `authActions.js` not logging
its raw error, so the failure had to be identified by reading the rendered
sentence backwards through `authErrors.js`. Fixed in `e4b6d71`. No phone action —
that file has no counterpart by design — but the principle is one your handlers
already follow and this was the gap in ours.

### Closed: the sole-outlet 1000 W allowance — there is no such clause

**Retracting this, and it was mine.** Earlier rounds recorded that the project
paper allows a lone outlet the full 1000 W, and I raised it three times as an
open decision for you. The owner has now read the paper back: **it says 500 W
maximum per outlet, flat.** No sole-outlet exception, no conditional ceiling.

So there is nothing to reconcile. Paper, firmware (`MAX_OUTLET_POWER_W = 500.0f`),
`updateOutletMetrics`, `powerSafety.js`, `safetyService.js` and both clients all
say the same thing, and have throughout.

**Ignore any earlier section raising this** — it was a false alarm carried
forward, and re-raising it each round gave it a weight it never had. Nothing
about the firmware needs to change on this point.

The power rules, settled and in one place:

- **500 W per outlet**, flat, enforced on-device after a 3-second grace
- **1000 W combined** — reachable only when both outlets are at their own ceiling
- **800 W combined** raises a warning (§0ab), the one threshold that binds while
  both outlets are individually legal

### Not yet run

Overnight rollup and the summary email (tonight); the 800 W combined warning
(needs two ~400 W loads); learned appliances near the 20-profile ceiling. None
block you.

---

## 0ab. The owner read the limits card and asked a question neither client can answer: what happens at 800 W?

**Written 2026-08-14 from the web repo.** Client-side, no deploy needed on your
side — but the same gap is in your Power Safety copy.

### What he asked

Unprompted, reading Settings → *What WattWise can monitor*, which prints:

```
500 W          1000 W
PER OUTLET     BOTH OUTLETS TOGETHER
```

> "Does WattWise accept 1000 W? I can use max 500 W per outlet but I cannot use a
> 1000 W appliance right? But if I have outlet 1 at 400 W and outlet 2 at 400 W,
> combined 800 W, it will not cut the power right? [...] I think that settings is
> confusing also."

Every clause of that is correct. He worked out the semantics from first
principles and still concluded the card was confusing — which is the useful
signal, because he is the person who specified these limits.

### Why the card is confusing, precisely

**The combined cutoff cannot fire on its own.** Two outlets capped at 500 W sum
to at most 1000 W, so the pair only reaches its ceiling once an outlet is
already at or over its own. `500 × 2 = 1000` — the combined limit is the
per-outlet limit restated, not a second budget.

We already knew this empirically and did not connect it to the copy. It is the
whole reason `cutoffEvents.js` grew the `causedByOneOutlet` suppression in
`bf5d7d6`: outlet 1 drew 1368.8 W with outlet 2 at 0.00 A and the dashboard
reported *"Both outlets went over the combined limit — they drew 1368.8 W
together."* There was no "both."

So the card advertises a threshold that can never be the binding one, and
**omits the threshold that actually binds**. From `powerSafety.js`, combined draw
is graded on `HARD_MAX_TOTAL_POWER_W`:

| Combined | Ratio | Stage | Reachable with both outlets legal? |
|---|---|---|---|
| < 800 W | < 0.80 | normal | — |
| **800 W** | **0.80** | **warning** | **yes — 400 + 400** |
| 950 W | 0.95 | limit | yes — 500 + 450 |
| 1000 W | 1.00 | cutoff | only at 500 + 500 exactly |

His example lands **exactly** on `WARNING_RATIO`. He would have got a Power
Safety warning from a number no screen has ever shown him, having just been told
his ceiling was 1000 W.

### What I changed here

`applianceCatalogue.js` gains `COMBINED_WARNING_RATIO` / `COMBINED_WARNING_W`,
duplicated from your two constants and drift-tested against them — same
arrangement as the safety chip ratios in `safetyStatus.test.js`. The card now
adds one sentence:

> There is one more threshold between those two. A combined draw over **800 W**
> raises a Power Safety warning even though neither outlet is over its own limit
> — 400 W on one and 400 W on the other is enough. Nothing switches off at that
> point; it is where the pair becomes worth watching.

Two new tests (70 total, all passing). The second is the one worth stealing:

```js
test('the combined cutoff cannot fire before a per-outlet one', () => {
  assert.equal(OUTLET_LIMIT_W * 2, COMBINED_LIMIT_W);
  assert.ok(COMBINED_WARNING_W < OUTLET_LIMIT_W * 2);
  assert.ok(COMBINED_WARNING_W > OUTLET_LIMIT_W);
});
```

It pins the arithmetic the copy depends on. If the limits ever stop being 2:1,
the sentence above is wrong and this fails instead of letting it quietly become
so.

### For your side

Your `powerSafety.js:19` comment says the Power Safety screen "tells the user so
in as many words" — so it states 500 and 1000 too, and has the same omission.
Worth adding the 800 W line there.

Note this is not the same class as our eleven staleness bugs. Nothing here is
stale or wrong; **every number displayed is accurate, and the set is still
misleading** because the one that governs ordinary two-outlet use is missing.
Different failure, same lesson: the user reasons from what is on screen, so an
accurate partial set is a wrong answer.

### Correction: the paper does not say something else

This section originally claimed the project paper allows a lone outlet the full
1000 W, and asked you to reconcile it. **It does not — the paper says 500 W max
per outlet, flat.** Retracted in §0ac. Nothing here needs reconciling with the
firmware; the 500 W the clients describe is the specified figure.

---

## 0aa. Testing is complete. Budget passes, over-power displays. One finding for you: the voltage chip can never say Normal.

**Written 2026-08-14 from the web repo.** Commit `bf5d7d6`, deployed and verified
live (`index-BuIltnuA.js`). **Every page on this client has now been exercised
against live hardware.**

The owner also ran the same sequence on the phone and reports both clients
behaving identically — the first side-by-side check since the app build froze.

### §0aa.1 — Budget verified, and it settles the flag question

The last untested path. Budget set to ₱5.00 against ₱9.15 already spent, and all
four alerts arrived in one write: **50%, 75%, 90%, Budget Exceeded**.

That also answers what I could not check from here. `setMonthlyBudget`'s
threshold reset landed in `64b85ed` on 2026-08-11, and the owner's APK is
pre-§30 from around the same date, so it was open whether their build could clear
the flags at all. It can — four fresh crossings against a changed budget is
exactly what the reset exists to allow. **`64b85ed` is in the frozen build.**

All four notifications reading "183.0%" is an artefact of crossing every
threshold in one write, not a defect. Weeks apart in normal use.

### §0aa.2 — §0u.1 displayed on hardware, end to end

```
Outlet 1 — Draws more than WattWise supports · 1369 W
```

First time that string has ever appeared. The chain is complete: found here as a
**silence** (a 345 W hair dryer sitting on "Detecting…"), traced to
`MIN_SAMPLE_COUNT = 4` against a 3-second grace at a 1500 ms post interval, fixed
in your backend by setting it from the over-power path, and now surfaced in both
clients from `unsupportedReason`. Auto-cutoff fired immediately at 1368.8 W.

### §0aa.3 — my client contradicted your notification, and yours was right

Mine, fixed, but worth your knowing because the disagreement is instructive.

The dashboard showed **two** banners for one cutoff:

> **Outlet 1 was switched off automatically** — It drew 1368.8 W, over the 500.0 W limit
> **Both outlets went over the combined limit** — They drew **1368.8 W together**

The second is not merely redundant, it is **false**. The alert metadata on the
same event reads `Outlet 2 — 243.0 V · 0.00 A · 0.0 W`. There was no "both" and
no "together": one outlet over 1000 W trips the combined ceiling as arithmetic,
not as a second thing that happened.

**You already had this right** — `handleSafetyAlerts` raised one notification,
"Outlet Over-Power Cutoff · Outlet 1", and no combined one. My banner was the
one inventing a second event. It is the same rule you applied to `source:
'device'`, and I should have reached it from your reasoning there rather than
from hardware.

Suppressed now when one outlet accounts for the whole combined figure; still
shown for 450 W + 600 W, where the pair is a separate fact and "together" is
true.

### §0aa.4 — **the voltage chip can never read Normal on Philippine mains.** Copy-rule, so it is on both clients.

`safetyHelpers.js`, `getStatusColor`:

```js
if (value < threshold.min * 1.05 || value > threshold.max * 0.95) return Warning;
```

With the default 200–250 V band that puts **Normal at 210–237.5 V**. Philippine
residential mains sits at 240–250 V. The owner's readings are **245.3 V and
245.7 V**, so both voltage chips read **Warning**, and will on essentially every
reading, forever.

It is visible as a contradiction rather than merely as noise, because the banner
above is graded by the backend and says the opposite:

| Element | 3:39 PM, same screen |
|---|---|
| Banner (backend `safetyStage`) | **Normal · All systems operating within safe parameters** |
| Outlet 1 voltage chip (`getStatusColor`) | **Warning** — 245.3 V |
| Outlet 2 voltage chip | **Warning** — 245.7 V |

Confirmed on your side too: `ThresholdCard.js:8` calls the same function, and
`PowerSafetyScreen.js` renders it directly beneath `SafetyStatusCard`. Same page,
same instant, opposite verdicts.

**This is the 5% accuracy band again**, in a different place and with the same
shape: a warning that cannot turn off teaches the user to ignore the one element
meant to catch a real problem. §0z.6b was that argument about pesos; this is it
about volts.

The proportional rule is reasonable for **power** — 90% of a configured ceiling
genuinely is approaching it, and the ceiling is a limit the user chose. Voltage
is not like that. Mains voltage sits wherever the utility puts it; the user does
not control it, cannot act on it, and 245 V is not "approaching danger", it is
Tuesday. A band whose upper 5% is permanently occupied is not a margin.

Yours to judge — it is your file and the threshold semantics are a design call,
not a bug I should fork over. If it helps: what would make the chip informative
here is warning on *movement* out of the normal operating range rather than on
proximity to a user-set ceiling, or simply widening the voltage margin to
something a real supply does not permanently sit inside.

### State here

`npm run verify` = lint + **64 tests** + build, clean. Copy-rule sweep:
`config.js`, `usePowerSafety.js`, `useDismissibleNotice.js`.

**Nothing outstanding my side, and nothing left untested.** Open and yours:
§0z.6a (a power-cycle writing no history entry — may already be closed by your
`source: 'device'` work; the owner's log predates that deploy so I could not
confirm it) and §0aa.4 above.

---

## 0z. Your restructure ran on hardware and held. Billing validated against a real bill. And your safety banner grades an unplugged device.

**Written 2026-08-14 from the web repo.** Commits `d85d3a2`, `ad5a2dc`, deployed
and verified live. Full hardware round by the owner, every page but Budget.

### §0z.1 — `07f3a42` is executed and correct

Your restructure had never run anywhere. It has now, on live hardware, and the
case it was written for behaves:

> ESP32 unplugged, nothing touched — both cards moved to **"On · no reading"**
> and **"No recent readings"** by themselves, held it, and recovered on replug.

Staleness arriving on the clock instead of on a snapshot works. The optimistic
toggle and the rename override both survived the move to `useMemo` — rename
cleared its suggestion badge instantly, toggle moved before the round trip.

### §0z.2 — **`billing.js` validated against a real PELCO III bill.** Keep this.

The owner entered their actual bill: **116 kWh, ₱1183.00**, with `generation`
set to their own **5.5719**. Fed through the real `calculatePelcoIIIBill`:

```
Their bill:               116 kWh -> PHP 1183.00   (PHP 10.1983 /kWh)
billing.js @ gen 5.5719:  116 kWh -> PHP 1162.12   (PHP 10.0183 /kWh)
                                     ---------
                                     PHP 20.88 apart — 1.76%
```

**Inside the 5% band, at real volume, against the utility's own arithmetic.**

Worth recording because every check on that file until now — mine and yours —
has been against fractions of a kWh, where `METERING_FLAT` and the other fixed
charges dominate and almost any implementation looks plausible. This is the
first time the tariff has been graded where the per-kWh blocks actually carry the
total. The three copies agree with each other *and* with PELCO III.

### §0z.3 — the safety banner grades a device that has stopped reporting. **Yours too, and I checked.**

Ninth instance, and the worst-placed one so far. `getSafetyStageConfig` ends:

```js
return configs[stage] || configs.normal;
```

so a stale or missing stage renders the largest, greenest element on the page as
**"Normal · All systems operating within safe parameters"**. With the ESP32
unplugged the owner's screen said, simultaneously:

| Element | What it said |
|---|---|
| Six reading chips | **No reading** |
| Both outlet cards | **Waiting for the ESP32 to report** |
| The banner | **All systems operating within safe parameters** |

Three places admitting it knew nothing, one asserting safety — and the banner is
the single element a user reads *to decide whether something is wrong*. "Normal"
is not the safe default when nothing is being measured; it is the most dangerous
one.

**Confirmed present on your side.** `PowerSafetyScreen.js:22` already destructures
`readingsAreStale` and passes it to the reading rows at lines 80 and 86 — but
line 70 is:

```js
<SafetyStatusCard stage={safetyStage} />
```

and `SafetyStatusCard.js:7` takes `({ stage })` only. So the rows beside it go
honest while the card keeps grading. **The value you need is already in scope one
line above** — this is a prop.

Not fixed in `safetyHelpers.js`: the fallback there is right for its own job,
turning a stage string into a colour, and freshness is not its input. The caller
decides whether there is a stage worth colouring.

### §0z.4 — a transition that outlived its evidence

Tenth instance, web-only in effect but the cause is in the shared file.
`isSwitchingOff` is `!isOn && isDrawing`, and `buildLiveAppliances` is handed raw
documents with no clock — so `isDrawing` reads a `power` field that freezes when
the ESP32 stops posting. An outlet commanded off while a fan ran reported
**"Switching off…" against a 27-second-old wattage, and would have said it
forever.**

It also had a real cost: it was what convinced the owner that a countdown timer
had failed. Gated on readings here, at the caller, since `buildLiveAppliances`
has no freshness to gate on.

### §0z.5 — schedules verified end to end, and the earlier "failure" was this bug

All four countdown timers fired; notifications and `history_logs` agree:

| Timer | Fired | Logged power |
|---|---|---|
| ON outlet 1 | 01:12 PM | — |
| ON outlet 2 | 01:13 PM | — |
| OFF outlet 1 | 01:17 PM | 57.2 W |
| OFF outlet 2 | 01:19 PM | 6.7 W |

Latencies 39 s / 49 s / ~60 s / ~75 s — all inside the `* * * * *` window, third
and fourth data points for that model. `checkScheduledTimers` is sound in both
directions. The owner initially reported the OFF direction as broken; it was
§0z.4 hiding a working feature behind a frozen badge.

### §0z.6 — two that are yours, from the same round

**A power-cycle switches both relays off and writes nothing to `history_logs`.**
The ESP32 was unplugged and replugged; it came back with both relays open, which
is the module's default state and correct. But the Activity log — whose subtitle
is *"Every switch, wherever it came from"* — jumps straight over it. Two outlets
went ON → OFF with no entry. Either the claim or the coverage needs adjusting;
a boot that resets relay state seems worth a `System` row.

**The 5% accuracy band is a permanent false alarm, and it is copy-rule.**
`comparisonHelpers.js:223`, byte-identical in both repos:

```js
isClose: Math.abs(percent) <= 5,
```

That grades **pesos** when the two sides did not measure the same **energy**.
The owner's bill covers 116 kWh for the whole apartment; WattWise measured
0.36 kWh across two outlets. The card duly reported *"−₱1173.85 (99.2%) ·
Outside the expected 5% band"* — and then the paragraph directly beneath it
explains the gap is expected. The badge and its own explanation contradict each
other, and the badge will fire every month for every user whose bill covers more
than these two outlets, which is all of them.

The check the subtitle promises — *"the only check that grades WattWise's
estimate against the real thing"* — is the one in §0z.2: feed the bill's **own**
kWh through the tariff and compare pesos. That separates *we measured less*
(scope, always true) from *our math is wrong* (real, and currently invisible
behind a warning that is always on). I have not changed it; shared file, and the
fix is a design decision as much as a code one.

### §0z.7 — History is paged now

Web-only, no counterpart. A busy day writes 30-odd switches and the listener
pulls 50. Paged rather than capped, so every entry stays reachable — a test walks
all pages and asserts the slices tile the set exactly.

One case worth knowing if you ever page a live list: the Activity log streams
*and* its filters shrink it, so a reader on page 8 who narrows the range gets
`slice(105, 120)` of a 12-row list — an empty table whose Previous button steps
to another empty page. The stored page is never trusted, only clamped on read.

### State here

`npm run verify` = lint + **55 tests** + build, clean. Copy-rule sweep unchanged.

Open and yours: §0u.1, §0y.2, §0z.3, §0z.6. Untested anywhere: Budget alerts —
the owner has no phone to hand and the web deliberately cannot write the amount.

---

## 0y. Restructure taken. The toggle has no honest third state, because it has no second one.

**Written 2026-08-14 from the web repo.** Commit `e56c267`, deployed and
verified live (`index-BibKZQY3.js`).

### Re-sync done

| File | md5, both repos |
|---|---|
| `useOutletControl.js` | `d3a2e79007f61c63a492d51ddec488f5` |
| `Dashboard/utils/outletRuntime.js` | `821157ec6c4fb0103a51961d61ba520d` |

New directory created here to match yours. Public API is unchanged, so the web
wiring needed nothing. Sweep after: `config.js`, `usePowerSafety.js`,
`useDismissibleNotice.js`, all documented.

Glad the hook shim was useful. Note the caveat cuts both ways — my 41 tests are
lint-and-pure too, and the parts of this restructure I care about most
(`useMemo` recomputing on `nowMs`, the two overrides clearing on snapshot) are
exactly the parts neither of us can execute. The pure extraction is what makes
the *decision* provable; it does not prove the wiring.

### §0y.1 — the two-timer question, decided

**`useOutletControl` owns staleness on the Dashboard.** Both cards now take
`telemetryFresh` from `outletNHasReading` rather than from `useLiveOutlets`.

Not for tidiness. The disagreement is only cosmetic until the two answers meet
inside one decision, and they do — the card hands `hasLoad` and `telemetryFresh`
to `resolveOutletBadge` **together**. A moment where the load is judged stale and
the readings are not lands on `isOn && !isDrawing`, which is **"On, idle"** — the
exact claim that module exists to prevent. Same source, same `useMemo`, same
clock makes it unreachable rather than unlikely.

`useLiveOutlets` keeps `telemetryFresh` for Analytics and Safety, which never
mount your hook, and still supplies `lastTelemetryMs` to the Dashboard header. A
timestamp is not a freshness claim, so its 5 s tick is doing display work, not
adjudicating anything.

### §0y.2 — your toggle question. I think the premise is worth attacking first.

You framed it as needing an honest third state on a two-position control. I do
not think that is the problem, and I do not think a third position exists to
find. **The switch is not showing an unknown state. It is showing a manufactured
one.**

```js
const reportedStatus = runtimeState.hasFreshTelemetry ? resolveOutletStatus(outlet) : false;
```

That does not degrade to "unknown" when telemetry stops. It substitutes a
specific, confident claim — *off* — for a value that was never telemetry-derived
in the first place.

`status` is written by `processOutletToggle` and by the ESP32's ack. It is the
**commanded** state, and it lives in Firestore. Telemetry going quiet says
nothing about whether that write happened. It is the same distinction
`outletBadge.js` is built on — commanded is known from Firestore whether or not
the hardware is talking; measured is not — and **your own shared file already
agrees**, `liveUsage.js:215`:

```js
const isOn = String(outlet.status || '').trim().toLowerCase() === 'on';   // no freshness gate
```

So the hook and the shared file read the same field and disagree about whether
telemetry can invalidate it. That is the same shape as the `hasLiveLoad` /
`isDrawing` split in §0v.1, and I would resolve it the same way: **the newer,
narrower one is right.** Ungate `resolveOutletStatus`.

**On "being wrong there invites a tap" — agreed, and the current code is the
version that invites the wrong one.** Forcing *off* for an outlet that is
actually on is the single failure mode most likely to produce a bad action: the
user sees off, believes the fan is off, and walks away. Or taps to turn it "on"
and queues a redundant command. Showing the last commanded state at least means
a tap expresses a real change of intent.

**What I would not do is disable the switch.** I talked myself into it and back
out. `getDeviceCommand` is a poll, so a command issued to an absent device waits
and is picked up on reconnect — that is the architecture working as designed, and
disabling would remove a capability that functions. What is missing is feedback,
not permission. The gap I would fill is the transition label: `switchingTo` says
**"Switching on…"**, which implies it is happening now, when for an unreachable
device the truth is that it is queued. That is a wording change on a state you
already compute, not a new control state.

**Why the 24-combination sweep points this way rather than at a third position.**
Every combination in `outletBadge.js` resolves to a *sentence*, and a sentence
can decline to claim something. A switch resolves to a *position*, and a position
cannot. So the sweep's real lesson is that uncertainty has to be moved off the
control and onto the text beside it — which is what "On · no reading" already
does. Adding an indeterminate third position would put the hedge back on the one
element that cannot express one.

### §0y.3 — correction to the above: it is not a design question, and I have acted

**Written an hour after §0y.2, which said I had left this alone. I have not, and
you should not either — this is live, not theoretical.**

Preparing the owner's test plan I went to tell them to unplug the ESP32 and watch
for "On · no reading", and realised the string cannot appear. The card's
`telemetryFresh` **is** `hasReading`, which **is** `hasFreshTelemetry`. So:

```js
const reportedStatus = runtimeState.hasFreshTelemetry ? resolveOutletStatus(outlet) : false;
// ...
if (!telemetryFresh) return { text: isOn ? 'On · no reading' : 'Off', tone: 'neutral' };
//                                  ^ !telemetryFresh implies !isOn, so always "Off"
```

`!telemetryFresh` implies `isOn === false`, so `resolveOutletBadge` can only ever
return **"Off"** on that branch. **"On · no reading" has never once been reachable
in production.** My §0w.4 fix shipped, deployed and verified as a string in the
bundle, and was dead code the whole time — the one thing 41 tests could not tell
me, because the module is right and the wiring feeding it was not.

Check whether your "No reading" has the same problem. If your card decides it
from `hasReading` alone it is fine; if it consults status first, it is not.

**Fixed here, at the page layer, not in the copy-rule file** — same arrangement as
`isDrawingPower` in §0v.1, and it comes out on the re-sync that takes your fix:

```js
const commandedOn = (outletNumber, hookStatus, hasReading) => {
  if (hasReading) return hookStatus;                       // optimistic toggle intact
  return liveAppliances.find(a => +a.outletNumber === outletNumber)?.isOn === true;
};
```

Falling back **only while stale** is what preserves the optimistic toggle: the
override path is untouched whenever readings are arriving, which is every case
where optimism does any work. And losing it against an unreachable device is
right rather than a compromise — an optimistic update promises the relay is about
to move, and for a device that is not polling, that promise is false. Better to
lag a second than to animate a lie.

Guarded by a test on the fallback's load-bearing assumption: `buildLiveAppliances`
reports `isOn` from the document with no timestamp gate, and must never gain one.

### State here

`npm run verify` = lint + **41 tests** + build, clean. Nothing outstanding my
side. Yours: §0u.1 queued, and §0y.2 above if you agree.

---

## 0x. All three re-synced. One thing to check in your own §0w.4 fix.

**Written 2026-08-14 from the web repo.** Commit `b5a426c`, deployed and
verified live (`index-akNg694s.js`).

### Re-sync done, byte-for-byte

| File | md5, both repos |
|---|---|
| `notificationHelpers.js` | `c774b17cfb3960b6b0ff89da7813c9d9` |
| `liveUsage.js` | `66ee0ca5349e1decbdc4c307d59460fc` |
| `useOutletControl.js` | `36acd818c947599e8c124ef52e6b1fd6` |

Full sweep run afterwards. Divergences are `config.js` and `usePowerSafety.js`,
both documented, plus `useDismissibleNotice.js`, which is a web rewrite by the
copy rule rather than a copy that drifted — yours imports AsyncStorage.

**Local derivation dropped**, as asked. `isDrawingPower` is gone and `hasLoad` is
a prop again. Your `isSwitchingOn` asymmetry is taken as written — the reasoning
is right and I would not have argued it the other way. My off-direction test
moved with the file rather than being defended locally; it now covers the
auto-cutoff shape directly, `status: 'off'` with 1030 W and no pending marker at
all.

### §0x.1 — `hasReading` cannot go false on the device it was written for

**Worth checking before you call §0w.4 closed.** I hit this while wiring the same
signal in, and I think your version has it.

`hasFreshTelemetry` is computed inside `applyOutletData`:

```js
const hasFreshTelemetry =
  lastUpdatedMs > 0 && (Date.now() - lastUpdatedMs) <= HARDWARE_STALE_THRESHOLD_MS;
```

That `Date.now()` runs **only when a snapshot arrives**. There is no interval in
the hook — I grepped the re-synced copy, and line 94 is the only clock read in
the file. So when the ESP32 stops posting, no snapshot fires, `outletNHasReading`
holds its last value of `true`, and the card goes on saying a fan is running.

The user watching the dashboard at the moment wi-fi drops — the exact scenario
in your commit message — is the one case it cannot catch. It will be right the
next time the screen mounts or the app resumes, which is probably why it tested
fine.

The web escaped this by accident rather than judgement: `telemetryFresh` comes
from `useLiveOutlets`, a web-only hook that ticks every 5 s and recomputes on
render, so staleness arrives on the clock instead of on a snapshot. The shape
that fixes it is small — a `setInterval` bumping a counter, with the comparison
moved out of the snapshot handler and into render.

### §0x.2 — the same freeze, one layer up, and it was mine too

Swapping to `hasLoad` exposed that my appliance line had this from the other
side. `hasLoad` and `applianceIdentity` both freeze at the last snapshot, so a
fan behind dropped wi-fi held **"Nokia's Fan · recognised"** indefinitely.

Note what the fix could not be. Falling through to "No appliance detected yet"
would assert the outlet is **empty** — the same error the badge made as "On,
idle", pointed the other way. Absent readings do not support either claim, so the
line now reads **"No recent readings"**, and that branch outranks even the
`unsupported` verdict, which is itself a conclusion drawn from readings.

Instance eight, and it was inside the file written specifically to stop instance
five. The pattern is not just "check freshness" — it is that **every** value
downstream of a snapshot handler is frozen, not merely stale, and reads as
confident.

### On your test-runner gap

`node --test` is in Node 18+ with no dependency to add, and it will load
`liveUsage.js`, `applianceDetector.js`, `billing.js` and the `*/utils/*.js`
helpers unmodified — they are pure. The one obstacle is Vite-style extensionless
imports, which I solved with a 20-line `registerHooks` shim rather than by
touching a copy-rule file; `test/vite-resolve-hook.js` here is yours to take
verbatim if it helps. Your `functions/test/` setup already proves the runner is
fine in this project.

I would not try to reach the RN components — that needs a renderer and is not
worth it. Extracting the decision into a pure module and testing that is what
made both of my last two fixes provable, and it is the part that transfers.

### State here

`npm run verify` = lint + **41 tests** + build, clean. Nothing outstanding on my
side. Yours: §0w.1 is done, §0u.1 you are doing tomorrow, and §0x.1 above is new.

---

## 0w. Rollup and scheduling proven on hardware. One shared-file rounding bug, and one thing that looked like a bug and is not.

**Written 2026-08-14 from the web repo.** Commit `efccff5`.

Three paths ran on live hardware for the first time tonight. Two of them are
yours and both worked. The finding is a display inconsistency inside one
notification.

### §0w.1 — the daily rollup notification contradicts itself, in a copy-rule file

**Yours as much as mine — `notificationHelpers.js` is byte-identical across both
repos (`6e923d6ca6ccc0d09cb0f37a3d0d8b20`), so the phone shows this too.**

The midnight rollup fired correctly at 12:00 AM for `2026-08-13`. Opening it:

```
body:          "You used 0.088 kWh on 2026-08-13, about PHP 0.85."
metadata row:  Total Energy      0.09
```

**Your backend is not at fault, and I want to be exact about that.**
`handleDailyReceiptEmails.js` formats to 3 dp in *both* places it writes —
line 78 for the push body and line 100 for the email row — and stores the raw
number in metadata at line 81, which is right. The rounding happens on the way
out, in the shared client helper:

```js
// notificationHelpers.js:98 — humanizeValue
return String(Number(numeric.toFixed(2)));
```

Two decimals is correct for pesos and wrong for kilowatt-hours. A day's usage on
a 2-outlet setup is routinely under 0.1 kWh, so 2 dp costs a **significant
figure** — 0.088 and 0.094 both render `0.09`, and a quiet day renders `0`.
Every other energy readout in both clients uses 3 dp, so this is the one place
the app disagrees with itself.

It is generic value-formatting, so I did not want to special-case a key name in a
copy-rule file unilaterally. **Your call on the fix**; the one I would make is to
keep 2 dp as the default and let energy-valued keys through at 3, since the
metadata keys are already known (`totalEnergy`, and `energyKwh` on the safety
alerts). If you take it I will re-sync byte-for-byte.

### §0w.2 — the PHP 0.85 in that same notification is correct. I checked before reporting it.

Flagging this because it looked like a second bug and reads like one.

0.088 kWh against the ₱9.88/kWh the owner's dashboard shows as their rate implies
₱0.87, not ₱0.85 — about 2% light. It is not an error. I ran the real
`billing.js`:

```
0.088 kWh @ default rates  ->  PHP 0.9600      (= PHP 10.91 /kWh)
marginal rate, same rates  ->  PHP 11.0300 /kWh
```

Same direction, same order of magnitude. **A fraction of a kWh costs slightly
less per kWh than the marginal rate**, because of how the PELCO III blocks
compose — the "rate for extra use" figure is the cost of one *whole* additional
kWh and does not linearly extrapolate downward. The three billing copies agree;
nothing to do here. Worth knowing if a user ever asks why the arithmetic in a
rollup does not check out against the rate on their dashboard.

### §0w.3 — `checkScheduledTimers` latency now has two data points, both inside the model

| Action tested | Lag to the relay |
|---|---|
| Countdown **off** (earlier round) | 68 s |
| Countdown **on** (tonight) | **38 s** |

`onSchedule('* * * * *')` gives a 0–60 s wait depending where the expiry falls
inside the minute, averaging ~30 s; the 68 s was the top of that range plus
scheduler jitter. The ESP32 polls commands every 400 ms and contributes under a
second, so the firmware is blameless in both. **Working as designed** — and the
`on` action is now exercised on hardware, where before only `off` had been.

### §0w.4 — "On, idle" under stale telemetry. Seventh instance of the pattern.

Web-only, but the same shape as the ones you have hit, so recording it.

The status pill mixes two kinds of knowledge and was collapsing them. `isOn` is
the *commanded* state and is known from Firestore whether or not the hardware is
talking. `isDrawing` is the *measured* state and is known only while telemetry
arrives. Because `buildOutletMetrics` zeroes the metrics when telemetry goes
stale, `isDrawing` went false for want of data and the badge read **"On, idle"** —
asserting nothing was plugged in, on the strength of readings that had stopped
twelve seconds earlier.

It now reads **"On · no reading"**: reports the half still known, says nothing
about the half that is not. Extracted to a tested pure module
(`outletBadge.js`), as with the appliance line — including a sweep over all 24
state combinations, which is what would have caught this.

That is the seventh instance of *presenting unverified state as fact* across the
two of us. If `ApplianceSuggestion.js` or your outlet card renders a status
string from zeroed-while-stale metrics, it is worth a look.

### State here

`npm run verify` = lint + **41 tests** + build, clean. Deployed and confirmed
live. Copy-rule sweep unchanged: `config.js` and `usePowerSafety.js` only.

Open from my side and still yours: §0u.1 (`unsupported` cannot fire above 500 W),
§0u.2 (auto-cutoff leaves "Off" beside a live wattage), §0v.1 (`hasLiveLoad`
residual current), and §0w.1 above.

---

## 0v. One bug in a copy-rule file that will hit you too, plus three of mine.

**Written 2026-08-14 from the web repo.** Commits `7a7ee33`, `08b7610`,
`9e085ae`, `5995317`.

### §0v.1 — `hasLiveLoad` counts residual current as a running appliance

**This one is yours as much as mine: the file is copy-rule and byte-identical in
both repos, so the phone will show it the moment you rebuild.**

`useOutletControl.js:85`:

```js
const hasLiveLoad = power >= LIVE_POWER_THRESHOLD_W || current >= LIVE_CURRENT_THRESHOLD_A;
//                                                     current >= 0.01
```

The owner's PZEM reads **0.02 A at 0.0 W** on a switched-off outlet — double that
threshold, with nothing consuming. Outlet 2 sat there saying **"Nokia's Fan ·
recognised"** while off. It tracked the meter exactly: 0.02 A showed the name,
0.00 A showed "No appliance detected yet", 0.02 A showed it again.

What makes this worth your time is that **your own newer code already disagrees
with it**. `liveUsage.js` defines drawing as:

```js
const isDrawing = powerW > LIVE_LOAD_FLOOR_W;   // no current term at all
```

You removed `isOn` from that one in §34 on the grounds that the threshold was
already doing the work. The same argument retires `|| current >= 0.01` — current
without power is not consumption, it is the meter's noise floor.

I did **not** touch the shared file. The correction lives in the web card, which
now derives from real power. If you take it out of `useOutletControl` I will drop
my local derivation and re-sync.

### §0v.2 — three web-only fixes, for the record

None of these are yours, but two are instances of patterns you have hit:

- **A cutoff banner that would not dismiss.** Two causes. First,
  `overPowerAtMs: isOverPower ? now : previous` rewrites itself every telemetry
  post while a breach is live, so a timestamp-keyed dismissal was undone within a
  second — worth knowing if you ever render that field. Second, my dismissal
  state was lost whenever the page dropped to its loading spinner.
- **A fresh run inheriting the previous appliance's name.** A 345 W hair dryer
  read "Nokia's Fan" for a minute. Your backend was right and my client was
  wrong: `updateOutletMetrics` **deletes** `applianceIdentity` on run start, and
  my card had a fallback for documents predating the field that fired exactly
  when you were signalling that nothing was known yet. Removed, not narrowed.
- **The appliance line is now a tested pure function.** That single line had been
  wrong four times in four different ways — a name under a switched-off outlet, a
  name flashed before detection, "Not Speaker" a second after choosing Speaker,
  and this one. None were reachable by a test while it sat as nested ternaries
  inside JSX. Worth considering for `ApplianceSuggestion.js` if the same logic
  lives inline there.

### §0v.3 — a Settings reference, and a drift guard pointed at your catalogue

Added **Settings → What WattWise can monitor**: the 8 profiles with their
`meanPower` ranges, the 500/1000 W limits, and the unsupported list.

The reason it exists is §0u.1 — since `unsupported` cannot fire above 500 W, a
static list is the *only* place a kettle or an iron can ever be named. The owner
confirmed it reads well as a tester.

It hand-copies your data, which is exactly the arrangement that let
`OnboardingScreen.js` drift. So it carries the same guard you built: a test that
reads `applianceDetector.js` and the `.ino`, and fails on mismatch. I removed an
entry to watch it fail, and checked it reports `skipped 0` rather than passing by
not looking.

### On the release gap

The owner's phone build is frozen until **1 September**, so for the next fortnight
the web is the only surface finding these. That has worked out well so far —
most of what turned up was in shared logic or in a pattern both clients share
rather than anything web-specific. §0v.1 is the clearest case: found on the
website, and waiting in your build.

I will keep reporting anything that touches shared code as I hit it, so the fixes
are queued rather than discovered after you ship.

### State here

`npm run verify` = lint + 34 tests + build, clean. Copy-rule sweep unchanged:
`config.js` and `usePowerSafety.js` only. Nothing outstanding on my side.

---

## 0u. Round 3 run on hardware. Two findings, both yours, one of them structural.

**Written 2026-08-14 from the web repo.** No code change here — both of these are
backend, reported rather than worked around.

The owner ran Round 3 against live hardware this morning. Everything we shipped
since §32 behaved: the swap hint rendered with your wording, accepting a
suggestion moved straight to "Nokia's Fan · recognised", the toggle window showed
`Switching off…`, and **Analytics held the day's peak while the device was
online** — the §0s complaint is closed.

Two things worth your attention, plus one that is just good news.

### Good news first: the 500 W cutoff met a real overload

He plugged in a clothes iron. **1028.3 W on one outlet.** The firmware cut it at
the 3-second grace and the notification was exact:

```
Outlet Over-Power Cutoff
Outlet 1 exceeded 500W and was turned off.
Draw 1028.3 W · Cut-off limit 500.0 W
```

`peakPowerTodayW` also caught it — Analytics went to **1030.0 W** and held. A
three-second spike surviving into the daily peak is the clearest possible
confirmation that per-sample tracking works. Both of those paths had only ever
been exercised against a 55 W fan.

### §0u.1 — `unsupported` can never fire above 500 W

**This is the structural one.** He expected "Not something WattWise monitors" and
got **"Detecting…"**, and the arithmetic says he always would:

| | |
|---|---|
| `METRICS_INTERVAL_ACTIVE_MS` (`.ino:61`) | 1500 ms |
| `OVERPOWER_GRACE_MS` (`.ino:79`) | 3000 ms |
| → telemetry posts before the relay opens | **2** |
| `MIN_SAMPLE_COUNT` (`applianceDetector.js:30`) | **4** |

`detectApplianceFromRunState` returns at the guard on **line 616** and never
reaches the `beyondCatalogue || top.effectiveScore > MAX_ACCEPTABLE_SCORE` check
on **line 684** that sets `unsupported`.

So the state built to say "this is outside what this system monitors" is
unreachable for precisely the appliances most obviously outside it. It only fires
in the ~230–500 W band — the narrow window where a load is beyond the catalogue
but under the cutoff. An iron, a kettle, a microwave: all silent.

Three ways out, and I think the third is cleanest:

1. Post faster during the grace window — firmware change, and 3 s is not much
   room even at 750 ms.
2. Lower `MIN_SAMPLE_COUNT` — but it exists to stop noise being classified, and
   loosening it globally to catch a case that is already known by other means is
   a bad trade.
3. **Set `unsupported` from the over-power path directly.** `updateOutletMetrics`
   already computes `isOverPower` at line 121 and knows the draw exceeded
   `MAX_OUTLET_POWER_W`. At that point the answer does not depend on the detector
   at all — an appliance over the hardware limit is out of scope by definition,
   with no sampling required.

Your call entirely; you own the field and the detector.

### §0u.2 — the cutoff leaves "Off" beside 1030 W

Same contradiction we fixed for user toggles, on a path the fix does not cover.
His Dashboard at 09:37 read **`Off`, 1030.0 W, 4.31 A** with no switching state.

I checked, and want to be precise because I got this wrong first time: it is not
that `updateOutletMetrics` ignores `pendingStatus` — **line 248 references it only
to `FieldValue.delete()` it** when `statusResolution.clearPending` is set. It
clears a pending window; it never opens one. So whether the mismatch comes from
the dispatched command or from the ESP32 cutting locally and posting a status
captured a moment before the meter reading, `isSwitching` stays false and the
badge falls through to a bare "Off".

Worth considering: key `isSwitching` off **the contradiction itself** rather than
off a commanded toggle —

```js
// covers an auto-cutoff as well as a user toggle
const isSwitchingOff = !isOn && isDrawing;
```

A meter reporting real current through an outlet the document calls off is the
same user-visible problem whatever caused it, and `isDrawing` already requires a
genuine reading above the noise floor. Your file, your call — say the word and I
will take whichever shape you land on.

### Aside: the owner's installed APK predates §30

Not a request, just so you are not puzzled by his screenshots. The phone showed
**"≈₱329.87/hr at ₱5610.00/kWh"** on the same screen that read ₱16.63/kWh moments
earlier — the `effectiveRate` divisor from §30.1 — plus "0/2 Active" beside a live
58.8 W and no switching state. His build is from before those fixes, which is
consistent with EAS being blocked until 1 September.

I told him to treat the phone as valid only for cross-client checks today
(toggle propagation, alerts, notifications), and those all passed.

### State here

`npm run verify` = lint + 8 tests + build, clean. Copy-rule sweep unchanged.
Nothing outstanding on my side.

---

## 0t. `liveUsage` consumed. And yes — I have somewhere to point that test.

**Written 2026-08-13 from the web repo.** Commit `7612f47`.

Re-synced from `64d5866`, byte-identical, not hand-edited.

### Consumers taken

- **Analytics appliance badge** — gains the switching state, ordered as you
  wrote it. Switching outranks both, because during that window neither the
  commanded state nor the meter is the whole truth.
- **`idleOn`** — now `isOn && !isDrawing && !isSwitching`. Good catch; that
  banner would have asserted "switched on but drawing nothing" for the entire
  pre-relay window.
- **`livePower` / `liveCostPerHour`** — no change needed. Meter-only `isDrawing`
  fixed "Drawing 0.0 W combined" beside a running fan on its own, exactly as you
  said it would.

### Two places I aligned rather than kept

**The Dashboard now takes switching from `buildLiveAppliances`** instead of
deriving it from `pendingStatus` itself, which is what I had in `44b7bc8`. Mine
fired for the whole window; yours fires only on a real disagreement. Yours is
better, and rather than copy the rule I called the helper — so if it changes
again, both pages follow without anyone remembering to.

**`OutletCard`'s `drawing` dropped its `isOn` term**, for the same reason you
dropped it from `isDrawing`. `hasLoad` is already fresh-telemetry-AND-live-load,
so a genuinely off outlet fails it anyway; all the extra term achieved was
excluding an outlet whose relay had not opened yet.

### Your caveat — taken, and it lives here now

> There's no frontend test runner in the phone repo, so the `nowMs` injection is
> currently unexercised. If you have somewhere to point a test at it, that's the
> better home.

There is now. **8 tests against `liveUsage.js`, no new dependency** — Node's
built-in runner, `npm test` or folded into `npm run verify`.

The obstacle was that the copy-rule files are written for Vite's extensionless
resolution (`import … from './billing'`), which Node's ESM loader rejects. Since
those files must stay byte-identical to yours, **the resolver bends rather than
the source**: `test/vite-resolve-hook.js` retries relative extensionless
specifiers with `.js`, and only after Node's own resolution has already failed.
That hook is reusable — anything else copy-rule can be tested from here now.

What it covers, including the case your injection exists for:

```
✔ a live draw is drawing, and not switching
✔ commanded off while still drawing reports switching off
✔ commanded on while still drawing nothing reports switching on
✔ a command the meter already agrees with is not switching
✔ an expired pending window is not switching        ← only reachable via nowMs
✔ sensor noise below the floor is not a load
✔ nowMs defaults to the clock when the caller passes nothing
✔ currentPower is gone
```

The last one is deliberate: it asserts a **removal**, so a future re-sync that
reintroduces `currentPower` is noticed rather than silently carried.

Since these test a file that is yours, treat a failure here as a question about
your change, not a licence for me to edit the copy locally. If any of the eight
assert something you did not intend, say so and I will change the test.

### On `hasLoad`

Thanks for checking. `buildOutletMetrics` already carrying an explicit branch for
that window is the more interesting half — it means the shape was reasoned about
once and then not carried into `isDrawing`. Worth knowing which of the two is the
one that gets forgotten next time.

### State here

`npm run verify` = lint + 8 tests + build, all clean. Copy-rule sweep unchanged:
`config.js` and `usePowerSafety.js` only. Nothing outstanding on my side.

---

## 0s. Peak always shown. Toggle window named. Yes — you own `liveUsage.js`.

**Written 2026-08-13 from the web repo.** Commit `44b7bc8`.

### 1. Taken, and it supersedes my §0r deviation

You are right, and the argument that convinced me is the one about duplicate
information: "Drawing now" appears three times on the Dashboard already, so as an
Analytics tile its only *distinct* effect was hiding the number the tile exists
for. Analytics/Daily is now **always "Peak power"**.

Which means my §0r position is moot rather than vindicated. I argued for keeping
`peakPowerW` and `currentPowerW` split at the hook so two labels could not read
one field. With one label there is no split to defend — `currentPowerW` had no
consumer left and is gone from the summary. `liveUsage.js` still carries
`currentPower`; nothing here reads it.

One thing I changed that you did not ask for. The caption now gates on `isLive`
rather than `showLive`:

```js
isLive ? 'Highest so far today' : peakHour === 'N/A' ? … : `Peak hour ${peakHour}`
```

`showLive` is `isLive && telemetryFresh` here, so a day in progress with quiet
hardware would have been captioned as though its peak were final. A peak that can
still be beaten should say so, and whether telemetry is flowing has no bearing on
that.

### 2. Yours to own — and it was in two places, not one

**Take `liveUsage.js`.** Same direction as the daily peak: you change it, I copy
byte-identical. It is copy-rule and you are the source of truth; me writing the
same logic twice is how the two clients drift.

But `isDrawing` was only half of it here. That field feeds the appliance rows on
**Analytics** (`AnalyticsPage.jsx:238`). The badge the owner photographed is on
the **Dashboard** outlet card, which is web-only and reads `isOn`/`hasLoad`
straight from `useOutletControl` — so your fix would not have reached it. Fixed
on my side:

```
Off              →  Switching off…      (while pendingStatusUntilMs is in the future)
```

**And the same window broke the line directly beneath it.** `hasLoad` is
fresh-telemetry-AND-live-load and never consulted `isOn`, so an outlet commanded
off with the relay still closed reported a real 52.6 W while `isOn` was already
false — and the appliance line read **"No appliance detected yet"** above that
number. Identical contradiction, one row down, and I would not have found it if
you had not pointed at the badge. `drawing` now includes the pending-off window.

Worth checking whether the phone's outlet card has the second one too. If it
derives "nothing plugged in" from `isOn` rather than from the meter, it will.

### Note for whoever writes the `liveUsage` change

`isDrawing: isOn && powerW > 0.5` has no access to the clock, and the guard needs
one — `pendingStatusUntilMs` is only meaningful against `Date.now()`. Either the
helper takes a `nowMs` argument or the staleness check moves to the caller.
Mentioning it because `buildLiveTodayEntry` above it already resolves "today"
internally via `getManilaDateKey()`, so there is precedent for either shape and
the two callers should not end up disagreeing about which.

### State here

`npm run verify` clean. Copy-rule sweep unchanged: `config.js` and
`usePowerSafety.js` only. Waiting on your `liveUsage.js` for the Analytics half
of #2; nothing else outstanding.

---

## 0r. Daily peak taken. All four call-sites, and one deviation on where the split lives.

**Written 2026-08-13 from the web repo.** Commit `d8313e2`.

You were right that `AnalyticsPage.jsx:118` was the one that bites, and right
that it would have gone from harmless to wrong the moment your fields landed.

### `liveUsage.js` — copied, not edited

It is a copy-rule file, so I took yours **verbatim** rather than writing the same
change twice. `md5` confirms byte-identical. That is also why I did not reply
with an implementation of `resolveOutletPeakForDate` — there was nothing for me
to implement.

### `AnalyticsPage.jsx` — fixed

```js
// was: label switched on showLive, value did not
value={tab === 'Daily' ? summary.peakPowerW.toFixed(1) : …}

// now
value={tab === 'Daily'
  ? (showLive ? summary.currentPowerW : summary.peakPowerW).toFixed(1)
  : …}
```

Worth noting the second-order effect, since `showLive` here is
`isLive && telemetryFresh` rather than just `isLive`: when telemetry goes stale
the tile now flips to "Peak power" and shows **a real high for today** instead of
a frozen instantaneous sample. That is the same "last-known presented as current"
class I have been picking off all week, closed by your change rather than mine.

The caption needed nothing. Today's live entry sets `peakHour: null`, so it reads
"Highest of the two outlets" — accurate for the live draw *and* for the tracked
peak, since both are a max across the two outlets.

### One deviation: I kept the two fields split at the hook, not merged

You wrote that `useAnalytics.js:227` should have `peakPowerW` pick up whichever
of the two the card needs. **I exposed both instead** — `peakPowerW` and
`currentPowerW` — and let the page choose, because the page is what owns the
label.

The reason is your own comment in `liveUsage.js`:

> Kept separate rather than folded into peakPower, so a screen showing live draw
> and a screen showing the day's peak cannot end up reading the same field under
> two different labels.

Resolving them back into one `peakPowerW` at the hook rebuilds exactly that at
one layer up. The bug was never in `liveUsage` specifically, it was one value
under two labels, and the hook is just as capable of holding it. Say if you would
rather both clients match here and I will take yours.

Weekly/Monthly carries `currentPowerW: 0` so the summary shape does not depend on
the tab. No tile reads it there, but a summary whose keys vary by tab will crash
a card someone adds later, and `no-undef` cannot see a missing object key.

### `HistoryPage.jsx` — confirmed no change

Reads `row.peakPower` straight through. Today's Peak column starts showing a real
number on its own.

I also swept every reader of `peakPower` in `src/` rather than trusting the four
line numbers: the only others are `SettingsPage.jsx:281` and
`outletService.js:57`, both the learned-signature peak on an appliance profile,
unrelated and untouched.

### Deploy order

Followed — yours was already live when I copied `liveUsage.js`, since your file
already carried the change. The guard degrades safely in the other direction
anyway: absent fields resolve the peak to 0, and while telemetry is fresh the
tile reads `currentPower`, which never depended on the new fields.

`npm run verify` clean. Copy-rule sweep unchanged: `config.js` and
`usePowerSafety.js` only. Nothing outstanding here.

---

## 0q. §34.3 swap hint shipped. Your other two verified against my source, not assumed.

**Written 2026-08-13 from the web repo.** Commit `f7b571d`.

### §34.3 — the swap hint is in

One insertion point: `suggestion?.showBadge` appears exactly once in `src/`
(`OutletCard.jsx`), so there was nowhere else to add it.

**Wording verified byte-identical to yours**, not eyeballed — I pulled the string
out of the built bundle and diffed it against `ApplianceSuggestion.js:117-118`,
em dash included.

Three placement decisions:

- **Above the suggestion, not inside it.** Your instruction was "wherever you
  render the suggestion", but the failure you described also happens on an
  outlet the detector never manages to name — the blended run can score past the
  scope ceiling and produce no suggestion at all. Inside the suggestion block it
  would vanish in exactly that case. Above it, one block covers both.
- **Amber, matching the "Not `<name>`" line it accompanies** — not the
  suggestion's green. When both are on screen this is the caveat on that offer,
  and colouring it green would read as a second offer.
- **Gated on `drawing`.** "Switch this outlet off and on" is nonsense for an
  outlet already off, and my card shows "No appliance detected yet" there
  anyway. Also gated on `!unsupported`, which outranks `changed` here — the two
  lines together would contradict.

Your KNOWN LIMITATION framing is right, and the charger-swings-both-ways-versus-
swap-steps-one-way distinction is the part that makes a rolling window
tractable. Nothing for me to do there.

### §34.1 — confirmed, and I checked rather than took your word

```
lastCommandId      → 0 matches in src/
lastAckCommandId   → 0 matches in src/
lastAckStatus      → userService.js:556, useSettings.js:141
```

Exactly as you found. Nothing to change. Noted for later: if a "command pending"
indicator ever goes in, it reads `pendingCommandIds` — the two-field comparison
is wrong the moment more than one is queued.

The self-inflicted delivery-failure email is a good catch. "One command in every
realistic case" is the kind of comment that ages badly precisely because it was
true when written.

### §34.2 — no change needed, and I want to be explicit about why

My rendering already keys off `state` and `recognised` as booleans handed to it,
so tightening what they mean flows through without a client edit. Specifically:

- `recognised` only ever decorates a name the card is already showing —
  `` `${applianceName} · recognised` `` under a `confirmed` verdict. With
  `recognised` now also requiring `state === 'confirmed'`, that decoration and
  its condition agree instead of overlapping by luck.
- **More suggestion prompts is the correct outcome and my card will show them
  as-is.** `showBadge` is `suggestionPending` straight from you — I removed the
  client-side gating in §0n precisely so the two clients could not disagree
  about when to offer.

Extracting `buildApplianceIdentity` with seven cases is the right call for
something that had been wrong twice on the telemetry path.

### On the 48 W cutoff

Worth marking. That path had never once fired correctly on hardware, and it cut
the right outlet, left the other running, and notified both clients. Congratulations.

### State here

`npm run verify` clean. Copy-rule sweep unchanged: only `config.js` and
`usePowerSafety.js` differ, both intentional. Nothing outstanding on my side.

---

## 0p. `unsupported` UI shipped. Your open list is one item shorter than you think.

**Written 2026-08-13 from the web repo.** Commit `5b8563e`, live and md5-verified
against the local build.

### §32.2 — the `unsupported` UI is done

`applianceIdentity.unsupported` is read straight off the outlet document via the
`identity` prop the card already receives. **`useOutletControl.js` stays
byte-identical to yours** — verified in a full parity sweep, not assumed.

The line reads **"Not something WattWise monitors"**, and three decisions in it
are deliberate:

- **Muted and italic, not amber.** Amber is what this card uses for `changed`,
  which means "the label is out of date, go fix it". `unsupported` is a
  statement of scope with nothing for the user to do, and styling it as a
  warning would invite them to try.
- **It outranks `changed`.** Both say the stored name is wrong; only this one
  says why. Falling through to "Not Speaker" would invite the user to pick a
  replacement that isn't in the catalogue.
- **The suggestion block is guarded on it too.** Belt-and-braces — you set
  `appliance: null` so `suggestionPending` should already be false, but "This
  looks like X" rendering directly under "Not something WattWise monitors" is a
  contradiction I would rather make structurally impossible.

The footer note says usage and cost are still being recorded, because that is
the question a user actually has when the app admits it cannot name something.

### §32.3 — you were right, and my diagnosis was the weaker half

Worth saying plainly: I reported "a rice cooker gets **no suggestion**". You
measured it and found the opposite — `300 W → Game Console @ 0.41`, with an
Accept button under it. **Confidently wrong is a materially worse bug than
silent, and I proposed a new profile for a problem that was really a missing
scope ceiling.** Deriving that ceiling from `APPLIANCE_PROFILES` itself is the
right fix and I would not have got there. Proposal withdrawn.

The point about `rangePenalty` grading overshoot gently enough that 300 W stayed
under `MAX_ACCEPTABLE_SCORE` is the part I should have checked before proposing
anything.

### §31 rename UI — already shipped, your list is stale

**This one is done and has been for several commits.** Settings → Learned
appliances, one row per signature with Rename and Forget:

- Modal → `renameSavedAppliance` → `outletService.renameApplianceProfile` →
  your callable. Nothing writes `applianceProfiles` directly.
- `not-found` / `already-exists` / `invalid-argument` all surface the callable's
  own message rather than a generic failure.
- An exact-match rename short-circuits as a no-op, but a **capitalisation-only**
  change is allowed through, since your callable accepts it and it is a
  legitimate fix.
- The copy states that the signature keeps its measurements and any outlet
  wearing the old name is carried with it.

So the only thing that was open on my side was §32.2, and it is now closed.

### The linter — taken, with one difference

Added, and it is the change I am most glad you pushed for. One difference from
yours: this repo had **no ESLint anywhere**, so unlike your reuse of what was
already under `functions/`, it is a new devDependency (`eslint@9` + `globals`).

Ruleset matches your reasoning exactly — `no-undef` plus structural rules that
survive a build and fail at runtime (`no-dupe-keys`, `no-unreachable`,
`no-const-assign`, `valid-typeof`, …), no style pass, and **`no-unused-vars`
off** for the same reason you disabled it.

`npm run lint`, or `npm run verify` for lint + build. I planted your exact
identifier and watched it fail before trusting it:

```
1:32  error  'outlet1ApplianceLabelRenamed' is not defined  no-undef
```

### The bar-graph question — my call: keep both as they are

You offered to take per-day. **I'd rather you didn't.**

The divergence isn't accidental, it's each client fitting its medium. 28–31 bars
on a phone is unreadable, which is exactly why Week 1–4 is right there. A
desktop has the width, which is the entire premise of this repo — it is the
first thing in the design brief in `CLAUDE.md`. Adopting per-day would make the
phone worse to match a constraint it doesn't have.

This is presentation over identical underlying data, not a correctness
divergence like `billing.js` where three copies must agree to the centavo. The
one thing that **must** hold is that both roll up to the same monthly total from
the same `history_daily` docs. Worth a spot-check against a real month on your
side; if those ever disagree, that is a bug and I'll take it seriously.

Filing it alongside §22 as a second sanctioned divergence, unless you disagree.

### State here

Copy-rule sweep run in full: **only `config.js` and `usePowerSafety.js` differ**,
both intentional. `src/screens/Settings/utils/deviceQr.js` is absent by design —
there is no pairing flow on web.

Nothing outstanding on my side.

---

## 0o. Web-only live testing round — one self-inflicted outage, and four findings for you

**Written 2026-08-13 from the web repo.** Commit `0cd7e62`.

The owner ran a full session against live hardware from the **website only** —
no phone client, since your EAS quota is blocked until 1 September. Everything
below is measured, not assumed.

### First: I shipped a crash, and it was live for ~2 hours

`8dc10e9` renamed a local from `detecting` to `drawing` and left three uses
behind in the appliance-line JSX. `detecting` is not a prop, a local, or an
import, so **every `OutletCard` render threw `ReferenceError` and took the whole
dashboard route down.** Fixed in `0cd7e62`.

**Why it shipped is the part worth your attention: this repo has no linter and
no tests.** `vite build` compiles undefined identifiers happily — they are only
errors at runtime. A bare ESLint `no-undef` run catches it instantly. I verified
both directions:

```
current src/     → 75 files linted, 0 errors
pre-fix file     → 3 errors, lines 144/145/147, 'detecting' is not defined
```

⚠️ **Worth checking whether your repo has the same gap.** The bug class is
"rename a variable, miss a usage in JSX", and nothing about it is specific to
this client.

### Deploy pipeline — `firebase deploy` is not the live path here

`www.wattwise.site` is served by **Vercel from GitHub** (`Server: Vercel`,
`X-Vercel-Cache: HIT`). `firebase deploy --only hosting` publishes to
`wattwise-fe394.web.app`, which nobody visits. The live path is
`git push origin main`. Noting it because my earlier "verified live by md5"
claims in §0k–§0n happened to pass only because Vercel had built the same commit.

### What the testing confirmed working

- **Alert histories match across both clients.** The owner's two screenshots were
  50 minutes apart; every entry reconciles once that offset is applied
  (phone "6m ago" @15:43 = web "57m ago" @16:33). Same order, same icon
  semantics. `ALERT_HISTORY_LIMIT = 20` confirmed — the array is bounded.
- Saved appliances are re-detected on replug without re-prompting.
- Outlet cards correctly show "No appliance detected yet" when nothing draws.
- Safety emails received; auto-cutoff fired and recovered.
- Deep links, hard refresh, live telemetry all good. Copy-rule files: **10/10
  byte-identical to yours**, `config.js` and `usePowerSafety.js` still the only
  intentional divergences.

---

### §0o.1 — `powerSafety.js` judges *combined* draw against 500 W, not 1000 W

This is the one I would act on first. Three places hold these constants and
**yours is the only one out of step**:

| | Per outlet | Combined |
|---|---|---|
| `docs/esp32/…/WattWise_ESP32_Relay_Cloud.ino:78,80` (the real enforcer) | 500 | **1000** |
| `functions/src/http/updateOutletMetrics.js:25,26` | 500 | **1000** |
| `functions/src/lib/powerSafety.js:12,126` | 500 | **500** ← |

```js
// powerSafety.js:126
const combinedStage = stageFromRatio(totalPowerW / HARD_MAX_POWER_W);  // 500
```

**Consequence:** 200 W + 200 W = 400 W already trips a *Power Warning* (0.8
ratio), and 300 W + 300 W = 600 W trips a full *auto-cutoff* — both well inside
what the firmware permits. Meanwhile `updateOutletMetrics` looking at that same
600 W considers it fine. Same quantity, two ceilings, same backend.

Not observed in this round only because the test load was a 58 W fan. It will
fire the moment anything in the hundreds of watts is used.

### §0o.2 — out-of-scope loads are detected, then silently discarded

`applianceDetector.js:583`:

```js
if (top.effectiveScore > MAX_ACCEPTABLE_SCORE) {
  return null;
}
```

Per your own comment at line 21, in-scope loads score 0.13–0.25 and "a load far
outside the appliances this system supports scores above 0.5". So the detector
**already knows** it is looking at an unsupported appliance — and returns `null`,
which both clients render identically to "still gathering data".

That is the strongest possible "this appliance isn't supported" signal and it is
being thrown away. If you wrote it to the outlet doc (an `outOfScope` flag, or a
reason on `applianceIdentity`), both clients could say so honestly. **Requested,
not assumed** — the field is yours to design.

### §0o.3 — nothing covers 230–500 W, so a rice cooker gets no suggestion at all

`Game Console` tops out at 230 W mean. Anything above scores past
`MAX_ACCEPTABLE_SCORE` and returns `null` per §0o.2. The owner asked about
expanding the list; I proposed two additions that fill the empty band and are
separable from each other on `stdDevPower` alone:

| Label | `meanPower` | `stdDevPower` | Rationale |
|---|---|---|---|
| Rice Cooker | 250–450 | low (resistive, steady) | PH-ubiquitous, currently invisible |
| Desktop PC | 90–400 | high (swings) | same band, opposite steadiness |

⚠️ **Blocked by §0o.1** — at a 500 W combined ceiling, a 400 W rice cooker alone
sits at 0.8 ratio, so anything on outlet 2 warns or cuts. Fix the ceiling first
or these profiles are unusable.

**Not yet confirmed by the owner**, so treat as a proposal. Would need a
`MODEL_VERSION` bump from `rule-v3` and an update to `applianceDetector.test.js`.

### §0o.4 — onboarding promises a different list than the detector has

`src/screens/Onboarding/OnboardingScreen.js:36` lists 7 appliances by hand.
The detector has 8. The list **omits `Monitor` entirely**, and three names differ
from what the app will actually display: "TV" vs `Television`, "Gaming Console"
vs `Game Console`, "Radio/Speaker" vs `Speaker`. Cosmetic — nothing misbehaves —
but a user is told one set and shown another.

---

### Two the owner raised that are yours, for the record

- **Schedule lag ~1 minute.** Confirmed inherent, not a bug:
  `functions/index.js:270` is `schedule: '* * * * *'`, so worst case is ~60 s of
  cron granularity plus the ESP32's command-poll interval on top. Making this
  feel instant needs Cloud Tasks with an exact dispatch time per schedule, which
  is a real piece of work — flagging it rather than proposing it.
- **July 2026 shows ₱5.60 spent on a month with no usage.** Looks like the
  metering charge being applied to a zero-usage month. Worth confirming that is
  intended before the owner's panel sees it.

### Power caps: a note on the owner's paper

The owner's project paper specifies 1000 W combined, 500 W per outlet **when
both are in use**, and up to 1000 W on a single outlet **when it is the only one
active**. That third clause is not implemented anywhere — the firmware enforces a
flat 500 W per outlet at line 78 with no sole-outlet exception.

**The owner has decided to keep the hardware limits exactly as they are**, on the
grounds that the relay module (not the PZEM-004T, which measures to ~2300 W) is
the binding constraint. Recording it only so the paper and the code can be
reconciled on paper's side. **No change requested.**

### Nothing changed on your side

I have not modified anything under `C:\App\WattWise`. Files showing as modified
there are your own uncommitted `renameApplianceProfile` work.

---

## 0n. §30 items 7–10 done — and 1–6 were already closed

**Written 2026-08-13 from the web repo.** Commits `55be683` and `14d74b8`.

### First, a correction to your table

**§30's outstanding list repeats items 1–6 as open. They were closed yesterday**
in `5eed1cc` and `ba5edf7`, which §29 asked for and which I reported in §0k.
Verified again just now rather than trusting my own memory —
`safetyService.js`, `comparisonHelpers.js`, `notificationHelpers.js` and
`safetyHelpers.js` are all byte-identical to yours, `icon.name` is mapped, the
logo is committed and the bolt is `#10B981`. Nothing there needs doing twice.

### §30.1 — taken, and it reproduced exactly

`billing.js`, `liveUsage.js`, `useOutletControl.js` and `useHistory.js`
re-synced. All four byte-identical again.

Reproduced your figures before changing anything, on this repo's own copy:

```
effectiveRate at 0.001 kWh   P5610.00/kWh     <- matches your screenshot
16 W at that rate            P89.76/hr        <- matches exactly
COST TODAY                   P5.61  ->  P0.01
16 W marginal                P0.18/hr (seeded) / P0.16 (owner's rates)
```

`functions/test/billingParity.test.js` passes for both clients now, and the
full suite is **122/122**.

**One thing §30.1 did not call out: Weekly needed it too.** "The last 7 days" is
not a billing period either, so it was carrying a full month's metering fee —
the same error as the day, one scale up. Only Monthly still includes the period
flats and only Monthly reports a true effective rate; Daily and Weekly say
"P9.88/kWh for extra use" instead.

Chart tooltips price marginally as well. Each bar is a single day, and a day
charged a share of the monthly metering fee it never incurred is the same
mistake in a hover.

### §30.2 and §30.3 — taken

Prompt now shows iff `suggestionPending`, label comparison kept as the fallback
for pre-deploy documents. One wrinkle worth flagging: the comparison reads the
outlet document's own `applianceName`, not `useSettings`' `outlet1Name` — that
one defaults to `"Outlet 1"`, so the fallback would have compared a suggestion
against a placeholder and offered a name for every unnamed outlet forever.

`state === 'changed'` renders as **"Not LED Lamp"** in amber on the dashboard
card, and Settings adds a line saying the readings no longer match the name.
Neither guesses a replacement — the alternative is a suggestion and the user
confirms it. `unknown` is never treated as `changed`.

`recognised === true` is surfaced as **"· recognised"** where the card otherwise
says "· named". You were right that neither client showed it; it is the
"it knew my appliance" moment and it cost one line.

### §30.6 — audited, all clean

Every `calculatePelcoIIIBill` call in this repo passes `supplyRates` alongside
`profileId`. `useHistory` had drifted again with exactly the omission you
describe and is re-synced. `useMonthStrip` — the web-only rail hook from §29 —
already passed both.

### §30.4 — I agree with you, and yes to the callable

Keeping the field. Your reasoning is right: every learned signature starts as
something a user typed, so removing free-text naming means a new appliance can
only ever be called whatever the generic profiles guess. With §30.2 and §30.3
in, the confusion the owner actually hit is gone without removing anything.

**Yes to `renameApplianceProfile`, please.** The owner asked for it directly and
`Forget` really is the only action on a saved signature today — renaming one
currently means forgetting it and re-teaching it, which throws away the
measurements. Neither client can do it without you.

### Still open here

Nothing from §30. Waiting on `renameApplianceProfile` before the saved-appliance
list can offer rename.

---

## 0m. Both corrections taken — load-testing doc is live

**Written 2026-08-13 from the web repo.** Commit `8a4254c`,
`docs/web-verification-steps.md`.

Both folded in, and both checked against
`functions/src/lib/powerSafety.js` rather than taken on trust —
`WARNING_RATIO = 0.8`, `LIMIT_RATIO = 0.95`, `ratio >= 1 → cutoff`. Your
56/47/44 for a 45 W fan is exactly right.

**The ratio correction was the important one.** A single threshold cannot
produce the ladder, and the doc as I first drafted it would have sent the owner
straight to cutoff with instructions promising three stages — they would have
reported a broken escalation path that works fine. It now carries the general
form, so it holds for whatever the fan actually draws:

| Stage | Fires at | Set for a draw of `D` |
|---|---|---|
| ⚠️ Warning | ≥ 0.80 | `D / 0.8` |
| ⚡ Limit | ≥ 0.95 | `D / 0.95` |
| 🔴 Cutoff | ≥ 1.00 | just under `D` |

Also noted there: over-voltage escalates to `limit` and never `cutoff`, so
testing the voltage band stops one rung short by design.

**The stale-APK note is its own bolded warning at step 11**, not a footnote.
That ₱5.60 gap looks exactly like the failure CLAUDE.md warns about — "if the
bill does not match, `billing.js` was modified, revert to a verbatim copy" —
so without the warning the morning goes on a hunt for a divergence that is not
there. Rebuild-before-comparing is now a precondition of the step.

Email logo is on the don't-chase list with the reason and the fix.

### One thing I added while checking your numbers

`READING_WRITE_INTERVAL_MS = 15000` — the safety document persists readings at
most every 15 s, so **Power Safety steps while the Dashboard flows**.

Worth writing down because step 2 is the one page nobody has ever seen working:
it shipped last night, and every previous look at it happened while the device
was quiet, so `—` is the only state it has shown. A page seen working for the
first time, updating six times slower than the one beside it, is a very easy
false bug report. It is on the don't-chase list.

Nothing open from this side.

---

## 0l. Closing — nothing open on either side

**Written 2026-08-12 from the web repo.** Final entry. No reply needed to any of
the below; it is a record, not a question.

### `MAIL_LOGO_URL` — confirmed set, confirmed live

I raised this in §0h and you never explicitly confirmed it, so I checked rather
than asking again. `functions/.env` has it, pointing at the right URL.

Verified from the web side by bytes, not by status code:

```
GET https://www.wattwise.site/email-logo.png
  200 · image/png · 880 bytes · md5 cdf51d7029ea00595e9118937b1ac0ea
```

Identical to `public/email-logo.png` in this repo. The control matters, because
the SPA rewrite returns 200 for everything: `GET /not-a-real-file.png` also
returns 200, as `text/html`. The logo is a real file being really served.

The only thing neither repo can prove by reading is whether functions were
redeployed after that `.env` line landed — v2 reads `.env` at deploy time. One
password-reset email answers it: the header shows the bolt mark if it deployed,
the ⚡ emoji if it did not. Your graceful fallback means the failure mode is
cosmetic either way, which was the right call.

### Compare Months — audited after the re-sync, nothing to fix

The owner asked me to check this because its figures moved. They moved because
`summarizeDailyEntries` is now correct; the page around it is sound:

- `useReferenceComparison` passes the user's rates to both months.
- `compareToActualBill` returns `null` for a missing bill and for
  `actualCost <= 0`, so a zero-cost reference cannot divide by zero.
- `explainAccuracy` renders only behind `accuracy ?`.

Expect the accuracy verdict to shift once, in the *direction of correct*: the
estimate now carries the metering charge it was dropping, so a month that read
"under" reads slightly less under.

### Final state of this repo

- Copied surface: **23 of 25 byte-identical**. The exceptions are `config.js`
  (sanctioned persistence edit, `firebaseConfig` re-verified identical) and the
  web-only `authActions.js`.
- Hooks: `usePowerSafety.js` is the only one that differs — the documented §22
  divergence.
- All six §22 verification paths run and passed, including the two cross-client
  ones: browser toggle → physical relay → phone, and a bill matching to the
  centavo.
- Alert history, alert icons, and notification detail rows verified on screen.

Nothing is open from this side. Thanks for the §0j widening — `currentStage` was
the half that mattered and I had not seen it.

---

## 0k. §29 done — all six items closed, plus a seventh you did not report

**Written 2026-08-12 from the web repo.** Commits `5eed1cc` and `ba5edf7`.

| | Item | Status |
|---|---|---|
| 1 | Re-sync `safetyService.js` | ✅ byte-identical |
| 2 | Re-sync `comparisonHelpers.js` + pass rates | ✅ byte-identical, hook taken whole |
| 3 | Re-sync `notificationHelpers.js` | ✅ already identical since §28 |
| 4 | Map `icon.name` on the Safety page | ✅ done — see below |
| 5 | Commit `public/email-logo.png` | ✅ already committed (`4faa499`), URL live |
| 6 | The orange bolt | ✅ already done (`4faa499`) |

**You were right to widen §0j, and `currentStage` is the worse half.** Wiped
history is a silent loss; a phantom "Back to Normal" alert *and email* on every
launch is the app actively lying about the hardware. I only caught the field I
could see the effect of. Taken verbatim.

### Item 4 — the seven names, mapped

Your warning was exactly right: re-syncing alone left a green-tinted warning
sign, because the page took `icon.bg` and `icon.color` and hardcoded the glyph.
`SafetyPage.jsx` now maps `icon.name` onto glyphs this client can draw:

| `icon.name` | here |
|---|---|
| `checkmark-circle` | ✅ |
| `warning` | ⚠️ |
| `alert-circle` | ⚡ |
| `flash-off` | 🔴 |
| `flash` / `speedometer` | ⚡ / 📈 |
| `notifications` | 🔔 |

Chosen to agree with `getNotificationIcon` where the lists overlap, so one alert
looks the same on both pages — and to match the emoji the trigger already puts
in the alert *title*, which renders inches away. "✅ Back to Normal" now carries
a green tick rather than a triangle of any colour.

### Item 2 — verified against this repo's own `billing.js`

`useReferenceComparison` was byte-identical to yours apart from the rates, so I
took the whole file rather than porting the change.

Independent check, not a re-read of your number: **0.28 kWh prices to ₱8.69**
here. Third copy of `billing.js` agrees, so the parity that matters is intact.

### The seventh thing — `useHistory.js` had drifted

Found sweeping the entire copied surface afterwards; neither of us had flagged
it. Your `useHistory` returns `rateProfileId` and this one did not — the field
your History screen uses to price its header total from total energy instead of
summing per-day costs. **The same mistake §29 fixed in
`summarizeDailyEntries`.**

Harmless here, and I checked before assuming so: this repo's History page lists
per-day rows and has no summed header total, so nothing read the missing field.
Taken anyway, to make it byte-identical.

### The copied surface, swept in full

**23 of 25 identical.** The two exceptions are the two that are supposed to be:

- `config.js` — the sanctioned persistence edit. `firebaseConfig` re-checked
  byte-identical to yours.
- `authActions.js` — web-only, no phone counterpart.

Hooks: `usePowerSafety.js` is now the **only** one that differs, which is the
documented §22 divergence. Nothing else is open here either.

---

## 0j. 🔴 URGENT — every app session wipes the alert history. Take this fix.

### ✅ VERIFIED after the fix — and it retracts §0i's theory

Re-ran the transition with the fix deployed. **Both entries are present and
survive a reload:**

```
✅ Back to Normal          Just now
🔴 Safety Limit Reached    Just now
```

**§0i's `previousAlerts` race theory is withdrawn.** The trigger was writing
both entries correctly the whole time — prepending works, the tail is carried.
Every entry it wrote was then destroyed by the next page load. Do **not** change
`handleSafetyAlerts`; there was never anything wrong with it.

Also confirmed working: `describeNotificationDetails` renders the readings
behind each alert on the notifications page — `Stage: Limit`, `Outlet 1:
238.5 V · 0.00 A · 0.0 W`, and so on. Those figures had never been visible
anywhere on the web before.

**Finding 2 confirmed visually and still open:** in Alert history both rows show
the same red error triangle, including `✅ Back to Normal`. The notifications
page gets this right because `getNotificationIcon` has the matching keys —
`getAlertIcon` does not. Same data, two mappings, one of them wrong.

**2026-08-12.** This is the cause of §0i's "missing entry", and it is bigger
than that symptom. **`safetyService.js` is edited here — deliberately, and it
needs the identical change on the phone or the wipe continues.**

### The bug

`initializationService` runs account repair once per app session. It calls:

```js
await setDoc(getSafetyRef(userId), getDefaultSafetyData(), { merge: true });
```

`getDefaultSafetyData()` contains **`alerts: []`**.

`merge: true` does **not** mean *"only fill in absent fields"*. It means *"do
not delete fields I did not mention"*. `alerts` **is** mentioned — so merging
the defaults over a live document **replaces the stored history with an empty
array.**

The comment above the call site reads *"Already a merge write, so it only fills
in absent fields."* That is the misunderstanding, stated as a reassurance, which
is presumably why it survived review.

### What the owner saw, exactly

1. Forced a stage change. `✅ Back to Normal` appeared **live** in the panel.
2. Reloaded the page three minutes later. **Panel empty.**

Not a race, not a rendering problem, not the missing-`limit`-entry theory in
§0i — that entry was almost certainly written too, then destroyed by the next
page load before anyone read it.

**Nothing that has ever been written to `power_safety/settings.alerts` has
survived a single app launch, on either client, since this code shipped.** The
history feature has never once worked end to end.

### The fix, applied here

```js
const { alerts, ...defaultsWithoutHistory } = getDefaultSafetyData();
await setDoc(getSafetyRef(userId), defaultsWithoutHistory, { merge: true });
```

Every other default still merges, so the repair this call exists for is
unchanged. A document that has never carried `alerts` simply lacks the field,
and `normalizeSafetyData` already defaults it to `[]`.

### ⚠️ Why this had to be edited in a copy-rule file

Fixing it only here would be pointless theatre: **the phone's line 248 is
byte-identical**, so opening the app would wipe the history the web had just
preserved. The rule exists so both clients agree with the backend; leaving a
data-destroying write in one of them does not serve that.

So `safetyService.js` is knowingly drifted **until you take this**. It is the
one file where the drift is doing work, and it should be closed in your next
commit rather than lived with.

### The two findings in §0i, revisited

- **Missing `Safety Limit Reached` entry** — probably not the `previousAlerts`
  race after all. A page load between the two transitions is enough to explain
  it, and the owner was reloading throughout. Worth re-testing once both clients
  carry this fix, before changing the trigger.
- **`getAlertIcon` keys still do not match the emitted types.** Unaffected by
  this and still worth fixing: only `cutoff` matches, so `✅ Back to Normal`
  renders under a red error triangle.

---

## 0i. §28 list done — and two findings in `handleSafetyAlerts`

**2026-08-12.** Commits `4faa499`, `df11608`.

### The §28 list

| # | Item | Result |
|---|---|---|
| 1 | Alert history | ✅ **Populates.** It writes and renders — see the finding below |
| 2 | `notificationHelpers.js` | ✅ Re-synced, and `describeNotificationDetails` wired into the notifications page |
| 3 | Corrected `email-logo.png` | ✅ Deployed. Re-verified by bytes: 880 B, **120 x 120**, md5 `cdf51d7029ea00595e9118937b1ac0ea` |
| 4 | The orange bolt | ✅ Gone — `BoltMark.jsx` holds the path once, same geometry as the favicon and email logo |

**Your cost-summing check came back clean.** The only `reduce` over a cost here
is `liveCostPerHour` in Analytics, which sums per-hour rates across outlets, not
`history_daily.cost` across days. Nothing understates.

### Fixed here: alert history was only read once, at mount

The hook subscribes to `power_safety`, but `applySafetyData` lifts readings,
thresholds and stage out of each snapshot — the `alerts` array rides in the same
payload and is dropped. So an alert raised while the page is open never appeared
until a reload, under a panel insisting *"Nothing has crossed a threshold"*,
which is a stronger claim than "nothing has loaded".

Now re-reads on a stage change — one extra read per transition, not a poll.
**Done in `SafetyPage.jsx`, not the hook**, because `usePowerSafety` is a shared
copy and **the phone has the identical gap**. Worth taking there.

### ⚠️ Finding 1 — the "Safety Limit Reached" entry did not survive

Owner forced a transition by lowering the voltage maximum below live mains, then
restored it. Expected two entries. **Only `✅ Back to Normal` is present.**

Not a rendering problem — the panel renders the array unfiltered, and the switch
in `handleSafetyAlerts` writes an entry for `warning`, `limit` and `cutoff` as
well as `normal`.

The suspect is `previousAlerts`:

```js
const previousAlerts = Array.isArray(newData.alerts) ? newData.alerts : [];
await change.after.ref.set({ alerts: [alertEntry, ...previousAlerts]... });
```

`newData` is the trigger's own after-snapshot. If the second transition's
snapshot predates the first transition's `alerts` write, the second write
carries an empty tail and **overwrites the first entry** rather than prepending
to it. Telemetry posts about once a second, so the window is not small.

**The notifications collection settles it**, and the badge already reads 2:
two notifications plus one history entry means both transitions fired and the
history write lost one. One notification means only one transition fired.

If it is the race, reading `alerts` inside a transaction — or appending with
`arrayUnion` — fixes it. Backend, so left alone here.

### ⚠️ Finding 2 — `getAlertIcon` keys do not match the types being written

`safetyHelpers.getAlertIcon` maps `voltage`, `current`, `power`, `cutoff`, and
falls back to `icons.power` — a red error-coloured warning triangle.

`handleSafetyAlerts` emits `warning`, `high_usage`, `cutoff` and `device`.
**Only `cutoff` matches.** Everything else takes the fallback, which is why
`✅ Back to Normal` renders under a red alert triangle in the screenshot: a
success message wearing an error icon.

`safetyHelpers.js` is a copy-rule file, so this is yours. Either add the four
emitted types or change what the trigger emits — but they should agree.

---

## 0h. §25 and §26 done — **the email logo is live, set `MAIL_LOGO_URL`**

**2026-08-12.** Commit `a20037b`, deployed.

### ✅ `https://www.wattwise.site/email-logo.png` is serving

Verified by **bytes, not by status code**:

```
status  200
type    image/png
bytes   6907
md5     c3480c7902842d4a28c8122f4f2dee26   ← matches your copy exactly
format  PNG, 640 x 640, 8-bit RGBA
```

The control that makes that meaningful: `/not-a-real-file.png` also returns
**200, with `text/html`** — the SPA rewrite answers for every unmatched path.
A status check alone would have "passed" on a file that was never deployed.
This repo made exactly that mistake once before with placeholder images, so the
md5 is the evidence, not the 200.

**Step 1 is complete. Set
`MAIL_LOGO_URL=https://www.wattwise.site/email-logo.png` in `functions/.env`
and redeploy functions.**

### ⚠️ Correction: the file is 640 x 640, not 120 x 120

§26 states 120 x 120. The `md5` matches yours byte-for-byte, so it is
unquestionably the right file — the dimension in the note is simply wrong.

Worth checking before the template goes out: at 640 px it needs explicit
`width` and `height` attributes in the header markup, or clients that ignore CSS
will render it at full size. If the template was written against 120 px it may
already be fine; if it relies on the intrinsic size, it is not.

### ✅ Favicon replaced with the real mark

The ⚡ emoji data URI is gone. `index.html` now carries the white bolt on a
`#10B981` disc from §25's source path, bolt height equal to the circle's radius
per the circle lockup. Confirmed the emoji is absent from the built HTML and the
mark is present in it.

No files, no build step — a data URI, as §26 specified. `theme-color` was
already `#10B981` and was not touched.

### ✅ `#16a34a` grep — clean

It appears in this repo only inside `FROM-THE-PHONE-REPO.md`, in your own note
warning about it. **No code here was ever on the mock colour.**

### Nothing else outstanding on this side

With §24 closing the phone's `ErrorBoundary`, there is no open item in either
repo beyond the `MAIL_LOGO_URL` switch above.

---

## 0g. §23 taken — both items done and verified on screen

**2026-08-12.** Commit `0a5c2e9`, deployed and confirmed live.

### 1. `comparisonHelpers.js` re-synced

Byte-identical again. A full sweep of every shared file leaves **`config.js` as
the only difference in either direction**, plus web-only `authActions.js` and
the deliberate `usePowerSafety.js` divergence recorded in `CLAUDE.md`.

### 2. `explainAccuracy()` taken — and you were right to push back

`ComparisonPage.jsx` renders it under the verdict badge. All three branches were
exercised against the real numbers before wiring it up; ₱13.22 against ₱1183.96
returns your 98.9% string exactly.

**Confirmed rendering on the live site**, under *"Outside the expected 5% band"*:

> WattWise read 98.9% under the August 2026 bill. That is expected unless
> everything you own runs through these two outlets - the bill covers the whole
> apartment, WattWise covers outlet 1 and outlet 2. This gap is a difference in
> what is being measured, not an error in the estimate.

Your correction stands and this repo was wrong. *"Worth being ready to explain,
not to fix"* put the burden on whoever happens to be standing next to the
screen. It is the screen's job. Both clients now answer with the same sentence,
which matters more than either wording.

Noted for the record: your three-state finding — a bill on file against a month
with no measured usage rendering as *"estimated ₱0.00, 100% under"* — does not
arise here, because this page never gated the card. Worth remembering if it ever
does.

### The `securetoken` 400 no longer reproduces

Checked the console on the same account and page: **clean, no issues.** The
error has not returned.

That is consistent with your deleted-test-account hypothesis and inconsistent
with anything structural — a token layer that was genuinely broken would still
be failing. Not confirmed, because the Response body was never read while it was
live, and it is now unreadable. **Closing it as benign and unexplained rather
than as diagnosed.** If an unexplained sign-out appears on either client, this
is the first thing to reopen.

### Where this leaves the project

Every path either repo flagged as never-run is exercised or fixed, **except the
phone's `ErrorBoundary`**. That is the entire remaining list, and it is yours.

---

## 0f. §22 verification run — **all six paths closed**

**2026-08-12.** Owner ran the web side against live hardware and the installed
build. **Nothing on the §22 list has "never been run" against it any more**,
including both cross-client checks.

Two findings came out of it, neither blocking: a phone-side rendering gap on the
reference bill (yours), and a `securetoken` 400 worth watching (shared). Both
below.

| # | Path | Result |
|---|---|---|
| 1 | Cross-client toggle | ✅ **PASS** — both directions, no console errors |
| 2 | Saving safety thresholds from the web | ✅ **PASS** — 260 V write reached the phone |
| 3 | Creating a schedule from the web | ✅ **PASS** — fired, and reflected in the app |
| 4 | Bill to the centavo | ✅ **PASS** — **₱8.27 on both**, 0.27 kWh both |
| 5 | Entering a past bill | ⚠️ Web passes; **phone does not display it** — below |
| 6 | `ErrorBoundary` | ✅ **PASS** — forced a throw, all three checks. Below |

§1 and §2 of `cross-client-verification.md` are now closed. **The premise is
proven: a browser toggle switches the relay and the phone follows, and both
clients price the same month identically to the centavo.**

### ✅ 6 — `ErrorBoundary` triggered and verified. It is no longer a guess.

`throw new Error('boundary check')` at the top of `BudgetPage`, dev server,
signed in. **All three checks passed**, and the console proved more than the
screen did:

- **Budget rendered the fallback card, not a blank page.** "This page stopped
  working", with `boundary check` under *Technical details* — the real thrown
  message, so it is catching the actual error rather than showing a generic
  screen.
- **The sidebar stayed fully usable** inside the error state.
- **Clicking Dashboard recovered with no reload.** Confirmed by the console:
  the boundary errors were still listed while the Dashboard rendered normally,
  so the page was never reloaded — the `pathname` key remounted the boundary.
  That is the check worth having, since without it the user reaches an error
  page they cannot leave.

The logged `componentStack` also confirms the nesting is as designed —
`ErrorBoundary` appears twice, once under `AppShell` and once under `App`.

**Both repos should now stop describing their boundary as unverified.** The
phone's remains untriggered; the same 60-second procedure applies.

### ✅ §17.2 confirmed fixed on the live account — not just in principle

Checked directly on the owner's account: **Budget and Analytics agree.** The
corrected `currentSpending` has been written, so the inflated metering charge is
gone in practice, not only in the deployed code.

That closes the last thing this repo was told to expect and not work around. No
temporary note was ever added to the Budget page, and none is needed.

### ⚠️ 5 — the reference bill is stored correctly and the phone cannot show it

Not a web bug, and not a data bug. `comparisonService.js` is byte-identical, so
the web wrote `reference_comparison/2026-08` exactly where the phone reads it.
It survives a reload on the web.

`ReferenceComparisonScreen.js` wraps the comparison metrics, the outlet
breakdown **and the actual-bill card** in a single conditional. When either
month has zero recorded days it renders the `emptyState` branch instead —
*"Nothing recorded for Jul 2026"*. July has no data, so the stored bill cannot
appear no matter what is in Firestore.

**The entry point for entering a bill is inside that same branch**, so on the
phone today a user can neither see nor add a reference bill. The web gates
neither, which is why it shows there.

Suggested, but yours to weigh: render the actual-bill card outside the
`daysRecorded` conditional. It does not depend on comparison data — it is a
figure copied off paper — and it is the one part of that screen that works with
a single month of usage.

### ⚠️ Unrelated, and worth someone's attention: a 400 from `securetoken`

Visible in the dev console during test 6, on both the Dashboard and Budget
screenshots, and **nothing to do with the boundary test**:

```
Failed to load resource: the server responded with a status of 400 ()
securetoken.googleapis.com/…?key=AIzaSyD0jBN6PpEPyWuw1On83_T9BIXWhhCoqMo
```

That endpoint is Firebase Auth's **ID-token refresh**. A 400 there normally
means the refresh token was rejected. The session kept working and every page
rendered live data, so it did not bite — but a token refresh that fails is
exactly the kind of thing that surfaces later as a user being signed out
mid-session, and it was not present in the earlier live-site runs.

Not chased yet. Recorded so it is not rediscovered from scratch. If anyone sees
an unexplained sign-out on either client, start here.

### Worth being ready to explain, not to fix

The web shows *"PELCO III billed ₱1183.96"* against *"WattWise estimated
₱13.22"*, flagged **"Outside the expected 5% band"**. That is correct
behaviour and the numbers are right — but the 5% band assumes WattWise measures
everything the bill covers. It measures **two outlets**; the bill covers the
whole apartment. Those cannot converge.

Not proposing a change. Flagging it because an examiner reading "98.9% off" will
ask, and the answer is a scope difference rather than an accuracy problem.

---

## 0e. Reply to §20 — plus one thing §12 should know

**Written 2026-08-11, fifth pass.** Commits `7d1a208` (code) and this entry.
No code changed in response to §20 itself; there were no tasks in it.

### §20 acknowledged, and it corrects something this repo repeated

The §17.2 reading — inflated `currentSpending` explaining silent budget alerts —
was relayed to the owner from here **as fact**, including the advice to change
the budget amount once to clear burned flags. Harmless, but it was never the
fix, and it was passed on without being questioned.

Worth stating why both repos landed on it: **a silent failure and a condition
that never occurred are indistinguishable from outside.** Every explanation
either side reached for assumed the handler ran.

### ✅ CLOSED 2026-08-12 — `verifyEmail` has been walked and it worked

Struck off per §22. A verification email from the phone's callable was opened in
a **signed-out browser** — the exact case flagged below as skipping `reload()` —
and the phone picked up `emailVerified` through its own `refreshEmailVerified()`.
The branch is live and the signed-out case is fine.

The original entry is kept below rather than deleted, because the reasoning that
found it is the part worth reusing.

### ~~⚠️ `/auth/action?mode=verifyEmail` has never executed once~~

**This is the item from §20's pattern that has traffic already pointed at it.**

`AuthActionPage` handles three modes. Only `resetPassword` has ever run. The
`applyCode` path — `checkActionCode`, then `applyActionCode`, then
`auth.currentUser.reload()` — has not executed a single time in production or in
testing.

Per §8, the phone now **sends address-confirmation emails**, and every one of
them lands on that path. So this is a never-exercised branch with real users
walking into it, which is precisely the shape of the four dead triggers.

Two things make it worth ten minutes before anyone relies on it:

- The `reload()` call is inside `if (auth.currentUser)`. A user confirming from
  a browser where they are **not** signed in — the common case, since the link
  arrives by email — skips it silently. Whether the phone then sees
  `emailVerified` without its own refresh is unverified from this side.
- `checkActionCode` runs first purely to learn the address for the success
  screen, wrapped in a bare `catch {}`. If it fails, the screen says
  "Your account has been updated" instead of naming the address. Cosmetic, but
  it is another silent branch.

**Suggested:** send one verification email to a signed-out browser and watch the
whole path. This repo cannot generate that email — the callable lives in the
phone repo.

### The app download card has been removed from the sign-in page

Requested by the owner, commit `7d1a208`. The card and its Expo build URL no
longer render, and the URL is gone from the built bundle. `DownloadApp.jsx` is
left on disk so restoring it is one element.

**§12 consequence:** registration does not exist on the web, and that card was
the only thing on the site pointing anywhere for account creation. **The web
client now has no route to a new account at all** — not gated, simply absent.

✅ **Raised with the owner as you suggested, rather than decided here. Their
answer: leave it off.** The APK is distributed directly, so the site is not
expected to carry anyone to it. Treat the sign-in page as sign-in only —
somebody without the app installed is not an audience it serves. No further
change planned; restoring it is one element if that ever changes.

### `checkActionCode` no longer swallows its error — fixed

Commit `1f47d09`, done regardless of what the `verifyEmail` test shows, as
advised. The call stays non-fatal — `applyActionCode` decides whether the code
is usable and this one only learns the address for the success screen — but the
raw code and message are now logged. A dead path and a path with nothing to do
were indistinguishable, which is the shape §20 describes.

Swept the rest of the client for the same pattern. The only other bare catches
are two in `useDismissibleNotice` guarding `localStorage` against private mode
and third-party cookie rules. Those are left alone deliberately: being blocked
there is an expected condition with a correct fallback on both branches, not an
operation that was meant to succeed and quietly did not.

### Your answer on `reload()` — noted, and the gap is understood

Accepted: the phone's own `refreshEmailVerified()` → `reload()` → `onVerified()`
→ tick is what makes verification land, so the browser skipping `reload()` for a
signed-out user does not break it. The tick existing because `reload()` mutates
in place rather than emitting is worth having written down.

Agreed the real gap is that it is manual — no `AppState` listener, so verifying
in a browser and switching back leaves the user on the gate screen until they
tap. Friction, not a dead end, and **still unwalked by anyone**. That remains
the thing to test, and this repo cannot start it: the callable that sends the
email lives in yours.

### `ErrorBoundary` — still unverified, agreed

No claim made. The check is recorded in §0d and has not been run. It is ranked
below the items above deliberately: a boundary only matters *after* something
else has already broken, whereas `verifyEmail` is a path users reach on the
happy path.

### Applying §20's lens to this repo

Ranked by *never exercised end to end*, which is a different order than ranking
by risk:

| Path | State |
|---|---|
| `/auth/action?mode=verifyEmail` | **Never run. Traffic already pointed at it** |
| Creating a schedule from the web | Never run. Writes a document the firmware acts on |
| Saving safety thresholds from the web | Never run. Writes the document auto-cutoff reads |
| Entering a past bill (`reference_comparison`) | Never run |
| Either `ErrorBoundary` | Never thrown at |

Agreed on moving to `docs/cross-client-verification.md` next. Flagging only that
`verifyEmail` is cheaper than either cross-client check and has users on it
sooner.

---

## 0d. Reply to §18 — all three answers taken

**Written 2026-08-11, fourth pass.** Commit `b7b76f6`.

### 1. Parity green — noted, nothing to do

Confirmation received. Tariff changes now go in all three copies in one commit.

### 2. `LoginPage` fixed — and the class swept again

Taken as advised: the banner clears **on edit, not on submit**, guarded so an
already-empty banner is not re-set on every keystroke, matching your
`clearFieldError` idiom.

**Sweeping the class rather than the instance found two more in this repo.**
Your §14 lesson applied twice over:

| Form | Error that used to linger |
|---|---|
| `LoginPage` | "That email and password do not match an account." |
| `ForgotPasswordPage` | "No account found with this email." |
| `SafetyPage` threshold editor | "Minimum voltage must be below the maximum." — reachable on any of four fields |

`AuthActionPage` was already fixed earlier. Every form in this client that shows
an error now clears it on edit; a grep for `setError` with no clear-on-edit
returns nothing.

The `SafetyPage` one is worth noting because it is not an auth form — the
pattern had spread past the place it was first found, which is exactly the
argument for checking the class.

### 3. §17.2 — no note added, as instructed

Confirmed: nothing was added to the Budget page and nothing will be. Both
caveats are understood and are the owner's to watch on the day:

- Existing `budget/{month}` documents stay inflated until the next nightly
  rollup rewrites them. **If the demo runs before the next midnight Manila, the
  stale figure is still on screen.**
- Alert thresholds burned against the inflated figure need the budget amount
  changed once to clear.

### `ErrorBoundary` — agreed, still unverified on this side

No claim is being made that it works. It has not been triggered. The check is
recorded here so whoever runs it does not have to design it:

> Temporarily add `throw new Error('boundary check');` as the first line of the
> `BudgetPage` component body. `npm run dev`, sign in, open **Budget**.
> Expect the fallback **and a working sidebar**. Then click **Dashboard** — it
> should recover without a reload, which is what the `pathname` key buys.
> Revert the throw.

That sequence tests both boundaries' distinguishing behaviour, not just that
something renders. Nothing of the sort is committed — a permanent crash route
would be clutter for a one-time check.

---

## 0c. Reply to §14–§17

**Written 2026-08-11, third pass.** All of the below is deployed and live on
`www.wattwise.site`.

| Commit | What |
|---|---|
| `a7caa04` | §3 Analytics single freshness authority, §4 device card read-only |
| `9d892e4` | Power Safety stops grading absent readings |
| `a97b662` | §7 stale banner, `useSettings.js` re-sync, showcase placeholders removed |
| `71e600c` | §12.1 budget read-only + `budgetService.js` byte-sync |
| `f6b5969` | `ErrorBoundary` ×2 |

### What this repo needs back from you

1. **Does the parity suite pass against this copy?** `billing.js` diffs clean
   here, but only your machine can run `billingParity.test.js`. A green run is
   the confirmation; this side cannot produce it.
2. **Should `LoginPage` get the `LoginScreen` fix?** Flagged below, not made.
   It is your find and the two should probably land as a pair.
3. **Will the §17.2 rollup fix land before the demo?** If `currentSpending`
   stays inflated, Budget and Analytics disagree on screen and a temporary note
   here becomes worth the cost of removing it later. If the fix is close, no
   note is better.

### §16 asked whether this repo has an `ErrorBoundary` — it did not. It does now.

Two of them, placed differently on purpose:

- **Inside `AppShell`, wrapping `<Outlet />`**, keyed on `location.pathname`. A
  crashed page leaves the sidebar standing, and navigating anywhere else remounts
  the boundary and clears the error. The user walks out rather than reloading.
- **Around `<Routes>` in `App.jsx`**, unkeyed. `/login`, `/forgot-password` and
  `/auth/action` have no sidebar to escape with, so reload is the only useful
  move there and the fallback offers it.

The fallback is built from plain elements and CSS variables, not `Card` /
`Button` / `Banner`. Whatever just crashed may have been a UI component, and a
fallback that re-throws is worse than none.

⚠️ **Unverified in a browser.** The build passes and the logic is standard React,
but nothing has actually thrown at it yet. Treat "we have a boundary" as
untested until someone forces an error.

### §15 billing parity — this repo's copy is clean

`src/utils/billing.js` diffs identical against the phone's, so the parity suite
should pass on this side. Noted and accepted: tariff changes now go in all three
copies in one commit, or your suite breaks. That is the right trade.

Agreed too that the arithmetic is now covered but the **plumbing is not** — the
open question is whether both clients feed those functions the same kWh, rates
and month boundary. That is one of the two manual checks still outstanding.

### §17.1 invoices index — explains something seen here

Accepted, no action. Worth recording that this is a plausible cause of billing
and comparison views looking thin on this client, which had been put down to
there simply being little history. Nobody investigated it here, so the silent
failure cost nothing beyond a wrong assumption.

### §17.2 metering fee — not worked around, as instructed

**No client-side correction made.** The Budget page continues to show
`currentSpending` as written. Adding a third opinion on that number is exactly
the trap.

Flagging one consequence for whoever sees it first: **Budget and Analytics will
visibly disagree until the rollup fix lands**, and Analytics is the correct one.
No wording has been added to explain the gap, because any such wording becomes
wrong the moment `currentSpending` is fixed. If the gap is going to persist past
the demo, say so and a temporary note can go in.

### §14 `LoginScreen` — good catch, and it closes the loop

Checking the class rather than the instance is what found it. This repo's
`LoginPage` uses the same `Banner`-based pattern; its error is set only on submit
failure and the fields do not clear it, so it has the same shape. Not changed
this session — flagging it rather than fixing it silently, since it is the
mirror of what you just fixed and should probably land deliberately.

### §3, §4, §12.1 — all verified still in place

These landed in `a7caa04` and `71e600c`, before this handoff was written.
Re-verified rather than redone: `budgetService.js` diffs clean, no budget write
path in `BudgetPage`, no device token field in `SettingsPage`, `showLive` gating
Analytics, and all three §12.2 routes present in `src/App.jsx`.

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
