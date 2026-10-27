---
title: '[09] Fleet Sync: distributing an operations toolchain across heterogeneous nodes'
description: 'Start with homelab toolchain distribution, then examine bootstrap installation, cross-platform repository sync, offline recovery, configuration application and the limits of the current design.'
pubDate: 2026-10-26T22:21:33-07:00
translationKey: homelab-ops-fleet-sync
categories: [Homelab Ops]
tags: [homelab, fleet-sync, toolchain, automation, git]
toc: true
---

**Fleet Sync is the operations repository synchronization service I built for this homelab.** A fleet is a group of machines managed together, such as home servers, workstations and cloud nodes. Sync means keeping those nodes supplied with updates from one controlled source. In this project, fleet-sync synchronizes operations scripts, tool source code and configuration from Git into a canonical checkout on each node, and reports their revisions and sync status.

That gives the operations toolchain a way to distribute source files continuously. Making the tools usable also requires installation, dependency preparation and configuration application on each node. This article starts with that wider requirement and explains Fleet Sync's role within it.

Writing an operations script on one machine completes only a small part of the job. For it to remain useful across a homelab, other nodes need the script, the tools it depends on, and the right user identity and execution environment.

As the fleet grows, small differences become recurring chores: a Linux server lacks an extraction utility, a command on a Mac is visible only in an interactive shell, an ARM node needs a different binary, and another machine missed an update and still runs an old script. Every maintenance task begins with checking the environment and filling the gaps by hand.

The problem I want to solve is: **how can the toolchain needed for operations automatically reach the nodes that need it, and remain usable?**

More concretely, after a controlled source changes, enrolled nodes should obtain suitable content, perform the necessary installation or application steps, and report the result. Temporarily offline nodes should catch up when they return. The operator should be able to tell which nodes are ready, which are unfinished, and where a failure occurred.

This is broader than synchronizing a Git repository. The existing fleet-sync first addresses repository distribution and revision visibility; CLI installation, environment integration and subsequent apply steps belong to adjacent mechanisms.

This follows the discussion of [operations shared through runbooks](/en/posts/runbook/): once the steps are clear, how do we get the environment required to execute them onto each node?

## Define what needs distributing

Here, a toolchain means the tools, scripts and configuration required to perform operations tasks. These objects have different update mechanisms.

| Object                                 | Examples in this project                                        | What the node must do                                                        |
| -------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| In-house tools and scripts             | Operations scripts, check programs, just recipes                | Obtain the intended revision and keep it at a stable location                |
| Third-party CLIs                       | just, btop, procs, op, sops, age                                | Install artifacts matching the OS and architecture, and verify executability |
| Runtimes and basic dependencies        | Bash, Python, Git, curl, tar, unzip                             | Prepare them before running dependent scripts                                |
| Configuration and command entry points | PATH, shell configuration, tool configuration, SSH access model | Place them in the right user or system location and apply them when needed   |

The repository's `tools/cli-tools/install.sh` already coordinates several CLI installers and PATH setup. A separate preflight checks some basic dependencies. Fleet-sync handles the operations repository itself. Together, these mechanisms approach what a user means by “install the tools on the node.”

An updated repository therefore establishes that source files arrived. A required CLI may still be missing, configuration may still need applying, and a service process may still be running old code.

## Different nodes need compatible capabilities

Homelab nodes are rarely identical. This environment includes Linux, macOS and Windows, with x86_64 and ARM64 CPUs. Their availability, network conditions and execution identities also differ.

These differences shape the target a distribution system needs to describe.

First comes the platform. The same tool may require different release assets for different operating systems and CPUs. The existing just installer uses `uname` to select Linux or macOS artifacts for x86_64 or aarch64. Native Windows needs its own installation adaptation.

Next comes execution identity. Installing a tool in one user's `~/.local/bin` establishes that a copy exists in that user's directory. Interactive shells, non-interactive SSH commands and system services may have different PATH, HOME and credential scopes. Acceptance checks need to run as the identity that will actually perform the task.

Node roles matter too. A workstation used for operations and troubleshooting may need a different toolset from an edge node running a single service. A useful target gives each node the capabilities its tasks require, with explicit version requirements. Identical installation lists and byte-for-byte identical paths are not prerequisites.

