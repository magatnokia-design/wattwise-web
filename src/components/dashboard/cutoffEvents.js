/*
 * Which over-power events are worth telling the user about, and how to phrase
 * the numbers. Kept apart from CutoffNotice.jsx so it can be tested directly —
 * the JSX around it needs a transform that `node --test` does not have.
 *
 * Source is `users/{uid}/outlets/{outletId}.safety`, written by
 * updateOutletMetrics. Nothing here reads Firestore itself.
 */

// Long enough to still be on screen when someone comes back to the tab after an
// outlet dropped; short enough that it is never reporting old news. A cutoff
// nobody saw within a quarter of an hour is history, and History has it.
export const RECENT_WINDOW_MS = 15 * 60 * 1000;

// Positive finite value or 0. Used for both epoch milliseconds and wattages —
// same coercion, and naming it for one of them made the other read as a bug.
const toPositiveNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

export const formatWatts = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed.toFixed(1) : '0.0';
};

export const formatClock = (ms) =>
  new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

/**
 * Both the per-outlet and the combined breach, newest first.
 *
 * The combined fields are written identically onto *both* outlet documents, so
 * they are collapsed to a single event rather than reported twice — which is the
 * whole reason this is not just a filter over the outlets array.
 */
export const collectCutoffEvents = (outlets, nowMs) => {
  const list = Array.isArray(outlets) ? outlets : [];
  const events = [];

  list.forEach((outlet) => {
    // Only settled breaches are reported.
    //
    // updateOutletMetrics writes `overPowerAtMs: isOverPower ? now : previous`,
    // so while the breach is live that timestamp is rewritten on EVERY telemetry
    // post - roughly once a second. Reporting it then gives every post a new
    // identity, and since dismissal is by timestamp the banner reappeared within
    // a second of being dismissed. Waiting for `overPower` to go false freezes
    // the timestamp at the moment of the cut, which is the number worth showing
    // anyway. The firmware's grace is 3 seconds, so nothing is lost but noise.
    if (outlet?.safety?.overPower === true) return;

    const atMs = toPositiveNumber(outlet?.safety?.overPowerAtMs);
    if (!atMs || nowMs - atMs > RECENT_WINDOW_MS) return;

    events.push({
      key: `outlet-${outlet.outletNumber}-${atMs}`,
      atMs,
      scope: 'outlet',
      label: `Outlet ${outlet.outletNumber}`,
      drawW: outlet?.safety?.overPowerW,
      limitW: outlet?.safety?.limitW,
    });
  });

  const newestCombined = list.reduce((newest, outlet) => {
    const atMs = toPositiveNumber(outlet?.safety?.totalOverPowerAtMs);
    return atMs > toPositiveNumber(newest?.safety?.totalOverPowerAtMs) ? outlet : newest;
  }, null);

  const combinedAtMs = toPositiveNumber(newestCombined?.safety?.totalOverPowerAtMs);
  const combinedSettled = newestCombined?.safety?.totalOverPower !== true;

  /*
   * A combined breach one outlet caused on its own is not a second event.
   *
   * Observed on hardware: outlet 1 drew 1368.8 W with outlet 2 at 0.00 A, and
   * this reported both a per-outlet breach and "Both outlets went over the
   * combined limit — they drew 1368.8 W together". The second banner is not
   * merely redundant, it is false: outlet 2 drew nothing, so there is no "both"
   * and no "together". One outlet over 1000 W trips the combined ceiling as a
   * matter of arithmetic, not as a separate thing that happened.
   *
   * The backend already agrees — it raised one notification, "Outlet
   * Over-Power Cutoff · Outlet 1", and no combined one. This is the same rule
   * the phone applied to `source: 'device'`: a single failure reported twice
   * under two names is worse than reporting it once.
   *
   * Kept when no single outlet accounts for it, e.g. 450 W plus 600 W. Then the
   * combined limit is a genuinely separate fact about the pair, and the wording
   * is true.
   */
  const combinedLimitW = toPositiveNumber(newestCombined?.safety?.totalLimitW);
  const causedByOneOutlet = list.some(
    (outlet) => combinedLimitW > 0 && toPositiveNumber(outlet?.safety?.overPowerW) >= combinedLimitW
  );

  if (combinedSettled && combinedAtMs && !causedByOneOutlet
    && nowMs - combinedAtMs <= RECENT_WINDOW_MS) {
    events.push({
      key: `combined-${combinedAtMs}`,
      atMs: combinedAtMs,
      scope: 'combined',
      label: 'Both outlets together',
      drawW: newestCombined?.safety?.totalOverPowerW,
      limitW: newestCombined?.safety?.totalLimitW,
    });
  }

  return events.sort((a, b) => b.atMs - a.atMs);
};
