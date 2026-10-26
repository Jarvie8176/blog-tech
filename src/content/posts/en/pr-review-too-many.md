---
title: 'Too many pull requests to review!'
description: 'Treat AI as a fluid intelligence, shape implementation with requirements and verification, and keep both review work and growing complexity under control.'
pubDate: 2026-10-25T19:20:00-07:00
translationKey: homelab-ops-pr-review
categories: [Homelab Ops]
tags: [homelab, AI, workflow, code-review, project-management]
heroImage: '../../../assets/pr-review-too-many/makeine-cover.jpg'
heroImageAlt: 'Cover of 負けヒロインが多すぎる！. Image source: Bangumi.'
toc: true
---

_Treat AI as a fluid intelligence, and shape its output with requirements, constraints, and acceptance criteria._

Hand configuration, scripts, and maintenance to AI, and the change soon becomes visible on GitHub: more implementations to check, more designs to assess, and more pull requests to handle.

AI can work on several tasks at once. A person still needs to judge whether the results are right. If every change waits for me to read it line by line, time saved on coding can easily turn into time spent reviewing. I wanted less maintenance work and ended up becoming the system’s review queue.

As implementation capacity grows, where should people apply their judgment, and where should a project stop and wait?

I prefer to think of AI as a **fluid intelligence**. Given a general direction, it can explore, fill gaps, connect pieces, and supply many implementation details. My job is to build a mold: requirements, design intent, interfaces, constraints that must hold, and a way to tell whether the result is acceptable. AI can then fill that mold—an analogy to injection molding—before audits and actual use reveal where refinement is needed.

The mold needs iteration too. An implementation may expose an overlooked requirement, and acceptance work may show that a design is unsuitable. Managing the process includes deciding when to refine the result and when to make a different mold. AI can also fill gaps with extra features, abstractions, and procedures. I need to ask whether the mold is becoming more complicated than the actual need.

## Make the mold into usable constraints

In Homelab Ops, the mold lives across several connected places.

Issues describe the problem and completion conditions. Epics organize related tasks. Design documents explain the system’s decomposition, and interfaces specify how components exchange information. A PR fixes a particular set of changes for review. CI checks requirements that can be evaluated mechanically. Operational records and acceptance results show what the changes actually did.

These materials need to agree. A requirement left only in a chat can disappear in the next implementation. If documentation gives an interface one meaning while the code accepts another, later components grow around incompatible interpretations.

The mold also needs to distinguish where flexibility is useful. Interface copy and layout can be discussed through prototypes. Where data may be written, which objects an action may affect, and how failure is recovered need clearer boundaries. Put constraints that can be checked by a program into those checks. Leave semantic interpretation and trade-offs to AI or people where they are needed.

I want working conditions that someone else can use: with the goal, inputs, allowed changes, and acceptance method available, work can continue.

## Let multiple agents challenge the implementation

Review can run in parallel too. For changes that deserve close inspection, I ask several agents to look for counterexamples from different perspectives: concurrency, resource use, permissions and data exposure, recovery, or the producers and consumers of an interface.

In practice, I do not need to spell out those perspectives as detailed instructions. I usually just say: **“Audit PR #xxx.”** Choosing review perspectives, splitting the work, reading source code, finding triggers, running reproductions, and consolidating and adjudicating findings are mental work I can delegate to the model. The findings and evidence it returns need to be specific; the initial request can be brief.

I am comfortable doing this because upstream cloud models have learned from enough best practices, design patterns, and accounts of things going wrong. Their pace of improvement and reasoning capabilities are already sufficient for these tasks in my own practice. I choose to let them handle the complexity, trading tokens and electricity for mental labor. That judgment rests on results in my current use; audit evidence and feedback from use still determine whether the work is good enough.

The goal is for the models to fill gaps through repeated rounds of adversarial review, then feed problems encountered in actual use into the next iteration. I focus on **understanding decision points and confirming requirements**: why a change is needed, which trade-offs are worth accepting, and whether the result serves its purpose.

