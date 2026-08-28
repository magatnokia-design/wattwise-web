/**
 * Collapsing runs of identical security entries for display.
 *
 * The log records one event per refused request, which is right for an audit
 * trail and wrong for a page someone reads. A device holding a stale token
 * retries every 1.2 seconds, so a token rotation that takes ten minutes to
 * finish writes hundreds of `device_auth_failed` entries describing a single
 * situation - and one card each buries every other event on the account under a
 * wall of identical amber boxes.
 *
 * This lives beside the card rather than in `utils/securityActivity.js` on
 * purpose. That helper is duplicated verbatim with the phone repo and decides
 * what an event MEANS, which must not drift between clients. How many rows a
 * page draws is a property of the page, and the phone shows this list in a
 * bounded modal where the problem does not arise.
 */

/** How many groups to show before the rest have to be asked for. */
export const INITIAL_VISIBLE = 5;

/**
 * Folds CONSECUTIVE entries of the same type and unit into one row.
 *
 * Only consecutive ones: a run broken by a different event stays broken,
 * because "these happened together" is the thing worth showing and stitching
 * across a gap would fake it.
 *
 * Nothing is dropped. The count and the span of the run are both carried, so a
 * collapsed row states strictly more than the first card of that run did.
 *
 * Expects rows newest-first, as `securityService` returns them (`orderBy('at',
 * 'desc')`), which is why each further match extends `oldestWhen`.
 */
export const groupSecurityRows = (rows = []) => {
  const groups = [];

  rows.forEach((row) => {
    const previous = groups[groups.length - 1];

    if (previous && previous.type === row.type && previous.deviceId === row.deviceId) {
      previous.count += 1;
      previous.oldestWhen = row.when;
      return;
    }

    groups.push({ ...row, count: 1, oldestWhen: row.when });
  });

  return groups;
};

/**
 * "23 times, from 22 minutes ago to 2 minutes ago", or the short form when the
 * whole run falls inside one relative-time bucket.
 *
 * Empty string for a single event: a run of one is just the event, and saying
 * "1 times" would be noise on every ordinary row.
 */
export const describeRun = (group) => {
  if (!group || group.count < 2) return '';

  if (!group.oldestWhen || group.oldestWhen === group.when) {
    return `${group.count} times, ${group.when}`;
  }

  return `${group.count} times, from ${group.oldestWhen} to ${group.when}`;
};
