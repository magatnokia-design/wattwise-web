/*
 * What WattWise can and cannot monitor, for the reference card in Settings.
 *
 * ⚠️ This is a HAND-COPY of data that lives in the phone repo. That is exactly
 * the arrangement that let `OnboardingScreen.js` drift to 7 appliances with
 * three renamed while the detector had 8 (reported as §0o.4). So it is covered
 * by a drift test — `test/supportedAppliances.test.js` reads the detector and
 * fails if this list stops matching.
 *
 * Sources of truth, in order:
 *   names + wattages  → C:\App\WattWise\functions\src\lib\applianceDetector.js
 *   limits            → C:\App\WattWise\docs\esp32\…\.ino (500 / 1000)
 *   allow / deny list → C:\App\WattWise\docs\low-power-appliances.md
 *
 * Do not edit this to make the test pass. Re-read those files.
 */

/**
 * The generic catalogue, in the detector's own order.
 *
 * `typical` is the profile's `meanPower` range — the draw the detector expects
 * to see averaged over a run, not a nameplate rating. An appliance can sit
 * outside it and still be matched on the other features.
 */
export const DETECTABLE_APPLIANCES = [
  { name: 'Phone Charger', typical: '2–18 W' },
  { name: 'LED Lamp', typical: '3–22 W' },
  { name: 'Electric Fan', typical: '22–95 W' },
  { name: 'Laptop Charger', typical: '18–80 W' },
  { name: 'Monitor', typical: '14–50 W' },
  { name: 'Speaker', typical: '5–45 W' },
  { name: 'Television', typical: '45–190 W' },
  { name: 'Game Console', typical: '60–230 W' },
];

/** Enforced on the ESP32 itself, not from the cloud. */
export const OUTLET_LIMIT_W = 500;
export const COMBINED_LIMIT_W = 1000;

/*
 * The threshold this card used to omit — and the only one that can bind while
 * both outlets are inside their own limit.
 *
 * The combined *cutoff* cannot fire on its own. Two outlets capped at 500 W each
 * sum to at most 1000 W, so the pair reaches its ceiling only once an outlet is
 * already at or over its own. That is not theory: every combined cutoff observed
 * on hardware was one outlet's cutoff counted twice, which is why cutoffEvents.js
 * suppresses it.
 *
 * The combined *warning* is a different matter. evaluateSafety grades total draw
 * at WARNING_RATIO of the ceiling, so 400 W + 400 W raises a warning with neither
 * outlet in breach. Printing 500 and 1000 and nothing else made that alert arrive
 * from a number the user had never been shown.
 *
 * Ratio and ceiling are duplicated from functions/src/lib/powerSafety.js and
 * drift-tested against it, the same arrangement as the safety chip ratios.
 */
export const COMBINED_WARNING_RATIO = 0.8;
export const COMBINED_WARNING_W = Math.round(COMBINED_LIMIT_W * COMBINED_WARNING_RATIO);

/**
 * High-power or high-inrush, from the project's appliance policy. Listed
 * because the detector cannot warn about them: anything over the outlet limit
 * is cut within 3 seconds, which is fewer samples than a classification needs.
 * A static list is the only place these can be named.
 */
export const UNSUPPORTED_APPLIANCES = [
  'Air conditioner',
  'Refrigerator',
  'Washing machine',
  'Electric kettle',
  'Microwave oven',
  'Electric iron',
  'Hair dryer',
  'Water heater',
];
