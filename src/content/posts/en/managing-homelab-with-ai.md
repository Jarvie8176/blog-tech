---
title: '[02] Managing a homelab: from manual maintenance to AI operations'
description: 'The services behind Homelab Ops, monthly repository evidence, and a real incident: how AI changes operations and what people need to verify, stop, and recover.'
pubDate: 2026-10-25T19:05:00-07:00
translationKey: homelab-ops-management
categories: [Homelab Ops]
tags: [homelab, AI, self-hosting]
toc: true
---

In 2022, I started home automation with a Raspberry Pi and Home Assistant. Remote lighting was followed by air conditioning, curtains, outdoor decorative lights, a doorbell, and environmental monitoring. Before 2026, I managed HASS and this homelab manually.

In 2026, I began delegating more management work to AI and building Homelab Ops around it: helping AI understand the system, handle configuration, perform operations, verify results, and leave records.

The object of maintenance has been changing too. There are more services to manage. To let AI do that work reliably, I also need to manage its context, permissions, procedures, and coordination between sessions.

These two kinds of growth raise a question: as AI technology advances, what must people still understand and control? My current answer is that execution can gradually be delegated, while people retain judgment over goals, constraints, and consequences, along with the ability to verify, stop, take over, and recover. That is also how I want to evaluate whether AI management is worthwhile.

## What Homelab Ops manages

homelab-ops is the environment’s operations repository and work record. It holds host and service inventories, configuration, scripts, recovery procedures, architecture decisions, and audit results. GitHub issues track tasks, pull requests provide change review, and CI performs suitable automated checks. AI uses this material to participate in deployments, upgrades, migrations, troubleshooting, monitoring checks, and record updates.

Its scope has grown from home automation to files, photos, media, and personal administration. These are some services marked as deployed in the October 2026 inventory, grouped by purpose.

| Purpose                                 | Representative services                 | Work they support                                             |
| --------------------------------------- | --------------------------------------- | ------------------------------------------------------------- |
| Home automation                         | Home Assistant, Zigbee2MQTT             | Device connections, state collection, and home automations    |
| Files and photos                        | Samba, Syncthing, Immich                | Sharing files, synchronizing devices, and managing photos     |
| Media                                   | Jellyfin, Music Assistant, Calibre-Web  | Managing and accessing video, music, and ebooks               |
| Personal information and administration | Linkwarden, Memos, Vikunja, Firefly III | Bookmarks, quick notes, tasks, and personal finances          |
| Monitoring and notifications            | Prometheus, Grafana, Uptime Kuma, ntfy  | Metrics, trends, availability checks, and notifications       |
| AI and task execution                   | Hermes, LiteLLM, Cronicle               | An AI operations interface, model access, and scheduled tasks |

The services need ongoing deployment and maintenance. The interfaces, permissions, and context tools built around AI need attention too. Understanding how Homelab Ops changes therefore involves both the needs it serves and the work introduced to manage them.

## Making maintenance knowledge transferable

During manual management, I built and maintained the system myself. Why a configuration looked a certain way, why a device used a particular integration, and which changes needed a reboot could be remembered through that work.

Once AI participates, the system needs to be transferable.

“Upgrade this service” does not describe the whole task. AI needs to know where the service runs, what it depends on, which configuration is authoritative, what it may change, how to recognize success, and what to do after failure.

Those requirements encouraged organizing inventories, operation records, and procedures. Hosts and services gained checkable lists, version control preserved changes, recurring operations acquired explicit steps, and completion needed evidence.

Some of that knowledge already existed in human memory and judgment. Recording it transfers part of the work: AI can use it, and my future self can take over more easily. AI also introduces coordination questions, such as preventing two sessions from changing the same files and identifying which session performed an operation.

## How far the management scope expanded

I audited the repository’s history by month from May through October 2026. The following charts show several directly checkable indicators.

![Monthly Homelab Ops scale: declared deployed services, tracked files, architecture decisions, and workflow files](/images/homelab-ops/monthly-scale-en.png)

The audit ends at a fixed Git revision from October 25, 2026 at 12:57 Vancouver time. Service counts are inventory declarations. Architecture decision records include proposals, accepted decisions, and superseded history. May also includes repository creation and imported documents, so its contents cannot all be treated as newly built features. The [aggregate dataset](/data/homelab-ops-monthly.csv) is available with these charts.

Over this period, registered host entries rose from eight to nine, while services, implementation files, and management records grew much faster. June and July accounted for about 74% of the net file increase after May. Repository activity fell in August and September, then rose again in October.

![Monthly first-parent commits and net file growth](/images/homelab-ops/monthly-activity-en.png)

October is particularly informative: services marked as deployed increased by just one net entry, while files increased by 430. New material covered photo processing, monitoring, AI clients, and memory management. Service entries alone no longer describe changes to functionality, tests, and operational tools.

With May-end set to 1×, the final snapshot has 2.67× as many service entries, 6.28× as many files, 3.50× as many architecture decisions, and 3.45× as many workflow files.

![Relative growth since May-end for files, service entries, architecture decisions, and CI workflows](/images/homelab-ops/relative-growth-en.png)

