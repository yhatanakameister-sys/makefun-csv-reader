import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { run } from './solve.js';
const cases = JSON.parse(readFileSync('/input/cases.json', 'utf8'));
const answers = cases.map(({ input }) => run(input));
mkdirSync('/output', { recursive: true });
writeFileSync('/output/answers.json', JSON.stringify(answers));
