# Cloudflare Pages and the blog gateway

Production: https://blog.fnpg.me/tech/. The independent Pages project is `blog-tech`, project alias `https://blog-tech-81q.pages.dev`. The gateway TECH_ORIGIN points to the current immutable deployment URL, not the mutable alias. Worker `blog-tech-gateway` owns the `blog.fnpg.me` Custom Domain and forwards only `/tech` and `/tech/*`; other paths currently return 404. Future sections can add their own origins to the shared front door.

## Verified artifact publishing

`Site checks` validates PRs and main: types, lint, format, unit tests, Astro build, Pagefind, static artifact checks, Chromium desktop/mobile. It saves `site-<SHA>` for seven days.

`.github/workflows/publish.yml` runs after successful main **push** checks from this repository. It checks out that SHA, skips an obsolete main revision, downloads the matching checked artifact and invokes `scripts/cloudflare/publish.js`. It does not rebuild the site. Production publishes are serialized, and deployment receipts are retained for 30 days.

The publisher uses the Cloudflare REST API to upload static assets and create the Pages production deployment. It rejects Functions/routing files, checks the configured project and branch, waits for deployment success, verifies its canonical source SHA, and checks the public gateway. After the deployment succeeds, the publisher updates only the gateway TECH_ORIGIN binding to that immutable deployment URL, reads the binding back, and waits for the public page to show the verified source SHA. Gateway code and DNS remain separate releases.

Repository configuration:

- Actions secret `CLOUDFLARE_API_TOKEN`, supplied from the existing `CF_API_TOKEN_FNPG` credential.
- Actions variable `CLOUDFLARE_ACCOUNT_ID`, identifying the account owning the Pages project.
- Runtime `RELEASE_SHA`, supplied by the successful check run.
- Optional public Actions variables `PUBLIC_UMAMI_WEBSITE_ID` and `PUBLIC_UMAMI_SCRIPT_URL`, consumed during Site checks when building the artifact. These are a public website UUID and HTTPS tracker URL, never an Umami API token. Leave the ID empty to disable analytics; the privacy page reflects this state. Changing either variable requires a new checked main build before production changes.

No credential values belong in Git or logs. The credential source is the `homelab/cloudflare` 1Password item and the SOPS-age encrypted envctl cache. For headless operations use `~/cc/envctl --file ~/cc/.env.enc exec -- <command>` with the correct local tool PATH. The default plaintext `.env` is not the authoritative cache. Actions Secrets are an encrypted consumer copy; rotate/update that copy when changing the canonical credential.

## Public path mapping

```text
Public URL                           Pages request
/tech/                               /
/tech/en/posts/yaaa/                  /en/posts/yaaa/
/tech/_astro/example.css             /_astro/example.css
/tech/_pagefind/pagefind.js           /_pagefind/pagefind.js
```

SITE_URL is `https://blog.fnpg.me`; BASE_PATH is `/tech`. Pagefind sets its browser baseUrl before initialization. Opening a raw Pages origin does not emulate the public mount. Use `bun run preview:gateway` for local preview.

The gateway fixes TECH_ORIGIN to the current distinct immutable Pages deployment origin, forwards GET/HEAD, preserves queries, excludes reader cookies/authorization, rewrites origin-local redirects and removes origin cookies. Do not configure an origin-wide redirect back to blog.fnpg.me.

Content routes, feeds, sitemap and the Pagefind entry manifest use both Request.cache=no-store and Cloudflare's cf.cacheTtlByStatus with -1 for all statuses, and return Cache-Control: no-store. Request.cache alone did not bypass the stale cross-zone cache in production. Pages publishes cannot invalidate a separate stale Worker cache entry, which can otherwise keep deleted articles visible. Astro bundles, images and other Pagefind assets retain origin caching. These cache flags alone did not invalidate a cross-zone cached alias response in production. The authoritative release boundary is the immutable deployment origin, switched after every successful publish. No zone-wide purge permission is needed. On the verified public hostname only, the gateway removes the deployment-hostname X-Robots-Tag; per-page robots meta still excludes search and 404, while other preview origins retain their noindex header.

HTTP requests to `blog.fnpg.me` receive a permanent 308 redirect to the same HTTPS path and query before proxying. `/tech` also gains its trailing slash in that redirect, avoiding a second hop. Other paths upgrade to HTTPS and then retain their normal 404 behavior. Local HTTP preview hosts are exempt. This is a hostname-specific Worker policy, not a zone-wide setting for other fnpg.me services; release the Worker separately when changing it.

`gateway/wrangler.toml` remains a source/local configuration. Production bootstrap used the Cloudflare API with the compiled module, compatibility date 2026-10-25 and a plaintext TECH_ORIGIN binding. A Workers Custom Domain creates the hostname binding; it does not require zone Worker Routes access. Check existing DNS/domain ownership before a new binding. Separate gateway releases require separate verification and must not be folded into every article publish.

Root homepage, robots.txt and the global sitemap index belong to the shared front door. tech contributes `/tech/sitemap-index.xml` and localized feeds. Keep all section resources beneath their mounts and namespace browser preferences.

## Verification and rollback

Initial production bootstrap published source `80f7a82835c13d08fd045f4943c0923728b06349`, Pages deployment `768c7f1a-4d9a-4cfd-aa10-1402cdc4b331`. Current releases are identified by the workflow's `cloudflare-deployment.json` receipt, containing current and previous deployment IDs, source SHA and manifest digest.

Verify public three-language articles, assets, same-article language links, search, RSS, sitemap, redirects and missing pages after deployment. Preserve preview noindex and production self-canonical/hreflang. Full search quality, screen-reader and production performance audits remain separate work.

For a Pages rollback, inspect the recorded previous successful production deployment and invoke the Cloudflare Pages rollback endpoint or dashboard action, then update TECH_ORIGIN to that rollback deployment URL and recheck the public source SHA. The immutable binding must be switched along with a Pages rollback. The first deployment has no previous release to roll back to. Gateway/domain rollback is separate: keep its prior version/bindings and domain ID, and avoid changing other blog sections. Never treat an API upload response alone as proof that public routing works.
