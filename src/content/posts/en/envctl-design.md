---
title: '[07] envctl design and boundaries'
description: 'Local dotenv editing motivates envctl’s components, credential workflow and place alongside 1Password, SOPS and Compose secrets.'
pubDate: 2026-10-26T18:38:15-07:00
updatedDate: 2026-10-26T18:52:41-07:00
translationKey: homelab-ops-envctl
categories: [Homelab Ops]
tags: [homelab, envctl, secrets, design]
toc: true
---

_envctl handles local dotenv editing, snapshots and execution. It improves routine credential handling; [the previous article](/en/posts/secrets-and-credentials/) addresses diagnostic reads and propagation into knowledge._

[envctl/bakctl v0.1.0](https://github.com/Jarvie8176/envctl/releases/tag/v0.1.0) packages existing local tools independently. It joins editing by key, encryption, snapshots and restoration for an existing local dotenv workflow.

## Why keep local carriers

I already use 1Password for credential records, want configuration in Git, and want some persistent tasks and recovery operations to avoid a live vault read on every execution. 1Password remains the record source, SOPS + age encrypt files, and local or service carriers supply runtime input. Editing the source neither revokes service tokens nor refreshes these copies automatically.

| Location          | Responsibility                                | Maintenance boundary                                        |
| ----------------- | --------------------------------------------- | ----------------------------------------------------------- |
| 1Password         | Credential records and references             | Permissions, expiry, consumers and actual issuance          |
| SOPS + age        | Encrypted configuration for Git workflows     | Recipients, private identities, recovery and old ciphertext |
| envctl + bakctl   | Local dotenv editing, snapshots and execution | Format, versions, reads, writes and output                  |
| envsync + doco-cd | Generate and consume service SOPS carriers    | Delivery, deployment, staleness and actual service use      |

A carrier is a configuration copy for a consumer. envsync renders service-specific SOPS files from 1Password; doco-cd decrypts them during deployment for Compose interpolation. Controller bootstrap has a separate path, including existing permission-restricted local plaintext configuration. Every consumer need not adopt every layer. [SOPS](https://getsops.io/docs/) · [age](https://github.com/FiloSottile/age)

## Omit the layer when native capabilities suffice

Tasks accepting a live-source dependency can use `op run`. For an existing SOPS file needed only for execution, consider `sops exec-env`, or `exec-file` when the application consumes a file. envctl’s injection is not unique. Its distinction is editing by key through stdin, preserving other lines, ciphertext round-trip checks, locking and atomic replacement, with paired backup and restore conventions. [SOPS process execution](https://getsops.io/docs/usage/advanced/#passing-secrets-to-other-processes)

Container consumers can also use Compose `secrets:` to give files to selected services, keeping values out of container environments. That controls consumption; SOPS controls storage; envctl handles some editing operations. Choosing one does not require all of them. Applications must support file input, and ordinary Compose mounts neither encrypt source files nor stop Docker administrators reading them. [Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/)

I retain envctl for existing dotenv editing needs. Consumers without that need can omit it. Issuance, rotation and execution permissions have their own interfaces.

## Current components and defaults

![Credential stack and envctl logical components](/images/secrets/components-en.png)

_The current single script groups configuration, editing, storage, backups and execution by responsibility._

| Responsibility           | Work                                                              |
| ------------------------ | ----------------------------------------------------------------- |
| CLI and configuration    | Select targets, commands, SOPS and key configuration              |
| Document                 | Edit assignments, preserve other lines and handle repeated writes |
| Storage and SOPS adapter | Read, encrypt, decrypt, check candidates and replace files        |
| Backup adapter           | Use bakctl for snapshots, history and restoration                 |
| Runner and output        | Inject process environments or output requested keys and values   |

v0.1.0 decrypts candidate ciphertext for a round-trip check before atomic replacement, with mutation locking and input validation. Temporary files and bakctl snapshots of encrypted targets remain ciphertext, with synthetic tests covering these paths. This work focuses on write integrity. [Release security model](https://github.com/Jarvie8176/envctl/blob/v0.1.0/docs/security-model.md)

Three defaults matter: the historical target is plaintext `~/cc/.env`; only a terminal `.enc` suffix enables automatic encryption; `exec` inherits the parent environment and injects every parsed variable. `get/export` deliberately print values; `list` prints keys. Purpose-specific files reduce injection scope, but there is no per-command variable allowlist or same-user isolation.

## Designing five steps from an empty item to execution

I plan to connect the existing capabilities into this flow. envctl already provides stdin editing and process injection; the safe importer, business-check script and shared response format still need writing. Consider the imaginary reference `op://demo-vault/demo-service/credential` and key `DEMO_API_TOKEN`:

![Five-step target design for creating and injecting credentials](/images/secrets/use-case-en.png)

1. **The agent prepares foundations.** Prepare op, SOPS, age and paired tools on the authorized executor. Check actual versions, recipients, permissions and recovery, using disposable identities and synthetic values. First op access uses the existing authorized bootstrap path.
2. **The agent creates an empty item.** Record the service, purpose, consumers and required fields in a specified vault, returning an item reference. Leave secret fields for the user and check their content before import. [1Password item interface](https://www.1password.dev/cli/reference/management-commands/item)
3. **The human fills credentials.** Confirm permissions and expiry at the issuer, then enter the value directly in 1Password. Report completion without copying it through chat.
4. **The agent requests controlled import.** Supply only a reference, target key and explicit encrypted file. A trusted local importer verifies retrieval, field presence, nonempty content and format before writing through stdin. Failures preserve the previous value and return status only. Piping op reads directly into a setter can write empty input before upstream failure is known; pipefail cannot undo that write, and ciphertext round-trip checks cannot replace input validation.
5. **The agent requests controlled execution.** The business process uses credentials internally and returns agreed status fields. Keep values out of authentication arguments, debug logs, raw responses and exceptions. Synthetic canaries should check stdout, stderr, arguments and artifacts across success and failure, plus original-carrier preservation.

These steps address values in routine use. The [previous article](/en/posts/secrets-and-credentials/) covers exploratory troubleshooting and the trade-offs after exposure.

## Use four complexity questions to choose copies

A credential may exist at the source, in a service carrier, a local file and bootstrap. Structured lineage does not reduce the count. Apply the [series’ four questions](/en/posts/pr-review-too-many/):

- **Which observed problem does it solve?** Central records, Git configuration, reduced live access and bootstrap each have uses. Adding copies does not solve diagnostic leaks.
- **Would a simpler path suffice?** Omit envctl copies when op run, native SOPS execution or direct file consumption meets the need.
- **What maintenance is added?** Record source references, consumers, generation and deployment versions, update time, permissions and update ownership. Check real authenticated actions without publishing secret hashes as proof.
- **What is lost by removing it?** Removing caching restores live-source dependence; removing envctl loses editing and snapshot conventions while SOPS injection remains. Decide per consumer.

I still need to complete the copy inventory and staleness checks, consolidate unnecessary layers and expose failed updates, undeployed changes and continued old-value use.

## What I want to change next

v0.1.0 packages the paired CLIs, editing, snapshots and write protections. Next come a general op importer, business checks across the five-step flow and a shared response format.

I also want an agent mode: require an explicit encrypted file, reject get/export, inject only declared variables, filter inherited environments, and restrict actions and returned fields. That would reduce casual value reads; arbitrary programs still need independent execution permissions controlling their reads and output.

Use the [fixed-release README instructions](https://github.com/Jarvie8176/envctl#install-a-fixed-release) and [Releases](https://github.com/Jarvie8176/envctl/releases). For existing installations, follow the [integration and adoption contract](https://github.com/Jarvie8176/envctl/blob/main/docs/integrations.md), validating in a separate prefix before switching consumers. Keep envctl and bakctl on the same release and check actual executables. Update copied installations on each node, then check the actual business authentication after switching.
