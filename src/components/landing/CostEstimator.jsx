import { useMemo, useState } from 'react';
import { calculatePelcoIIIBill, RATE_EFFECTIVE_DATE } from '../../utils/billing';
import styles from './CostEstimator.module.css';

/**
 * The estimator on the landing page.
 *
 * Every peso here comes out of `calculatePelcoIIIBill` — the same module the
 * dashboard, the analytics page and the emailed invoice bill from. Nothing is
 * approximated for the sake of the marketing page, which is the point: a visitor
 * who changes the watts and reads the total has just watched the real tariff run.
 *
 * `includePeriodFlats: false` is deliberate and load-bearing. The P5.00 metering
 * charge is once per bill, not once per appliance; charging it here would make a
 * 5 W lamp look like it costs P5 a month to leave on. This is the marginal cost
 * of the energy, which is the only honest answer to "what does running this
 * cost me".
 *
 * The wattages are the detector's own catalogue ranges (applianceDetector.js),
 * not measurements — a preset moves the slider to somewhere sensible inside the
 * range and the caption says so. No number on this page is presented as a
 * reading taken from anyone's hardware.
 */

// Mirrors APPLIANCE_PROFILES in functions/src/lib/applianceDetector.js — the
// eight WattWise can name, with the mean-power window each is matched against.
const PRESETS = [
  { icon: '🔌', label: 'Phone charger', range: [2, 18], watts: 12 },
  { icon: '💡', label: 'LED lamp', range: [3, 22], watts: 9 },
  { icon: '🌀', label: 'Electric fan', range: [8, 95], watts: 55 },
  { icon: '💻', label: 'Laptop charger', range: [18, 80], watts: 45 },
  { icon: '🖥️', label: 'Monitor', range: [14, 50], watts: 28 },
  { icon: '🔊', label: 'Speaker', range: [5, 45], watts: 15 },
  { icon: '📺', label: 'Television', range: [45, 190], watts: 90 },
  { icon: '🎮', label: 'Game console', range: [60, 230], watts: 140 },
];

// The firmware's per-outlet ceiling. The slider stops here because the hardware
// does — see MAX_OUTLET_POWER_W in the ESP32 sketch.
const MAX_OUTLET_W = 500;
const DAYS = 30;

const peso = (value) =>
  `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const clampWatts = (value) => Math.min(MAX_OUTLET_W, Math.max(0, Math.round(value)));

export const CostEstimator = () => {
  const [watts, setWatts] = useState(55);
  const [hours, setHours] = useState(6);
  const [preset, setPreset] = useState('Electric fan');

  const applyPreset = (entry) => {
    setPreset(entry.label);
    setWatts(entry.watts);
  };

  const { kwh, bill } = useMemo(() => {
    const energy = (watts * hours * DAYS) / 1000;
    return {
      kwh: energy,
      // Marginal: no once-per-period flats. See the note above.
      bill: calculatePelcoIIIBill(energy, { includePeriodFlats: false }),
    };
  }, [watts, hours]);

  const blocks = [
    { label: 'Generation & transmission', amount: bill.totals.generationTransmission },
    { label: 'Distribution', amount: bill.totals.distribution },
    { label: 'Government charges & VAT', amount: bill.totals.government },
  ];

  return (
    <div className={styles.wrap}>
      <div className={styles.controls}>
        <div className={styles.field}>
          <span className={styles.fieldLabel}>Start from an appliance</span>
          <div className={styles.presets}>
            {PRESETS.map((entry) => (
              <button
                key={entry.label}
                type="button"
                aria-pressed={preset === entry.label}
                className={`${styles.preset} ${preset === entry.label ? styles.presetOn : ''}`}
                onClick={() => applyPreset(entry)}
              >
                <span aria-hidden="true">{entry.icon}</span>
                {entry.label}
                <em className={styles.presetRange}>
                  {entry.range[0]}–{entry.range[1]} W
                </em>
              </button>
            ))}
          </div>
          <p className={styles.presetNote}>
            Those are the wattage windows WattWise matches against when it identifies
            an appliance — not measurements. Move the slider to your own figure.
          </p>
        </div>

        <div className={styles.sliderRow}>
          <label className={styles.field} htmlFor="ww-watts">
            <span className={styles.fieldLabel}>
              Power draw
              <output className={styles.fieldValue} htmlFor="ww-watts">
                {watts} W
              </output>
            </span>
            <input
              id="ww-watts"
              type="range"
              min="0"
              max={MAX_OUTLET_W}
              step="1"
              value={watts}
              onChange={(event) => {
                setWatts(clampWatts(event.target.value));
                setPreset('');
              }}
              className={styles.slider}
            />
            <span className={styles.scale}>
              <span>0 W</span>
              <span>{MAX_OUTLET_W} W — one outlet&rsquo;s limit</span>
            </span>
          </label>

          <label className={styles.field} htmlFor="ww-hours">
            <span className={styles.fieldLabel}>
              Hours per day
              <output className={styles.fieldValue} htmlFor="ww-hours">
                {hours} h
              </output>
            </span>
            <input
              id="ww-hours"
              type="range"
              min="0.5"
              max="24"
              step="0.5"
              value={hours}
              onChange={(event) => setHours(Number(event.target.value))}
              className={styles.slider}
            />
            <span className={styles.scale}>
              <span>30 min</span>
              <span>All day</span>
            </span>
          </label>
        </div>
      </div>

      <div className={styles.result} aria-live="polite">
        <p className={styles.resultLabel}>Estimated cost per month</p>
        <p className={styles.resultTotal}>{peso(bill.totals.total)}</p>
        <p className={styles.resultSub}>
          {kwh.toLocaleString('en-PH', { maximumFractionDigits: 1 })} kWh over {DAYS} days
        </p>

        <ul className={styles.blocks}>
          {blocks.map((block) => (
            <li key={block.label} className={styles.block}>
              <span>{block.label}</span>
              <span className={styles.blockAmount}>{peso(block.amount)}</span>
            </li>
          ))}
        </ul>

        <p className={styles.disclosure}>
          PELCO III residential rates effective {RATE_EFFECTIVE_DATE}, run through the same
          billing module the app uses. The once-per-bill ₱5.00 metering charge is left out —
          it belongs to the whole bill, not to one appliance.
        </p>
      </div>
    </div>
  );
};

export default CostEstimator;
