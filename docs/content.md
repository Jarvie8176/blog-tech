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

## Session closeout article

The second article lives at `src/content/posts/{zh,en,ja}/session-closeout.md`, with `translationKey: session-closeout-knowledge`. Public destinations are `/tech/posts/session-closeout/`, `/tech/en/posts/session-closeout/`, and `/tech/ja/posts/session-closeout/`. Each uses `/images/closeout/lifecycle-<language>.png`, a 2000 × 1720 PNG with an editable SVG beside it.

Preserve the distinction between manual five-step SOP practice, historical record assessment, the read-only status display, and the planned execution and knowledge-promotion paths. The six CLI rows are actual output from synthetic fixtures, not scanned personal histories. The experimental receipt is an input to that display, not a released procedure schema or proof of business completion. The 11 tests apply to the offline display, not to end-to-end automatic closeout or independent takeover.

The historical assessment is described in anonymized aggregate form. Public references use the blog's gateway fix; do not publish private issue links, raw journals, host identifiers, or original source records. The article's date does not refresh historical production acceptance. Keep handoff preparation separate from demonstrated takeover, and retain unknown states when evidence is unavailable.

The quantitative snapshot separates 92 discussion comments, 10 purposively reviewed case groups, and seven reread PRs. Five of those case groups were explicitly traced to method-bearing PRs: three merged and two open. The confirmed merged subset contains four substantive operating/acceptance documents (three new, one revised) and one verifier suite (implementation, synthetic tests, CI). Count case groups and artifacts separately; journals, indexes, and links are excluded from the method-artifact count. This is a confirmed lower bound, not an exhaustive inventory, conversion rate, or evidence of independent reuse. Keep all counts, units, status dates, and exclusions aligned across translations.

## Editing and acceptance

1. Update the Chinese source and review which facts, examples, and status dates changed.
2. Update corresponding editorial translations together, including code comments, illustrative strings, qualifications, and external citations. If a translation is unavailable, omit its published entry rather than generating a false destination.
3. Keep the Python rule consistent across all three articles. Translated YAML values are illustrative text; field names and the approval requirements remain the same.
4. Check public content for private endpoints, credentials, internal operational records, and workstation paths. Only public-safe diagrams and selected aggregate status statements belong here.
5. Run all checks required by AGENTS.md. The browser scenarios check each localized title, both code examples, diagram loading and dimensions, same-article language links, search, and reading without JavaScript.

The public origin and production deployment process remain as documented in deployment.md.
