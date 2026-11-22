// Provisional implementation of make.fun csv-reader-speed-01.
// Official grader and reference implementation have not been run.
export function run(input) {
  let text = String(input.text ?? '');
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);
  const header = !!input.header;
  const rows = [], errors = [];
  let columns = null, width = -1;
  let i = 0, line = 1, startLine = 1;
  let fields = [], field = '', began = false, touched = false;
  let afterQuote = false, junk = false;
  function currentRow() {return (header && width < 0) ? null : rows.length;}
  function finishField() {fields.push(field);field='';began=false;afterQuote=false;junk=false;}
  function finishRecord() {
    finishField();
    const rowId = currentRow();
    if (width < 0) {
      width = fields.length;
      if (header) columns = fields;
      else rows.push(fields);
    } else {
      if (fields.length < width) {
        errors.push({code:'short_row',line:startLine,row:rowId,fields:fields.length});
        while (fields.length < width) fields.push('');
      } else if (fields.length > width) {
        const extra = fields.splice(width);
        errors.push({code:'long_row',line:startLine,row:rowId,extra});
      }
      rows.push(fields);
    }
    fields=[];touched=false;
  }
  while(i < text.length) {
    const c = text[i];
    if (c === '"' && !began) {
      let j=i+1, closed=false;
      while(j<text.length) {
        if(text[j]==='"') {
          if(text[j+1]==='"'){j+=2;continue;}
          closed=true;break;
        }
        j++;
      }
      if(!closed) {
        errors.push({code:'unterminated_quote',line:startLine,row:currentRow()});
        field+='"';began=true;touched=true;i++;continue;
      }
      began=true;touched=true;i++;
      while(i<text.length){
        let d=text[i];
        if(d==='"') {
          if(text[i+1]==='"'){field+='"';i+=2;continue;}
          i++;break;
        }
        if(d==='\r'){field+='\n';line++;i+=(text[i+1]==='\n'?2:1);continue;}
        if(d==='\n'){field+='\n';line++;i++;continue;}
        field+=d;i++;
      }
      afterQuote=true;continue;
    }
    if(c===','){finishField();touched=true;i++;continue;}
    if(c==='\n' || (c==='\r' && text[i+1]==='\n')) {
      if(touched || fields.length || began || field.length) finishRecord();
      line++;i+=(c==='\r'?2:1);startLine=line;continue;
    }
    if(c==='\r') {errors.push({code:'stray_cr',line,row:currentRow()});i++;continue;}
    if(afterQuote && !junk){junk=true;errors.push({code:'quote_junk',line:startLine,row:currentRow()});}
    field+=c;began=true;touched=true;i++;
  }
  if(touched || fields.length || began || field.length) finishRecord();
  return {columns,rows,errors};
}
