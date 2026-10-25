import { describe, expect, test } from 'bun:test';
import { routeRequest } from './worker';

const env = { TECH_ORIGIN: 'https://tech-origin.pages.dev' };

describe('tech path gateway', () => {
  test('does not capture other blog paths or lookalike prefixes', async () => {
    for (const path of ['/', '/arts/', '/photo/', '/notes/', '/technology/', '/technique']) {
      const response = await routeRequest(new Request(`https://blog.fnpg.me${path}`), env);
      expect(response.status).toBe(404);
    }
  });

  test('normalizes the mount once while preserving the query', async () => {
    const response = await routeRequest(new Request('https://blog.fnpg.me/tech?q=a'), env);
    expect(response.status).toBe(308);
    expect(response.headers.get('location')).toBe('https://blog.fnpg.me/tech/?q=a');
  });

  test('strips the mount for HTML, assets, languages and search', async () => {
    for (const path of [
      '/tech/',
      '/tech/ja/posts/yaaa/',
      '/tech/_pagefind/pagefind.js',
      '/tech/_astro/site.css',
    ]) {
      let target = '';
      const response = await routeRequest(
        new Request(`https://blog.fnpg.me${path}?q=x`),
        env,
        async (input: Request) => {
          target = input.url;
          return new Response('ok');
        },
      );
      expect(response.status).toBe(200);
      expect(target).toBe(`https://tech-origin.pages.dev${path.slice(5)}?q=x`);
    }
  });

  test('a double-slash path cannot select an arbitrary origin', async () => {
    let host = '';
    await routeRequest(
      new Request('https://blog.fnpg.me/tech//example.org/x'),
      env,
      async (input: Request) => {
        host = new URL(input.url).host;
        return new Response('ok');
      },
    );
    expect(host).toBe('tech-origin.pages.dev');
  });

  test('rewrites redirects without fetching again or doubling the mount', async () => {
    for (const path of ['/en/posts/yaaa/', '/tech/en/posts/yaaa/']) {
      const response = await routeRequest(
        new Request('https://blog.fnpg.me/tech/old/'),
        env,
        async () => new Response(null, { status: 301, headers: { location: path } }),
      );
      expect(response.status).toBe(301);
      expect(response.headers.get('location')).toBe('https://blog.fnpg.me/tech/en/posts/yaaa/');
    }
  });

  test('preserves preview noindex and excludes client credentials', async () => {
    let credentials = '';
    const response = await routeRequest(
      new Request('https://blog.fnpg.me/tech/', {
        headers: { cookie: 'private=1', authorization: 'Bearer private' },
      }),
      env,
      async (input: Request) => {
        credentials =
          (input.headers.get('cookie') ?? '') + (input.headers.get('authorization') ?? '');
        return new Response('preview', {
          headers: { 'x-robots-tag': 'noindex', 'set-cookie': 'origin=1' },
        });
      },
    );
    expect(credentials).toBe('');
    expect(response.headers.get('x-robots-tag')).toBe('noindex');
    expect(response.headers.has('set-cookie')).toBe(false);
  });

  test('fails clearly for an unavailable or recursive origin and unsupported methods', async () => {
    expect(
      (
        await routeRequest(new Request('https://blog.fnpg.me/tech/'), {
          TECH_ORIGIN: 'https://blog.fnpg.me',
        })
      ).status,
    ).toBe(503);
    expect(
      (await routeRequest(new Request('https://blog.fnpg.me/tech/', { method: 'POST' }), env))
        .status,
    ).toBe(405);
    expect(
      (
        await routeRequest(new Request('https://blog.fnpg.me/tech/'), env, async () => {
          throw new Error('offline');
        })
      ).status,
    ).toBe(502);
  });
});
