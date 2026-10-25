# Chirping Astro adoption

The owner selected Chirping Astro on 2026-10-25, following [issue #2](https://github.com/Jarvie8176/blog-tech/issues/2). The imported commit and license are recorded in NOTICE.md. This site owns its adaptation rather than merging upstream demo content and publishing workflows.

## Adaptations

- Chinese-default zh/en/ja UI, dates, feeds, HTML and Open Graph metadata.
- `/tech` base for assets, fonts, Markdown links, Pagefind modules and result URLs.
- Actual article translation destinations rendered into HTML, without client-side link rewriting.
- Self-canonical language variants and existing-sibling hreflang; editorial translations link to the source.
- `blog.tech.theme` preference key and full-document navigation to isolate other blog sections.
- CJK typography and reading-time estimates, exercised by tables, code and a diagram in the introductory article.
- Site-owned SVG artwork and a rasterized PNG social preview instead of automatic remote OG generation. Bundled Latin/code fonts are self-hosted; CJK uses system fallbacks.
- Fixed-origin gateway, static artifact checks and desktop/mobile browser checks.
- Root robots.txt remains the shared front door's responsibility.

## Upgrade procedure

1. Compare the recorded upstream commit with the proposed update, dependencies and notices.
2. Review the adaptations above; do not import upstream identity, deploy/sync workflows or demo posts.
3. Update NOTICE.md and lock dependencies deliberately.
4. Run AGENTS.md checks, including missing translations, mounted search, assets and gateway redirects.
5. Recheck mobile reading, keyboard controls and no-JavaScript access.

Automatic LLM translation and live Cloudflare deployment are separate stages. Chromium checks cover the tested viewports and do not constitute a full screen-reader or production performance audit.
