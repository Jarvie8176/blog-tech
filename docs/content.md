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

## Editing and acceptance

1. Update the Chinese source and review which facts, examples, and status dates changed.
2. Update corresponding editorial translations together, including code comments, illustrative strings, qualifications, and external citations. If a translation is unavailable, omit its published entry rather than generating a false destination.
3. Keep the Python rule consistent across all three articles. Translated YAML values are illustrative text; field names and the approval requirements remain the same.
4. Check public content for private endpoints, credentials, internal operational records, and workstation paths. Only public-safe diagrams and selected aggregate status statements belong here.
5. Run all checks required by AGENTS.md. The browser scenarios check each localized title, both code examples, diagram loading and dimensions, same-article language links, search, and reading without JavaScript.

The public origin and production deployment process remain as documented in deployment.md.

## Yaaa topic page

The topic landing page lives at `/tech/topics/yaaa/`, `/tech/en/topics/yaaa/` and `/tech/ja/topics/yaaa/`. Astro emits static HTML redirects from the previous localized `/yaaa/` paths to these destinations. Article URLs under `/posts/yaaa/` are unchanged.
