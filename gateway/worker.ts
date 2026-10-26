/** Public routing boundary; the Pages origin serves the build root. */
export interface GatewayEnv {
  TECH_ORIGIN: string;
}

const PREFIX = '/tech';

export async function routeRequest(
  request: Request,
  env: GatewayEnv,
  upstreamFetch: (
    request: Request,
    options?: RequestInit & { cf?: { cacheTtlByStatus: Record<string, number> } },
  ) => Promise<Response> = fetch,
): Promise<Response> {
  const publicUrl = new URL(request.url);
  // Upgrade the public hostname at the edge; local HTTP previews stay usable.
  if (publicUrl.protocol === 'http:' && publicUrl.hostname === 'blog.fnpg.me') {
    publicUrl.protocol = 'https:';
    publicUrl.port = '';
    if (publicUrl.pathname === PREFIX) publicUrl.pathname = `${PREFIX}/`;
    return Response.redirect(publicUrl, 308);
  }
  if (publicUrl.pathname !== PREFIX && !publicUrl.pathname.startsWith(`${PREFIX}/`)) {
    return new Response('Not found', { status: 404 });
  }
  if (!['GET', 'HEAD'].includes(request.method)) {
    return new Response('Method not allowed', {
      status: 405,
      headers: { Allow: 'GET, HEAD' },
    });
  }
  if (publicUrl.pathname === PREFIX) {
    publicUrl.pathname = `${PREFIX}/`;
    return Response.redirect(publicUrl, 308);
  }

  let origin: URL;
  try {
    origin = new URL(env.TECH_ORIGIN);
    if (
      !['http:', 'https:'].includes(origin.protocol) ||
      origin.username ||
      origin.password ||
      origin.pathname !== '/' ||
      origin.search ||
      origin.hash ||
      origin.origin === publicUrl.origin
    ) {
      throw new Error('Expected a distinct origin without a path');
    }
  } catch {
    return new Response('Blog origin is not configured', { status: 503 });
  }

  // Set pathname, rather than resolving an untrusted "//host" relative URL.
  const target = new URL(origin);
  target.pathname = publicUrl.pathname.slice(PREFIX.length);
  target.search = publicUrl.search;
  const cacheableAsset =
    target.pathname.startsWith('/_astro/') ||
    target.pathname.startsWith('/images/') ||
    (target.pathname.startsWith('/_pagefind/') &&
      target.pathname !== '/_pagefind/pagefind-entry.json');
  const headers = new Headers();
  for (const name of ['accept', 'accept-encoding', 'if-none-match', 'if-modified-since', 'range']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  let response: Response;
  try {
    response = await upstreamFetch(
      new Request(target, {
        method: request.method,
        headers,
        redirect: 'manual',
        cache: cacheableAsset ? undefined : 'no-store',
      }),
      cacheableAsset ? undefined : { cf: { cacheTtlByStatus: { '100-599': -1 } } },
    );
  } catch {
    return new Response('Blog origin is unavailable', { status: 502 });
  }

  const outgoing = new Headers(response.headers);
  const location = outgoing.get('location');
  if (location) {
    const redirect = new URL(location, target);
    // Never follow origin redirects. Rewrite only this origin's paths.
    if (redirect.origin === origin.origin) {
      redirect.protocol = publicUrl.protocol;
      redirect.host = publicUrl.host;
      redirect.pathname =
        redirect.pathname === PREFIX || redirect.pathname.startsWith(`${PREFIX}/`)
          ? redirect.pathname
          : PREFIX + redirect.pathname;
      outgoing.set('location', redirect.toString());
    }
  }
  // Public content does not need cookies from a Pages origin.
  outgoing.delete('set-cookie');
  // Pages marks deployment hostnames noindex; the verified production mount
  // has its own canonical URLs and per-page robots meta (including search/404).
  if (
    publicUrl.hostname === 'blog.fnpg.me' &&
    /^[a-z0-9]+\.blog-tech-81q\.pages\.dev$/.test(origin.hostname)
  ) {
    outgoing.delete('x-robots-tag');
  }
  outgoing.set('x-content-type-options', 'nosniff');
  outgoing.set('referrer-policy', 'strict-origin-when-cross-origin');
  if (!cacheableAsset) outgoing.set('cache-control', 'no-store');
  return new Response(request.method === 'HEAD' ? null : response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: outgoing,
  });
}

export default {
  fetch(request: Request, env: GatewayEnv): Promise<Response> {
    return routeRequest(request, env);
  },
};
