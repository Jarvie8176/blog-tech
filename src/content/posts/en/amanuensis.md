---
title: 'Amanuensis: architecture, components, and information integration'
description: 'Follow a fictional event update through collection, triage, and delivery to understand the three kits, private policy, and the limits of information integration.'
pubDate: 2026-10-28T10:00:00-07:00
translationKey: amanuensis-architecture
categories: [Yaaa]
tags: [Yaaa, Amanuensis, architecture, information, privacy]
toc: true
---

[Amanuensis](https://portfolio.fnpg.me/projects/amanuensis/) is the information collection, triage, and notification subsystem within [Yaaa](/en/posts/yaaa/). It turns incoming material into records, judges what deserves attention, and delivers it according to audience, sensitivity, and timing. Its first application, digest, turns a continuing mail stream into fewer, more useful notifications and summaries.

Receiving information still leaves the work of deciding what matters now. Mail, subscriptions, notes, and task tools each demand another inbox check. Summarizing every item can shorten the text without reducing interruptions.

This article moves from the overall architecture to component organization and information integration. **Mail collection, triage, and digest delivery have recorded operation; full task and note integrations, and cross-source event aggregation, need separate implementation and acceptance.** The diagrams describe responsibilities and interfaces, not an inventory of connected sources. The event example is entirely fictional.

## What happens to one email

Suppose I subscribe to a community event. An email moves it to Saturday, while a public newsletter still lists the old date. Fetching the update, preserving its origin and timestamp, judging its importance, choosing a notification time, and recovering from delivery failure are different jobs.

Recognizing that both documents refer to the same event adds entity matching, chronology, and conflicting evidence. Putting them in one database completes only the collection part of integration.

Amanuensis separates the main path into **gather / judge / deliver**. Each stage has its own inputs, results, and state. The consuming application connects them.

<div role="region" aria-label="Architecture diagram; scroll horizontally" tabindex="0" style="overflow-x: auto;">

<div style="min-width: 720px;">

![Amanuensis architecture: an application connects three independent kits, each with its own store; private policy enters at explicit boundaries](/images/amanuensis/architecture-en.png)

</div>

</div>

[Open the vector diagram](/images/amanuensis/architecture-en.svg)

The arrows represent data dependencies. digest connects the stages through store queries, conversions, and independent schedules. The kits do not have to run sequentially in one process. Collection and triage can run periodically while delivery waits for a digest window; upstream records can remain available when a later stage is unavailable.

## How the three kits are organized

The platform uses independently installable and testable Python packages:

```text
packages/
  ingest-kit/    # adapters, normalization, cursors, within-source dedup, records
  triage-kit/    # triage input, policy interface, model routing, verdicts
  push-kit/      # channels, admission checks, digest queue, delivery ledger
```

triage-kit does not import ingest-kit, and push-kit imports neither upstream kit. The application converts collected records into triage inputs, then joins valid verdicts with the original records to construct delivery inputs. Adapters, model endpoints, and channel implementations can change independently. The application pays for that flexibility by maintaining mappings and compatible contracts.

| Component          | Input and output                                  | State it owns                                       |
| ------------------ | ------------------------------------------------- | --------------------------------------------------- |
| `ingest-kit`       | Source adapter → normalized Item                  | Cursors, content hashes, records, run audit         |
| `triage-kit`       | Input + policy → structured verdict               | Results, model versions, retries, exceptions        |
| `push-kit`         | Delivery input + channel catalog → send or retain | Queue, attempts, refusals, explicit feedback states |
| digest application | Queries, conversions, joins, schedules            | Deployment, private policy, stage wiring            |

### ingest-kit: a common shape with the source preserved

Adapters understand the source protocol. A core record carries `source_id`, `external_id`, title, author, timestamp, body, and necessary metadata. Keeping the original identity lets downstream components locate an item through `(source_id, external_id)`.

Each adapter also owns its resume cursor. The engine stores and returns that opaque token without treating it as an incrementing integer. Mail UIDs, sync tokens, and time cursors can share a storage interface. A real new integration still needs an adapter, permission checks, and source-specific update and deletion behavior.

The current content hash provides **within-source duplicate suppression over selected fields**. It neither establishes that two sources describe one event nor performs semantic comparison of complete bodies. digest separates collection from triage, so collection needs no model call.

### triage-kit: an interpretation that can be inspected

One model call per item produces `priority`, `audience`, `summary`, `key_entities`, and `action_required`. This structured verdict becomes input to later policy. The rescheduling email might deserve attention while retaining a personal audience. Extracting an event and a date does not establish that another record has been merged with it.

The policy interface offers priority rules, audience rules, and a model-selection extension point. The basic implementation accepts configurable rule text. Decisions conditioned on live calendars, presence, or current plans require additional context wiring and implementation. An extension point alone does not establish continuous understanding of my plans.

Sensitivity selects the allowed endpoint before inference. High-sensitivity material uses a trusted local-only route. An unreachable endpoint yields `deferred`, to retry later, without a cloud fallback. Missing or invalid priority yields `degraded`, then `dead` after the retry limit, rather than an invented normal grade. Requested and actually served models also need distinct provenance; unavailable evidence stays unknown.

### push-kit: turn importance into an appropriate interruption

The five priority tiers are `must`, `should`, `fyi`, `ambient`, and `drop`. They express urgency and information value. **Delivery policy determines actual timing**: the bundled default is digest-first, and immediate delivery requires explicit configuration. A model returning `must` does not by itself trigger an immediate notification.

Policy can choose immediate delivery, the next digest window, or quiet retention. `drop` is recorded without delivery; `ambient` can remain available for later browsing. Neither grants execution authority. `action_required: true` says the user may need to pay attention.

Before sending, the engine independently checks audience equality and allows high-sensitivity items only onto channels configured as non-cloud. These checks also cover digest flush and use item attributes persisted in the delivery ledger. Unknown audience becomes personal; unknown sensitivity becomes high. Trusted channel configuration and underlying isolation still matter.

Local inference therefore does not authorize a cloud summary. Without an appropriate non-cloud channel, sensitive content remains unsent. The available `--dry-run` rehearses routing and admission without outbound calls or delivery-state writes.

## Where mechanisms and personal rules belong

Reusable code can easily become entangled with real family identities, accounts, and channels. Three policy tiers separate them:

| Tier              | Contents                                                          | Location                                  |
| ----------------- | ----------------------------------------------------------------- | ----------------------------------------- |
| T0 engine         | Storage, retries, interfaces, model routing, delivery checks      | Platform package                          |
| T1 defaults       | Generic priority rubric, prompts, default routing behavior        | Bundled platform defaults                 |
| T2 private policy | Real members, audience taxonomy, channel maps, personal overrides | Private consumer configuration or plugins |

This is a code and configuration boundary. Engine source excludes private identities and routing, but the running engine still handles private data, and plugins execute with their host process's privileges. The split does not automatically provide process isolation or log redaction.

Excluding sensitive policy from platform source reduces the work needed for reuse or future publication. It does not establish an open-source release or make runtime records safe to publish.

## Three layers of information integration

<div role="region" aria-label="Information integration diagram; scroll horizontally" tabindex="0" style="overflow-x: auto;">

<div style="min-width: 720px;">

![Three integration layers: collect independent source records, produce per-item verdicts, and assemble a delivery window; cross-source event merging requires additional implementation](/images/amanuensis/integration-en.png)

</div>

</div>

[Open the vector diagram](/images/amanuensis/integration-en.svg)

### Collection: records can be queried together

Sources share a record shape while retaining their original identity. A source identifier prevents matching IDs in two systems from becoming a false match. Timestamps, provenance, and run records explain where material came from and when it was collected.

The fictional update and newsletter remain two records. They can be queried and triaged together without erasing their differences.

### Interpretation: connect evidence with context

The established path chiefly performs per-item triage: rules and an individual item produce a verdict. Concluding that Saturday supersedes Friday additionally requires matching the event, comparing publication times and source authority, retaining the conflict, and explaining the conclusion with evidence.

Current plans, cross-source links, and human corrections are useful extensions. Entity fields, policy interfaces, and record identities provide places to connect them; they do not independently deliver event clustering, conflict resolution, or long-term memory.

Combined content must also retain source restrictions. A summary incorporating high-sensitivity material should preserve the appropriate sensitivity rather than becoming less sensitive because it is shorter. This is a requirement for future combinations that needs implementation and verification at every transformation. Existing per-item delivery checks cannot replace full derivation-chain controls.

### Presentation: several arrivals become one reading session

Windowed collection, ordering, and digest delivery can reduce interruptions even before semantic merging exists. Queues and the delivery ledger distinguish information collected, verdict produced, and message sent.

Items in one window need not share a topic. An optional prose overview cannot replace mechanically generated item indexes. If the overview fails, the basic indexed lines can still be delivered, so language generation does not determine the availability of the entire window.

The ledger associates deliveries by source, item, and channel, supporting retry suppression and diagnosis. An uncertain outcome can still occur between a database update and an external send and needs channel-specific reconciliation. A ledger alone does not provide strict exactly-once delivery across all channels. `sent`, `read`, and `acked` respectively record delivery, an explicit reading signal, and explicit acknowledgment; none establishes completion of the real-world task.

## How corrections affect later judgments

A review card offers low-cost signals: agree, should be higher, should be lower, or stop pushing this kind. Signals enter a feedback ledger. Repeated corrections can become candidate override rules, reviewed by a human before influencing later triage. Models interpret information; durable policy changes have a separate review step. [Portfolio technical explanation](https://portfolio.fnpg.me/projects/amanuensis/technical/)

This loop concerns triage corrections. Review cards, capture, candidate generation, and approved application each need their own verification. A depicted loop does not prove every production connection is complete, and it does not establish general SOP learning or cross-tool memory for Yaaa.

## Current boundaries and the next useful check

Existing records establish an operational mail collection, triage, and digest path in July 2026. This article, written October 28, 2026, explains recorded mechanisms; its publication date is not a fresh runtime acceptance. The portfolio [walkthrough](https://portfolio.fnpg.me/projects/amanuensis/walkthrough/) uses material sampled and reconstructed from the live system for presentation. It helps explain a record's journey without replacing acceptance checks.

| Scope                                                    | Claim used here                                                            |
| -------------------------------------------------------- | -------------------------------------------------------------------------- |
| Three kits and digest wiring                             | Implemented, with recorded mail-path operation                             |
| Sources beyond mail                                      | Extensible interfaces; adapters and production wiring checked individually |
| Live-plan context and cross-source event merging         | Further implementation and verification required                           |
| Triage feedback                                          | Designed and illustrated; verify each operational connection               |
| General conversation, long-term memory, approved actions | Broader Yaaa integration with separate delivery boundaries                 |

The useful next test returns to the rescheduled event: find the related records, identify old and new information and conflicts, explain why a reminder matters, and deliver it through an allowed route. Updating a calendar would enter Yaaa's action path, with separate approval and result verification.
