import { useState } from 'react';
import { Banner } from '../ui/Feedback';
import { Button } from '../ui/Button';
import { collectCutoffEvents, formatWatts, formatClock } from './cutoffEvents';

/*
 * Why an outlet is off.
 *
 * The over-power cutoff is enforced on the ESP32 itself, so an outlet can switch
 * off with nothing on screen having asked for it. When that happened on a 1028 W
 * iron the Dashboard showed "Off" beside a live 1030 W and said nothing else —
 * the only explanation was on the Notifications page, which is not where anyone
 * looks when an outlet has just died.
 *
 * Everything rendered here is already on the outlet document under `safety`, so
 * this needs no backend change and no extra read: DashboardPage is subscribed to
 * those documents already.
 */
/*
 * Dismissal is by timestamp rather than useDismissibleNotice, whose flag is
 * permanent per key: a cutoff is an event, not a standing notice, so dismissing
 * one must not suppress the next.
 *
 * It IS persisted, which reverses what this file said when it shipped. The
 * reasoning then was that after a reload you would want to be told again. In
 * practice the component remounts whenever DashboardPage drops to its loading
 * spinner — which happens on any telemetry gap — and each remount resurrected a
 * banner the user had already dismissed. A dismissal is a decision, and losing
 * it because the hardware went quiet for a moment is worse than the reload case
 * it was protecting.
 */
const STORAGE_KEY = 'wattwise_cutoff_dismissed_through_ms';

const readDismissedThroughMs = () => {
  try {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  } catch {
    // Storage blocked (private mode, third-party cookie rules). Failing open
    // shows the banner, which is the safer direction for a safety notice.
    return 0;
  }
};

export const CutoffNotice = ({ outlets }) => {
  const [dismissedThroughMs, setDismissedThroughMs] = useState(readDismissedThroughMs);

  const dismissThrough = (ms) => {
    setDismissedThroughMs(ms);
    try {
      window.localStorage.setItem(STORAGE_KEY, String(ms));
    } catch {
      // Dismissed for this mount either way.
    }
  };

  const events = collectCutoffEvents(outlets, Date.now()).filter(
    (event) => event.atMs > dismissedThroughMs
  );

  if (events.length === 0) return null;

  // Both banners describe one incident, so Dismiss on either clears both.
  const newestMs = events[0].atMs;

  return (
    <>
      {events.map((event) => (
        <Banner
          key={event.key}
          tone="alert"
          title={
            event.scope === 'combined'
              ? 'Both outlets went over the combined limit'
              : `${event.label} was switched off automatically`
          }
          action={
            <Button size="sm" variant="secondary" onClick={() => dismissThrough(newestMs)}>
              Dismiss
            </Button>
          }
        >
          {event.scope === 'combined' ? (
            <>
              They drew <strong>{formatWatts(event.drawW)} W</strong> together, over the{' '}
              {formatWatts(event.limitW)} W ceiling for both outlets at once, at{' '}
              {formatClock(event.atMs)}.
            </>
          ) : (
            <>
              It drew <strong>{formatWatts(event.drawW)} W</strong>, over the{' '}
              {formatWatts(event.limitW)} W limit for one outlet, at {formatClock(event.atMs)}.
            </>
          )}{' '}
          The ESP32 did this on its own — the cutoff runs on the device and does not wait on
          the network. Unplug or swap the appliance before switching the outlet back on.
        </Banner>
      ))}
    </>
  );
};

export default CutoffNotice;
