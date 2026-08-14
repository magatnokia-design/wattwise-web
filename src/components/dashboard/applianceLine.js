/*
 * What the outlet card says is plugged into it.
 *
 * Extracted from OutletCard.jsx and kept free of JSX so `node --test` can reach
 * it. That is worth doing here more than anywhere else in this repo: every
 * user-visible bug on the Dashboard has been this one line asserting something
 * the measurements did not support.
 *
 *   "Electric Fan" under an outlet that was switched off
 *   "Electric Fan" flashed for seconds before the detector had placed anything
 *   "Not Speaker" one second after the user chose Speaker
 *   "Nokia's Fan" over a 345 W hair dryer, for a minute
 *
 * Each was a different branch getting the same thing wrong: reporting a
 * conclusion drawn from evidence that was not about the load in front of it.
 */

/**
 * @param {object} args
 * @param {boolean} args.isDrawing  Real power above the floor. The meter decides.
 *   Supplied by `useOutletControl`'s `hasLoad`, which is power-only since the
 *   phone's b90e529. This file used to re-derive it, purely because that hook
 *   also accepted `current >= 0.01 A` as evidence of a load and this meter's
 *   residual on a switched-off outlet is 0.02 A at 0.0 W. Fixed upstream and
 *   re-synced, so there is no longer anything to work around.
 * @param {boolean} args.telemetryFresh  Readings arriving inside the 12 s window.
 * @param {string}  args.applianceName  The name stored on the outlet.
 * @param {object|null} args.identity   Raw `applianceIdentity` from the document.
 * @returns {{ text: string, tone: 'idle'|'unsupported'|'changed'|'named' }}
 */
export const resolveApplianceLine = ({ isDrawing, telemetryFresh, applianceName, identity }) => {
  const name = String(applianceName || '').trim();

  /*
   * No readings, so nothing below is currently knowable.
   *
   * Both inputs freeze at the last snapshot when the ESP32 stops posting -
   * `hasLoad` is computed inside the snapshot handler and `applianceIdentity`
   * arrives with it - so without this the line went on reading "Nokia's Fan -
   * recognised" indefinitely, asserting a live recognised load from readings
   * minutes old. Falling through to "No appliance detected yet" would be no
   * better: that is a positive claim the outlet is empty, the same mistake
   * pointed the other way.
   */
  if (telemetryFresh === false) {
    return { text: 'No recent readings', tone: 'idle' };
  }

  // Nothing is drawing, so there is nothing to report. The absence of a
  // detection is not a fact about an appliance, and the stored name is not
  // evidence that it is the thing plugged in right now.
  if (!isDrawing) {
    return { text: 'No appliance detected yet', tone: 'idle' };
  }

  const hasIdentity = typeof identity?.state === 'string';

  /*
   * No verdict while something is drawing means the detector has not placed
   * this run yet — and that is a positive signal, not missing data.
   *
   * updateOutletMetrics *deletes* applianceIdentity the moment a run starts,
   * precisely so a previous run's "confirmed" cannot vouch for whatever got
   * plugged in next. This used to fall back to the stored name for documents
   * predating the field, which meant the one branch written for old data fired
   * exactly when the backend was signalling that it knew nothing yet: a 345 W
   * hair dryer read "Nokia's Fan" for a minute, because a 58 W fan had been
   * confirmed on the previous run.
   *
   * The fallback is not merely wrong here, it is unreachable when correct: an
   * outlet with a genuinely old document is not drawing under the current
   * build, and if it is drawing then updateOutletMetrics is writing the current
   * shape right now.
   */
  if (!hasIdentity) {
    return { text: 'Detecting…', tone: 'idle' };
  }

  /*
   * Measured, scored against every profile, matched by none — a load outside
   * what this system monitors.
   *
   * Outranks `changed`: both say the stored name is wrong, but only this one
   * says why, and "Not Speaker" invites the user to pick a replacement that
   * does not exist in the catalogue.
   */
  if (identity.unsupported === true) {
    return { text: 'Not something WattWise monitors', tone: 'unsupported' };
  }

  /*
   * A verdict is only about the name it was computed against. Accepting a
   * suggestion renames the outlet immediately, but the stored verdict still
   * describes the *old* name until the next evaluation — which is what briefly
   * rendered "Not Speaker" one second after choosing Speaker.
   */
  const isAboutCurrentName =
    String(identity.namedAs || '').trim().toLowerCase() === name.toLowerCase();

  if (!isAboutCurrentName) {
    return { text: 'Detecting…', tone: 'idle' };
  }

  if (identity.state === 'changed' && name) {
    return { text: `Not ${name}`, tone: 'changed' };
  }

  if (identity.state === 'confirmed' && name) {
    return {
      text: identity.recognised ? `${name} · recognised` : name,
      tone: 'named',
    };
  }

  return { text: 'Detecting…', tone: 'idle' };
};
