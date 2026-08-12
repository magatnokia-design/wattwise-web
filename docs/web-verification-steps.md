# Web verification — the six untested paths

Companion to `C:\App\WattWise\docs\cross-client-verification.md`. That file owns
the two cross-client checks; this one owns the web side and the four web-only
paths nobody has run.

Order is from `FROM-THE-PHONE-REPO.md` §22 and is not arbitrary — 1 proves the
premise of the project, 6 only matters after something else has already broken.

**Before you start.** Sign in at `www.wattwise.site`, ESP32 powered, phone app
open beside you. Open the browser console (**F12** → Console) and leave it open
for all six — three of these fail silently in the UI and say so only there.

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
