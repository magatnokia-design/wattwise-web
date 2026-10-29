import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLiveOutlets } from '../hooks/useLiveOutlets';
import { useApplianceCosts } from '../screens/ApplianceCosts/hooks/useApplianceCosts';
import { formatCurrency } from '../screens/BudgetTracking/utils/budgetHelpers';
import {
  costPerHour,
  describeApplianceDraw,
  formatHours,
  projectApplianceCost,
} from '../utils/applianceCost';
import { Card } from '../components/ui/Card';
import { OfflineState, Spinner } from '../components/ui/Feedback';
import { TextField } from '../components/ui/Field';
import { Section } from '../components/ui/ListSection';
import costStyles from './ApplianceCostsPage.module.css';
import styles from './page.module.css';

/**
 * Appliance costs (Oct 2026) - the web side of the phone's screen: what each
 * saved appliance costs an hour, and a "what would it cost?" calculator.
 *
 * Every figure here is a projection at the user's own rates, labelled so, and
 * display only. What appliances actually cost over a period is the Analytics
 * page's Appliance costs block, split from measured energy.
 */

const OTHER_KEY = '__other__';
const MAX_WATTS = 5000;

const formatRate = (value) => `₱${Number(value || 0).toFixed(2)}`;

const formatWatts = (draw) => (draw.varies
  ? `${Math.round(draw.minWatts)}–${Math.round(draw.maxWatts)} W`
  : `${draw.watts.toFixed(draw.watts < 10 ? 1 : 0)} W`);

const formatPerHour = (draw, rate) => (draw.varies
  ? `${formatRate(costPerHour(draw.minWatts, rate))}–${formatRate(costPerHour(draw.maxWatts, rate))}`
  : formatRate(costPerHour(draw.watts, rate)));

// A blank field is "not entered", not zero, so it never prints as P0.00.
const parseField = (text) => {
  const trimmed = String(text || '').trim();
  if (!trimmed) return null;
  const value = Number(trimmed.replace(',', '.'));
  return Number.isFinite(value) ? value : NaN;
};

