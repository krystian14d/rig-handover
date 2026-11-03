import { copyFileSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { Night } from '../src/digest/types.js';

const JOBS = ['digest/render', 'fixtures/refresh', 'lane/sync', 'notes/backup', 'rig/rotate-logs'];

let tmp: string;
let app: ReturnType<typeof createApp>;

beforeAll(() => {
  tmp = mkdtempSync(join(tmpdir(), 'rig-'));
  copyFileSync('runs/2026-10-28.jsonl', join(tmp, '2026-10-28.jsonl'));
  writeFileSync(join(tmp, '2026-10-30.jsonl'), '');
  writeFileSync(
    join(tmp, '2026-10-31.jsonl'),
    '{"at":"2026-10-31T23:00:00+01:00","job":"a/job","status":"ok","owner":null}\n{not json\n',
  );
  app = createApp({
    adapter: 'shim',
    installed: '2026-10-29T14:06:00+01:00',
    beatEverySeconds: 60,
    runsDir: tmp,
  });
});

afterAll(() => {
  rmSync(tmp, { recursive: true, force: true });
});

function inOrder(html: string, names: string[]): boolean {
  const idx = names.map((n) => html.indexOf(n));
  return idx.every((i) => i >= 0) && idx.every((i, k) => k === 0 || i > idx[k - 1]!);
}

describe('GET /digest/:night', () => {
  it('renders the table for a normal night', async () => {
    const res = await app.request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    for (const h of ['job', 'owner', 'runs', 'retries', 'last status', 'last error', 'first', 'last']) {
      expect(html).toContain(h);
    }
    expect(inOrder(html, JOBS)).toBe(true);
    expect(html).toContain('—');
    expect(html).toContain("1 line didn't parse");
  });

  it('says nothing ran for an empty night', async () => {
    const res = await app.request('/digest/2026-10-30');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });

  it('404s for a night with no file', async () => {
    const res = await app.request('/digest/2026-01-01');
    expect(res.status).toBe(404);
    expect(await res.text()).toContain('no run log for 2026-01-01');
  });

  it('counts a bad line but still renders', async () => {
    const res = await app.request('/digest/2026-10-31');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html).toContain('a/job');
    expect(html).toContain("1 line didn't parse");
  });
});

describe('GET /api/digest/:night', () => {
  it('returns the night as readNight does', async () => {
    const res = await app.request('/api/digest/2026-10-28');
    const body = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(body.night).toBe('2026-10-28');
    expect(body.rows.length).toBe(5);
    expect(body.badLines).toBe(1);
    expect(body.rows.map((r) => r.job)).toEqual(JOBS);
    expect(body.rows.find((r) => r.job === 'digest/render')?.owner).toBeNull();
    expect(body.rows.find((r) => r.job === 'fixtures/refresh')?.retries).toBe(3);
  });

  it('returns no rows for an empty night', async () => {
    const res = await app.request('/api/digest/2026-10-30');
    const body = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(body.rows).toEqual([]);
    expect(body.badLines).toBe(0);
  });

  it('404s with an error body for a missing night', async () => {
    const res = await app.request('/api/digest/2026-01-01');
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: 'no run log for 2026-01-01' });
  });

  it('counts a bad line', async () => {
    const res = await app.request('/api/digest/2026-10-31');
    const body = (await res.json()) as Night;
    expect(res.status).toBe(200);
    expect(body.rows.length).toBe(1);
    expect(body.badLines).toBe(1);
  });
});

describe('page and JSON agree', () => {
  it('lists the same jobs in the same order', async () => {
    const html = await (await app.request('/digest/2026-10-28')).text();
    const body = (await (await app.request('/api/digest/2026-10-28')).json()) as Night;
    expect(inOrder(html, body.rows.map((r) => r.job))).toBe(true);
  });
});