The findings then need consolidation, deduplication, and adjudication. During one photo-cache audit, one reviewer believed concurrent corruption had been ruled out, while another believed it was possible. The coordinating agent ran a reproduction and confirmed a window in which writing truncated the file. The triggering sequence and observed behavior settled the disagreement.

Findings can be prioritized from P0 through P3. This is the working rubric used in the article; the actual severity still depends on impact and triggering conditions.

| Level | Main question                                                                                    | Response                                                                 |
| ----- | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| P0    | Could this cause severe damage that is difficult to recover from, or breach a critical boundary? | Stop the affected work, contain the impact, and fix it.                  |
| P1    | Does it block a core function or invalidate an important operational or recovery promise?        | Resolve it before releasing the relevant stage.                          |
| P2    | Does it fail under particular conditions, affecting reliability, compatibility, or maintenance?  | Fix it or explicitly track it according to the current acceptance scope. |
| P3    | Would it improve readability, presentation, or local maintainability?                            | Schedule it by value without burying the important findings.             |

Reviewers do not need to fill every category. Each finding should bring evidence. An unreproduced concern can remain a question to investigate without being presented as a confirmed defect.

Fixes need review as well. A change may cover only one trigger or introduce a different error. The checking tools can also be wrong: inspecting an old version, connecting to the wrong preview server, or failing to collect a new sample can all produce a false conclusion. Reviewers need to establish which version and objects they checked, and that their test can detect the target error.

Agreement provides a lead. Independent counterexamples and operational evidence make the conclusion easier to assess. These methods have been used across several tasks; a common audit SOP and supporting tooling are still being developed.

## Put limits on complexity that AI adds

AI makes code and documentation cheaper to produce. It also makes it easier for a system to grow extra structure. A local change can lead to a general interface, a configuration layer, a plugin mechanism, migration tools, and another management process. Each addition may have a plausible purpose, yet together they can exceed what this homelab needs to support.

Delegating the complexity of analysis to a cloud model does not mean embedding all of it in permanent frameworks, settings, and approval steps. An audit investigation can finish after consuming tokens. Components and procedures left behind keep incurring maintenance costs.

That complexity needs ongoing care. Another component means deployment, upgrades, troubleshooting, and recovery. Another setting adds behavior to understand and verify. Another approval step consumes human attention. AI can help maintain these things, but the cost of understanding the system, taking over, and replacing tools remains.

When reviewing a design, I therefore ask:

- Which existing problem, or clearly evidenced upcoming problem, does this structure solve?
- Could existing components and a simpler implementation meet the current need?
- Which runtime dependencies, maintenance steps, and concepts must someone now understand?
- What useful capability would we lose by deferring or removing this layer?

The shared operations base made such a choice: reuse existing distribution infrastructure and explicitly reject building another cross-tool configuration conversion and code-generation framework. Different tools needed to discover and invoke shared operations. There was no need to build every conceivable extension in advance.

Multi-agent review needs scope control too. Reviewers can keep proposing edge cases and more elaborate implementations. Each suggestion should return to actual impact, triggering conditions, and the current goal. Data integrity, permissions, recovery, and core behavior deserve depth. Local naming, unused extension points, and implementation changes based only on preference can be scheduled by maintenance value, keeping delivery from becoming endless polishing.

I want an agreed stopping condition for the current stage: blocking problems have been addressed, acceptance criteria are met, and remaining risks and follow-up work have a clear home. New, important evidence can reopen the investigation. This preserves necessary detail while preventing review from circling around low-value questions.

The mold has a cost of its own. I want to keep reducing unnecessary dependencies, branches, and manual coordination, give added complexity a concrete purpose, and allow parts that have lost their purpose to be simplified or removed.

## Keep the project moving until a decision is needed

With a clear goal and authorized scope, AI should be able to complete a continuous stretch of work: inspect the current state, gather information, propose an approach, implement it, test it, fix problems, and leave a reviewable result. Asking “shall I continue?” after every command divides the project into unnecessary waits.

I want people to receive questions that require a trade-off. Will the next step widen data exposure? Change an accepted interface? Add ongoing operating costs? Affect an existing service?

