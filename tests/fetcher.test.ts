import assert from 'node:assert/strict';
import { test, afterEach } from 'node:test';
import { fetcher } from '../lib/fetcher';
const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
test('returns a successful directory response, including a genuinely empty directory', async () => {
  globalThis.fetch = async () => Response.json({ butchers: [] });
  assert.deepEqual(await fetcher('/api/butchers'), { butchers: [] });
});
test('rejects service outages so SWR retries rather than caching them as an empty directory', async () => {
  globalThis.fetch = async () => Response.json({ error: 'Unavailable' }, { status: 503 });
  await assert.rejects(fetcher('/api/butchers'), /503/);
});
test('rejects network failures', async () => {
  globalThis.fetch = async () => { throw new Error('Network unavailable'); };
  await assert.rejects(fetcher('/api/butchers'), /Network unavailable/);
});
