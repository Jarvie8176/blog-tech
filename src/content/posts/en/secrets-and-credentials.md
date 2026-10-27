---
title: '[06] What if secrets leak?'
description: 'Assume credentials may be exposed: diagnostic safeguards, Compose secrets, temporary escalation, knowledge propagation and rotation cost.'
pubDate: 2026-10-26T14:34:59-07:00
updatedDate: 2026-10-26T18:51:39-07:00
translationKey: homelab-ops-secrets
categories: [Homelab Ops]
tags: [homelab, AI, secrets, envctl, security]
toc: true
---

_Design for credentials that may be read, copied and propagated: reduce exposure while keeping revocation and recovery manageable._

In June 2026, environment output from `docker inspect` carried a deployment controller’s shared GitHub personal access token (PAT) into a conversation. Rotation then overwrote unrelated settings, used wrong variable names and falsely reported success. The incident exposed three problems together: reads, credential sharing and change verification.

The incident made me reconsider how to keep AI troubleshooting flexible while containing the cost of exposed credentials. Tool selection and components are covered in [the next article](/en/posts/envctl-design/).

## Why the nodes initially shared one PAT

The nodes ran the same deployment controller and fetched the same private deployment repository over HTTPS. Migration from the previous control plane to doco-cd retained an existing Git PAT in bootstrap configuration; subsequent nodes reused that credential. The same destination and purpose let one available token get the instances running.

That reduced initial issuance, storage, distribution and configuration mapping per node, with fewer records to maintain. The saving came at setup time: nodes lacked independent revocation, so exposure, expiry or permission changes required a coordinated cutover. Sharing a repository does not require sharing a credential. Once deployment was stable, the deferred rotation cost deserved another look.

## Design as though every credential will be exposed

I want to start from a zero trust premise: assume every credential will be exposed. Encryption matters, but using a credential creates moments when it can be read. Conversations, logs, configuration copies and retained knowledge can extend its reach.

Four concerns belong together: **exposure opportunities, credential permissions and lifetime, propagation, and rotation cost**. Banning every exploratory read reduces diagnostic ability; rotating everything after every ordinary check introduces disruption and change risk. Routine checks should avoid values, privileged exceptions need boundaries, and revocation must have a known scope.

A shared PAT amplifies that cost: revoking one value interrupts several nodes. An inventory locates consumers; splitting credentials by node or service, restricting repositories and granting read-only access narrows impact. Options include independent deploy keys for single repositories, fine-grained PATs for HTTPS, and GitHub Apps for long-lived multi-repository integration, with different key-management, user-binding and issuance costs. [GitHub authentication options](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)

The existing rotation path still centers on a shared PAT. Per-node separation comes next, with a direct check: revoke one node’s credential while the others continue pulling.

## Reduce easy accidental exposure first

Full isolation takes time. I plan to start with safeguards at a few common points of accidental exposure.

**Intercept before execution.** Reject unrestricted `docker inspect`, `env`, `printenv`, `.env` reads and `envctl get/export` at the agent tool interface, directing work to restricted checks. These inexpensive rules can stop accidental dumps, with synthetic secrets used to check their effect. Compound commands, scripts, aliases and other APIs remain bypass paths for later permission design to cover.

**Keep fewer secrets in environment variables.** Compose `secrets:` grants files to individual services under `/run/secrets/...`. An application reading the file directly no longer puts that value in its container environment, so a routine inspect of environment fields does not contain it. `_FILE` support is application-specific and must match the deployed version. Reading the file back into the environment reintroduces that exposure route. [Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/)