That requires an understandable tracker. Which requirements are confirmed, which steps are implementation details, which tasks have unmet dependencies, and which actions need a decision should all be visible there. A follow-up task can be created with its blocking conditions recorded and remain queued until they are satisfied.

At a decision point, AI should bring enough material for a choice: what it observed, feasible options, a recommendation, costs, and the work the decision would unlock. If it found an implementation defect and fixing it remains within the original goal and authorization, it should continue resolving it.

This is the project-driving capability I want to improve. Tools differ in sustained execution, authorization, and task recovery, so the concrete scope still needs to be established for each task. Finish the preparation that can be done independently, and reserve human attention for places where direction may need to change.

## Discover requirements before deciding to remake the mold

Even a clearly described task can rest on a misunderstanding. AI can implement that misunderstanding quickly. The faster it works, the more useful it is to show something early and confirm the direction.

A homelab monitoring page provided one example. “Glance” could mean a standalone portal or a dashboard in Grafana. A task first changed the portal. The clarified requirement was to dynamically collect items needing attention from other dashboards into Grafana’s alert overview. That required retracting unrelated changes and reorganizing the implementation around the intended page.

The problem existed before coding. We needed to establish the user’s entry point, the judgment they wanted to make, the missing information, and what would count as a useful result. A shared name and an easy implementation do not establish that the task is understood.

Other requirements become visible through use. The digest system encountered an arrival rate above the capacity of its message windows to drain the queue. Sending more messages could relieve some backlog while increasing reading load. A later design separated the notification surface, complete data, and drill-down reading, reopening questions about how summaries should be organized, what must remain explicit, and which object feedback should address.

This is requirements discovery. Feedback, prototypes, and operational data keep refining the initial description. When the direction is wrong, we need to return to requirements and design and accept that some completed implementation may be replaced.

## Use a spike and a minimal end-to-end experiment before committing to delivery

Redesign does not require an immediate full implementation. When a key assumption is uncertain, a spike can answer a question that would change the subsequent route with a small experiment.

Early experiments with session provenance markers for GitHub writes needed to establish whether the CLI’s different body-input forms could be handled correctly, whether repeated edits duplicated markers, and whether commands without an explicit body retained their meaning.

Tests against a stand-in were insufficient. Using the real CLI exposed dangerous behavior: removing an old footer could also swallow valid content below it. That defect concerned preservation of actual content and deserved attention before celebrating the marker’s appearance.

I separate the progression into three parts:

1. **Spike:** fix the critical question and seek evidence for or against feasibility with a minimal implementation.
2. **Minimal E2E:** send a representative input through the real entry point to an actual output, then read it back from the receiving side.
3. **Delivery:** accept, adjust, or abandon the route based on those results, then plan the full implementation, deployment, monitoring, and business acceptance.

An experiment’s conclusion needs a bounded scope. One successful API call establishes a working call path. It has not answered questions about sustained operation, upgrades, recovery, or multiple users. Conversely, an experiment that disproves a critical assumption can justify stopping the project.

I want evidence that helps the decision before investing further in the mold.

## Put explicit gates between stages

For AI to keep moving, it needs to know where it must stop. A gated decision connects a later action to an explicit decision or verification condition.

These gates serve different purposes. A design gate settles direction and trade-offs. An interface-freeze gate establishes whether a component contract is stable enough to depend on. A release gate decides which changes may enter the running environment. An acceptance gate judges whether the observed result meets the original requirement.

Human decisions and mechanical checks can work together, with distinct responsibilities. An interface that passes CI may still omit a field needed by a consumer. Accepting a design does not deploy it on a node or establish that it works for the user.

Homelab interface-freeze discussions encountered exactly this situation. Tests stayed green while adversarial review found discrepancies in field meanings, required conditions, and documentation. The work needed to extract inputs and outputs from the implementation, compare producers and consumers, and then decide when other components could pin the interface.

A useful gate states what it protects, what evidence releases it, who decides, and what becomes allowed afterward. “Approval required” without a binding to the current version, target, and action can leave participants approving different things.

