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

const toMs = (value) => {
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

    const atMs = toMs(outlet?.safety?.overPowerAtMs);
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
    const atMs = toMs(outlet?.safety?.totalOverPowerAtMs);
    return atMs > toMs(newest?.safety?.totalOverPowerAtMs) ? outlet : newest;
  }, null);

  const combinedAtMs = toMs(newestCombined?.safety?.totalOverPowerAtMs);
  const combinedSettled = newestCombined?.safety?.totalOverPower !== true;
  if (combinedSettled && combinedAtMs && nowMs - combinedAtMs <= RECENT_WINDOW_MS) {
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
