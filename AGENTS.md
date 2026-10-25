# blog-tech development

This repository adapts Chirping Astro into `blog.fnpg.me/tech/`.

- Use Bun 1.4.4 and committed bun.lock. Preserve upstream MIT notices; see NOTICE.md.
- Chinese (`zh`) is the default, without locale prefix. English and Japanese are `/tech/en/` and `/tech/ja/`.
- Build internal destinations with localizedPath, postPath or withBase. Assets and Pagefind belong beneath `/tech`.
- SITE_URL is the public origin, without `/tech`; BASE_PATH defaults to `/tech`.
- UI text belongs in src/i18n/ui.ts, with every key in all three languages. Dates, feeds, HTML and SEO language metadata must agree.
- Render actual translation destinations into HTML. Missing translations must not create routes, language links or hreflang entries.
- Keep article reading and language links usable without JavaScript. Client preferences use tech-specific keys.
- Do not put local LLM calls in public requests or normal builds. Initial translations are editorial; automated translation is separate follow-up work.
- The gateway forwards only `/tech` and `/tech/*` to a fixed origin. Root homepage, robots and sitemap aggregation belong to the shared front door.
- No credentials or private source records belong in this public repository.
- Preserve useful upstream structure and document adaptations in docs/theme-adoption.md.

Before a PR, run `bun run typecheck`, `bun run lint`, `bun run format:check`, `bun test src gateway`, `bun run build`, `bun run validate:site` and `bun run test:e2e`. Browser tests use the built site behind the local gateway. Do not use upstream CI skip flags as acceptance evidence.

Update README and relevant docs when scripts, content fields, routing or deployment change.
