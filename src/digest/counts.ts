// Plan morning-digest § 2c. Line counts by status for one night's log (lines that parsed).
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseLine } from './read.js';

export type NightCounts = { ok: number; retry: number; fail: number };

// null when runs/<night>.jsonl doesn't exist.
export function nightCounts(runsDir: string, night: string): NightCounts | null {
  let text: string;
  try {
    text = readFileSync(join(runsDir, `${night}.jsonl`), 'utf8');
  } catch {
    return null;
  }
  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const rawLine of text.split(/\r?\n/)) {
    if (rawLine.trim() === '') continue;
    const line = parseLine(rawLine);
    if (line !== null) counts[line.status]++;
  }
  return counts;
}