A complete distribution target should therefore include at least the node and user, required tools, platform-specific installation method, expected versions or compatibility conditions, and verification method. The current implementation covers part of this; the rest guides future toolchain management.

## Bootstrap and routine updates need different paths

A newly enrolled node may have neither Git nor credentials for the private repository. Requiring it to clone the operations repository before running the installer inside it creates a bootstrap dependency.

The existing fleet CLI installer takes a practical bootstrap path: the controller already has the repository, packages `tools/cli-tools/`, sends it over an existing SSH connection into a temporary directory on the target, and runs the installer there. The target needs neither a pre-existing homelab-ops clone nor private repository read credentials. It still needs the network access used by the installers to download tools.

The diagrams below scroll horizontally on narrow screens. You can also open the SVG to zoom in.

**Figure 1. CLI bootstrap and missing-tool installation on a new node**

<div role="region" aria-label="CLI bootstrap: send an installer over SSH, select the platform, fill missing tools and verify as the actual user; scroll horizontally" tabindex="0" style="overflow-x: auto;">

<div style="min-width: 477px; width: 572px; max-width: 100%;">

![CLI bootstrap: send an installer over SSH, select the platform, fill missing tools and verify as the actual user](/images/fleet-sync/01-toolchain-bootstrap-en.png)

</div>

</div>

[Open SVG](/images/fleet-sync/01-toolchain-bootstrap-en.svg) · [Mermaid source](/images/fleet-sync/01-toolchain-bootstrap-en.mmd)

The diagram shows the relationships in the existing installation scripts. Dependency checks currently report some missing prerequisites, and verify mainly produces a report. The task acceptance check at the bottom, connected by a dashed line, is a separate step. When downloads fail or a platform is unsupported, individual installers report errors or skip work according to their rules. A completion message does not establish that every tool is usable.

This path supports batch installation for enrollment and filling gaps. It checks reachability, reports unreachable nodes, and continues with nodes it can access. A single batch run cannot ensure that an offline node installs the tools later; skipped nodes still need follow-up.

Routine updates address a later stage: the node already has a basic execution environment and needs new scripts, checks and configuration as the repository changes. Having an operator initiate SSH distribution every time turns ongoing maintenance back into a manual checklist.

Fleet-sync takes over here: enrolled nodes continuously maintain a canonical operations checkout, with visible sync status.

## Fleet Sync first standardizes source and access paths

Before the initial version, copies of the same operations repository were scattered across user work directories, deployment-tool directories and temporary clones. Some were updated manually, others by cron. Running a runbook meant finding the files and checking whether that copy was the intended revision.

On Linux and macOS, fleet-sync maintains `/opt/homelab-ops` and exposes a common entry point through `$HOMELAB_OPS`. Operators and automation read scripts and documentation from this managed copy. Development happens in a separate clone or worktree, avoiding interference with automatic updates.

The initial implementation uses a Go hub/spoke design. Each node's agent initiates a WebSocket connection to the hub. When the hub detects a remote update, it notifies the nodes; each node then fetches directly from GitHub and updates to `origin/main`. The hub also collects connection and commit status for monitoring.

This works with nodes behind NAT: agents establish outbound connections, so the hub does not need inbound access to every machine. Nodes still depend on direct GitHub connectivity; the hub does not serve Git content. To compensate for missed webhooks, the hub reconciles every 60 seconds. That is a check frequency; completion time still depends on network and node conditions.

**Figure 2a. Control channels connecting heterogeneous nodes**

<div role="region" aria-label="Control channels: Linux, macOS and Windows agents connect to the hub, receive commands and report status; scroll horizontally" tabindex="0" style="overflow-x: auto;">

<div style="min-width: 735px; width: 882px; max-width: 100%;">

![Control channels: Linux, macOS and Windows agents connect to the hub, receive commands and report status](/images/fleet-sync/02-fleet-sync-architecture-en.png)

</div>

</div>

[Open SVG](/images/fleet-sync/02-fleet-sync-architecture-en.svg) · [Mermaid source](/images/fleet-sync/02-fleet-sync-architecture-en.mmd)

Figure 2a shows the control and status channels. Nodes initiate all WebSocket connections, which carry hub commands and agent status reports. A–D are illustrative platform roles. Windows represents an existing native service implementation; deployment status requires separate acceptance. The diagram emphasizes periodic reconciliation and omits the optional webhook trigger, which needs a reachable endpoint.

