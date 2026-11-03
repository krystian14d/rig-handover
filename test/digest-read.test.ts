import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { readNight } from '../src/digest/read.js';

const tmp = () => mkdtempSync(join(tmpdir(), 'rig-read-'));

describe('readNight on runs/2026-10-28.jsonl', () => {
  const night = readNight('runs', '2026-10-28');

  it('finds 5 jobs and 1 bad line, sorted by job', () => {
    expect(night).not.toBeNull();
    expect(night?.night).toBe('2026-10-28');
    expect(night?.badLines).toBe(1);
    expect(night?.rows.map((r) => r.job)).toEqual([
      'digest/render',
      'fixtures/refresh',
      'lane/sync',
      'notes/backup',
      'rig/rotate-logs',
    ]);
  });

  it('counts retries and keeps the last status', () => {
    const row = night?.rows.find((r) => r.job === 'fixtures/refresh');
    expect(row).toEqual({
      job: 'fixtures/refresh',
      owner: 'rook',
      runs: 4,
      retries: 3,
      lastStatus: 'ok',
      lastError: 'upstream 503',
      firstAt: '2026-10-29T01:30:00+01:00',
      lastAt: '2026-10-29T01:37:00+01:00',
    });
  });

  it('keeps the error of a failed job', () => {
    const row = night?.rows.find((r) => r.job === 'notes/backup');
    expect(row?.lastStatus).toBe('fail');
    expect(row?.lastError).toBe('quota exceeded');
    expect(row?.owner).toBe('lane-07');
  });

  it('keeps a row whose owner is null', () => {
    const row = night?.rows.find((r) => r.job === 'digest/render');
    expect(row?.owner).toBeNull();
    expect(row?.runs).toBe(1);
    expect(row?.lastError).toBeNull();
  });

  it('keeps the +01:00 offset on times', () => {
    const row = night?.rows.find((r) => r.job === 'lane/sync');
    expect(row?.firstAt).toBe('2026-10-28T23:00:06+01:00');
    expect(row?.lastAt).toBe('2026-10-29T05:00:04+01:00');
    expect(row?.runs).toBe(8);
    expect(row?.retries).toBe(1);
    expect(row?.lastError).toBe('lock held');
  });
});

describe('readNight edges', () => {
  it('returns null for a missing night', () => {
    expect(readNight('runs', '2026-01-01')).toBeNull();
  });

  it('returns null for a night that is not YYYY-MM-DD', () => {
    expect(readNight('runs', '../runs/2026-10-28')).toBeNull();
    expect(readNight('runs', '2026-10-28.jsonl')).toBeNull();
    expect(readNight('runs', '28-10-2026')).toBeNull();
    expect(readNight('runs', '2026-13-45')).toBeNull();
    expect(readNight('runs', '')).toBeNull();
  });

  it('reads an empty file as a night with no rows', () => {
    const dir = tmp();
    writeFileSync(join(dir, '2026-10-30.jsonl'), '');
    expect(readNight(dir, '2026-10-30')).toEqual({ night: '2026-10-30', rows: [], badLines: 0 });
  });

  it('counts bad lines without throwing and skips blank lines', () => {
    const dir = tmp();
    const lines = [
      '{"at":"2026-10-30T01:00:00+01:00","job":"a/job","status":"ok","owner":"rook"}',
      'not json',
      '[1,2]',
      '{"at":"2026-10-30T01:00:00+01:00","job":"a/job","status":"done","owner":"rook"}',
      '{"at":"2026-10-30T01:00:00+01:00","status":"ok","owner":"rook"}',
      '{"at":"2026-10-30T01:00:00+01:00","job":"a/job","status":"ok"}',
      '{"at":"2026-10-30T01:00:00+01:00","job":"a/job","status":"ok","owner":"rook","error":5}',
      '',
      '{"at":"2026-10-30T02:00:00+01:00","job":"a/job","status":"fail","owner":"rook","error":"boom"}',
      '',
    ];
    writeFileSync(join(dir, '2026-10-30.jsonl'), lines.join('\n'));
    const night = readNight(dir, '2026-10-30');
    expect(night?.badLines).toBe(6);
    expect(night?.rows).toEqual([
      {
        job: 'a/job',
        owner: 'rook',
        runs: 2,
        retries: 0,
        lastStatus: 'fail',
        lastError: 'boom',
        firstAt: '2026-10-30T01:00:00+01:00',
        lastAt: '2026-10-30T02:00:00+01:00',
      },
    ]);
  });
});
