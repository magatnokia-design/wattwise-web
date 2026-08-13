# Web verification

Companion to `C:\App\WattWise\docs\cross-client-verification.md`, which owns the
phone side.

Three rounds. **Round 3 is next**; Rounds 1–2 are kept below as the closed record.

---

# Round 3 — appliance identity and the toggle window

**Written 2026-08-13 for the next session.** Everything here is new since Round 2
and **none of it has been seen on hardware yet**. Round 2 proved the numbers were
right; this round is about whether the app stops asserting things it cannot know.

### Before you start

- **Hard-refresh (Ctrl+Shift+R).** Live bundle is `index-CbySESLM.js`; if
  DevTools → Network shows anything else, you are testing yesterday's build.
- ESP32 powered and reporting.
- **Have a 230–500 W appliance ready** for Phase 3. Nothing already tested
  reaches that band — the fan is ~55 W. **Stay under 500 W**: the firmware opens
  the relay after 3 seconds above it.
- Phone app optional. Only step 5 compares the two.

---

## Phase 1 — The toggle window (⭐ start here)

The one most likely to show a defect, because it lasts only seconds and has
never been watched deliberately.

### 1. "Switching off…" on the Dashboard

With a fan **running** on outlet 1, switch it **off** in the browser and watch
the badge — not the switch.

| Expect | Not |
|---|---|
| `Switching off…` (amber) while the wattage is still real | `Off` beside a live wattage |
| then `Off` once the reading drops to 0 | `Switching off…` stuck for more than ~15 s |

The window is short. If you miss it, toggle back on and try again.

### 2. The line under the badge

During that same window, the appliance line should **keep naming the appliance**.
It must not read "No appliance detected yet" while watts are still flowing —
that was the same bug one row down.

### 3. "Switching on…"

Switch the outlet **on** with the appliance plugged in but the relay not yet
closed. Expect `Switching on…`, then `Drawing power`.

⚠️ If the appliance is unplugged, expect `Switching on…` then `On, idle` — both
correct.

### 4. Analytics agrees

Repeat step 1 with **Analytics → Right now** open. The appliance row should show
the same `Switching off…`, and:

- **"Drawing … W combined" must not read 0.0** while the fan still runs. That
  number went to zero during this window, and took the per-hour cost with it.
- The banner **"switched on but drawing nothing" must not appear** during a
  switching-on window.

---

## Phase 2 — Peak power

### 5. The peak is visible while the device is online

Run the fan a minute, switch it off, go to **Analytics → Daily**.

| Expect | Not |
|---|---|
| `Peak power` showing the day's high (~56 W) | `Drawing now` |
| caption `Highest so far today` | `0.0 W` |

The number should **stay** after the outlet is off. This is the fix for "I can't
see peak power" — previously it only appeared once telemetry went stale.

### 6. History agrees

**History** → today's row → the **Peak** column should show the same number, not
a dash and not the instantaneous draw.

---

## Phase 3 — Appliance identity (needs the 230–500 W load)

### 7. ⭐ Unsupported

Plug the 230–500 W appliance into a **freshly switched-on** outlet and let it run
~1 minute.

| Expect | Not |
|---|---|
| `Not something WattWise monitors` | `Detecting…` forever |
| footer says usage and cost are still recorded | a suggestion with an Accept button |

**This is the one to report if it fails.** Before this shipped, a 300 W load was
confidently named "Game Console" at 41%.

### 8. The swap hint

With a **known appliance running** (fan, named and learned), swap it for a
different one **without switching the outlet off**.

Expect `Not <old name>` plus an amber box:

> Different appliance detected. Switch this outlet off and on to measure it on
> its own — otherwise this reading still includes the last one.

Then follow its advice — switch off, switch on — and confirm the next suggestion
is sensible. Before, a steady fan came back as "Speaker @ 84%" because the run
still contained the lamp.

### 9. More prompts than before

Suggestion prompts now also appear on outlets whose name has no learned signature
behind it. **This is a fix, not a regression** — forgetting a signature used to
strand an outlet with a wrong name and no way to correct it.

---

## Phase 4 — Regression

### 10. Nothing blanked

Visit **every** page: Dashboard, Analytics, History, Compare, Budget, Safety,
Settings. A blank panel with a red console error is the failure mode that shipped
once already.

