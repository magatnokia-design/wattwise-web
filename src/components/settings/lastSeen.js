/**
 * "Recognised on Outlet 2 · 8:37 AM", "· Yesterday", "· Oct 19" - when a saved
 * appliance was last matched (users/{uid}.applianceLastSeen, written once per
 * run by updateOutletMetrics). Proof that saving an appliance does something.
 * Same wording as the phone's Settings (Oct 2026).
 *
 * @param {{atMs: number, outlet: number|null}|null} lastSeen
 * @param {number} [nowMs]
 */
export const formatLastSeen = (lastSeen, nowMs = Date.now()) => {
  if (!lastSeen?.atMs) return 'Not recognised yet';
  const at = new Date(lastSeen.atMs);
  const today = new Date(nowMs);
  const yesterday = new Date(nowMs - 86400000);
  const sameDay = (a, b) => a.toDateString() === b.toDateString();
  const when = sameDay(at, today)
    ? at.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
    : sameDay(at, yesterday)
      ? 'Yesterday'
      : at.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  return lastSeen.outlet
    ? `Recognised on Outlet ${lastSeen.outlet} · ${when}`
    : `Recognised · ${when}`;
};
