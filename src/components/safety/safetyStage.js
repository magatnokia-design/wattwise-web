/*
 * The Power Safety banner, when there is nothing to grade.
 *
 * `getSafetyStageConfig` is copy-rule, and it ends `configs[stage] || configs.normal`
 * — so every unknown stage, and every stage read from a document the hardware
 * has stopped updating, renders as **"Normal · All systems operating within safe
 * parameters"**.
 *
 * Observed with the ESP32 unplugged: that banner sat above six chips all reading
 * "No reading", above two outlet cards both saying "Waiting for the ESP32 to
 * report". The page said in three places that it knew nothing, and in the
 * largest, greenest element on the screen that everything was safe.
 *
 * This is the ninth instance of one bug — a value derived from a snapshot
 * presented as current after the readings behind it stopped — and the worst
 * placed of them, because it is the one element a user checks *to decide whether
 * something is wrong*. "Normal" is not the safe default when nothing is being
 * measured; it is the most dangerous one.
 *
 * The fix cannot go in safetyHelpers.js: the fallback there is right for its own
 * job, which is turning a stage string into a colour, and the file is shared with
 * the phone. Freshness is not its input. So the page decides whether there is a
 * stage worth colouring, and only then asks.
 */

/** Rendered instead of a grade when no readings are arriving. */
export const NO_READING_STAGE = {
  label: 'No readings',
  description: 'Nothing has been measured in the last 12 seconds, so nothing is being graded.',
  color: '#64748B',
  bgColor: '#F8FAFC',
};

/**
 * @param {object} args
 * @param {object} args.stageConfig     Result of getSafetyStageConfig(safetyStage).
 * @param {boolean} args.telemetryFresh Readings arriving inside the 12 s window.
 * @returns {{ label: string, description: string, color: string, bgColor: string }}
 */
export const resolveSafetyStage = ({ stageConfig, telemetryFresh }) => {
  if (telemetryFresh === false) return NO_READING_STAGE;
  return stageConfig;
};
