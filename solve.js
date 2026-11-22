// Fast drop-in replacement for csv-reader 1.0.0 (make.fun csv-reader-speed-01).
//
// Returns exactly the reference readCsv's answer {columns, rows, errors} for every
// input {text, header}, following the same broken-row policy:
//   - a U+FEFF at the very start of the text is dropped;
//   - a record ends at LF or CRLF, and a line left with no characters is no record;
//   - outside quotes a CR not followed by LF is dropped (stray_cr);
//   - a field that opens with a quote runs to the next quote that is not doubled,
//     "" inside it one quote, and each CRLF or lone CR inside it read as LF; what
//     follows its closing quote, up to the next comma or line break, is appended
//     as it stands (quote_junk, recorded when the field ends, and only when at
//     least one character is kept); a quote that never closes is a literal
//     character and the text after it is read again as unquoted
//     (unterminated_quote);
//   - a quote inside an unquoted field is a literal character; fields stay
//     strings, never trimmed or converted;
//   - columns is the first record when header is true, else null (an empty
//     array when header is true and there are no records); rows holds the
//     records after it (every record when header is false), each padded with ""
//     (short_row, with fields: its count) or cut (long_row, with extra: the cut
//     fields) to the first record's width;
//   - each error is {code, line, row}: line the 1-based line its record starts
//     on (every LF, CRLF and lone CR inside a quoted field counted), row its
//     record's index in rows (null for the header), in the order met.
//
// The reference walks one character at a time; this version scans with
// indexOf jumps and slices whole runs of ordinary characters at once. Error
// objects are built with the same keys the reference uses.

const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;
  const len = text.length;

  let pos = 0; // the next character to read
  let line = 1; // the line that character is on
  if (text[0] === '\uFEFF') pos = 1;

  // The record being read: the line it starts on and the index in rows it
  // takes (null: the header). Every error of the record carries these two.
  let recordLine = 1;
  let recordRow = null;

  function error(code) {
    errors.push({ code, line: recordLine, row: recordRow });
  }

  // The character at i, or '' past the end of the text.
  function at(i) {
    return i < len ? text[i] : '';
  }

  // Reads unquoted characters onto `value` up to the next comma or line break:
  // a CR not followed by LF is dropped (stray_cr). Returns the field, how it
  // ended, and `added`, the number of characters kept.
  function readUnquoted(value) {
    let added = 0;
    while (pos < len) {
      const ic = text.indexOf(',', pos);
      const in_ = text.indexOf('\n', pos);
      const ir = text.indexOf('\r', pos);
      let idx = len;
      let kind = '';
      if (ic !== -1 && ic < idx) { idx = ic; kind = ','; }
      if (in_ !== -1 && in_ < idx) { idx = in_; kind = '\n'; }
      if (ir !== -1 && ir < idx) { idx = ir; kind = '\r'; }
      if (idx > pos) {
        value += text.slice(pos, idx);
        added += idx - pos;
        pos = idx;
      }
      if (kind === '') {
        // No delimiter left: the rest of the text is the field.
        pos = len;
        return { value, ended: END, added };
      }
      if (kind === ',') {
        pos += 1;
        return { value, ended: COMMA, added };
      }
      if (kind === '\n') {
        pos += 1;
        line += 1;
        return { value, ended: LINE_BREAK, added };
      }
      // kind === '\r'
      if (at(pos + 1) === '\n') {
        pos += 2;
        line += 1;
        return { value, ended: LINE_BREAK, added };
      }
      error('stray_cr');
      pos += 1;
    }
    return { value, ended: END, added };
  }

  // Reads a quoted field whose opening quote is at pos.
  function readQuoted() {
    const open = pos;
    // Find the closing quote: the next '"' that is not doubled.
    let close = -1;
    let j = open + 1;
    while (j < len) {
      const q = text.indexOf('"', j);
      if (q === -1) break;
      if (text[q + 1] === '"') { j = q + 2; continue; }
      close = q;
      break;
    }
    if (close === -1) {
      // The quote never closes: it is a literal character, and the text after
      // it is read again as unquoted. `line` never moved during the scan, so
      // nothing needs restoring.
      pos = open + 1;
      error('unterminated_quote');
      return readUnquoted('"');
    }
    // Build the value from the region (open, close): "" is one quote, and
    // each LF stays an LF while each CRLF or lone CR becomes one LF; every
    // one of them counts a line.
    let value = '';
    let i = open + 1;
    while (i < close) {
      const iq = text.indexOf('"', i);
      const in_ = text.indexOf('\n', i);
      const ir = text.indexOf('\r', i);
      let idx = close;
      let kind = '';
      if (iq !== -1 && iq < idx) { idx = iq; kind = '"'; }
      if (in_ !== -1 && in_ < idx) { idx = in_; kind = '\n'; }
      if (ir !== -1 && ir < idx) { idx = ir; kind = '\r'; }
      if (idx > i) {
        value += text.slice(i, idx);
        i = idx;
      }
      if (kind === '') break; // plain text up to the closing quote
      if (kind === '"') {
        // A doubled quote inside the region (the closing quote itself is the
        // first unpaired one, so this quote's pair is inside the region too).
        value += '"';
        i += 2;
        continue;
      }
      if (kind === '\n') {
        value += '\n';
        line += 1;
        i += 1;
        continue;
      }
      // kind === '\r': CRLF and a lone CR inside quotes are each one LF.
      value += '\n';
      line += 1;
      i += text[i + 1] === '\n' ? 2 : 1;
    }
    pos = close + 1;
    if (pos >= len) return { value, ended: END };
    const c = text[pos];
    if (c === ',') {
      pos += 1;
      return { value, ended: COMMA };
    }
    if (c === '\n') {
      pos += 1;
      line += 1;
      return { value, ended: LINE_BREAK };
    }
    if (c === '\r' && at(pos + 1) === '\n') {
      pos += 2;
      line += 1;
      return { value, ended: LINE_BREAK };
    }
    // What follows the closing quote is appended as it stands, up to the next
    // comma or line break; quote_junk is recorded when the field ends, after
    // any stray_cr the junk itself met, and only if a character was kept.
    const junk = readUnquoted(value);
    if (junk.added > 0) error('quote_junk');
    return junk;
  }

  while (true) {
    // Lines with no characters are no records.
    while (pos < len) {
      if (text[pos] === '\n') {
        pos += 1;
        line += 1;
      } else if (text[pos] === '\r' && at(pos + 1) === '\n') {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= len) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let field;
    let quoted;
    do {
      quoted = text[pos] === '"';
      field = quoted ? readQuoted() : readUnquoted('');
      fields.push(field.value);
    } while (field.ended === COMMA);

    // A line that held only stray CRs is left with no characters: no record
    // (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