### 11. Rename still works

**Settings → Learned appliances → Rename.** Confirm the outlet wearing that name
follows it.

---

## Don't chase

| Looks wrong | Actually |
|---|---|
| `Switching…` never appears | The relay beat the round trip. Only a real disagreement sets it. |
| Peak hour missing for today | Deliberate — the nightly rollup fills it in. |
| Analytics has no "Drawing now" tile | Removed on purpose; the Dashboard shows it three times. |
| Outlet 2 says "No appliance detected yet" | Correct when nothing is plugged in. |
| Email header shows ⚡ instead of the mark | Phone-side redeploy, unrelated. |

---

# Round 2 — load testing with real appliances

**2026-08-13.** The first run against genuine current draw. Everything before
this was verified on a near-idle device, which means the paths that only exist
under load — stage escalation, auto-cutoff, rollup pricing — have never
executed with real numbers.

Run the phases in order; each assumes the one before it passed.

### Before you start

- **Hard-refresh `www.wattwise.site`** (**Ctrl+Shift+R**). Yesterday's bundle
  may still be cached, and every UI check below is against the new one.
- ESP32 powered and reporting.
- **Rebuild and reinstall the phone app first** — see step 11 for why the bill
  check fails without it.
- Browser console open (**F12** → Console). Several of these fail silently in
  the UI and say so only there.

---

## Phase 1 — Baseline

### 1. Live telemetry

Sit on the Dashboard and touch nothing.

- **Pass:** wattage changes on its own.
- **Fail:** frozen numbers → `onSnapshot` is down, and nothing below this line
  means anything until it is fixed.

### 2. ⭐ Power Safety shows real readings

**The highest-value check of the day.** This page shipped last night and has
never once been observed working. Every previous look at it happened while the
device was quiet, so the only state anyone has seen is `—`.

- **Pass:** real V / A / W with green "Normal" chips.
- **Fail:** still `—` while the Dashboard shows live data → the 12-second
  freshness window is wrong, and the page is now hiding readings that exist.

Expect the numbers to **step every ~15 s** rather than flow. That is correct —
see the don't-chase list.

### 3. Cross-client toggle

Toggle **Outlet 1** from the browser.

- **Pass:** the switch moves instantly, the relay clicks within 1–3 s, the phone
  follows within about a second of the relay.
- This is the check that proves the premise of the whole project.

---

## Phase 2 — Last night's UI, on real data

### 4. Compare Months

Drag the **August** chip into the **left** slot.

- **Pass:** the rail assigns it, and the PELCO III bill check reappears below.
- The bill check only ever grades whichever month sits in **Month**, so with
  August on the right it stays hidden. That is inherited behaviour, not a rail
  bug.

### 5. Analytics width

Monthly tab.

- **Pass:** noticeably wider and taller than the Power Safety page — Analytics
  and Compare Months are capped at 1680px, everything else at 1400px.

---

## Phase 3 — Safety stages

**Do not test these by adding load.** Lower the threshold instead. It is the
same code path, and trying to trip a 500 W limit with real appliances means
deliberately pushing heavy current through the setup to learn nothing extra.

### 6. Setup

Plug the fan into Outlet 1, let the reading settle, and **note its actual draw**
— call it `D`. Auto cut-off **on**.

### 7. Walk the ladder

Stages are **ratio-based**, not absolute, so one threshold will not produce the
sequence. `stageFromRatio` in `functions/src/lib/powerSafety.js`:

| Stage | Fires at | Threshold to set for a draw of `D` | 45 W fan |
|---|---|---|---|
| ⚠️ Power Warning | ratio ≥ **0.80** | `D / 0.8` | **56 W** |
| ⚡ Safety Limit Reached | ratio ≥ **0.95** | `D / 0.95` | **47 W** |
| 🔴 Auto-Cutoff | ratio ≥ **1.00** | just under `D` | **44 W** |

Step the threshold **down** through those three values, pausing at each for the
stage to settle.

A single 40 W max against a 45 W fan is ratio 1.125 — it jumps **straight to
cutoff** and you never see the two stages in between.

- **Pass:** each stage announces itself, and 🔴 opens the relay.
- **You have never seen 🔴.** Cut-off is a separate stage from "limit reached",
  which is why the two carry different icons.
