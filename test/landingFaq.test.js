import assert from 'node:assert/strict';
import test from 'node:test';

import { HELP_SECTIONS } from '../src/screens/Help/helpContent.js';
import { LANDING_FAQ_IDS, selectLandingFaq } from '../src/components/landing/faqTopics.js';

/*
 * The landing page renders a subset of the Help Center by id rather than copying
 * its prose. That keeps one source of truth, but it moves the failure: a topic
 * renamed in helpContent.js would not break the build, it would just quietly
 * remove a question from the public page. These tests are what makes that loud.
 */

test('every landing FAQ id still resolves to a Help Center topic', () => {
  const resolved = selectLandingFaq();
  const missing = LANDING_FAQ_IDS.filter(
    (id) => !resolved.some((topic) => topic.id === id)
  );

  assert.deepEqual(missing, [], `Help Center no longer has: ${missing.join(', ')}`);
  assert.equal(resolved.length, LANDING_FAQ_IDS.length);
});

test('the declared order is preserved, not the Help Center order', () => {
  assert.deepEqual(
    selectLandingFaq().map((topic) => topic.id),
    LANDING_FAQ_IDS
  );
});

test('scope comes first — "only two outlets" is not buried', () => {
  assert.equal(selectLandingFaq()[0].id, 'two-outlets');
});

test('every selected topic carries a question and a non-empty answer', () => {
  for (const topic of selectLandingFaq()) {
    assert.equal(typeof topic.question, 'string');
    assert.ok(topic.question.length > 0, `${topic.id} has no question`);
    assert.ok(Array.isArray(topic.answer), `${topic.id} answer is not an array`);
    assert.ok(topic.answer.length > 0, `${topic.id} has an empty answer`);
    assert.ok(
      topic.answer.every((line) => typeof line === 'string' && line.trim().length > 0),
      `${topic.id} has a blank paragraph`
    );
  }
});

test('answers are the Help Center wording, not a paraphrase', () => {
  const source = HELP_SECTIONS.flatMap((section) => section.topics);

  for (const topic of selectLandingFaq()) {
    const original = source.find((entry) => entry.id === topic.id);
    assert.deepEqual(topic.answer, original.answer, `${topic.id} diverged from the Help Center`);
    assert.equal(topic.question, original.question);
  }
});

test('post-purchase troubleshooting is left out', () => {
  // These assume you already own the hardware; they belong in the app, not on a
  // page someone reads to decide whether to install it.
  const inApp = ['no-readings', 'forget', 'changed', 'which-rates', 'charging-done'];
  const selected = selectLandingFaq().map((topic) => topic.id);

  for (const id of inApp) {
    assert.ok(!selected.includes(id), `${id} should stay in the app`);
  }
});
