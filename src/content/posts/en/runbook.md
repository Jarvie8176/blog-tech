---
title: '[08] How one person can manage dozens of homelab services'
description: 'Use the existing Calibre-Web runbook and initialization code to examine shared operational context for people and AI, and the gaps in repeatability, acceptance and recovery.'
pubDate: 2026-10-26T21:35:21-07:00
updatedDate: 2026-10-26T23:47:42-07:00
translationKey: homelab-ops-runbook
categories: [Homelab Ops]
tags: [homelab, AI, runbook, automation, workflow]
toc: true
---

_Using runbooks to organize operations shared by people and AI_

<nav aria-label="Article contents" class="xl:hidden" data-pagefind-ignore>

**Contents**

- [Separate current state from history](#separate-current-state-from-history)
- [How people and AI reach services](#how-people-and-ai-reach-services)
- [A Calibre-Web runbook example](#a-calibre-web-runbook-example)
- [Make execution repeatable and inspectable](#make-execution-repeatable-and-inspectable)
- [From a task to acceptance](#from-a-task-to-acceptance)
- [Use evidence to establish completion](#use-evidence-to-establish-completion)
- [Distinguish history from recovery](#distinguish-history-from-recovery)
- [Keep runbooks maintained](#keep-runbooks-maintained)

</nav>

In [Managing a homelab](/en/posts/managing-homelab-with-ai/), I described how this environment grew from home automation into files, photos, media and personal administration. As services accumulated, maintenance involved more relationships: a photo application depends on storage, media services need the right files, monitoring detects problems, and notification services bring the issues that need attention to a person.

On October 26, 2026, the service inventory shown in Glance contained 64 entries: 56 marked deployed, 3 planned, 3 decommissioned and 2 superseded. That count includes applications, infrastructure and management components, as well as development environments. “Deployed” is a lifecycle state in the inventory; actual health still needs to be checked.

Some of these services are part of everyday use. Others help me manage them.

| Purpose                                 | Examples in Glance                      | Maintenance concerns                                      |
| --------------------------------------- | --------------------------------------- | --------------------------------------------------------- |
| Home automation                         | Home Assistant, Zigbee2MQTT             | Device communication, automation rules and results        |
| Files and photos                        | Samba, Syncthing, Immich                | Data locations, permissions, synchronization and recovery |
| Media and reading                       | Jellyfin, Music Assistant, Calibre-Web  | Media paths, libraries and client access                  |
| Personal information and administration | Linkwarden, Memos, Vikunja, Firefly III | Stored data, accounts and application upgrades            |
| Monitoring and notifications            | Prometheus, Grafana, Uptime Kuma, ntfy  | Check coverage, alert conditions and delivery             |
| AI and task execution                   | Hermes, LiteLLM, Cronicle               | Invocation paths, permissions, dependencies and results   |

The table groups services by purpose, with their maintenance concerns in the last column. It turns “managing dozens of services” into specific questions: what deploys this service, where its data lives, whether the old host has been retired, which endpoint to check after an upgrade, and whether a script left over from the last migration is still safe to use. Each question is manageable on its own. Together, they can turn routine maintenance into archaeology.

AI can help me read code, inspect logs, edit configuration and run commands. That raises further questions: when AI can operate the system directly, how do I retain my understanding of it? How can a new session reuse a procedure we have already verified? And when it says “done,” what lets me confirm the result?

The operating approach I want needs to satisfy all of these conditions: people can understand the system, AI can take on tasks, known operations can be repeated, and results can be independently verified. Runbooks are the main mechanism I use to connect those requirements. This article explains how they organize everyday operations and give a different AI session a clear basis for performing the same work.

A runbook generally describes an operational procedure for achieving a particular outcome. It can start as a simple checklist and grow to cover tools, permissions, error handling and escalation paths. This is also the basis of [AWS's definition of a runbook](https://docs.aws.amazon.com/wellarchitected/latest/framework/ops_ready_to_support_use_runbooks.html). In my homelab, a service's runbook also connects its current documentation, deployment configuration, execution scripts and verification methods, giving people and AI a common starting point.

The most developed parts today are shared current-state documentation, explicit configuration and data boundaries, and some deployment constraints. Service-specific operation, acceptance and recovery procedures remain incomplete. The Calibre-Web case below shows the existing runbook and code before discussing the execution requirements still to be met.

## Separate current state from history

First, we need to know what the system actually looks like today.

As services move and deployment methods change, documentation tends to accumulate. Installation instructions come first, configuration for a new host follows, and temporary repair commands from an incident are added later. Each passage may have been correct when written. Together in one operational entry point, however, they can present several apparently executable versions of the truth.

In October 2026, my runbook cleanup focused on this problem: conflicting descriptions of current state, retired executables still present in service directories, and migration records mixed into deployment instructions. For a person or AI taking over, these materials create the same burden: decide what is still valid before starting the task.

I began separating the current entry point from detailed history. The current README first establishes what manages the service, where its data and configuration live, and which constraints apply. Operation, verification and recovery procedures still need to be completed for each service. Detailed migrations, failed attempts and old topologies go into `history.md`, explicitly marked as unsuitable for deployment instructions.

A service directory might look like this:

```text
runbooks/example/
├── README.md          Current state, constraints, operations and verification
├── history.md         Migrations and incidents, explicitly marked as history
├── deploy.sh          Execution entry point where a script is needed
├── verify.sh          Verification entry point where checks can be automated
├── compose.yaml       Deployment configuration still in use
└── recovery.md        Only when a supported recovery procedure exists
```

This illustrates the division of responsibilities; the files should match the service's needs. A service already managed by a deployment controller does not need a duplicate manual deployment procedure. A service without a supported recovery plan should not acquire an empty recovery document just to complete the directory.

## How people and AI reach services

Putting people, AI and services in one picture shows how the documentation participates in an operation. A person reads the runbook in the repository or an editor. An AI agent reads the same current instructions for its task, then selects the operation entry point they specify.

![People and AI read a shared runbook, reach services through a terminal, a registered MCP procedure or a configuration PR, and independently verify the result](/images/runbook/architecture-en.png)

[View SVG](/images/runbook/architecture-en.svg) · [Mermaid source](/images/runbook/architecture-en.mmd)

_Figure 1: People and AI use a shared runbook to find execution entry points. Dashed arrows represent documentation references; solid arrows represent reading, invocation or result delivery. These are available integration paths, not a claim that every service has a registered procedure._

There are two common entry points for direct operations. People and agents can invoke standalone scripts through a terminal. Registered procedures can also be called through the local procedure CLI or MCP. Here, MCP is the protocol connecting an agent to tools: use `list_procedures` to discover parameters, scope and the SOP, then call `run_procedure`. Both procedure entry points reuse the same dispatcher, the component that selects the operation and enforces invocation checks.

The checking boundaries differ. Direct script execution relies on the script's own preconditions and the execution identity's permissions. Registered operations going through the dispatcher must also satisfy its argument, scope and gate checks. Documentation helps people and AI understand the rules; whether an invalid operation is actually blocked depends on the implementation of that entry point.

Runbooks also reach services in different ways. Operation scripts can query or modify a target through SSH, command-line tools or a service API. Services deployed from configuration instead receive updates through a PR: after checks and an authorized merge, a controller such as doco-cd pulls and applies the configuration. Routine Caddy routing changes currently follow that latter path, followed by a check that the target domain returns the intended application. The runbook identifies the appropriate path, avoiding competing entry points for maintaining the same service.

## A Calibre-Web runbook example

[Calibre](https://calibre-ebook.com/about) is a free, open-source ebook manager. It can organize titles, authors, covers and other metadata, convert ebook formats and transfer books to reading devices. [Calibre-Web](https://github.com/janeczku/calibre-web) is a separate web application that uses a Calibre library database to let people browse, read and download books in a browser. The service maintained here is Calibre-Web, and both its library records and ebook files need protection.

The existing `runbooks/calibre-web/README.md` is titled “current snapshot.” It has four sections: `Snapshot`, `Deployment invariants`, `Historical summary` and `Authority and pointers`. The excerpt below preserves the original wording while omitting entries such as hosts, addresses and host filesystem paths. No operation section has been added. The source is repository snapshot `1d5db4f7ef9a`, checked on October 26, 2026.

```markdown
# Calibre-Web — current snapshot

> Current state only. Detailed migration and repair history:
> [`history.md`](history.md).

## Snapshot

| Field            | Current state                                                                  |
| ---------------- | ------------------------------------------------------------------------------ |
| Status           | Deployed; doco-cd managed                                                      |
| Library mode     | Native split library: `/library` metadata + `/storage` payloads                |
| Uploads          | Globally enabled in Calibre-Web `app.db`; not reconciled by Compose            |
| Observed library | 8 EPUB files / 19,928,132 bytes on 2026-10-23; operational data, not Git state |

## Deployment invariants

- `calibre-library-init` creates the checksum-pinned empty `metadata.db` only
  when the file is absent or empty.
- Book files and mutable SQLite databases are runtime data. Git records their
  locations and initialization rules, not their contents.
```

This entry point already answers practical questions: doco-cd manages the service; library metadata and book files are split between `/library` and `/storage`; the upload setting lives in the application database and is not reconciled by Compose; and Git records data locations and initialization rules, not library contents. The rest of the README points migration details to `history.md` and identifies the authoritative configuration, deployment enrollment, inventory, routing and credential references.

Following the README to `docker-compose.tp.yml` reveals code that already implements some of these constraints. This is the actual `command` field of `calibre-library-init`, with indentation adjusted for display. In Compose, `$$` preserves a dollar sign for the container's shell. This excerpt depends on the service's environment variables and mounts; it is not a standalone shell script.

```yaml
command:
  - sh
  - -euc
  - |
    target=/library/metadata.db
    chown 1000:1000 /library /storage
    chmod 2775 /library /storage
    if [ -s "$$target" ]; then
      chown 1000:1000 "$$target"
      chmod 664 "$$target"
      echo "existing Calibre metadata.db retained"
      exit 0
    fi
    tmp=$$(mktemp /library/.metadata.db.XXXXXX)
    trap 'rm -f "$$tmp"' EXIT
    wget -qO "$$tmp" "$$CALIBRE_METADATA_URL"
    echo "$$CALIBRE_METADATA_SHA256  $$tmp" | sha256sum -c -
    chown 1000:1000 "$$tmp"
    chmod 664 "$$tmp"
    mv "$$tmp" "$$target"
    trap - EXIT
    echo "initialized empty Calibre library"
```

A specific behavior is already defined here: if `metadata.db` is nonempty, adjust its permissions and retain its contents; if it is missing or empty, download an empty database from a fixed source, verify its SHA-256 checksum and put it in place. The download URL is tied to an upstream commit, and the checksum is stored in Compose. People and AI can follow the documentation to inspect the same implementation, without generating initialization commands again.

Its guarantees have limits. The `-s` check establishes only that the file is nonempty, not that it is the original library or that book files are readable. The subsequent `calibre-config-init` queries the library UUID, checks the application database schema and configures paths and the management account. Those checks still do not establish that a user can open an existing book. Creating an empty database is initialization, not restoration of a lost library. Both the configuration initializer and the main service still use `latest` for their application images, so pinning the initialization sample has not pinned the whole application version.

If the task given to AI is “upgrade Calibre-Web while preserving the existing library,” this README is not yet enough to execute it as a documented procedure. It does not specify pre-upgrade checks, upgrade order, library acceptance criteria, an upgrade-check script to invoke or supported recovery steps. A person or agent can locate configuration and understand the data boundaries, but must still investigate runtime state, establish version and recovery requirements, and turn the operation and acceptance checks into a reviewable procedure. That work remains to be done.

This case demonstrates the value of shared current context and some implemented initialization rules. It does not yet demonstrate a complete upgrade that another session can repeat and independently verify. The existing runbook makes finding the right system, configuration and data more reliable; the operational procedure still needs to be completed.

## Make execution repeatable and inspectable

Once context has a clear entry point, the next step is constraining execution.

If AI must assemble commands from natural language for every deployment, the same task still contains many ad hoc decisions: which directory to create first, which user to run as, whether to pull the latest code, and whether to continue after an error. Repeatable operations should gradually move into versioned scripts or deployment controllers. The runbook explains prerequisites, effects and verification; AI finds the applicable entry point and invokes the existing implementation.

The project's code extraction convention requires executable code in new or changed runbooks to live in separate files. People can then review the implementation, tools can check its syntax and behavior, and other workflows can invoke it directly. For recurring tasks, previous decisions remain available instead of being regenerated by the next session.

This continues the division of work discussed in [Too many PR reviews!](/en/posts/pr-review-too-many/). People need to understand goals, constraints and acceptance conditions, while AI can keep doing code exploration, implementation and checks. Runbooks give those requirements a stable entry point; scripts make concrete behavior available for repeated inspection.

A script is only the first step, though.

One deployment script I inspected checked tool dependencies and `.env` and enabled strict shell mode. Yet it updated source with `pull --ff-only || true`, allowing an update failure to pass, and finished mainly by printing container state and logs. Continuing after a failed pull may mean deploying old code. Printing logs supplies observations without establishing that the application works.

Details like these require a specific definition of “deterministic execution.” My goal is for known operations, with explicit inputs, versions and preconditions, to follow inspectable rules: stop when parameters are missing, reject a mismatched target, and return an explicit outcome when a critical step fails. Networks and external services will still change, but there should be defined ways to handle those changes.

Repeatability, idempotence and recoverability also answer different questions: can another session invoke the same procedure; does repeating it introduce additional side effects; and, after a partial failure, can the operation be continued or undone? Naming a file `deploy.sh` or adding an “idempotent” comment cannot substitute for checking those properties.

Rules suited to the execution layer need to be enforced there. The target host or runtime user must match, required parameters must be present, and one-time initialization must recognize existing data. Scripts, permissions or deployment policies should enforce important constraints. The instructions AI reads explain why the rules exist.

Credentials are part of this division too. A runbook can identify the credential reference and the permitted operation, while an authorized tool supplies the actual value to the process that needs it. This follows the normal usage path described in [envctl design and boundaries](/en/posts/envctl-design/); neither instructions nor execution reports should copy secret values. Output filtering and execution permissions still need their own implementation, as discussed in [What if secrets leak?](/en/posts/secrets-and-credentials/).

Different AI tools should call the same implementation wherever possible. The project calls invocable operations procedures and fixed operating instructions SOPs. They live in a foundation independent of any particular AI tool, are discovered on demand through an operation catalog, and are invoked through a common entry point. Adapters connect each tool; deployment logic stays in one place. Switching agent entry points still leaves the same operation code available for review.

AI continues to have plenty to do: understand current state, investigate differences, judge whether an existing procedure applies, and propose changes for new problems. Verified routine operations should go through explicit entry points where possible. That lets people concentrate on new changes and exceptions.

## From a task to acceptance

The following flow describes the requirements I want to apply as service-specific operation and acceptance procedures are completed. The current Calibre-Web README does not cover the whole flow. The operator may be a person or an AI agent. “Applicable and executable” means the procedure fits the task, current state satisfies its preconditions, and both existing authorization and actual permissions are sufficient.

![Runbook workflow: establish authorization, check current state and prerequisites, choose a script or configuration deployment path, then verify and handle failures within authorization](/images/runbook/flow-en.png)

[View SVG](/images/runbook/flow-en.svg) · [Mermaid source](/images/runbook/flow-en.mmd)

_Figure 2: Execution and acceptance requirements to implement for each service. Existing authorization can be reused; a further human decision is needed only for a new tradeoff or work outside that scope._

When a condition is unmet, stop the corresponding change and preserve observations. Supply missing parameters, investigate state differences or propose a procedure revision, then check again once the issue is resolved. A first failure is not a reason to expand permissions automatically. Both execution paths must ultimately check the service's result: a successful script exit, a merged PR and a controller's completion report each establish only one part of the process.

If acceptance fails, troubleshoot within existing authorization. When recovery is needed, use only a currently supported and applicable recovery procedure. The execution record should retain the version used, target, observation time, result and unverified scope. This flow describes the requirements I want every operation to meet; how well each service's existing entry points cover them still needs individual verification.

## Use evidence to establish completion

One of the easiest steps to overlook is proving that the task is complete.

Portainer's retirement record provides a clear example. The old service domain's root path returned HTTP 200 and appeared “healthy.” In fact, the response came from a reverse proxy's wildcard directory page, while the intended application's `/api/status` returned 404. The request had reached a page, but not the expected application.

If a runbook says only “confirm HTTP 200,” both people and AI can reach the wrong conclusion. A useful check needs to establish which application produced the response, whether the version or content is expected, whether authentication behaves correctly, and whether key data paths work. The task determines the depth of checking, but success conditions should be written before execution.

Likewise, a running container establishes something about process state; configuration merged into Git establishes that source files changed; and a deployment controller's success report does not automatically cover every application function. Each kind of evidence has a scope.

I want an AI execution report to answer four questions: which procedure version it used, which target it operated on, what it observed, and what it did not verify. People can then follow the evidence to assess the conclusion without rereading a whole terminal session or accepting “done” as proof.

The existing Calibre-Web README contains a more limited observation: on October 23, 2026, the library held 8 EPUB files totaling 19,928,132 bytes. It explicitly identifies those numbers as runtime data rather than Git state. This gives later checks a dated reference, but file counts and total bytes cannot establish that every book opens or that a subsequent upgrade passed acceptance. The current README does not turn this observation into a complete upgrade acceptance record.

The next step is to connect the running image, application access, library entries and file-reading results to the same operation and version. Those conclusions cannot be inferred from the existing file statistics. With that work done, another AI session could reuse explicit acceptance criteria instead of guessing what “healthy” means.

## Distinguish history from recovery

Recovery procedures need the same clarity.

A deployment script having worked in the past does not establish that it suits today's environment. Hosts, data formats, permissions and dependencies may have changed. My runbook conventions therefore separate history from recovery: history explains what happened; a supported recovery procedure specifies its trigger, permissions, prerequisites, verification and exit conditions.

Executables confirmed as retired and no longer serving a current recovery purpose can be removed from the current directory after preserving a commit or PR reference. This keeps them traceable while reducing accidental use. Removing repository files and cleaning up host remnants are still separate jobs. Portainer's records preserve that distinction: the old control plane has been replaced, stopped containers still retain data, and retirement checks across the whole fleet remain incomplete.

## Keep runbooks maintained

These conventions need continued maintenance. If a service changes but only its code is updated, the next operation still begins with stale instructions. Each change therefore needs to consider whether the execution implementation changed, whether current documentation remains accurate, whether verification conditions need updating, and whether old paths now belong to history or supported recovery.

I delegate mechanically checkable parts to templates, scaffolding and CI. The current structural checks look for required sections in READMEs that declare the new contract. They also check historical warnings and links back to the current entry point, unreplaced template placeholders, and relative links in the relevant documents.

These checks reduce structural omissions. They do not log into a host to verify its topology or establish whether a recovery plan still works. Script tests also need a defined scope. The project's testing standard calls for automated tests when behavior can be reproduced in a clean environment, its resulting state can be checked, and it runs quickly enough. Production writes or operations that cannot be simulated need a documented manual verification method and the reason for it.

The system must also permit investigation and correction when AI encounters a problem outside existing procedures. It can gather facts, identify differences between documentation, code and runtime state, then propose a change. Reviewed and verified solutions should return to the maintained scripts and current instructions. [Session closeout](/en/posts/session-closeout/) establishes what happened and what is worth retaining; the runbook supplies the entry point for the next operation. That is how one troubleshooting session becomes a reusable capability.

As of October 2026, this work has delivered templates, structural checks and current-state cleanup for some services. The generated service catalog also distinguishes current, planned and historical states more clearly. Separating history, resolving conflicts and retiring obsolete files across the whole repository remain ongoing work. Those remaining tasks remind me that runbook reliability needs to be maintained along with the system.

For one person managing dozens of services, the working pattern I want is this: routine operations reuse existing procedures, new problems produce reviewable changes, and every execution returns evidence with an explicit scope. People still understand dependencies, set constraints and handle exceptions, while tools repeat the steps that have already been made clear.

To judge whether a runbook is useful, I imagine myself a few weeks later opening a completely new AI session. Can we quickly find current state, understand why the service is deployed this way, choose a supported operation, and confirm at the end that the system meets expectations? When those questions have clear answers, I am willing to hand off the next task of the same kind.
