---
title: '[06] What if secrets leak?'
description: 'A diagnostic leak and failed rotations expose separate needs: control reads, split credentials, protect writes, and assess envctl against SOPS and the cost of extra copies.'
pubDate: 2026-10-26T14:34:59-07:00
updatedDate: 2026-10-26T18:19:23-07:00
translationKey: homelab-ops-secrets
categories: [Homelab Ops]
tags: [homelab, AI, secrets, envctl, security]
toc: true
---

_Delegating operations to AI means assigning responsibility for how credentials are stored, passed to processes, exposed in output, revoked and replaced—and how recovery is verified._

In the [previous article](/en/posts/pr-review-too-many/), I discussed redistributing responsibility among human judgment, machine execution, engineering verification and project decisions as implementation becomes abundant. Credentials make that question concrete: AI can deploy a service or diagnose authentication failures while handling tokens capable of changing the environment.

This incident exposed three connected failures: diagnostic output carried a secret into a conversation, a shared credential widened the revocation impact, and rotation damaged configuration. Encryption and safe import can improve routine work. Preventing recurrence also requires control over ad hoc diagnostic reads and output, plus verifiable rotation changes.

## How troubleshooting became a rotation across several consumers

During troubleshooting in June 2026, environment output from `docker inspect` carried a deployment controller’s shared GitHub PAT into a conversation record. A personal access token grants access within its assigned permissions. When several nodes share one PAT, revocation affects them together.

The rotation script then introduced failures of its own. It overwrote a configuration file containing other settings, used the wrong token variable name for some nodes, and reported success because it had not matched a few expected error strings. Recovery required addressing those failures separately. The script fixes were subsequently merged.

That experience connected several tasks: limit secrets in diagnostic output, find the consumers of a shared credential, preserve unrelated configuration, and prove the replacement works. Rotation changes the system too, so it needs design and acceptance checks.

This is a historical exposure and recovery case. A credential entering a conversation record is an exposure to address; misuse by a third party requires separate evidence. Recovery at that time also does not establish that all later hardening is complete today.

## Control what troubleshooting can read and return

The incident happened on an ad hoc read path. Even flawless import, encryption and `exec` cannot prevent the next `docker inspect`, `env`, `cat .env` or `envctl get` from sending values into context. The five-step workflow below improves planned operations; it is not evidence that this incident has been prevented.

Three controls need separate treatment:

- **Diagnostic entry points:** wrap common checks in procedures accepting approved targets and actions, selecting necessary fields locally. A container running flag and restart count can return a boolean and a number. Full environments, labels, logs and error text must not return by default. Hold unfamiliar output back for controlled handling.
- **Tool responses:** construct results from an allowed set of fields before stdout, stderr, exceptions or artifacts enter the agent channel, then apply secret detection or redaction. Detection can catch mistakes, but cannot guarantee recognition of arbitrary formats, encodings or split values. Filtering text after it reaches the model cannot undo exposure.
- **Execution permissions:** isolation requires a separate agent account without Docker administration, arbitrary sudo, business decryption keys or credential-file access. It requests operations through restricted interfaces whose code, configuration and allowed programs it cannot modify.

