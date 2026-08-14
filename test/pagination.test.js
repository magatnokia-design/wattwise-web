import test from 'node:test';
import assert from 'node:assert/strict';

import { resolvePage, describeRange } from '../src/components/ui/pagination.js';

test('a full first page', () => {
  const result = resolvePage({ page: 1, totalRows: 137, pageSize: 15 });

  assert.equal(result.page, 1);
  assert.equal(result.totalPages, 10);
  assert.deepEqual([result.start, result.end], [0, 15]);
  assert.equal(result.hasPrevious, false);
  assert.equal(result.hasNext, true);
});

test('the last page is short, and end never runs past the rows', () => {
  // 137 rows at 15 = nine full pages and a remainder of two.
  const result = resolvePage({ page: 10, totalRows: 137, pageSize: 15 });

  assert.deepEqual([result.start, result.end], [135, 137]);
  assert.equal(result.end - result.start, 2);
  assert.equal(result.hasNext, false);
});

test('an exact multiple does not produce a trailing empty page', () => {
  const result = resolvePage({ page: 1, totalRows: 30, pageSize: 15 });
  assert.equal(result.totalPages, 2);
});

test('a page beyond the end is clamped, not honoured', () => {
  /*
   * The live case. The Activity log streams, and the range and outlet filters
   * shrink it - a reader on page 8 who switches to "Last 7 days" would be handed
   * slice(105, 120) of a 12-row list and see an empty table with no way back,
   * since Previous would step to a page that is also empty.
   */
  const result = resolvePage({ page: 8, totalRows: 12, pageSize: 15 });

  assert.equal(result.page, 1);
  assert.equal(result.totalPages, 1);
  assert.deepEqual([result.start, result.end], [0, 12]);
  assert.equal(result.hasPrevious, false);
  assert.equal(result.hasNext, false);
});

test('an empty table is page 1 of 1', () => {
  // Not "page 1 of 0", which reads as a fault. The empty state renders here.
  const result = resolvePage({ page: 1, totalRows: 0, pageSize: 15 });

  assert.equal(result.page, 1);
  assert.equal(result.totalPages, 1);
  assert.deepEqual([result.start, result.end], [0, 0]);
});

test('nonsense input cannot produce a negative or reversed slice', () => {
  [
    { page: 0, totalRows: 40, pageSize: 15 },
    { page: -3, totalRows: 40, pageSize: 15 },
    { page: NaN, totalRows: 40, pageSize: 15 },
    { page: 1, totalRows: -5, pageSize: 15 },
    { page: 1, totalRows: 40, pageSize: 0 },
    { page: 1, totalRows: 40, pageSize: NaN },
  ].forEach((args) => {
    const result = resolvePage(args);

    assert.ok(result.start >= 0, `start ${result.start} for ${JSON.stringify(args)}`);
    assert.ok(result.end >= result.start, `end < start for ${JSON.stringify(args)}`);
    assert.ok(result.page >= 1, `page ${result.page} for ${JSON.stringify(args)}`);
    assert.ok(result.totalPages >= 1);
  });
});

test('every page of a set is reachable and nothing is listed twice', () => {
  /*
   * The property that matters most: this table is the record of what the
   * hardware did, so paging must not lose a row. Walks all pages and checks the
   * slices tile the set exactly.
   */
  const rows = Array.from({ length: 137 }, (_, index) => index);
  const seen = [];

  let page = 1;
  for (;;) {
    const result = resolvePage({ page, totalRows: rows.length, pageSize: 15 });
    seen.push(...rows.slice(result.start, result.end));
    if (!result.hasNext) break;
    page += 1;
  }

  assert.deepEqual(seen, rows);
});

test('the range description counts from one, and says so plainly when empty', () => {
  assert.equal(describeRange({ start: 0, end: 15, totalRows: 137 }), 'Showing 1–15 of 137');
  assert.equal(describeRange({ start: 15, end: 30, totalRows: 137 }), 'Showing 16–30 of 137');
  assert.equal(describeRange({ start: 0, end: 0, totalRows: 0 }), 'No entries');
});
