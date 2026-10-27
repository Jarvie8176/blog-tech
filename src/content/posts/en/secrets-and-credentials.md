---
title: '[06] What if secrets leak?'
description: 'An exposure and rotation incident explains the choice of 1Password, age, SOPS and envctl, and how people and agents create, inject, revoke and verify credentials.'
pubDate: 2026-10-26T14:34:59-07:00
translationKey: homelab-ops-secrets
categories: [Homelab Ops]
tags: [homelab, AI, secrets, envctl, security]
toc: true
---

_Delegating operations to AI means assigning responsibility for how credentials are stored, passed to processes, exposed in output, revoked and replaced—and how recovery is verified._

In the [previous article](/en/posts/pr-review-too-many/), I discussed redistributing responsibility among human judgment, machine execution, engineering verification and project decisions as implementation becomes abundant. Credentials make that question concrete: AI can deploy a service or diagnose authentication failures while handling tokens capable of changing the environment.

I want services to use the credentials they need while routine work avoids copying values into conversations and logs. After exposure, I also need to know what a credential permits, who consumes it, and how to invalidate the old access and restore service. Saving an encrypted file covers one part of that work.

## How troubleshooting became a rotation across several consumers

During troubleshooting in June 2026, environment output from `docker inspect` carried a deployment controller’s shared GitHub PAT into a conversation record. A personal access token grants access within its assigned permissions. When several nodes share one PAT, revocation affects them together.

The rotation script then introduced failures of its own. It overwrote a configuration file containing other settings, used the wrong token variable name for some nodes, and reported success because it had not matched a few expected error strings. Recovery required addressing those failures separately. The script fixes were subsequently merged.

That experience connected several tasks: limit secrets in diagnostic output, find the consumers of a shared credential, preserve unrelated configuration, and prove the replacement works. Rotation changes the system too, so it needs design and acceptance checks.

This is a historical exposure and recovery case. A credential entering a conversation record is an exposure to address; misuse by a third party requires separate evidence. Recovery at that time also does not establish that all later hardening is complete today.

## What the service needs and what the model needs

An operation involves several distinct places: model context, the agent’s tool call, the local process, credential storage and the target service.

The model can organize work around a service, a credential reference, an allowed action and its verification. An authorized local tool can read the value and pass it to the process that needs it. What returns to the model can be the result and a necessary error category.

Execution and output must implement that division. If a read command prints a token, the tool result can carry it back. If a business command expands an authorization header into its arguments, the value enters another observable surface. Encrypting the input file does not constrain either behavior.

Operating conventions also need a real permission boundary where isolation is required. An agent with arbitrary shell access as the same user, decryption rights or Docker administration may bypass the normal path. 1Password’s environment-injection documentation says to assume that processes running as the same user can access each other’s environments. Stronger isolation needs separate accounts, restricted execution interfaces and permission checks. [1Password environment injection](https://www.1password.dev/cli/secrets-environment-variables)

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

The default target is still `~/cc/.env`. Only names ending in `.enc` automatically take the encrypted path. The example explicitly selects `service.env.enc`. Deployment carriers often use another naming convention and are consumed by SOPS and doco-cd; a filename merely containing `enc` does not establish that envctl will decrypt it.

`exec` inherits the parent environment and injects every variable in the selected file. Separating carriers by purpose can reduce what is handed to a business operation; there is no per-command variable allowlist yet. `get` and `export` output values, while `list` outputs keys. For secret-bearing work, the business process should usually consume the value directly instead of returning it to the model first.

Encrypted writes create ciphertext temporary files, and bakctl snapshots of encrypted targets remain ciphertext. This reduces plaintext copies explicitly created by that tool path. Output from subprocesses, logs and other programs still needs separate control.

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

## Evidence for revocation rotation and recovery

Urgency determines the sequence. Active misuse or exposed high-privilege access calls for restricting access first and accepting necessary interruption. When a controlled transition is possible and the service supports overlap, deploy and verify the replacement, then revoke the old credential, with an explicit limit on that overlap.

Consumers include repository references, running containers, scheduled tasks, external nodes and manually maintained locations. Searching a variable name supplies leads; no results do not establish zero consumers. Preserve the management and recovery access needed for the rotation, rather than removing the only identity that makes recovery possible.

Acceptance needs several answers: does the new credential perform the required action with the intended permissions? Is old access invalid under the service’s rules? Do known consumers perform their actual functions? Is unrelated configuration intact? Does troubleshooting still expose secrets? Existing sessions, derived tokens and cached authorization need their own checks under the service’s revocation semantics.

One HTTP success cannot establish all of these. A healthy container may fail to pull code; a successful file write may not reach the running process; a failed request may target the wrong service or encounter a network problem. Retain the checked version, target and action result without outputting secrets again to demonstrate success.

## Current implementation and next steps

As of October 26, 2026, envctl/bakctl are used in this environment, and envsync with service-level SOPS carriers has been implemented. Public v0.1.0 adds ciphertext round-trip checks, mutation locking and input validation, with temporary identities and synthetic values covering encrypted paths. The plaintext default, whole-file environment injection and value output by get/export remain. Deployment bootstrap also includes permission-restricted plaintext configuration.

A general safe importer from 1Password to envctl, end-to-end acceptance of the five-step use case, runtime credential isolation and some rotation follow-ups remain. The [envctl repository](https://github.com/Jarvie8176/envctl) maintains public package versions and change records. Migration of older installations, the version running on each node, and actual activation or invalidation of business credentials each require separate verification.

I want an inspectable chain of responsibility: the human confirms purpose, permissions and interruption trade-offs; the agent prepares and progresses within authorization; local tools handle values and execute; verification checks actual activation and invalidation; and [session closeout](/en/posts/session-closeout/) retains redacted results, remaining work and reusable methods. The next task can reuse a checked path while keeping its unfinished parts visible.
