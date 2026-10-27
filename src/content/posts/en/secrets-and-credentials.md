---
title: '[06] What if secrets leak?'
description: 'Assume credentials may be exposed: diagnostic safeguards, Compose secrets, temporary escalation, knowledge propagation and rotation cost.'
pubDate: 2026-10-26T14:34:59-07:00
updatedDate: 2026-10-26T18:36:03-07:00
translationKey: homelab-ops-secrets
categories: [Homelab Ops]
tags: [homelab, AI, secrets, envctl, security]
toc: true
---

_Design for credentials that may be read, copied and propagated: reduce exposure while keeping revocation and recovery manageable._

In June 2026, environment output from `docker inspect` carried a deployment controller’s shared GitHub PAT into a conversation. Rotation then overwrote unrelated settings, used wrong variable names and falsely reported success. The incident exposed three problems together: reads, credential sharing and change verification.

This article covers the incident and remediation trade-offs. Tool selection, components and the proposed workflow move to [envctl design and boundaries](/en/posts/envctl-design/).

## Design as though every credential will be exposed

For secret preservation, zero trust starts by assuming every credential will be exposed, rather than treating “the value stays in the vault” as a dependable promise. Encryption matters, but using a credential creates moments when it can be read. Conversations, logs, configuration copies and retained knowledge can extend its reach.

Four concerns belong together: **exposure opportunities, credential permissions and lifetime, propagation, and rotation cost**. Banning every exploratory read reduces diagnostic ability; rotating everything after every ordinary check introduces disruption and change risk. Routine checks should avoid values, privileged exceptions need boundaries, and revocation must have a known scope.

A shared PAT amplifies that cost: revoking one value interrupts several nodes. An inventory locates consumers; splitting credentials by node or service, restricting repositories and granting read-only access narrows impact. Options include independent deploy keys for single repositories, fine-grained PATs for HTTPS, and GitHub Apps for long-lived multi-repository integration, with different key-management, user-binding and issuance costs. [GitHub authentication options](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys)

As of October 26, 2026, the existing rotation path still centers on a shared PAT. Per-node separation is not complete. Acceptance should revoke one node’s credential and confirm other nodes can still pull, rather than merely checking configuration writes.

## Reduce easy accidental exposure first

Full isolation takes time. Cheap safeguards can help beforehand. The following measures are work to implement and verify, not completed deployment claims.

**Intercept before execution.** Reject unrestricted `docker inspect`, `env`, `printenv`, `.env` reads and `envctl get/export` at the agent tool interface, directing work to restricted checks. Compound commands, scripts, aliases and other APIs can bypass such rules. Their role is reducing mistakes; use synthetic secrets to verify that commands of this incident’s kind are stopped before execution. Lack of enforced isolation is no reason to skip them.

**Keep fewer secrets in environment variables.** Compose `secrets:` grants files to individual services under `/run/secrets/...`. An application reading the file directly no longer puts that value in its container environment, so a routine inspect of environment fields does not contain it. `_FILE` support is application-specific and must match the deployed version. Reading the file back into the environment reintroduces that exposure route. [Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/)

