import { run } from './solve.js';
import assert from 'node:assert/strict';

// Expected values follow the official reference implementation (csv-reader
// 1.0.0, vendor/csv-reader/index.js in the competition kit). Where an older
// local expectation disagreed with the reference, the reference wins:
// for {text:'', header:true} the reference returns columns: [] (not null),
// because its answer is `header ? (columns ?? []) : null`.
const cases = [
  // The repository's original six tests (case 6 corrected to the reference).
  [{ text: 'a,b\n1,2', header: true }, { columns: ['a', 'b'], rows: [['1', '2']], errors: [] }],
  [{ text: 'a,b\n1', header: true }, { columns: ['a', 'b'], rows: [['1', '']], errors: [{ code: 'short_row', line: 2, row: 0, fields: 1 }] }],
  [{ text: 'a,b\n1,2,3', header: true }, { columns: ['a', 'b'], rows: [['1', '2']], errors: [{ code: 'long_row', line: 2, row: 0, extra: ['3'] }] }],
  [{ text: '"a,b",c\n"x\r\ny",z', header: false }, { columns: null, rows: [['a,b', 'c'], ['x\ny', 'z']], errors: [] }],
  [{ text: '\ufeffx,y\r\n1,2\r\n', header: true }, { columns: ['x', 'y'], rows: [['1', '2']], errors: [] }],
  [{ text: '', header: true }, { columns: [], rows: [], errors: [] }],

  // The exploratory inputs from additional-tests.mjs, with expectations
  // derived from the reference implementation.
  [{ text: '', header: false }, { columns: null, rows: [], errors: [] }],
  [{ text: '\n\n', header: false }, { columns: null, rows: [], errors: [] }],
  [{ text: 'a,b\r1,2', header: true }, { columns: ['a', 'b1', '2'], rows: [], errors: [{ code: 'stray_cr', line: 1, row: null }] }],
  [{ text: 'a,b\r\n1,2\r\n', header: true }, { columns: ['a', 'b'], rows: [['1', '2']], errors: [] }],
  [{ text: 'a,b\n1,2,3\n4', header: true }, { columns: ['a', 'b'], rows: [['1', '2'], ['4', '']], errors: [{ code: 'long_row', line: 2, row: 0, extra: ['3'] }, { code: 'short_row', line: 3, row: 1, fields: 1 }] }],
  [{ text: '"a,b",c\n"x\ny",z', header: false }, { columns: null, rows: [['a,b', 'c'], ['x\ny', 'z']], errors: [] }],
  [{ text: '"a"junk,b\n1,2', header: false }, { columns: null, rows: [['ajunk', 'b'], ['1', '2']], errors: [{ code: 'quote_junk', line: 1, row: 0 }] }],
  [{ text: '"unfinished,abc\nnext,line', header: false }, { columns: null, rows: [['"unfinished', 'abc'], ['next', 'line']], errors: [{ code: 'unterminated_quote', line: 1, row: 0 }] }],
  [{ text: 'a,,c\n1,,3', header: true }, { columns: ['a', '', 'c'], rows: [['1', '', '3']], errors: [] }],
  [{ text: '\ufeffa,b\n1,2', header: true }, { columns: ['a', 'b'], rows: [['1', '2']], errors: [] }],
  [{ text: '"a""b",c', header: false }, { columns: null, rows: [['a"b', 'c']], errors: [] }],
  [{ text: 'a,b\n\n1,2\n', header: true }, { columns: ['a', 'b'], rows: [['1', '2']], errors: [] }],

  // Edge cases from the review notes, expectations from the reference:
  // a stray_cr carries its record's start line, even when an earlier quoted
  // field of the same record already advanced the line counter.
  [{ text: '"x\ny",a\rb', header: false }, { columns: null, rows: [['x\ny', 'ab']], errors: [{ code: 'stray_cr', line: 1, row: 0 }] }],
  // Inside quote junk, a stray_cr is met (and recorded) before the field
  // ends, so it precedes the quote_junk recorded at the field's end.
  [{ text: '"a"x\ry', header: false }, { columns: null, rows: [['axy']], errors: [{ code: 'stray_cr', line: 1, row: 0 }, { code: 'quote_junk', line: 1, row: 0 }] }],
  // Junk after a multiline quoted field: the error carries the record's
  // start line.
  [{ text: 'a,b\n"x\ny"junk,2', header: true }, { columns: ['a', 'b'], rows: [['x\nyjunk', '2']], errors: [{ code: 'quote_junk', line: 2, row: 0 }] }],
  // A line holding only a stray CR is no record, but its error stays.
  [{ text: '\r', header: false }, { columns: null, rows: [], errors: [{ code: 'stray_cr', line: 1, row: 0 }] }],
  // A single empty quoted field is a record (it is not discarded).
  [{ text: '""', header: false }, { columns: null, rows: [['']], errors: [] }],
];

for (const [input, expected] of cases) assert.deepEqual(run(input), expected);
console.log(`${cases.length} local tests passed`);
