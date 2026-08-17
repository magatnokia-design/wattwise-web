import { HELP_SECTIONS } from '../../screens/Help/helpContent';

/**
 * The subset of the Help Center that belongs on a public page.
 *
 * The wording is not copied. `helpContent.js` is a copy-rule file — byte-identical
 * with the phone app's — so duplicating its prose here would create a third copy
 * that silently disagrees with the other two the first time anyone edits a
 * sentence. This selects from it by id instead, and the answers render verbatim.
 *
 * Not all seventeen topics belong here. Roughly half of the Help Center is
 * troubleshooting for someone who already owns the hardware — "Why does it say
 * No readings?", "What is the difference between Rename and Forget?" — which a
 * visitor deciding whether to install anything has no use for, and which would
 * bury the ones they do. What is left are the questions someone asks *before*
 * they commit: what it covers, whether the figures are real, what it cannot do,
 * and whether it will act on its own.
 *
 * Order is deliberate and is not the Help Center's: scope first, because "only
 * two outlets" is the fact most likely to make someone stop reading, and it
 * should not be buried. Then how the numbers are produced, then the limits, then
 * safety.
 */
export const LANDING_FAQ_IDS = [
  'two-outlets',
  'how-measured',
  'accuracy',
  'steady-vs-changing',
  'wrong-name-bill',
  'cutoff',
  'suggestion-first',
];

/**
 * Resolves the ids above against the Help Center, keeping the declared order.
 *
 * An id that no longer exists is dropped rather than rendered blank — but that
 * is a silent failure, so `test/landingFaq.test.js` asserts every id still
 * resolves. If someone renames a topic in the copy-rule file, the test fails
 * instead of the page quietly losing a question.
 */
export const selectLandingFaq = (sections = HELP_SECTIONS) => {
  const byId = new Map();

  for (const section of sections) {
    for (const topic of section.topics) {
      byId.set(topic.id, { ...topic, sectionTitle: section.title, icon: section.icon });
    }
  }

  return LANDING_FAQ_IDS.map((id) => byId.get(id)).filter(Boolean);
};

export default selectLandingFaq;
