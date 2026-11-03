// Plan morning-digest § 1. The contract every part of § 2 starts against: the reader turns
// runs/<night>.jsonl into one row per job, the page and the JSON only render these rows.

export type RunStatus = 'ok' | 'retry' | 'fail';

// One line of runs/<night>.jsonl, once parsed.
export type RunLine = {
  at: string;
  job: string;
  status: RunStatus;
  owner: string | null;
  error?: string;
};

// One row per job. Times keep the offset from the log (styleguide); never converted to UTC.
export type DigestRow = {
  job: string;
  owner: string | null; // null renders as '—'
  runs: number; // lines for this job
  retries: number; // lines with status 'retry'
  lastStatus: RunStatus;
  lastError: string | null; // error of the last line that had one
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string; // YYYY-MM-DD
  rows: DigestRow[]; // sorted by job
  badLines: number; // lines that didn't parse: counted, never thrown
};

// Returns null when runs/<night>.jsonl doesn't exist (→ 404). An empty file is a Night with no rows.
export type ReadNight = (runsDir: string, night: string) => Night | null;
