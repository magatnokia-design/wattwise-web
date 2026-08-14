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
export const CutoffNotice = ({ outlets }) => {
  /*
   * Dismissal is by timestamp rather than useDismissibleNotice, which stores a
   * permanent flag per key: a cutoff is an event, not a standing notice, so
   * dismissing this one must not suppress the next. Deliberately not persisted
   * either — after a reload, "this outlet was cut off" is exactly what you want
   * to be told again.
   */
  const [dismissedThroughMs, setDismissedThroughMs] = useState(0);

  const events = collectCutoffEvents(outlets, Date.now()).filter(
    (event) => event.atMs > dismissedThroughMs
  );

  if (events.length === 0) return null;

  const newestMs = events[0].atMs;

  return (
    <>
      {events.map((event) => (
        <Banner
          key={event.key}
          tone="alert"
          title={
            event.live
              ? `${event.label} is over the ${formatWatts(event.limitW)} W limit`
              : event.scope === 'combined'
                ? 'Both outlets went over the combined limit'
                : `${event.label} was switched off automatically`
          }
          action={
            <Button size="sm" variant="secondary" onClick={() => setDismissedThroughMs(newestMs)}>
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
          {event.live ? (
            <>The ESP32 opens the relay itself a few seconds after the limit is passed.</>
          ) : (
            <>
              The ESP32 did this on its own — the cutoff runs on the device and does not wait
              on the network. Unplug or swap the appliance before switching the outlet back on.
            </>
          )}
        </Banner>
      ))}
    </>
  );
};

export default CutoffNotice;