**Figure 2b. Each node fetches content directly from GitHub**

<div role="region" aria-label="Content channel: each agent fetches directly from GitHub and updates its local working tree; scroll horizontally" tabindex="0" style="overflow-x: auto;">

<div style="min-width: 732px; width: 878px; max-width: 100%;">

![Content channel: each agent fetches directly from GitHub and updates its local working tree](/images/fleet-sync/02b-fleet-sync-content-en.png)

</div>

</div>

[Open SVG](/images/fleet-sync/02b-fleet-sync-content-en.svg) · [Mermaid source](/images/fleet-sync/02b-fleet-sync-content-en.mmd)

Figure 2b applies independently to every node in Figure 2a. The node initiates an HTTPS fetch, GitHub returns refs and objects, and the agent updates its local working tree. Git content passes neither through the hub nor between nodes.

Nodes share a sync protocol and Git revision identifiers. Differences remain in agent builds, service management and local paths:

| Platform             | Agent execution                               | Canonical repository path    | Local adaptation                                                                |
| -------------------- | --------------------------------------------- | ---------------------------- | ------------------------------------------------------------------------------- |
| Linux amd64 / arm64  | Architecture-specific binary, systemd service | `/opt/homelab-ops`           | Service user, directory permissions, Git credentials                            |
| macOS x86_64 / arm64 | Architecture-specific binary, launchd daemon  | `/opt/homelab-ops`           | The current deployment runs as root and needs the corresponding Git environment |
| Windows amd64        | Native Windows SCM service, LocalSystem       | `C:\ProgramData\homelab-ops` | Windows Git, service-account credentials and directory ACLs                     |

Repository content can correspond to the same commit, while local adaptations decide which scripts to execute and which third-party artifacts to install. A successful Git sync does not turn a Linux shell installer into a Windows installer.

**Figure 3. How one update converges on two platforms**

<div role="region" aria-label="Sync sequence: the hub announces B; Linux and Mac independently fetch and report their actual commits; scroll horizontally" tabindex="0" style="overflow-x: auto;">

<div style="min-width: 608px; width: 649px; max-width: 100%;">

![Sync sequence: the hub announces B; Linux and Mac independently fetch and report their actual commits](/images/fleet-sync/03-fleet-sync-sequence-en.png)

</div>

</div>

[Open SVG](/images/fleet-sync/03-fleet-sync-sequence-en.svg) · [Mermaid source](/images/fleet-sync/03-fleet-sync-sequence-en.mmd)

This example assumes the remote stays at commit B during synchronization and omits periodic heartbeats. The two fetches are independent. Their vertical order does not require Linux to finish before the Mac, and there is no transaction barrier requiring every machine to complete together.

Three details affect actual behavior:

- **Agents follow the latest main branch rather than enforcing a revision named in a message.** After the hub sends target B, an agent fetches and resets to the `origin/main` it obtains. If the remote has advanced to C, the agent may report C directly; subsequent hub reconciliation updates the target.
- **Offline nodes catch up after registering again.** An agent reconnects with backoff and reports its local commit. The hub sends pending sync instructions to lagging nodes. Recovery requires both the hub and Git source to become reachable. The initial version has no independent node timer that keeps pulling during a hub failure.
- **Failures remain visible per node.** A failed fetch does not roll back other nodes that already finished. Later reconciliation still identifies that node as behind. Agents use a local repository lock to avoid concurrent writes from duplicate sync requests.

The example uses the single homelab-ops repository.

Acceptance on June 27, 2026 confirmed that all six agents at that time were connected and synchronized, with alerts and a dashboard in place. Canonical repository distribution had been demonstrated in operation.

Synchronizing a new installer script does not execute it again or upgrade every CLI. For example, the existing just installer normally skips installation when an executable already exists; it resolves the latest upstream release on first installation. This fills missing tools but does not continuously reconcile a specified version. Version management needs explicit selection, upgrade and verification rules.

## From repository sync to pull and apply

As requirements expanded to ssh-manifest and dotfiles, distribution began to involve multiple repositories. After receiving files, nodes may also need to apply configuration, refresh command entry points or reload a service.

