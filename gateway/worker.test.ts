import { describe, expect, test } from 'bun:test';
import { routeRequest } from './worker';

const env = { TECH_ORIGIN: 'https://tech-origin.pages.dev' };

describe('tech path gateway', () => {
  test('production mount does not inherit the immutable deployment hostname noindex header', async () => {
    const response = await routeRequest(
      new Request('https://blog.fnpg.me/tech/'),
      { TECH_ORIGIN: 'https://12345678.blog-tech-81q.pages.dev' },
      async () =>
        new Response('<meta name="robots" content="noindex">', {
          headers: { 'x-robots-tag': 'noindex' },
        }),
    );
    expect(response.headers.has('x-robots-tag')).toBe(false);
    expect(await response.text()).toContain('content="noindex"');
  });

  test('revalidates content deletion and search manifests without serving a stale cache', async () => {
    for (const path of [
      '/tech/posts/removed/',
      '/tech/',
      '/tech/rss.xml',
      '/tech/sitemap-0.xml',
      '/tech/_pagefind/pagefind-entry.json',
    ]) {
      const response = await routeRequest(
        new Request(`https://blog.fnpg.me${path}`),
        env,
        async (input, options) =>
          input.cache === 'no-store' && options?.cf?.cacheTtlByStatus['100-599'] === -1
            ? new Response('removed', { status: 404 })
            : new Response('stale article', { status: 200 }),
      );
      expect(response.status).toBe(404);
      expect(response.headers.get('cache-control')).toBe('no-store');
    }
    for (const path of [
      '/tech/_astro/site.hash.css',
      '/tech/images/diagram.png',
      '/tech/_pagefind/fragment/hash.pf_fragment',
    ]) {
      const response = await routeRequest(
        new Request(`https://blog.fnpg.me${path}`),
        env,
        async (input) => {
          expect(input.cache).toBe('default');
          return new Response('asset', { headers: { 'cache-control': 'public, max-age=3600' } });
        },
      );
      expect(response.headers.get('cache-control')).toBe('public, max-age=3600');
    }
  });

  test('upgrades public HTTP requests without fetching, preserving paths and queries', async () => {
    for (const method of ['GET', 'HEAD', 'POST']) {
      for (const path of [
        '/tech',
        '/tech/',
        '/tech/ja/posts/yaaa/',
        '/tech/_pagefind/pagefind.js',
        '/arts/',
      ]) {
        const response = await routeRequest(
          new Request(`http://blog.fnpg.me${path}?q=%E7%9F%A5%E8%AD%98&lang=ja`, { method }),
          env,
          async () => {
            throw new Error('HTTP requests must not reach the origin');
          },
        );
        expect(response.status).toBe(308);
        expect(response.headers.get('location')).toBe(
          `https://blog.fnpg.me${path === '/tech' ? '/tech/' : path}?q=%E7%9F%A5%E8%AD%98&lang=ja`,
        );
      }
    }
  });

  test('keeps local HTTP previews usable', async () => {
    const response = await routeRequest(
      new Request('http://127.0.0.1:4321/tech/'),
      env,
      async () => new Response('preview'),
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('preview');
  });

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
