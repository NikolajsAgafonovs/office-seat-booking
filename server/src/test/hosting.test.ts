// Hosting behaviour (decision 0009, api.md "Operations"): health check and static client.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createTestApp, type TestApp } from './helpers.js';
import { TMP_DIR } from './globalSetup.js';

let t: TestApp;
afterEach(() => t.close());

describe('health', () => {
  it('GET /api/health is public and says ok', async () => {
    t = await createTestApp();
    const res = await t.as(null, { method: 'GET', url: '/api/health' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true });
  });

  it('without CLIENT_DIST, unknown paths are JSON 404s', async () => {
    t = await createTestApp();
    const res = await t.as(null, { method: 'GET', url: '/anything' });
    expect(res.statusCode).toBe(404);
    expect(res.json()).toEqual({ error: { code: 'not_found', message: 'No such route' } });
  });
});

describe('static client', () => {
  const dist = path.join(TMP_DIR, 'client-dist');
  mkdirSync(path.join(dist, 'assets'), { recursive: true });
  writeFileSync(path.join(dist, 'index.html'), '<!doctype html><title>Office seat booking</title>');
  writeFileSync(path.join(dist, 'assets', 'app-abc123.js'), 'console.log(1)');

  it('serves index.html at / and as the fallback for client routes', async () => {
    t = await createTestApp({ clientDist: dist });
    for (const url of ['/', '/some/client/route']) {
      const res = await t.as(null, { method: 'GET', url });
      expect(res.statusCode).toBe(200);
      expect(res.headers['content-type']).toContain('text/html');
      expect(res.body).toContain('Office seat booking');
    }
  });

  it('serves hashed assets as immutable and keeps /api 404s as JSON', async () => {
    t = await createTestApp({ clientDist: dist });
    const asset = await t.as(null, { method: 'GET', url: '/assets/app-abc123.js' });
    expect(asset.statusCode).toBe(200);
    expect(asset.headers['cache-control']).toContain('immutable');
    const api = await t.as(null, { method: 'GET', url: '/api/nope' });
    expect(api.statusCode).toBe(404);
    expect(api.json()).toMatchObject({ error: { code: 'not_found' } });
    const post = await t.as(null, { method: 'POST', url: '/not-a-page' });
    expect(post.statusCode).toBe(404);
  });
});