Docker administration matters here. For ordinary rootful Docker Engine, Docker explicitly states that membership in the `docker` group grants root-level privileges. Removing one command or moving a token into a file does not stop a daemon administrator reading container or mounted secrets. [Docker permissions](https://docs.docker.com/engine/install/linux-postinstall/)

The model needs a service, a credential reference, an allowed action and its verified result; a trusted executor passes values to the business process. 1Password likewise advises assuming that processes under the same user can access each other’s environments. [Environment injection](https://www.1password.dev/cli/secrets-environment-variables)

These diagnostic interfaces, channel filters and independent permissions have not completed end-to-end acceptance in this environment. Paths that can expose secrets remain, and addressing them takes priority over polishing a general importer.

## Shared credentials widen the impact

A shared PAT turns revocation into a coordinated change across nodes. A consumer inventory helps locate updates, but cannot narrow the credential’s permissions or impact. The existing rotation path still handles a shared PAT; it does not establish a completed move to per-node credentials.

For consumers pulling one repository, evaluate a separate read-only deploy key per node and repository. HTTPS consumers can evaluate fine-grained tokens restricted to the required repositories and permissions. Multi-repository, long-lived integrations can also consider short-lived GitHub App installation tokens. The controller’s authentication support and actual pull checks determine suitability. Deploy keys default to read-only but do not expire automatically; fine-grained PATs remain tied to their issuing user; Apps add issuance and renewal work. [GitHub deploy keys and Apps](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys) · [Fine-grained PATs](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)

Acceptance means revoking one node’s credential while other nodes continue their own pulls. The credential count may grow while each exposure and revocation affects less. A privileged account able to read every node’s secrets still defeats full isolation.

The controller’s plaintext bootstrap configuration also remains. It needs restricted account access, recorded consumers and a rotation owner. A token file can reduce values in environment dumps, but host root or Docker administrators may still read it; that does not resolve the exception.

## What this credential stack solves and why I chose it

The initial problem was scattered credentials: one copy in a node’s configuration, another in a script’s environment, and a consumer still using an older value. Rotation made it difficult to tell which locations needed updating.

I already used 1Password, so I retained it as the authoritative credential record and projected values into the locations consumers need. A projection is a derived copy for a particular purpose. Changing the source still requires updating the copies and verifying that services use the new value. Editing a 1Password field does not issue or revoke a token at the service.

Configuration also needed to enter Git and PRs. SOPS manages encrypted configuration, including ENV and YAML files; age provides one of its public-key encryption backends. A recipient identifies an allowed decryption identity, with the corresponding private key held by a node or operator. This fits the existing file and Git workflow, with keys, recipients and recovery paths to maintain. Variable names and some metadata may remain visible. [SOPS documentation](https://getsops.io/docs/) · [age](https://github.com/FiloSottile/age)

Different paths fit different conditions. Plaintext `.env` files integrate easily with existing programs but scatter copies and update responsibilities. `op run` retrieves secrets from 1Password at execution time and suits operations that can accept that dependency. For persistent tasks using saved credentials, and some recovery work, I want to reduce the need for a live 1Password read on every execution, so I retain local encrypted carriers.

| Need                                         | Components chosen | Work that remains                                                 |
| -------------------------------------------- | ----------------- | ----------------------------------------------------------------- |
| Maintain an authoritative credential record  | 1Password         | Manage permissions, expiry, consumers and issuance at the service |
| Encrypt configuration for version control    | SOPS + age        | Maintain recipients, private keys, recovery and historical copies |
| Edit, back up and inject local carriers      | envctl + bakctl   | Maintain compatibility and verify writing, recovery and output    |
| Produce service configuration for deployment | envsync + doco-cd | Update the carrier, deliver, deploy and verify its actual use     |

I call these encrypted configuration copies carriers. `envsync` produces service-specific SOPS carriers from 1Password; doco-cd decrypts them at deployment for Compose interpolation. That stage consumes delivered files, reducing its dependence on live 1Password reads. Git, image and network dependencies still need separate handling. Carriers can become stale, so source updates, rendering, deployment and business verification each require confirmation.

The deployment controller’s own startup credentials have a bootstrap problem: it needs Git access before it can fetch later deployment inputs. The existing path uses separately generated, host-local plaintext configuration with restricted file permissions. That exception is part of the system to manage too.

### Apply the four complexity questions

This design gives copies a source relationship; it does not automatically reduce their number. A credential may exist in 1Password, a service SOPS carrier, a local envctl file and bootstrap configuration. Every service need not use all four. The [previous article’s four questions](/en/posts/pr-review-too-many/) require a reason to retain or remove each layer.

1. **Which observed problem does it solve?** 1Password centralizes records; SOPS puts configuration in Git; local carriers support operations without live vault access; bootstrap enables the controller’s first pull. None directly addresses diagnostic reads or shared privileges.
2. **Would a simpler path suffice?** Tasks accepting live access can use `op run`. Existing SOPS files needed only for execution can use `sops exec-env`. Without local editing needs, omit an envctl copy; a consumer should not gain another copy just to standardize the stack.
3. **What maintenance does it add?** Each derived copy needs its source reference, consumers, generation or deployment version, update time, permissions and update owner. Check versions and actual authenticated actions without publishing secret hashes as proof. Source changes do not refresh running processes automatically.
4. **What is lost by removing a layer?** Removing local caching restores a live-source dependency. Removing envctl loses its editing and snapshot conventions, while SOPS still supports injection. Removing service carriers changes deployment delivery. Only consumers needing those capabilities should carry their copies.

Keeping local carriers is currently an availability and maintenance trade-off. A complete copy inventory and staleness checks are not yet unified, so source relationships do not establish a closed rotation process. Review consumers to consolidate duplicate carriers and expose failed updates, undeployed changes and continued use of old values.

## How envctl connects the components

`envctl` began as a dotenv tool for this homelab. Its independent public repository is [Jarvie8176/envctl](https://github.com/Jarvie8176/envctl), with a [v0.1.0 release](https://github.com/Jarvie8176/envctl/releases/tag/v0.1.0). It connects editing, SOPS calls, backups and process execution, and ships with its file-snapshot companion `bakctl`. Other tools handle 1Password integration and node distribution. Moving existing installations to the public version requires separate acceptance.

Use the repository’s [fixed-release installation instructions](https://github.com/Jarvie8176/envctl#install-a-fixed-release) to obtain the paired tools, and check versions, artifacts and checksums against [Releases](https://github.com/Jarvie8176/envctl/releases). This article describes v0.1.0 behavior; the public repository maintains instructions and changes for later versions.

For an existing installation, follow the [integration and adoption contract](https://github.com/Jarvie8176/envctl/blob/main/docs/integrations.md): validate in a separate installation prefix before switching consumers. Keep envctl and bakctl on the same release and check the actual executables. Updating a source checkout does not update copied installations on other nodes.

![Credential stack and envctl components: 1Password and envsync provide service carriers; envctl connects configuration, document editing, storage, SOPS, bakctl and process execution](/images/secrets/components-en.png)

_Logical responsibilities. The relevant envctl implementation currently lives in one script; the groups do not represent separately deployed modules or services._

| Logical component        | Responsibility                                                                    |
| ------------------------ | --------------------------------------------------------------------------------- |
| CLI and configuration    | Select the command, file, SOPS executable and key configuration                   |
| Document                 | Find and change values, preserve other lines and handle repeated writes           |
| Storage and SOPS adapter | Read, encrypt, decrypt and replace files; pass plaintext through subprocess pipes |
| Backup adapter           | Call bakctl for snapshots, history and restoration                                |
| Runner and output        | Inject variables into a process, or output keys or values as requested            |

Process injection is not unique to envctl. SOPS already provides `exec-env` for passing decrypted values into a child environment and `exec-file` for programs consuming files. Consider those native capabilities first if the requirement is simply decrypting and running once. envctl’s main distinction is editing: stdin input by key, preservation of other lines, ciphertext round-trip checks, locking and atomic replacement, plus paired backup and restore conventions. It supplies a common interface for existing dotenv operations, without adding runtime isolation. [SOPS process execution](https://getsops.io/docs/usage/advanced/#passing-secrets-to-other-processes)

The default target is still `~/cc/.env`. Only names ending in `.enc` automatically take the encrypted path. The example explicitly selects `service.env.enc`. Deployment carriers often use another naming convention and are consumed by SOPS and doco-cd; a filename merely containing `enc` does not establish that envctl will decrypt it.

`exec` inherits the parent environment and injects every variable in the selected file. Separating carriers by purpose can reduce what is handed to a business operation; there is no per-command variable allowlist yet. `get` and `export` output values, while `list` outputs keys. For secret-bearing work, the business process should usually consume the value directly instead of returning it to the model first.

Encrypted writes create ciphertext temporary files, and bakctl snapshots of encrypted targets remain ciphertext. This reduces plaintext copies explicitly created by that tool path. Output from subprocesses, logs and other programs still needs separate control.

Those defaults reflect a tool built for people and are not conservative for agents. Round-trip checks, locks and atomic replacement in v0.1.0 protect **write integrity**. This exposure calls for **read and output controls**.

An agent mode could require an explicit encrypted file, reject `get`/`export`, and inject only declared variables through `exec`, while also filtering the inherited environment so old secrets cannot arrive from the parent. It would need restricted actions and return fields too: giving an arbitrary program fewer variables does not prevent printing them or reading other secrets. **These are proposed interface constraints; v0.1.0 has no agent mode.** Even with them, enforcement still needs separate permissions and a controlled executor.

## From an empty item to an execution with credentials

Consider an imaginary `demo-service`. Existing primitives include item creation, reference reads, stdin input to envctl and `exec`. Input validation, failure protection and output filtering still need a controlled wrapper and end-to-end acceptance using synthetic data.

![Five steps: the agent prepares foundations and an empty item, the human fills it in 1Password, a controlled local tool validates and encrypts it, and envctl executes the business command](/images/secrets/use-case-en.png)

_Target workflow. Local tools handle values while the model receives references and results. This normal path alone does not isolate an agent with the same permissions._

### The agent prepares the foundations

On an authorized node, prepare `op`, SOPS, age tooling and the paired envctl/bakctl. Check actual executable paths and versions. Generate or reuse an age identity on that node, configure recipients and file permissions, and test encryption and decryption with synthetic values.

First access to 1Password needs existing authentication too. Prepare a service account or other bootstrap credential through the authorized control plane; private keys and tokens do not belong in diagnostic output. `age-keygen` creates an identity. envctl calls SOPS for encrypted reads and writes, with SOPS using the age backend.

### The agent creates an item stub

The agent creates an empty item in a specified vault, recording the service, purpose, consumers and fields the user should fill. Secret fields remain empty. The user receives the item link and field instructions. 1Password CLI’s category templates and item creation interface support this preparation. [Item creation](https://www.1password.dev/cli/reference/management-commands/item)

For example, agree on a `credential` field referenced as `op://demo-vault/demo-service/credential`. This illustrative reference does not identify a real item. A stub proves only that preparation has occurred, not that the credential is filled or usable.

### The human fills the credential in 1Password

The user obtains a credential with suitable permissions from the service and enters it directly in 1Password, confirming purpose, scope and expiry. The conversation needs only “filled.” A need for broader access or a different token belongs at a human decision point.

### The agent triggers local validation and encrypted import

Call parameters contain the reference, target key and carrier path—for example, mapping that reference to `DEMO_API_TOKEN`. A controlled importer reads the value and checks that the read succeeded, the field exists, and the value is nonempty and valid for the agreed format. Only then does it pass the value through stdin to envctl for `service.env.enc`. The value need not enter arguments, shell expansion or the tool response.

Failure order matters. Connecting `op read` directly to `envctl set` can let the downstream command write empty input after an upstream failure. `pipefail` reports pipeline failure; it cannot undo an earlier write. The importer should invoke writing only after successful retrieval and validation. Public v0.1.0 already decrypts candidate ciphertext for a round-trip check before atomically replacing the target. That protection and the upstream nonempty check cover separate stages; neither replaces the other. [Public release security model](https://github.com/Jarvie8176/envctl/blob/v0.1.0/docs/security-model.md)

The wrapper should also disable command tracing and return only the key, status and necessary error classification, without raw responses, exceptions or secret hashes. Reimporting the same value should not cause meaningless updates.

### The agent executes the business command through envctl

The invocation has this shape; `service_check.py` represents a business check script that must be prepared separately:

```bash
envctl --file ./service.env.enc exec -- python3 service_check.py
```

The script reads `DEMO_API_TOKEN` inside the process, constructs the authenticated request and returns only agreed status fields. Expanding the environment value into `curl` authentication arguments, or enabling full request logs, creates another exposure route.

Mechanical acceptance can use a synthetic canary: a recognizable string used only for testing. Check normal execution, read failures, empty fields, wrong keys and business failures for the sample value in stdout, stderr, arguments and artifacts. Also confirm that failures leave the previous carrier intact. Those checks cover specified paths; stronger isolation requires a separate permission boundary.

## Identify the object and scope of a suspected leak

Limit further output and copying, then identify the exposed object, permissions, time and locations that may hold copies. Different secrets require different responses.

| Exposed object                 | What needs attention                                                                                                                  |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Business token or password     | Revoke, reissue or change it at the issuing service; update consumers and verify old access is invalid                                |
| age private identity           | Identify decryptable carriers and historical copies; replace the identity and address business credentials that may have been exposed |
| SOPS file data key             | Identify the files; renew their data keys and access configuration, and assess the secrets inside                                     |
| Private content already output | Address access, retention and deletion; credential rotation cannot recall knowledge already obtained                                  |

SOPS `updatekeys` adjusts recipients; `rotate` renews a file’s data key. Neither revokes service tokens. Remove a compromised identity and renew the data key before storing replacement credentials. Old ciphertext and known plaintext remain outside that recall. [SOPS key management](https://getsops.io/docs/usage/key-management/)

If exposure occurs in Git, deleting the string from the latest version does not revoke it. Address access at the service first, then arrange cleanup of history, clones, caches and other copies according to the sensitive content and its spread. [GitHub sensitive-data removal](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository)

## Treat rotation as a controlled change

SSH key rotation in June 2026 had a related failure: a script treated a prefix shared by keys of the same type as the old key’s identity, locking out five hosts. Recovery then ran the stale script after a version switch failed and locked them out again. The PAT rotation’s wrong variable names, configuration overwrite and false success share a pattern: inaccurate target selection, an unverified executing version and unreliable success criteria. Fixing one matching expression cannot prevent the next rotation failure.

The PAT script now preserves other configuration, selects targets and checks for success logs. It is still short of the complete procedure below: there is no unified dry-run, pre-write backup or automatic old-access invalidation check. Some paths with no observed success log only request a recheck and can still end with a successful exit status. General rotation procedures and hardening remain unfinished.

The minimum workflow I want to establish is:

1. **Plan and dry-run:** enumerate the credential, consumers, exact target keys, permissions, change set and executing script version. Test multiple keys, similar keys, empty input and wrong targets with synthetic configuration. Keep secret values out of the plan.
2. **Preserve recovery:** make protected configuration backups before writing and verify restoration. Start with one consumer and retain management access outside this rotation. Stop if retrieving or switching to the specified version fails.
3. **Update and check configuration:** retrieve the replacement inside a controlled process, change the exact target, preserve the original on failure and check that unrelated fields remain intact. Treat backups as secrets too.
4. **Verify replacement and consumers:** establish which version the consumer loaded, then perform a real pull, login or business action. Clean logs, container health and successful writes cannot substitute. Missing success evidence must produce failure or an explicit unverified state.
5. **Revoke and verify old access:** revoke at the issuer and check old access against the same target. Distinguish network errors and wrong targets from authorization denial. Check sessions, derived tokens and caches under service-specific rules. Return redacted results to the agent.
6. **Retain a receipt:** record versions, targets, consumer results, revocation, rollback conditions and unfinished work. A revoked credential is no rollback option; retain a separate recovery identity or reissuance capability.

Urgency still sets the order. Active misuse or high-privilege exposure calls for restricting access first and accepting interruption. Verify the replacement before revocation only when the service supports a controlled overlap with a deadline. A smooth transition must not delay necessary revocation.

## Current implementation and priorities

As of October 26, 2026, delivered work includes envctl/bakctl, service carriers and some rotation-script fixes. Public v0.1.0’s write protections have synthetic encrypted-path tests. That does not establish that ad hoc diagnostics cannot leak, shared PATs have been split, all old access is invalid, or a full rotation procedure has passed acceptance.

Priorities are diagnostic entry points, tool responses and permission boundaries, followed by credential separation and controlled rotation, then completion of the five-step importer. Agent mode and copy-staleness checks need their own implementation and acceptance. The [envctl repository](https://github.com/Jarvie8176/envctl) maintains tool versions; node adoption and real business results need separate verification.

[Session closeout](/en/posts/session-closeout/) should record the specific leak path blocked, consumers switched, old access invalidated and interfaces still open. Those facts determine whether the incident’s causes have been addressed, alongside whether the new tool works.