The successor, fleet-dist, splits the process into notification, pull and apply.

A signature-verifying bridge converts GitHub pushes into ntfy messages. A notified node reads its own manifest, pulls the configured repositories, and runs their hooks. The notification SHA is a change hint; the actual fetch follows `origin/main` at that time. A delayed message therefore does not require a node to return to an older commit.

Nodes also pull all configured repositories periodically. The current systemd timer runs every 15 minutes with up to 60 seconds of randomized delay. If notifications fail or a node misses a message, a later scheduled run can catch up once Git and the local execution environment are available again.

**Figure 4a. Two trigger paths in the successor design**

<div role="region" aria-label="Successor triggers: GitHub notifications pass through bridge and ntfy; node timers provide periodic fallback; scroll horizontally" tabindex="0" style="overflow-x: auto;">

<div style="min-width: 406px; width: 487px; max-width: 100%;">

![Successor triggers: GitHub notifications pass through bridge and ntfy; node timers provide periodic fallback](/images/fleet-sync/04a-fleet-dist-triggers-en.png)

</div>

</div>

[Open SVG](/images/fleet-sync/04a-fleet-dist-triggers-en.svg) · [Mermaid source](/images/fleet-sync/04a-fleet-dist-triggers-en.mmd)

Notifications provide prompt discovery, while the node timer compensates periodically. Both enter the same local pull process.

**Figure 4b. Pull and apply on one node**

<div role="region" aria-label="Successor node flow: select a repository, lock and fetch, run hooks, and record fetch, sync and apply results; scroll horizontally" tabindex="0" style="overflow-x: auto;">

<div style="min-width: 402px; width: 482px; max-width: 100%;">

![Successor node flow: select a repository, lock and fetch, run hooks, and record fetch, sync and apply results](/images/fleet-sync/04-fleet-dist-flow-en.png)

</div>

</div>

[Open SVG](/images/fleet-sync/04-fleet-dist-flow-en.svg) · [Mermaid source](/images/fleet-sync/04-fleet-dist-flow-en.mmd)

**This shows the fleet-dist successor implementation; migration is still in progress.** Every enrolled node executes the flow independently using its own manifest, which can select different repositories, paths and hooks. The diagram expands the ordinary repository update path. It omits early exits such as lock timeouts and initial clone failures, as well as the separate directory-switching branch for authentication-sensitive repositories.

One implementation boundary deserves to be drawn explicitly: the current `pull-repo.sh` continues into the hook loop after a fetch failure. Hooks then operate on retained content, with fetch and apply results recorded separately. Thus, `apply_ok=1` alone cannot establish that this run updated the repository. A hook that must run only on newly fetched content needs an additional constraint; the generic framework does not already guarantee that behavior.

Unlike hub reconciliation in Figure 2a, the timer in Figure 4a runs on each node. A bridge or ntfy outage does not prevent a node from initiating a pull. Monitoring reads results generated on the nodes rather than relying on the old hub to aggregate all sync state.

For toolchain distribution, apply provides a place to connect file arrival with a usable environment. A future hook could update command links, apply configuration or invoke an installer. The existence of generic hooks does not establish that those integrations are complete. Binary upgrades, system configuration changes and service restarts each need their own permissions, repeat-execution behavior and failure handling.

Ordinary operations scripts and configuration affecting SSH access also need different write permissions. Distribution services can receive limited permissions for their tasks, while credentials come from a separate mechanism. Being allowed to read tool files should not automatically grant permission to change access control or use every credential.

## Is this reinventing Ansible?

