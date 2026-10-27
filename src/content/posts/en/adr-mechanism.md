---
title: '[10] ADRs and decision evolution in Homelab Ops'
description: 'How Homelab Ops uses MADR Light, real supersession chains, pending IDs, lifecycle states, automatic numbering, relationship maintenance and CI to preserve architectural decisions.'
pubDate: 2026-10-26T23:30:00-07:00
translationKey: homelab-ops-adr-mechanism
categories: [Homelab Ops]
tags: [homelab, adr, madr, architecture, automation]
toc: true
---

Configuration can tell me where a service runs today. It may no longer tell me why I put it there several months ago.

The original choice might have reflected limits on memory, networking or permissions. It might simply have been the cheapest temporary arrangement. As the environment changes, those tradeoffs may stop making sense. If the reasons survive only in chats and commit messages, the next maintenance task starts with another investigation. The person taking over could be my future self, or an AI agent that never participated in the original discussion.

I want the operations repository to preserve both the current choice and the reasoning that led to it. Git records changes to files, runbooks explain procedures, and ADRs make the context, choices and costs of important decisions traceable.

[Article 09, Fleet Sync (Chinese)](/posts/fleet-sync/), covered configuration distribution: an earlier hub coordinated distribution to spokes, while the successor has nodes pull content from Git and apply it in response to notifications. Here I use those decisions as examples to explain the ADR mechanism itself: how records are organized, how proposals enter a lifecycle, how successor decisions replace earlier ones, and which maintenance tasks tools can perform.

## What ADR and MADR provide

ADR stands for Architecture Decision Record. A record focuses on one significant decision and describes its context, choice, status and consequences. It might cover service placement, data storage, identity boundaries or configuration distribution.

