import test from 'node:test';
import assert from 'node:assert/strict';
import {
  previousWindow,
  sumKwh,
  periodChange,
  buildAnalyticsInsights,
} from '../src/utils/analyticsInsights.js';

test('the previous period matches the tab', () => {
  assert.deepEqual(previousWindow('Daily', '2026-10-23'), { startDate: '2026-10-22', endDate: '2026-10-22', label: 'yesterday' });
  assert.deepEqual(previousWindow('Weekly', '2026-10-23'), { startDate: '2026-10-10', endDate: '2026-10-16', label: 'the 7 days before' });
  // The same stretch of last month, not all of it.
  assert.deepEqual(previousWindow('Monthly', '2026-10-23'), { startDate: '2026-09-01', endDate: '2026-09-23', label: 'the same days last month' });
  // Clamped to a shorter month, and across a year.
  assert.equal(previousWindow('Monthly', '2026-03-31').endDate, '2026-02-28');
  assert.equal(previousWindow('Monthly', '2027-01-15').startDate, '2026-12-01');
});

test('kWh adds either row shape; a change needs a previous period', () => {
  assert.equal(sumKwh([{ outlet1Energy: 1, outlet2Energy: 0.5 }, { totalEnergy: 2 }]), 3.5);
  assert.equal(periodChange(3, 0), null);
  assert.deepEqual(periodChange(3, 2), { previousKwh: 2, percent: 50 });
});

test('findings come from the figures, and none when nothing was used', () => {
  assert.deepEqual(buildAnalyticsInsights({ tab: 'Weekly', summary: { totalEnergy: 0 } }), []);

  const series = [0.2, 0.2, 1.4, 0, 0.2, 0.2, 0.2].map((total, i) => ({ total, label: String(i), fullLabel: `Oct ${10 + i}` }));
  const lines = buildAnalyticsInsights({
    tab: 'Weekly',
    summary: {
      totalEnergy: 2.4,
      outlet1Total: 0.4,
      outlet2Total: 2.0,
      peakPowerW: 312,
      applianceUsage: [{ applianceName: 'Hairdryer', energyKwh: 1.2 }, { applianceName: 'Fan', energyKwh: 0.8 }],
    },
    series,
    change: { percent: 12 },
    previousLabel: 'the 7 days before',
  }).map((line) => line.text);

  assert.ok(lines.includes('12% more energy than the 7 days before.'));
  assert.ok(lines.includes('Outlet 2 used 83% of the energy.'));
  assert.ok(lines.includes('Hairdryer was the biggest user - 50% of the energy.'));
  assert.ok(lines.some((text) => text.startsWith('Oct 12 was the busiest day')));
  assert.ok(lines.includes('1 of 7 days used nothing.'));
  assert.ok(lines.includes('Highest draw: 312 W.'));
});
