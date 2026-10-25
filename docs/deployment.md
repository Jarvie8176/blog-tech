# Cloudflare Pages and the blog gateway

tech is an independent Pages project. Its public mount is /tech, under https://blog.fnpg.me. Other sections can choose separate frameworks, themes and deployments.

## Build

```sh
bun install --frozen-lockfile
bun run build
bun run validate:site
```

Upload dist/ together with `_pagefind/`, HTML and all assets. The browser search API sets Pagefind baseUrl to /tech/ before initialization. For Pages Git integration, use the build command above and dist as output; Direct Upload can publish the same checked artifact. Project, credentials, preview/production selection and the final publishing workflow remain deployment work. The current CI saves artifacts but does not deploy.

## Path mapping

`gateway/worker.ts` exports the Cloudflare fetch handler. Set TECH_ORIGIN to the distinct Pages origin, with scheme and hostname only. Do not use blog.fnpg.me or include /tech in TECH_ORIGIN.

```text
Public URL                           Pages request
/tech/                               /
/tech/en/posts/yaaa/                  /en/posts/yaaa/
/tech/_astro/example.css             /_astro/example.css
/tech/_pagefind/pagefind.js           /_pagefind/pagefind.js
```

The gateway handles only /tech and /tech/*, normalizes /tech to /tech/, forwards GET/HEAD, strips the mount once, and excludes reader cookies/authorization. It returns upstream responses without following redirects, rewrites origin-local Location headers, and preserves preview noindex headers.

The origin must not redirect every request to blog.fnpg.me. For preview, use a gateway with the same mount rather than opening the Pages origin as if it were the public mounted site. Canonical metadata stays on the formal public URL.

`gateway/wrangler.toml` contains source configuration only, without claiming a production route. Configure hostname/route ownership at deployment. Other paths currently return 404. A future shared front door can dispatch arts, photo and notes to their declared origins.

## Shared ownership

Root homepage, robots.txt and the global sitemap index belong to the shared front door. tech contributes /tech/sitemap-index.xml and localized feeds. Keep per-site resources under their mounts, namespace browser storage and use normal navigation across sites.

## Before cutover

- Test the real Pages origin and gateway, including slash redirects, query preservation, conditional requests and failure responses.
- Fetch three-language articles, assets, search, RSS and sitemap through the public URL.
- Verify production canonical/hreflang and preview noindex, keeping previews out of the global sitemap.
- Coordinate root files without altering other sections.
- Record source SHA and deployment IDs, and exercise Pages/gateway rollback separately.

A local build is not evidence for live DNS or Cloudflare deployment. Credentials and production configuration are separate from theme adoption.