export const ApplianceCostsPage = () => {
  const { user } = useAuth();
  const { outlets, rateProfileId, supplyRates } = useLiveOutlets();
  const {
    loading,
    ratePerKwh,
    savedAppliances,
    measuredByName,
    measuredWindowDays,
    showOfflineState,
    retry,
  } = useApplianceCosts({ userId: user?.uid, outlets, rateProfileId, supplyRates });

  const [selectedKey, setSelectedKey] = useState(null);
  const [wattsText, setWattsText] = useState('');
  const [hoursText, setHoursText] = useState('');
  const [daysText, setDaysText] = useState('30');

  const appliances = useMemo(
    () => savedAppliances
      .map((appliance) => ({
        ...appliance,
        key: appliance.label.toLowerCase(),
        draw: describeApplianceDraw(appliance),
        measured: measuredByName.get(appliance.label.toLowerCase()) || null,
      }))
      .sort((a, b) => a.label.localeCompare(b.label)),
    [savedAppliances, measuredByName]
  );

  const selected = appliances.find((appliance) => appliance.key === selectedKey) || null;

  // Choosing an appliance fills both fields from what is known about it; both
  // stay editable - the calculator answers "what if", not only "what is".
  const selectAppliance = (key) => {
    setSelectedKey(key);
    const appliance = appliances.find((item) => item.key === key);
    if (!appliance) {
      setWattsText('');
      setHoursText('');
      return;
    }
    setWattsText(String(Math.round(appliance.draw.watts * 10) / 10));
    setHoursText(appliance.measured ? String(Math.round(appliance.measured.hoursPerRunDay * 10) / 10) : '');
  };

  // Start on the first saved appliance once they load. Once only, so later
  // edits to the fields stick. `selectAppliance` is deliberately not a
  // dependency - it is recreated every render and reads `appliances`.
  useEffect(() => {
    if (selectedKey !== null || loading || showOfflineState) return;
    selectAppliance(appliances.length ? appliances[0].key : OTHER_KEY);
  }, [appliances, loading, showOfflineState, selectedKey]);

  const watts = parseField(wattsText);
  const hours = parseField(hoursText);
  const days = parseField(daysText);

  const wattsError = watts !== null && (Number.isNaN(watts) || watts <= 0 || watts > MAX_WATTS)
    ? `Enter a wattage between 1 and ${MAX_WATTS.toLocaleString()}.`
    : '';
  const hoursError = hours !== null && (Number.isNaN(hours) || hours < 0 || hours > 24)
    ? 'A day has 24 hours - enter 0 to 24.'
    : '';
  const daysError = days !== null && (Number.isNaN(days) || days < 0 || days > 31)
    ? 'Enter 0 to 31 days.'
    : '';

  const projection = watts !== null && hours !== null && days !== null
    && !wattsError && !hoursError && !daysError
    ? projectApplianceCost({ watts, hoursPerDay: hours, daysPerMonth: days, ratePerKwh })
    : null;
  const perHourOnly = watts !== null && !wattsError ? costPerHour(watts, ratePerKwh) : null;

  const hoursHint = selected?.measured
    ? `Measured: about ${formatHours(selected.measured.hoursPerRunDay)} on each of the ${selected.measured.runDays} day${selected.measured.runDays === 1 ? '' : 's'} it ran in the last ${measuredWindowDays}.`
    : 'Not measured yet - enter your own estimate.';

  if (showOfflineState) {
    return (
      <div className={styles.page}>
        <OfflineState title="Can't load your appliances" onRetry={retry}>
          Your rate and saved appliances will appear once you&apos;re back online.
        </OfflineState>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <Spinner label="Loading appliance costs" />
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <div className={costStyles.rate}>
        <span className={costStyles.rateValue}>
          {formatRate(ratePerKwh)} <small>per kWh</small>
        </span>
        <p className={costStyles.rateText}>
          Every per-kWh charge on your PELCO III bill, VAT included. Fixed monthly charges are left
          out - they are the same whether an appliance runs or not.
        </p>
      </div>

      <div className={styles.pair}>
        <Section title="Your saved appliances" plain>
          <Card>
            {appliances.length === 0 ? (
              <p className={styles.muted}>
                No saved appliances yet. When Dagitab asks what is plugged into an outlet, naming it
                saves it here. You can still use the calculator with any wattage.
              </p>
            ) : (
              appliances.map((appliance) => (
                <button
                  key={appliance.key}
                  type="button"
                  className={`${costStyles.appliance} ${appliance.key === selectedKey ? costStyles.applianceActive : ''}`}
                  onClick={() => selectAppliance(appliance.key)}
                  aria-pressed={appliance.key === selectedKey}
                >
                  <span className={costStyles.applianceText}>
                    <span className={costStyles.applianceName}>{appliance.label}</span>
                    <span className={costStyles.applianceDetail}>
                      {formatWatts(appliance.draw)}
                      {appliance.measured ? ` · runs about ${formatHours(appliance.measured.hoursPerRunDay)} a day` : ''}
                    </span>
                  </span>
                  <span className={costStyles.perHour}>
                    <strong>{formatPerHour(appliance.draw, ratePerKwh)}</strong>
                    <span>per hour</span>
                  </span>
                </button>
              ))
            )}
            {appliances.some((appliance) => appliance.draw.varies) ? (
              <p className={costStyles.note}>
                A range means the appliance draws differently at different times - a fan&apos;s
                speeds, or a charger tapering off as the battery fills.
              </p>
            ) : null}
          </Card>
        </Section>

        <Section title="What would it cost?" plain>
          <Card>
            <div className={costStyles.chips} role="group" aria-label="Appliance">
              {[...appliances.map((appliance) => ({ key: appliance.key, label: appliance.label })),
                { key: OTHER_KEY, label: 'Other' }].map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  className={`${costStyles.chip} ${chip.key === selectedKey ? costStyles.chipActive : ''}`}
                  onClick={() => selectAppliance(chip.key)}
                  aria-pressed={chip.key === selectedKey}
                >
                  {chip.label}
                </button>
              ))}
            </div>

            <div className={costStyles.fields}>
              <TextField
                label="Power"
                inputMode="decimal"
                value={wattsText}
                onChange={(event) => setWattsText(event.target.value)}
                suffix="W"
                placeholder="e.g. 60"
                error={wattsError}
                hint={selected?.draw.varies
                  ? `Saved patterns range ${formatWatts(selected.draw)}; this is the most recent.`
                  : ''}
              />
              <TextField
                label="Hours a day"
                inputMode="decimal"
                value={hoursText}
                onChange={(event) => setHoursText(event.target.value)}
                suffix="h"
                placeholder="e.g. 8"
                error={hoursError}
                hint={selected ? hoursHint : 'Enter your own estimate.'}
              />
              <TextField
                label="Days a month"
                inputMode="decimal"
                value={daysText}
                onChange={(event) => setDaysText(event.target.value)}
                suffix="days"
                placeholder="30"
                error={daysError}
              />
            </div>

            <div className={costStyles.results}>
              {[
                ['Per hour', projection ? formatRate(projection.perHour) : (perHourOnly !== null ? formatRate(perHourOnly) : '—')],
                ['Per day', projection ? formatCurrency(projection.perDay) : '—'],
                ['Per month', projection ? formatCurrency(projection.perMonth) : '—'],
              ].map(([label, value]) => (
                <div key={label} className={`${costStyles.result} ${label === 'Per month' ? costStyles.resultStrong : ''}`}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            {projection ? (
              <p className={costStyles.note}>
                {projection.kWhPerMonth.toFixed(2)} kWh a month. An estimate at your current rates,
                assuming it draws {watts} W the whole time it runs - not your bill.
              </p>
            ) : null}
          </Card>
        </Section>
      </div>
    </div>
  );
};

export default ApplianceCostsPage;
