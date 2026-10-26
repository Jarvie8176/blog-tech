# Content maintenance

## Yaaa introduction

The full introduction replaces the foundation's short introductory fixture while preserving its slug and translation key.

| Language | Source                         | Public article path    | Diagram                              |
| -------- | ------------------------------ | ---------------------- | ------------------------------------ |
| Chinese  | `src/content/posts/zh/yaaa.md` | `/tech/posts/yaaa/`    | `public/images/yaaa/overview-zh.png` |
| English  | `src/content/posts/en/yaaa.md` | `/tech/en/posts/yaaa/` | `public/images/yaaa/overview-en.png` |
| Japanese | `src/content/posts/ja/yaaa.md` | `/tech/ja/posts/yaaa/` | `public/images/yaaa/overview-ja.png` |

All variants use `translationKey: yaaa-introduction`. Their content follows the same illustrative rescheduling email, dated status snapshot, structured-source rule, approval envelope, retention discussion, and review proposal. Editorial translations preserve the distinction between recorded implementation and proposed improvements. They are not evidence of an automated translation pipeline.

The source-matching Python example is a proposal, not the current deployed glob implementation. Approval signatures, propagation of sensitivity through general derivations, and review limits also retain their stated design or acceptance status. Preserve these qualifications when editing or translating.

Amanuensis handles information triage and attention-aware delivery within Yaaa. Its triage interactions do not establish general-purpose conversation, long-term memory, or privileged calendar actions. Its five priority tiers govern notification timing, not execution permission. The portfolio walkthrough is sampled and reconstructed from a live system for presentation; it does not independently verify every adapter or refresh the dated acceptance table. Keep its existing routing, delivery gates, and reviewed triage-feedback loop distinct from proposed knowledge and SOP workflows across Yaaa.

## Assets and links

Each architecture diagram has a 2320 × 1320 PNG and an editable SVG beside it. The approval flow has a 1680 × 1920 PNG and an editable SVG at `public/images/yaaa/approval-flow-<language>.*`. Diagram labels name the actor explicitly (user or assistant), avoiding an ambiguous first-person narrator. The approval diagram shows five user-facing steps and a refusal/defer branch; signing, hashing, and nonce details belong in the accompanying prose. Use the matching language's PNGs in each article. Use root-relative `/images/yaaa/<name>-<language>.png` paths in Markdown; the existing base-links plugin adds the configured mount at build time. Do not include `/tech` twice or copy workstation paths into content.

Language links for articles are generated from real content entries. Each article displays both diagrams in its own language, without links to other language images. Preserve alt text and the conceptual-design caption. The first body mention of Yaaa links to its portfolio project page; introduce Amanuensis and link to its portfolio project page before using the component name in the progress table. Keep progress descriptions in plain language and preserve the October 25, 2026 evidence date until new evidence supports an update.

## Homelab Ops

The two articles live at `src/content/posts/{zh,en,ja}/why-homelab.md` and `managing-homelab-with-ai.md`. Their translation keys are `homelab-ops-why` and `homelab-ops-management`. The shared topic registry matches category `Homelab Ops` and generates `/tech/topics/homelab-ops/` with corresponding `/tech/en/` and `/tech/ja/` destinations, linked from the topic index, sidebar and homepage. Category pages remain available separately.

The follow-up architecture article lives at `src/content/posts/zh/homelab-ops-what.md` with translation key `homelab-ops-what`. It introduces the operations stack before explaining infrastructure, SSH access, knowledge projections and execution paths. Its Mermaid diagram requires `mermaid: true`. Only the Chinese article is available; do not generate English or Japanese article destinations until corresponding translations exist. Keep the distinctions between declared, accepted, deployed and observed state, and between implemented mechanisms and ongoing migrations. The private research ledger remains outside this repository.

The Chinese source and editorial Japanese/English translations retain the same personal history, six service groups, monthly quantities, SSH incident scope, and thesis about human understanding and control. Keep normative goals separate from delivered or verified capabilities. Personal experience is dated to 2022; manual management continued before 2026. The first exact AI-delegation date is not asserted.

Each management article embeds three images in its own language: `monthly-scale-<locale>.png`, `relative-growth-<locale>.png`, and `monthly-activity-<locale>.png`. They are 3216 pixels wide; heights are 2208, 1896 and 2112 respectively. SVG exports preserve outlined glyphs. All languages use one aggregate dataset and the same axes; chart text is translated editorially.

The observations end at October 25, 2026, 12:57 America/Vancouver. May starts at repository creation on May 13 and includes imported material; October is partial. Service counts are inventory declarations, ADR totals include proposals and historical records, and first-parent commit counts are not PR counts or work hours. Relative growth cannot establish AI efficiency, reliability or governance cost. The public dataset contains aggregate counts only; private inventories, source records, endpoints and repository identifiers are not published.

To redraw charts, create an isolated Python 3.10+ environment, install `scripts/charts/requirements.txt`, and run `python scripts/charts/homelab.py --font /path/to/NotoSansCJK.otf`. The script reads `scripts/charts/homelab-monthly.csv` and writes assets and a public data-hash manifest beneath `public/images/homelab-ops/`. Keep the downloadable copy at `public/data/homelab-ops-monthly.csv` identical. Python rendering and any model calls stay outside normal builds and public requests.

The Homelab browser checks cover the six article destinations, paired language links, chart loading and dimensions, both viewport sizes, no-JavaScript reading and the downloadable CSV.

## Editing and acceptance

1. Update the Chinese source and review which facts, examples, and status dates changed.
2. Update corresponding editorial translations together, including code comments, illustrative strings, qualifications, and external citations. If a translation is unavailable, omit its published entry rather than generating a false destination.
3. Keep the Python rule consistent across all three articles. Translated YAML values are illustrative text; field names and the approval requirements remain the same.
4. Check public content for private endpoints, credentials, internal operational records, and workstation paths. Only public-safe diagrams and selected aggregate status statements belong here.
5. Run all checks required by AGENTS.md. The browser scenarios check each localized title, both code examples, diagram loading and dimensions, same-article language links, search, and reading without JavaScript.

The public origin and production deployment process remain as documented in deployment.md.

## Yaaa topic page

The topic landing page lives at `/tech/topics/yaaa/`, `/tech/en/topics/yaaa/` and `/tech/ja/topics/yaaa/`. Astro emits static HTML redirects from the previous localized `/yaaa/` paths to these destinations. Article URLs under `/posts/yaaa/` are unchanged.

## Adding a topic

Add a definition to `topicDefinitions` in `src/config.ts`: a unique URL-safe `key`, the exact category to match, and translation keys for its navigation label, title, introduction and description. Supply every key in all three dictionaries in `src/i18n/ui.ts`; the registry checks the key types. Keep category names consistent across article translations.

The shared `src/pages/[...locale]/topics/[topic].astro` template generates each configured topic in all site languages and selects published posts by the configured category. The registry also drives the topic index cards, sidebar children and homepage links. No new page file or duplicated path is needed. Unregistered topics return 404; drafts continue to follow the existing production post filtering. Redirects for historical URLs remain explicit migration rules in `astro.config.mjs`.