doco-cd documents `GIT_ACCESS_TOKEN_FILE`, mutually exclusive with a directly configured token. Migration needs a running-version check, removal of the old environment value, a real pull check and a synthetic test that inspect does not contain the sample. Existing deployment declarations mount some other secrets as files, while the Git token remains an environment variable. This editorial change does not migrate those deployments. [doco-cd Git settings](https://doco.cd/latest/Git-Settings/)

Ordinary file-backed Compose secrets mount files; they do not automatically encrypt the host source. Local plaintext bootstrap still needs access and lifecycle management. Host root or Docker administrators can still read it. This change targets accidental dumps and does not independently isolate secrets. [Compose secrets reference](https://docs.docker.com/reference/compose-file/secrets/)

**Constrain responses.** Common procedures select necessary fields locally, returning status, counts or error categories. Hold unfamiliar output at the controlled executor. Apply detection and redaction to stdout, stderr, exceptions and artifacts too. Detection cannot guarantee recognition of every encoding or fragmented value, but can catch mistakes. Filtering after content reaches the model cannot undo exposure.

## Exploration needs an escalation path

AI troubleshooting includes inspecting unexpected logs, configuration and state. Procedures cannot anticipate every fault. Separate accounts and strict output contracts narrow exploration and add waiting, interface work and human judgment. That cost needs an explicit decision.

The proposed path has levels: routine checks return necessary fields; when coverage is insufficient, an authorized person investigates locally and supplies redacted results, or extends a controlled check for the task. Only when broader agent access is necessary does a temporary, explicitly approved escalation follow.

Approval should identify targets, actions, duration, potentially accessible credentials, output destinations and expected rotation afterward. The executor grants and expires access, with entry-point code outside the agent’s write permissions; retain field filtering where possible. With broad shell or Docker access, if untouched secrets cannot be established, include credentials readable within the authorized scope as potentially exposed and plan reissuance, cutover, revocation and verification. Expensive rotation can justify continuing with human investigation.

Temporary access still assumes values might escape. With ordinary rootful Docker Engine, the `docker` group grants root-level privileges. Ending a shell or restoring account permissions cannot revoke a copied token. Approve remediation and interruption costs with escalation; actual high-privilege exposure must not wait for a smooth cutover. [Docker permissions](https://docs.docker.com/engine/install/linux-postinstall/)

## Retained knowledge is another propagation path

The PAT entered a conversation: that exposure is established. Whether it also entered closeout, journals, `agent-manifest`, knowledge candidates or retrieval indexes **has no complete propagation audit**. A redacted record does not establish safe copies everywhere, and token revocation does not erase private content.

The [Yaaa rule](/en/posts/yaaa/) applies: derived content inherits at least the highest sensitivity of its actual sources. Summaries, rewriting and embeddings do not downgrade it. [Session closeout](/en/posts/session-closeout/) should first examine visible conversation and tool output for secrets. A detection or unresolved suspicion places the record and related derivatives in restricted high-sensitivity handling, suspending routine archiving, further cloud processing and knowledge promotion. Record detection coverage; a clean scan cannot prove absence.

Review raw records, closeout summaries, journals, candidates, agent-manifest, indexes, synchronized copies and backups. Also check the cloud product, account policy and deletion options in use at the time: local deletion does not establish provider-side deletion. Perform review in a trusted local environment, without sending the old secret to another cloud scanner or repeating it in issues.

Retain a secret-free propagation and response receipt: sources and derivatives checked, restrictions, deletion or expiry status, and remaining unknowns. Promote only necessary methods and facts after an independent redaction review. The historical PAT audit, automatic sensitivity tagging and promotion blocking are not completed claims here.

## Rotation can cause incidents too

SSH rotation that June treated a prefix shared by keys of one type as the old key’s identity, locking out five hosts. Recovery ran stale code after a failed version switch and repeated the lockout. Like PAT rotation, it combined inaccurate targets, an unverified executing version and unreliable success criteria.

Rotation needs exact consumers and targets, a verified script version, dry-run and protected pre-write backups. Start with one consumer and preserve independent recovery access; verify the replacement’s actual business action and unchanged unrelated configuration, then check old access under issuer-specific revocation rules. Missing success evidence must fail or remain explicitly unverified. A revoked value cannot serve as rollback.

The PAT script has partial fixes but lacks unified end-to-end acceptance; some paths without observed success logs can still exit successfully. Updating ciphertext, age identities or SOPS data keys does not revoke business tokens. Fewer consumers per rotation, repeatable updates and failure protection reduce ongoing remediation cost.

## Tool delivery did not follow risk priority

After the June incident, October’s completed work packaged existing dotenv editing and backup capabilities as independent envctl/bakctl tools. That bounded delivery can test reads, writes and restoration with synthetic data without changing production permissions. It did not fix ad hoc diagnostic reads. The actual delivery order differs from the risk priorities above; publishing the tool does not close the incident’s remediation.

There is no confirmed production acceptance date. The proposed acceptance gate is to verify interception, file-based tokens, response filtering and knowledge propagation handling before future broad agent troubleshooting, then rehearse escalation expiry and rotation. Full isolation, per-node separation and unified rotation procedures need separate delivery. Restricted checks or human investigation remain the interim path.

Progress should measure reduced leak paths, the number of objects to rotate per exposure, traceable propagation and verifiable recovery. The [next article](/en/posts/envctl-design/) explains envctl’s limited role.