These figures establish growth in implementation and management scope. File splitting, imported history, tests, and generated results also affect the counts. They cannot directly answer how much time AI saved. That requires data on human approval and correction time, AI costs, and troubleshooting and recovery outcomes.

## How a batch operation amplified an error

As management capabilities grow, the impact of an operation can grow too. An SSH key rotation incident in June made that concrete.

The rotation script needed to identify and retire an old key. It instead matched a prefix shared by all keys of that type. Relevant SSH keys on five hosts were disabled together, leaving the existing management identities unable to log in.

A second lockout happened during recovery. The fixed code had been fetched, but switching the working version failed. The operation then ran the old script again.

There was no data loss or externally visible service outage. Management access was seriously disrupted, and recovery required consoles, passwords, and previously retained configuration snapshots.

The incident exposed two separate questions: whether the operation’s logic is correct, and whether the version being executed is the one that was checked. Fixing code, downloading files, and running a command each need their own verification.

Subsequent fixes extracted the key-editing logic for testing, matched complete key contents, rejected working directories with uncommitted changes before execution, and avoided rotating the access identity on which the operation itself depended. The broader lesson was to limit scope, verify results, and retain a recovery path before extending an operation to multiple hosts.

That matters especially for AI management. AI can carry out a group of operations faster, which makes it important to expose errors within a smaller scope.

The incident also gives “understanding and control” concrete meaning: knowing which access paths an operation affects, confirming the actual version in use, and finding a recovery method after the original management interface fails. Even when AI writes and checks the script, those conditions need to become evidence a person can understand and inspect.

## The tools for managing AI need maintenance too

Execution and coordination requirements produced mechanisms for permissions, auditing, task exclusion, isolated workspaces, and context distribution. They solve practical problems and introduce work of their own.

Documentation provides one example. By June, one architecture decision record exceeded a thousand lines, with conflicts between the original text and later amendments. Both people and AI had difficulty determining the current choice by reading its initial decision section.

The repository introduced clearer supersession relationships, indexes, and checks. Old decisions preserve their historical context while new ones state the current choice. Each change also has more references and consistency conditions to maintain. The decision records themselves became a maintained system.

Another adjustment is consolidating repeated capabilities. When multiple AI tools need the same operations, executable logic and required checks can live in a shared base, discovered and called as needed. This reduces differences between copied rules while adding an interface that must be deployed, diagnosed, and maintained.

These trade-offs need continual review. A mechanism deserves to stay when its problem still exists, it works at the relevant point, and its upkeep is proportionate. For a recurring class of error, input checks, isolated environments, or automatic refusal conditions are often easier to verify than repeated additions to written reminders.

## What people need to understand and control

For a homelab, I put the question into several practical areas. They can change as tools improve and need to be tested through actual operations.

First are goals and trade-offs. Whether to add a service, how much interruption is acceptable for convenience, and how much money and maintenance time to spend depend on the user’s needs. AI can offer options and analysis; people need to understand the consequences and decide when to stop expanding.

Second are important dependencies and data. We need to know where critical data lives, which services share storage, networks, or identities, and which failures affect multiple functions. The necessary depth should match the risk. An experimental environment can be easy to rebuild; important photos and everyday home functions need clearer preservation and recovery arrangements.

Third is the basis for judging results. A running process is one signal. Whether the service is reachable, automations execute, devices communicate, and existing data remains intact determines whether the change achieved its purpose. People need to set acceptance criteria, recognize missing evidence, and ask for further checks. AI can help write those checks, but configuration inspection, actual behavior, and recovery exercises provide different kinds of evidence and should be used together.

Fourth are authorization and stopping. There need to be explicit boundaries around the hosts AI can access, the data it can modify, and the scope to which it may extend an operation. Pausing tasks, revoking permission, and limiting impact need executable methods. Authorization also needs reconsideration when the goal or system state changes.

Finally, there is the ability to take over, recover, and change tools. If a management interface fails, another access path is needed. If AI cannot continue, configuration, data, and procedures must remain findable. Changing models or tools also requires knowing which state can move with them. These abilities are worth practicing during routine maintenance so their usability is demonstrated.

AI can also help analyze needs, design verification, and perform recovery. I want a relationship in which its growing capability leaves people able to understand important evidence, set boundaries, and intervene when necessary. Records, monitoring, backups, and recovery procedures then serve a shared purpose: keeping delegated work understandable and adjustable.

## What the series will cover next

Homelab Ops will continue with practical questions: checking running state against documentation, verifying alerts, arranging reversible changes, demonstrating that backups can be restored, and deciding how people should see status and intervene.

Each article will preserve the environment in which a problem appeared, the constraints, the reasons for a choice, and the verification results. Successful operations can become reusable methods; failures help establish their boundaries.

For this system that began with Raspberry Pi home automation, I want to keep asking what people must understand and control as AI improves. My current checks are concrete: can I explain why it runs this way, judge whether the result meets my needs, and stop, take over, or recover when necessary? Every addition to automation deserves another answer to those questions.