doco-cd documents `GIT_ACCESS_TOKEN_FILE`, mutually exclusive with a directly configured token. Migration needs a running-version check, removal of the old environment value, a real pull check and a synthetic test that inspect does not contain the sample. Existing deployment declarations mount some other secrets as files, while the Git token remains an environment variable. [doco-cd Git settings](https://doco.cd/latest/Git-Settings/)

Ordinary file-backed Compose secrets mount files; they do not automatically encrypt the host source. Local plaintext bootstrap still needs access and lifecycle management. Host root or Docker administrators can still read it. File mounting reduces accidental dumps; access permissions still need separate management. [Compose secrets reference](https://docs.docker.com/reference/compose-file/secrets/)

**Constrain responses.** Common procedures select necessary fields locally, returning status, counts or error categories. Hold unfamiliar output at the controlled executor. Apply detection and redaction to stdout, stderr, exceptions and artifacts too. Detection catches mistakes, while field selection reduces what reaches the channel. Both belong before output enters the model.

## Exploration needs an escalation path

AI troubleshooting includes inspecting unexpected logs, configuration and state. Procedures cannot anticipate every fault. Separate accounts and strict output contracts narrow exploration and add waiting, interface work and human judgment. That cost needs an explicit decision.

The proposed path has levels: routine checks return necessary fields; when coverage is insufficient, an authorized person investigates locally and supplies redacted results, or extends a controlled check for the task. Only when broader agent access is necessary does a temporary, explicitly approved escalation follow.

Approval should identify targets, actions, duration, potentially accessible credentials, output destinations and expected rotation afterward. The executor grants and expires access, with entry-point code outside the agent’s write permissions; retain field filtering where possible. With broad shell or Docker access, if untouched secrets cannot be established, include credentials readable within the authorized scope as potentially exposed and plan reissuance, cutover, revocation and verification. Expensive rotation can justify continuing with human investigation.

With ordinary rootful Docker Engine, the `docker` group grants root-level privileges. Ending a shell or restoring account permissions cannot revoke a copied token. Approve remediation and interruption costs with escalation; actual high-privilege exposure must not wait for a smooth cutover. [Docker permissions](https://docs.docker.com/engine/install/linux-postinstall/)

## Retained knowledge is another propagation path

The PAT entered a conversation and could travel onward through closeout, journals, `agent-manifest`, knowledge candidates and retrieval indexes. That tracing work is unfinished. Revocation handles access; propagation review must also locate content already retained.

The [Yaaa rule](/en/posts/yaaa/) applies: derived content inherits at least the highest sensitivity of its actual sources. Summaries, rewriting and embeddings do not downgrade it. [Session closeout](/en/posts/session-closeout/) should first examine visible conversation and tool output for secrets. A detection or unresolved suspicion places the record and related derivatives in restricted high-sensitivity handling, suspending routine archiving, further cloud processing and knowledge promotion. Record detection coverage so the search for omissions can continue.

Review raw records, closeout summaries, journals, candidates, agent-manifest, indexes, synchronized copies and backups. Also check the cloud product, account policy and deletion options in use at the time: local deletion does not establish provider-side deletion. Perform review in a trusted local environment, without sending the old secret to another cloud scanner or repeating it in issues.

Retain a secret-free propagation and response receipt: sources and derivatives checked, restrictions, deletion or expiry status, and remaining unknowns. Promote only necessary methods and facts after an independent redaction review. The next work is tracing the historical PAT and connecting sensitivity tags and promotion restrictions to the actual closeout workflow.

## Rotation can cause incidents too

SSH rotation that June treated a prefix shared by keys of one type as the old key’s identity, locking out five hosts. Recovery ran stale code after a failed version switch and repeated the lockout. Like PAT rotation, it combined inaccurate targets, an unverified executing version and unreliable success criteria.

Rotation needs exact consumers and targets, a verified script version, dry-run and protected pre-write backups. Start with one consumer and preserve independent recovery access; verify the replacement’s actual business action and unchanged unrelated configuration, then check old access under issuer-specific revocation rules. Missing success evidence must fail or remain explicitly unverified. A revoked value cannot serve as rollback.

The PAT script has partial fixes but lacks unified end-to-end acceptance; some paths without observed success logs can still exit successfully. Updating ciphertext, age identities or SOPS data keys does not revoke business tokens. Fewer consumers per rotation, repeatable updates and failure protection reduce ongoing remediation cost.

## Why envctl was finished first

After the June incident, October’s first completed work packaged existing dotenv editing and backup tools as envctl/bakctl. Existing code and clear file interfaces made reads, writes and restoration independently testable with synthetic data. Troubleshooting changes also involve account permissions, exploratory interfaces and everyday working habits, with the trade-offs above still to resolve.

That delivery order leaves a clear gap: file editing is more robust, while ad hoc troubleshooting can still read secrets. Next I want to put interception, file-based tokens and response filtering into use, then connect escalation, propagation review and rotation in one exercise.

The results I care about are fewer exposures along common diagnostic paths, fewer objects to rotate per incident, and traceable copies with recoverable services. The [next article](/en/posts/envctl-design/) continues with the local tool design.