In his introduction to ADRs, Michael Nygard explains that an old record should remain after its decision changes, with a status indicating that a successor supersedes it. Later maintainers can then understand the past and identify conclusions that no longer apply. [Documenting Architecture Decisions](https://www.cognitect.com/blog/2011/11/15/documenting-architecture-decisions)

MADR stands for Markdown Architectural Decision Records. It provides structured Markdown templates for describing the problem, options, outcome and tradeoffs. The upstream project offers full and minimal templates that projects can choose according to their needs. [Official MADR documentation](https://adr.github.io/madr/)

ADRs establish the practice of preserving decision information; MADR helps authors organize that information into documents. Projects still need their own rules for numbering, whether supersession can branch, when a new record is required, and what CI should check.

These records also have a specific role within an operations repository:

| Artifact                               | Main question it answers                                     |
| -------------------------------------- | ------------------------------------------------------------ |
| ADR                                    | Why was this choice made, and which costs were accepted?     |
| Runbook                                | What are the steps for execution, verification and recovery? |
| Configuration and inventory            | What configuration and resource relationships are declared?  |
| Runtime checks and deployment evidence | What is actually running, and does it meet expectations?     |

When deciding whether to write an ADR, I usually ask whether a future change will require understanding the original constraints and costs. Service boundaries, data models, permissions and long-term dependencies usually deserve a record. Temporary troubleshooting can stay in an issue, while operational steps belong in a runbook.

## Why homelab-ops uses a MADR Light variant

ADR-0026 calls the project's template MADR Light. It retains Context, Decision, Consequences and Rejected alternatives, while allowing the author to choose a level of detail appropriate to the problem. Replacing a distribution architecture needs a detailed comparison; a smaller interface convention might need only a few paragraphs.

The lightweight template keeps the cost of recording a decision proportional to its scale. A record can be short, but it still needs the context, choice, consequences and reasons for rejecting other options. A conclusion alone gives a future maintainer little basis for deciding whether it still applies under new constraints.

The template also needs rules for handling change. Early records accumulated Amendment sections. ADR-0026 describes the resulting problem: an ADR for the photo pipeline had developed contradictions between its original text and successive amendments. Readers had to reconstruct the applicable version from the original decision and its patches.

The project therefore adds several conventions: substantive changes to the body of an accepted decision go into a new ADR; full supersession forms a linear chain; partial supersession identifies its scope; and tools maintain numbering, indexes and relationships. These are homelab-ops engineering choices, rather than requirements that MADR imposes on every project (ADR-0026).

## The structure of a homelab-ops ADR

A homelab-ops ADR is a Markdown file under `decisions/`, with three parts: identity and status, the decision body, and navigation and references.

ADR-0049 records the earlier hub-spoke distribution design. ADR-0059 records its successor, using git-pull and notification-triggered application. The latter file is named `adr-0059-fleet-sync-gitpull-ntfy.md`: 0059 is its sequential number, and the remainder identifies the topic. The file begins with YAML metadata between two `---` lines, also called front matter:

```yaml
---
id: '0059'
uuid: 73fa7bc9
title: Fleet distribution — git-pull + ntfy-triggered apply-agent
date: 2026-07-03
status: accepted
original-adr: '0049'
original-adr-uuid: da2bdab9
supersedes: '0049'
supersedes-uuid: da2bdab9
---
```

`id` is used in everyday references. `uuid` is the project's stable eight-character hexadecimal alias; it remains unchanged when a draft receives its official number. `title` and `date` identify the subject and record date, while `status` describes the decision's current lifecycle stage. Identity fields help locate the same record; status helps determine how to use it.

This record has both `original-adr: "0049"` and `supersedes: "0049"` because ADR-0049 is its immediate predecessor and the beginning of this decision chain. If a later decision supersedes ADR-0059, that new record's immediate predecessor will be 0059, while the chain root remains 0049. The corresponding `-uuid` fields allow the stable identities of related records to be checked.

The body explains judgments that fields cannot express. The lightweight structure focuses on four areas:

| Section               | What to include                                             | What the reader should understand                     |
| --------------------- | ----------------------------------------------------------- | ----------------------------------------------------- |
| Context               | The problem, constraints and new facts prompting a decision | Why decide now, and under which limitations?          |
| Decision              | The choice, scope and key rules                             | What has been decided, and what remains undecided?    |
| Consequences          | Benefits, costs and accepted limitations                    | What follows from the choice, and what must be borne? |
| Rejected alternatives | Options considered and reasons for not choosing them        | Why are other viable options unsuitable now?          |

Authors need not copy the headings mechanically. ADR-0059 uses `Alternatives` and adds sections on the configuration model, health visibility and migration. Those sections explain applicability and implementation constraints. Links to runbooks carry the everyday procedures that will continue to change.

Navigation connects the historical record to the current entry point. ADR-0049's front matter and opening notice point to ADR-0059, while its historical body retains the original reasons for the choice. Issues, design documents and related ADRs at the end provide paths back to discussion and implementation.

Complete English versions of both records are available in the same public Gist: [ADR-0049](https://gist.github.com/cyber-ayi/bee0dc359a661352ced8152f52f76fee#file-adr-0049-fleet-sync-hub-spoke-distribution-md) and [ADR-0059](https://gist.github.com/cyber-ayi/bee0dc359a661352ced8152f52f76fee#file-adr-0059-fleet-sync-gitpull-ntfy-md).

## From proposal to accepted decision

An ADR's lifecycle describes how a decision is treated: `proposed` is a proposal, `accepted` is an accepted decision, and `rejected` is a proposal that was not adopted. An accepted decision can later be deprecated or superseded by a new one.

<div role="region" aria-label="ADR lifecycle: review accepts or rejects a proposal; an accepted decision can be deprecated or superseded. Horizontally scrollable." tabindex="0" style="overflow-x: auto;">

<div style="min-width: 560px; width: 640px; max-width: 100%;">

![ADR lifecycle: a proposal is accepted or rejected; an accepted decision can be deprecated or superseded](/images/adr-mechanism/lifecycle-en.png)

</div>

</div>

[View SVG](/images/adr-mechanism/lifecycle-en.svg) · [Mermaid source](/images/adr-mechanism/lifecycle-en.mmd)

Accepting an ADR means agreeing to its choice and costs. Review needs to establish whether the problem is real, the constraints are complete, alternatives have been compared reasonably, and the outcome can be verified. Finishing the file, passing CI or receiving a number cannot make that judgment on its own. The diagram describes process semantics; keeping repository fields aligned with actual decisions depends on the maintenance mechanisms discussed below.

`rejected` and `deprecated` preserve different histories. The former never became an accepted approach; the latter was once valid and later ceased to apply. `superseded` also identifies a replacement, showing readers where to continue. Preserving these distinctions helps prevent the same proposal from being raised repeatedly without its historical context.

ADR-0042 is a real example of rejection. It proposed Perses as the eventual monitoring presentation solution. Its opening notice records rejection on June 30, 2026 and states that it never entered `accepted`. ADR-0051 continues the subsequent direction. This preserves an option that was not adopted, rather than a previously established choice that later became obsolete.

### pending means waiting for a number

`pending` describes a separate concern: numbering is unfinished. It appears in `id: pending` and filenames such as `adr-pending-<uuid>-<slug>.md`. It is not a decision state in `status`.

Separating numbering from decision status supports parallel drafting. Multiple authors or agents can generate stable UUID aliases without competing for the same “next number.” A shared post-merge workflow assigns sequential numbers. During discussion, the UUID and draft path identify the record.

| ID field      | Decision status | Meaning                                                                                                |
| ------------- | --------------- | ------------------------------------------------------------------------------------------------------ |
| `id: pending` | `proposed`      | Unnumbered; the decision is still under discussion                                                     |
| `id: pending` | `accepted`      | The decision is accepted and awaiting numbering                                                        |
| `id: 0071`    | `proposed`      | Numbered, but its status field still says proposal; the Music Assistant chain below ends in this state |
| `id: 0059`    | `accepted`      | Numbered and accepted; deployment progress still needs separate verification                           |

A draft for a new topic also uses `original-adr: pending`, indicating that it will become its own chain root. Number assignment updates that field along with `id`. A draft superseding an existing ADR inherits the original chain root immediately; only the new record's own `id` awaits assignment. In both cases, `uuid` and `original-adr-uuid` retain their respective stable identities.

Pending files can temporarily exist on the main branch. Merging the draft PR triggers the numbering workflow, which creates a second PR. The official filename and number enter the main branch only when that PR merges. Waiting for a number therefore does not establish whether a decision is awaiting acceptance or has been rejected. The two-PR process is explained below.

Deployment progress is a third independent concern. Article 09 describes a stage where the successor distribution design had its core implementation but fleet-wide migration remained incomplete. Even after an ADR is accepted, tasks, deployment records and acceptance evidence are needed to establish implementation progress. [Fleet Sync implementation boundaries (Chinese)](/posts/fleet-sync/)

## Preserve decision history through supersession

Old records remain useful when decisions change. ADR-0049 preserves the context and costs of choosing hub-spoke. ADR-0059 preserves the facts that prompted reconsideration and the new tradeoffs. Supersession connects them, allowing readers to find the successor and understand why it was not the original choice.

homelab-ops requires full supersession to be linear. A new ADR's `supersedes` field can identify only one predecessor, that target must be `accepted` on the main branch, and supersession cannot fork from the same predecessor. This gives tools an unambiguous answer to where a historical chain ultimately leads.

| Field                 | Meaning                                             |
| --------------------- | --------------------------------------------------- |
| `supersedes`          | The immediate predecessor replaced by this ADR      |
| `original-adr`        | The first ADR in the chain                          |
| `superseded-by`       | The chain end to which the old ADR currently points |
| `superseded-by-chain` | A record of intermediate supersession steps         |

When the chain grows, an old ADR's `superseded-by` points to the new end, while `superseded-by-chain` preserves the intermediate path. The same record supports both finding the latest successor and studying how the decision evolved.

Preserving an old decision does not freeze every byte of its file. The project retains the historical decision body while allowing maintenance of supersession status, navigation pointers, references and prescribed annotations. Historical reasoning and current navigation have separate roles.

### A real three-generation Music Assistant chain

Music Assistant has a real three-generation chain: ADR-0009 → ADR-0028 → ADR-0071. The relationships and statuses below reflect records checked on October 26, 2026.

ADR-0009 chose a1989's macOS container environment and accepted its limitations. ADR-0028 subsequently addressed port-binding compatibility, extracting network changes from an earlier Amendment into a separate record. By ADR-0071, playback backend and networking requirements had changed. The recorded choice became the Linux host tp-server, host networking and the Soloist backend.

The relationships in the current files already extend to 0071: both 0009 and 0028 are marked `superseded by ADR-0071` and point directly to it. Yet 0071's front matter still says `status: proposed`. The diagram preserves that actual field value:

<div role="region" aria-label="Music Assistant ADR chain: 0009 to 0028 to 0071. Older records point to the chain end; 0071 remains proposed. Horizontally scrollable." tabindex="0" style="overflow-x: auto;">

<div style="min-width: 520px; width: 520px; max-width: 100%;">

![Music Assistant ADR evolution from 0009 through 0028 to 0071, whose status remains proposed](/images/adr-mechanism/music-assistant-chain-en.png)

</div>

</div>

[View SVG](/images/adr-mechanism/music-assistant-chain-en.svg) · [Mermaid source](/images/adr-mechanism/music-assistant-chain-en.mmd)

Solid arrows run from older to newer records to show the recorded supersession order. The dashed arrow shows direct navigation from an old record to the chain end. The actual `supersedes` field points in the reverse direction, to the immediate predecessor. The three files contain these values:

| ADR  | original-adr | supersedes | superseded-by | superseded-by-chain |
| ---- | ------------ | ---------- | ------------- | ------------------- |
| 0009 | 0009         | None       | 0071          | [0028, 0071]        |
| 0028 | 0009         | 0009       | 0071          | [0071]              |
| 0071 | 0009         | 0028       | None          | None                |

0028 and 0071 each retain their immediate predecessor; all three retain 0009 as the root. From 0009, `superseded-by: 0071` reaches the chain end directly, while `[0028, 0071]` preserves the intermediate changes. Root, immediate predecessor and chain end serve different purposes.

This example also carries traces of the transition from earlier rules. The body of 0028 changes only the networking row and its consequences, retaining the other decisions from 0009, but its metadata expresses full supersession. It was extracted from an old Amendment. A comparable change today should use the partial-supersession mechanism in the next section.

0071's proposed value also exposes a practical lifecycle-maintenance problem. Its creation PR #2308 and numbering PR #2311 have both merged. Migration epic #2306 contains implementation records, and incident #2297 records confirmation of audible Spotify playback on October 6 after the instance was restored and reconfigured. Work advanced without a matching status update. Reading tools can detect this discrepancy; correcting it requires returning to the decision evidence. The proposed field alone cannot establish that migration has not started.

Queries faithfully preserve the discrepancy: `chain-of 0009` returns `0009,0028,0071`, and `terminal-of 0009` returns `0071`. Meanwhile, `status-of 0071` returns `proposed`, and `is-active 0071` exits with code `1`. Position at the chain end and accepted status are independent query results.

### Partial supersession preserves unaffected scope

When only part of a decision changes, marking the entire ADR obsolete would invalidate content that still applies. ADR-0056 changes ADR-0034's workstream definition and related constraints while retaining the other classifications. It therefore creates a separate ADR and adds scope annotations at the relevant locations in the old record. The old record remains accepted, and the full-supersession `supersedes` field stays empty.

This keeps full supersession chains simple, but leaves partial relationships in prose. A useful next step would be a queryable scope index that answers “which ADR defines this part now?” The following is a design proposal that has not been implemented.

The new ADR would declare the target ADR's stable UUID, an identifier for the overridden scope, and the location of the new decision. Those relationships would generate notices in the old record and a query index. Scope identifiers should refer to decision items rather than unstable line numbers. For 0056, separate entries are needed for the workstream definition, the authoritative documentation entry point and CI invariant #3 to cover the full change.

A query for 0034 should return reading entry points organized by scope:

| Scope queried                                                | Decision to locate | Explanation to retain                                                          |
| ------------------------------------------------------------ | ------------------ | ------------------------------------------------------------------------------ |
| Workstream definition                                        | ADR-0056           | Changed to a repeatable pipeline or SOP spanning stacks                        |
| Workstream's authoritative documentation and CI invariant #3 | ADR-0056           | Points to workflow documentation and checks that the corresponding file exists |
| Other classifications, including app, stack and host         | ADR-0034           | Unaffected by this partial supersession                                        |

The query should return the full supersession chain, partial overrides, record statuses and body locations. Accepted overrides enter the effective result; proposed ones appear separately as pending changes. If multiple effective decisions cover the same scope with no established precedence, the tool should report a conflict rather than choose by date or number. If a successor is itself superseded, inheritance of the original override scope must also be explicit.

CI could check that targets and scopes exist, relationships are acyclic, overrides do not conflict, and generated output matches declarations. The accuracy of the scope still needs review. The 0034/0056 pair could validate the design before other records migrate. Unindexed partial relationships should produce an explicit notice and a link to their original annotation. If accumulated overrides become difficult to read together, a new complete ADR can consolidate the decisions that remain effective and supersede the whole record after review.

## How the ADR mechanism is automated

Records and relationships require continuing maintenance. homelab-ops stores decisions in Markdown, maintains numbering and navigation with scripts, and uses CI to check explicit constraints. The README and chain index are generated from ADRs, reducing the burden of maintaining separate lists by hand.

### Draft creation and number assignment

`adr-new.py` generates an eight-character hexadecimal UUID and checks for collisions against the existing chain index. A new topic receives a body skeleton and a self-referencing root placeholder. A replacement draft inherits the original root, records the immediate predecessor and copies its body for section-by-section revision. This reduces missing fields and makes differences between the old and new decision easier to inspect.

```bash
python3 tools/adr-new.py example-topic
python3 tools/adr-new.py --supersedes NNNN replacement-topic
```

`NNNN` in the second command is the actual predecessor's number. The generator first checks the target's status using the local index. PR checks validate it again against the merge baseline, accounting for main-branch changes since drafting.

After pending files merge into `main`, `adr-assign.yml` runs numbering serially. It orders files by when they were first introduced, then assigns increasing numbers from the current maximum. Files introduced at the same time are sorted by filename, making the assignment order reproducible.

The numbering tool renames files, replaces `id` and new-topic root placeholders, updates titles, and rewrites pending paths and `ADR-<uuid>` references throughout the repository. Stable UUIDs and decision statuses are preserved: receiving a number does not automatically turn proposed into accepted.

### Maintaining supersession chains and references

When a new record declares `supersedes`, `adr-supersede.py` updates its predecessor and ancestors: status, chain-end ID and UUID, historical path and opening notice. It preserves the first supersession date, refreshes the chain-update date and retains the root. This lets old ADRs preserve their historical path while pointing directly to the new chain end.

Next, `adr-supersede-sweep.py` scans runbooks, documents and ADR references within its configured scope, adding HTML comments containing the successor number beside old references. It retains the original links and prompts authors or agents reading the source to check applicability. These comments normally do not appear in rendered prose, and they do not mean the script has determined whether a reference should be deleted or rewritten.

Finally, `adr-chain-gen.py` rebuilds `.terminal-map.json` from front matter, calculates roots, members and endpoints, and checks for branches and cycles. `adr-readme-gen.py` updates the reading index from that data. Derived files provide queryable, browsable entry points; the decisions themselves remain in ADRs.

### How two PRs complete one numbering operation

The numbering workflow performs transformations on a working branch and runs `adr-verify.sh --no-pending` to ensure that no files remain unnumbered and no corresponding validation errors remain. It then creates an automated PR. Official numbers reach the main branch only when that PR merges.

<div role="region" aria-label="Automatic ADR numbering: draft PR merge, number assignment, validation and numbering PR merge. Horizontally scrollable." tabindex="0" style="overflow-x: auto;">

<div style="min-width: 560px; width: 560px; max-width: 100%;">

![Automatic ADR numbering through a draft PR and a generated numbering PR](/images/adr-mechanism/numbering-flow-en.png)

</div>

</div>

[View SVG](/images/adr-mechanism/numbering-flow-en.svg) · [Mermaid source](/images/adr-mechanism/numbering-flow-en.mmd)

The PR preserves the automated changes as an inspectable diff, with review and CI entry points. The workflow tries to enable auto-merge; if unavailable, it waits for a manual merge. Serial execution reduces contention during assignment, but creating and merging the PR remain separate stages, and PR checks must confirm the result. With no pending files, the numbering job exits. Validation failure prevents creation of the numbering PR; the workflow can be triggered again after a fix.

### What the CI layers check

The PR workflow combines its checks into `adr-corpus`. Ordinary PR validation allows pending files, while `--no-pending` at the end of the numbering workflow requires assignment to be complete. The same validator uses different modes for the valid states of each stage.

| Layer                      | Mechanical checks                                                                                                                             | Problem to prevent                                                           |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Files and numbering        | New files use pending names; numbers, UUIDs, required fields and status values follow the rules                                               | Competing manual number assignments, duplicate identities and missing fields |
| Relationships and baseline | The predecessor is accepted at the merge baseline; existing roots cannot change; chains cannot branch or cycle                                | Branching from an obsolete predecessor or rewriting a chain's origin         |
| Body changes               | Compare protected bodies with the baseline; prohibit new Amendment sections; allow prescribed relationship annotations and reference rewrites | Changing a recorded decision and its reasons in place                        |
| Derived files              | Regenerate the chain index and README, then compare the Git diff                                                                              | Inconsistent bodies and indexes, or hand-edited generated output             |

Relationship and body checks need the PR's effective merge baseline to distinguish the proposed changes from changes already on the main branch. Derived files are checked by regeneration and a Git diff. If differences remain, the author needs to commit generated output consistent with the ADRs.

`adr-corpus` runs on every PR. Unrelated changes pass quickly, rather than skipping the entire workflow with a path filter. Required checks therefore always return a result, so an unrelated PR cannot remain waiting for a check that will never appear.

### Why a status can remain proposed

Automatic numbering and decision acceptance are separate. The current workflow maintains supersession chains whenever it finds `supersedes`; it does not additionally require the new record to be accepted. R1 checks the predecessor's status at the baseline. Numbering and relationships can therefore advance while the new record remains proposed, as the Music Assistant example shows.

A different situation arises when a PR has not merged. As of October 26, 2026, browser migration PR #2353 remained open. Its Helium ADR had both `id: pending` and `status: proposed`, with subdecisions D1–D7 awaiting operator confirmation. The direction had been discussed, but the detailed tradeoffs and the main-branch record had yet to converge.

When reading proposed, distinguish three possibilities: the decision awaits confirmation; an acceptance update awaits merge; or related PRs have merged without updating the status field. Merging a draft that still says proposed does not automatically produce accepted.

Issue #2231 tracks ADR lifecycle fields drifting away from actual decisions. Its snapshot listed 14 proposed records, several with evidence of production execution. A follow-up review confirmed the missing successor-status check and proposed reconciling historical decisions before adding mechanical enforcement. At the article's verification date, the issue remained open, awaiting the corresponding lifecycle confirmations.

This repair needs an ordered approach. At review time, a new rule prohibiting a proposed successor would flag existing records including 0032, 0033 and 0046. Enabling it immediately would let historical data block checks. Status corrections should follow decision evidence, after which checks and regression cases can be added and the process meaning of proposed documented. Production use is a clue to investigate; it cannot automatically justify bulk acceptance.

This returns to the division of work in [article 05, “Too many PR reviews!”](/en/posts/pr-review-too-many/). Agents can organize evidence, find status discrepancies, and prepare fixes and tests. People need to confirm unresolved scope and costs. After confirmation, the acceptance evidence, status update and carrying PR should be tracked together until the main branch matches the decision. This reduces repeated judgment and avoids asking the same question on every read.

## Help people and agents read decisions correctly

As documents accumulate, the reading path matters more. Search results may come from old runbooks, historical ADRs or session records. A keyword match does not establish present applicability.

homelab-ops generates `.terminal-map.json` and provides an on-demand query tool. For the configuration distribution change, these commands run from the repository root:

```bash
python3 tools/adr-chain-query.py terminal-of 0049
python3 tools/adr-chain-query.py status-of 0059
python3 tools/adr-chain-query.py is-active 0059
```

The first locates the chain end; the second reads the record's status; the third uses its exit code to indicate whether the status is `accepted`. Narrow queries let an agent locate a record before reading the necessary body, without loading the full index and all historical records into context.

Reading still requires three separate answers: where the chain ends, whether the record is marked accepted, and whether the system has implemented it. The README's Active group also includes proposed records, so group membership alone does not establish acceptance. Partial supersession is currently expressed through scope annotations; a future scope index should return those reading entry points too.

For people and agents, the reading sequence is the same: find a candidate ADR, locate successors and partial overrides, check status and decision evidence, then use runbooks and runtime evidence to determine the next action. When fields and evidence disagree, return that discrepancy to its tracking task and drive a correction, rather than guessing again in every task.

## Start with a mechanism you can maintain

A personal project can begin with a few conventions: record the context, choice, costs and rejected options for important decisions; make status explicit; and preserve old records with links to successors when decisions change. Those steps alone reduce the cost of recovering reasons later.

Add automatic numbering when parallel drafts start colliding. Add supersession warnings and indexes when old references repeatedly mislead readers. Encode explicit constraints in CI when conventions are repeatedly broken.

Every layer of automation also adds tool maintenance and PRs. Invest in steps that repeatedly cause conflicts, omissions or misreading. The granularity of a record, the scope of a partial change and the need to compare options again still require judgment about the actual problem.

What I want this mechanism to leave behind is reasoning that remains usable: a path from a current decision to its reasons, from a historical decision to its successor, and from a status discrepancy to a place where it can be corrected. The body preserves tradeoffs, relationship fields connect history, and tools maintain the repeatable parts. Future maintainers can then understand existing choices and have a basis for changing them.