Authorization tools need this scrutiny too. A token or confirmation dialog alone does not establish that approval came from the right person, covers the right parameters, or remains usable after task recovery. Describe those capabilities according to what has actually been delivered. “There is a gate” cannot stand in for the whole approval chain.

Gates at meaningful boundaries can reduce both needless interruptions and work proceeding without the necessary judgment.

## I review design and implementation intent rather than defaulting to every line

If AI audits and automated tests inspect implementation, what should a person read?

My focus is understanding decision points and confirming requirements, then assessing design and implementation intent: why the change is needed, why this route was chosen, which existing behaviors must remain, which will change, and why the verification supports the conclusion.

Intent needs to become behavior. “Add caching” names an implementation technique. “Concurrent readers see only complete results, and resource consumption has explicit limits” tells a reviewer what to inspect. “Add retries” similarly needs to explain which failures are retried, whether writes can be duplicated, when retries stop, and how failure becomes visible.

I do not make line-by-line source reading the default for every PR. I ask AI to explain the relationship **requirement → design choice → implementation location → observed result**. When a claim needs checking, that trail must still lead back to code, tests, and runtime state. High-impact changes may need additional code or domain review.

A PR I can review effectively should let me understand:

- The actual problem, chosen approach, and reasons for accepting the trade-offs.
- Whether the added complexity earns its place and whether a simpler approach meets the same need.
- The changed behavior, affected objects, and recovery or compatibility costs.
- Findings from AI review, how they were handled, and judgments still unresolved.
- Inputs and behaviors covered by acceptance, and what remains for me to confirm through use.

Source code remains an important object of implementation review. I spend more attention on the relationship between mold and output, while tools that can read the code inspect implementation details. A persuasive explanation and numerous tests still need to be checked against actual behavior.

## Let acceptance and feedback carry refinement into the next iteration

After a PR is merged, we still need to check whether it reached the running environment and what the user ultimately received.

One photo-workflow E2E task illustrated the problem. It completed a limited transfer check and honestly recorded the unfinished work, but cleaned up the transferred test copies before the user could inspect their final destination. Later acceptance and handoff lost the objects they needed.

The missing piece was a clear endpoint for the whole request: which stages the selected assets should traverse, where they should end up, who still needed to inspect them, and when cleanup became permissible.

Acceptance therefore needs to start from actual use. A notification should travel from the expected trigger to a readable message at the correct recipient. Photos should reach the agreed location and remain usable by subsequent tools. A service update should establish that the new version is running and existing data and functions remain usable. Each step needs to say what was checked and which states remain unknown.

Feedback needs a destination too. An implementation defect can become a regression test. A frequently misunderstood requirement can enter a task template or design explanation. An unsuitable default can become an adjustable policy. An unsuitable interface calls for reopening the design. Recurring problems deserve changes to constraints and mechanisms, beyond another written reminder.

That is what refinement should achieve: after a deviation is corrected, the next iteration should be more likely to produce a suitable result. Lessons worth retaining can pass through [session closeout](/en/posts/session-closeout/) into records, procedures, and verification tools that later tasks can find.

## Bring review back to the judgments that matter

This approach will not make PRs disappear. Design, implementation, deployment, and later revisions still need inspectable change records.

I care more about whether solving real problems is also increasing the maintenance burden, whether I keep judging the same low-level questions, and whether the material is ready whenever a decision reaches me. Discover unclear requirements first. Experiment with unverified assumptions. Expose implementation deviations early through review and tests. Bring new trade-offs to a human decision point.

Human attention belongs on understanding decision points and confirming requirements. Models fill implementation gaps through repeated adversarial review, and actual use supplies the next round of feedback. My task is to judge whether the direction, trade-offs, and effects meet my needs.

Treating AI as a fluid intelligence means giving it room to work while continuing to inspect the mold. It can fill in implementation details, find errors, and help redesign that mold. People need to retain an understanding of goals, constraints, acceptance, and action boundaries, and be able to intervene when the result drifts from its purpose.

The rhythm I want for Homelab Ops is to describe the required shape, let AI make sustained progress, inspect the result through evidence, and bring feedback into the next iteration. When there are too many PRs to review, the process that funnels implementation back to a person may itself need redesign.