- Over-**voltage** escalates to `limit` and never to `cutoff`, deliberately: a
  supply problem is not fixed by switching the load off.

---

## Phase 4 — ⭐ The cross-repo fix

The bug that spanned both projects. Only two clients can prove it.

### 8. Alert history survives the phone app

With an alert showing on the web, **open the phone app**, then return and reload
Power Safety.

- **Pass:** the history is still there.
- **Fail:** empty → the phone's `initializePowerSafety` fix did not make it into
  the installed build.

### 9. No phantom "Back to Normal"

With the device sitting at **limit**, open the phone app.

- **Pass:** no "Back to Normal" alert, and **no email**.
- **Fail:** a phantom one arrives → `currentStage` is still being reset on
  launch, which is the louder half of the same bug.

---

## Phase 5 — Load and money

### 10. Rollups under real usage

Run an appliance for 30+ minutes.

- **Pass:** kWh accumulates on Analytics and the cost tracks it.

### 11. Bill parity — rebuild the phone first

**This will fail against a stale APK, and that failure is not billing.js
diverging.**

`comparisonHelpers.js` was re-synced here at `4e2d8da`, which stopped
`summarizeDailyEntries` from summing stored daily costs. An installed build
predating that commit still sums them, drops the once-a-month ₱5.00 metering
charge, and reads **₱5.60 low**. Rebuild and reinstall before comparing.

- **Pass:** web and phone agree **to the centavo**.
- **Fail after a rebuild:** then it is a real divergence — `billing.js` exists
  in three copies that must agree.

### 12. Budget threshold

- **Pass:** the notification fires and appears on both clients.

---

## Don't chase these — all correct

| Looks wrong | Why it isn't |
|---|---|
| Power Safety readings step every ~15 s while the Dashboard flows | `READING_WRITE_INTERVAL_MS` — the safety document persists readings at most every 15 s, because writing per telemetry post would re-fire `handleSafetyAlerts` once a second |
| Settings says "Online", Analytics says "not reporting" | Health tracks *command polling*; Analytics tracks *telemetry*. Both true |
| 240 V with 0.00 A while the relay is off | The PZEM sits on the mains side. A real measurement |
| Auto-cutoff does not fire at "Limit Reached" | Cut-off is the next stage up, at ratio ≥ 1.0 |
| Per-day costs smaller than they used to be | Daily costs are marginal now; the metering charge belongs to the month |
| History rows from before the deploy keep inflated costs | They were written under the old maths and are not rewritten |
| Power Safety shows `—` | Correct whenever the device is genuinely quiet |
| Emails show ⚡ instead of the bolt mark | `MAIL_LOGO_URL` is set in `functions/.env` but the deployed revision predates it. Cosmetic, and the fallback is deliberate — redeploy functions to fix |
| `usePowerSafety.js` differs from the phone | The documented §22 divergence: 12 s here on `metricsUpdatedAtMs`, 40 s there on `lastReadingWriteMs` |

---

# Round 1 — the six untested paths

**Closed 2026-08-12. All six passed.** Order was from `FROM-THE-PHONE-REPO.md`
§22 — 1 proves the premise of the project, 6 only matters after something else
has already broken.

---

## 1. Cross-client toggle

*Proves the premise: two clients, one backend, hardware that cannot tell them
apart.*

1. Dashboard. Note which way **Outlet 1** is set.
2. Click its switch.
3. Watch three things **in this order**:

| # | Expect | Timing |
|---|---|---|
| a | The switch moves | **Instant** — before any network call |
| b | The physical relay clicks | 1–3 s |
| c | The phone app follows | Within ~1 s of the relay |

**Pass:** all three, in that order.

**Fail — and what each one means:**

- **Switch snaps back within a second** → the `pendingStatus` guard. Telemetry
  overwrote the new status before the ESP32 collected its command.
- **Switch stays, relay never moves** → the command is not reaching the device.
  Check `users/{uid}/device_commands` in the Firestore console for a doc stuck
  unacked, and Settings → *Last command ack*.
- **Relay moves, phone does not follow** → phone-side listener. Not a web bug.
- **A red banner appears under the cards** → the callable itself failed; the
  message is the reason.