There is real overlap. Ansible already manages repository checkouts with its [Git module](https://docs.ansible.com/projects/ansible/latest/collections/ansible/builtin/git_module.html), and playbooks can install software, generate configuration and manage services. Automatically delivering operations tools to nodes is already within the scope of configuration management. Fleet Sync does not introduce a category those tools cannot cover.

The useful distinction today is **which state the system takes responsibility for reconciling**.

| Question                          | Current Fleet Sync / fleet-dist scope                                                       | What configuration management can handle                                                       |
| --------------------------------- | ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| What should a node receive?       | A canonical checkout and the repositories and hooks selected by its manifest                | Node roles and required configuration expressed through inventory, variables and tasks         |
| What counts as complete?          | Connections and commits in the original; fetch, checkout and apply results in the successor | Checking and adjusting managed packages, files, users and services                             |
| How does repeated execution work? | Git updates have a defined target; safe hook repetition is the script's responsibility      | Modules supporting idempotent operations; custom commands still need repeat-execution handling |

For example, a node reaches commit B, but someone accidentally deletes `just`. The original Fleet Sync can still report matching repository revisions because “this user can run the specified just version” is outside its target state. Suitable Ansible tasks describing the installation source, version and checks could detect and repair that deviation on the next execution. Repair still needs to be triggered: writing a playbook does not create a continuously running control loop. Most Ansible modules check desired state, but neither every module nor arbitrary shell commands are inherently idempotent. [Playbooks and idempotency](https://docs.ansible.com/projects/ansible/latest/playbook_guide/playbooks_intro.html#desired-state-and-idempotency)

**Pull operation is also not unique to Fleet Sync.** Ansible provides [`ansible-pull`](https://docs.ansible.com/projects/ansible/latest/cli/ansible-pull.html), letting nodes fetch playbooks from version control and execute them locally, with scheduling and external locking. NAT, occasional offline periods, and storing definitions in Git therefore do not individually justify a custom distributor. A pull approach still needs an appropriate execution environment and task adaptations on the target.

There is a concrete reason this project started at the synchronization layer: scripts and runbooks already lived in Git, while scattered copies, inconsistent entry points and unknown lag were the first visible problems. Connecting a canonical checkout, update notifications and revision reports let the existing scripts remain useful. It solved part of the workflow, but does not demonstrate that a custom solution is lighter, more reliable or cheaper than Ansible. The hub, agents, platform services, retries and monitoring all need maintenance too.

That boundary changes as apply expands. If hooks broadly manage software versions, account permissions, templates, dependency order and service restarts, while handling idempotency, drift repair and failure recovery, they are already doing configuration management. Continuing to add generic shell rules would reproduce capabilities mature tools provide, and moving that logic should be evaluated first.

One option is to retain useful notification or status presentation and delegate node configuration to an executor such as Ansible, with a single updater for each working tree. Another is to replace repository pulling as well, using `ansible-pull`. These are future choices, not integrations in the current system. Keeping Fleet Sync should depend on the project-specific work it still performs and its maintenance cost, rather than the fact that it has already been written.

## Why is there no canary for routine sync?

The routine path shown here has no automated canary: nodes independently follow `origin/main`, without a release gate that lets a small group use a candidate and admits the rest only after evaluation. Canarying needs limited real use, evaluation and a decision about further rollout. Notification order, timer jitter and running a script one machine at a time do not automatically provide that process. [Canary release definition and requirements](https://sre.google/workbook/canarying-releases/)

This follows the scope of the current implementation. The original problems were scattered operations checkouts, unclear revisions and missed updates, so the system was built around catching up with main. Canarying also needs candidate revisions, node groups, observation criteria, pauses and promotion. Those release states are absent from the sync protocol. Notifying one machine early is insufficient: others will still fetch the new main on their next run, and even the candidate node may advance directly from B to C.

For documents read by people or scripts not yet invoked, file arrival is usually separated from activation by another step. That explains how synchronization could be implemented first, but does not make toolchain canaries unnecessary. A scheduled task's next script invocation, a configuration hook or an authentication program reading a model can consume new content immediately. **Without a canary, the same error can propagate to every enrolled node before validation finishes.** Matching commits and healthy processes do not replace task acceptance, and reverting Git does not undo installations, configuration writes or other side effects.

Everyday content rollout and migration of the distributor are separate concerns. The fleet-dist migration design calls for an isolated directory on a selected node to compare with the old system, or stopping that node's old agent before giving the new one exclusive ownership of the working tree. Updates, offline recovery and timer fallback are then verified. Old and new agents must not write the same directory concurrently. This tests **the change of distribution mechanism**; it does not automatically canary every subsequent repository commit. A migration plan is also not proof of completed acceptance.

When distributed content changes active access permissions, obtaining candidate content should be separated from activating it, with trial, acceptance and promotion conditions for activation. Ssh-manifest makes that boundary concrete.

## Acceptance means being able to perform the intended task

To decide whether toolchain distribution is complete, work backward from the task on the target node.

| Layer          | Question to answer                                                                             |
| -------------- | ---------------------------------------------------------------------------------------------- |
| Source         | Where did files or installation artifacts come from, and what revision or version is expected? |
| Arrival        | Did the node obtain the content for this run?                                                  |
| Installation   | Does the binary match the platform, with all dependencies present?                             |
| Entry point    | Can the target user and service find and execute the command?                                  |
| Application    | Were configuration, links and any necessary reload completed?                                  |
| Ongoing status | How recent is the last verification, and which expected nodes remain unfinished?               |

The existing fleet-dist records fetch results, checkout consistency, apply results and execution times separately, then exposes local textfiles to monitoring. This provides evidence for repositories and hooks; full toolchain versions and task verification still need corresponding checks.

The existing CLI verify lists tool versions or marks `MISSING`, which helps inspection. It is mainly a reporting mechanism: a successful script exit does not establish that every tool meets requirements. Likewise, overall installer completion should not obscure skipped offline nodes or missing dependencies.

Fleet-sync itself encountered a directly relevant incident: CI passed, the image digest changed, and health checks were normal, yet the image still contained an old binary. A string unique to the new code exposed the mismatch. Building the same source with another builder produced the correct result, but the underlying cause was not conclusively established. Repository revisions, installed artifacts and running versions therefore need separate checks; one healthy signal cannot cover the entire toolchain.

A meaningful acceptance check runs as the actual maintenance identity, in its real non-interactive environment, verifies versions, and executes a harmless check command. For a long-running service, also confirm that the current process uses the intended version.

## Where the implementation stands

The existing capabilities fall into three layers of the original problem.

The first is bootstrap and filling installation gaps. Existing CLI scripts distribute installation logic over SSH, adapt some tools to the platform, and report reachability and versions. They still depend on a basic environment, report some prerequisites without fixing them, and lack a unified version convergence policy.

The second is continuous distribution of operations source files. The original fleet-sync has been deployed and run, maintaining canonical checkouts with sync visibility. That is its clearest responsibility today.

The third is application after pulling and ongoing verification. Fleet-dist has delivered core agent, bridge and monitoring code, but the project records reviewed as of October 26, 2026 do not establish completed fleet-wide migration. Continuous tool version management also remains to be integrated.

Further work should focus on the toolchain itself: which roles need which tools, how version requirements are expressed, how installation and apply can be repeated, how offline nodes catch up, and how usability is verified under the target identity. If this develops into complex dependency and system-state management, established configuration management deserves another evaluation instead of adding everything to shell hooks.

Completion should be judged by the next real maintenance task: an operator or automation arriving at an enrolled node can use the expected tools directly. When it cannot, the system should identify what is missing, where it is behind and which step needs attention.

## Next: ssh-manifest deployment on LAN and edge nodes

Ssh-manifest describes SSH identities, allowed access relationships and public keys. Distributing it as ordinary files differs from making SSH authentication consume it live. An error in the latter can cut off both operations access and the route needed to repair the change. The existing authentication transition design therefore has a separate canary stage, including Linux and macOS verification, with different acceptance goals from repository sync trials.

The next article will explore why deploying one access model to LAN and remote edge nodes needs to account for different recovery conditions. Here, edge means remote edge nodes; the important distinction is access and recovery, rather than an IP address's subnet alone.

| Environment       | Conditions to confirm before choosing a strategy                                                                                                                                                |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| LAN nodes         | Is on-site access actually available? Is there a local console or independent management path? Being on the LAN does not itself ensure recoverability                                           |
| Remote edge nodes | If primary SSH access fails, can an out-of-band console, independent management channel or node-local rollback still work? Does it depend on the same authentication and network being changed? |
| Both              | Make the candidate revision and activation scope explicit; verify the target identity and required paths with new SSH sessions; stop expanding scope if acceptance fails                        |

A node that is easy to recover is a possible trial candidate, but one LAN Linux node cannot cover remote routing or macOS differences. An existing connection staying alive does not prove the next login will succeed. The follow-up will examine candidate activation, trial selection, promotion and recovery after losing contact. The strategy needs to reflect each node's recovery options and platform; LAN and edge labels alone cannot determine rollout order.
