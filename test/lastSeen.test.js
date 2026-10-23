import test from 'node:test';
import assert from 'node:assert/strict';
import { formatLastSeen } from '../src/components/settings/lastSeen.js';

const NOW = new Date(2026, 9, 23, 10, 0).getTime();

test('never recognised says so', () => {
  assert.equal(formatLastSeen(null, NOW), 'Not recognised yet');
  assert.equal(formatLastSeen({ atMs: 0, outlet: 1 }, NOW), 'Not recognised yet');
});

test('today shows the time and the outlet', () => {
  const text = formatLastSeen({ atMs: new Date(2026, 9, 23, 8, 37).getTime(), outlet: 2 }, NOW);
  assert.match(text, /^Recognised on Outlet 2 · /);
  assert.match(text, /8:37/);
});

test('yesterday and older read as a day', () => {
  assert.equal(
    formatLastSeen({ atMs: new Date(2026, 9, 22, 21, 0).getTime(), outlet: 1 }, NOW),
    'Recognised on Outlet 1 · Yesterday'
  );
  assert.match(formatLastSeen({ atMs: new Date(2026, 9, 19, 9, 0).getTime(), outlet: null }, NOW), /^Recognised · /);
});