4. Repeat from the phone, watching the browser. Same three, reversed.

> Both outlet cards disable while either is toggling. If Outlet 2 ignores you
> immediately after Outlet 1, that is the guard, not a fault.

---

## 2. Saving safety thresholds from the web

*Writes the document auto-cutoff reads. That trigger is live now, so a bad write
has real consequences.*

1. **Power Safety** → **Edit**.
2. Note the current four numbers **on paper** before changing anything.
3. Set **Voltage max** to `260`, leave the rest. Save.
4. **Expect:** modal closes, the Thresholds panel reads `200 – 260 V`.
5. Confirm on the phone — Power Safety there should show 260 too.
6. **Set it back to what you wrote down.** Do not leave a test value in place.

**Also test the rejection path** (this is the bit that has never run):

7. Reopen **Edit**, set **Voltage min** to `300` and max to `250`. Save.
8. **Expect:** red banner, *"Minimum voltage must be below the maximum."*, modal
   stays open, nothing written.
9. Correct the minimum. **The banner should vanish as you type** — that is the
   clear-on-edit fix. If it lingers until you press Save, that is a fail.
10. Cancel out.

**Pass:** valid save reaches the phone; invalid save is refused; banner clears
on edit.

---

## 3. Creating a schedule from the web

*Writes a document the firmware acts on. Never run.*

1. **Schedule** → create one for **Outlet 2**, action **ON**, at a clock time
   **3–4 minutes from now**. Save.
2. **Expect:** it appears in the list, marked active, with the right time.
3. Check the phone — the same schedule should be listed.
4. Switch Outlet 2 **OFF** by hand.
5. **Wait for the scheduled minute with the hardware in sight.**

**Pass:** the relay switches ON within ~a minute of the scheduled time, and the
Dashboard follows.

**Fail:** nothing happens at the scheduled time. Note whether the schedule still
shows *active* and whether `lastTriggered` ever set — that separates "the
firmware never acted" from "it acted and did not report".

6. Delete the test schedule.

---

## 4. Bill to the centavo

*The arithmetic is under test from the phone repo. What is untested is whether
both clients feed it the same input.*

1. Web → **Analytics** → **Monthly**. Write down **Cost** to the centavo.
2. Phone → the same month.
3. Compare.

**Pass:** identical, to the last centavo.

**Fail — check in this order, it narrows fastest:**

1. **Do the kWh figures match?** If not, the divergence is in the energy data,
   not the tariff — stop here and say so.
2. If kWh match but pesos do not, compare the **Block 1 generation rate** in web
   Settings against the phone's. A different stored rate produces a different
   bill from identical energy.
3. Only if both match is it the maths — and the phone repo's parity suite says
   that is green, so report it rather than editing `billing.js`.

> **Budget vs Analytics may still disagree** until the corrected rollup has run.
> Analytics is the correct one. That is a known backend issue, not this test.

---

## 5. Entering a past bill

*`reference_comparison`. Never run.*

1. **Compare Months** → add a previous bill. Use a real one off paper if you
   have it; otherwise a made-up month you will delete.
2. Save.
3. **Expect:** it appears in the comparison immediately.
4. Reload the page (**F5**) — it should still be there. That is the difference
   between "rendered locally" and "actually written".
5. Check the phone shows it too.
6. Delete it if it was invented.

---

## 6. ErrorBoundary

*Never thrown at. Last on purpose — it only matters after something else has
already broken.*

This one needs a code change, so leave it until the other five are done, and
tell me when you want it — I will add the throw and remove it after.

The sequence, for the record:

1. `throw new Error('boundary check');` as the first line of the `BudgetPage`
   component body.
2. `npm run dev`, sign in, open **Budget**.
3. **Expect:** the fallback card *and a working sidebar*.
4. Click **Dashboard**. **Expect:** it recovers with no reload — that is the
   `pathname` key, and it is the difference between "an error page appears" and
   "the user can get out".
5. Revert.

---

## Reporting a failure

For any of the six, the three things that make it diagnosable:

1. **Which step number**, and what you saw instead.
2. **Anything in the browser console** — especially lines starting `[auth/action]`
   or `Outlet subscription error`.
3. **Whether the phone agrees.** Web-and-phone-both-wrong is a backend problem;
   web-only-wrong is mine.
