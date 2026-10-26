---
title: 'Why I run a homelab: from Raspberry Pi lighting control'
description: 'From Raspberry Pi lighting control in 2022 to home automation and personal services: their value, maintenance cost, and what people still need to understand as AI improves.'
pubDate: 2026-10-25T19:00:00-07:00
translationKey: homelab-ops-why
categories: [Homelab Ops]
tags: [homelab, AI, self-hosting]
toc: true
---

In 2022, I installed Home Assistant on a Raspberry Pi. The first feature was simple: controlling the lights at home remotely.

That starting point explains why a homelab became useful to me. There was a small thing I wanted to make more convenient, followed by the hardware and software to make it work. Questions about dividing responsibilities between hosts or deploying services became relevant as those needs grew.

After remote lighting came more home automation: starting and stopping the air conditioner, opening and closing curtains, switching outdoor decorative lights, and a sensor-triggered doorbell. Indoor air quality, device temperatures, and battery levels later joined the monitoring setup.

A single Raspberry Pi gradually became part of how the home worked.

As AI began helping manage it, the experience raised a longer-term question: when more building and maintenance can be delegated, what do we still need to understand and control? For me, a homelab is also a concrete place to practice deciding how technology should fit into everyday life.

## From controlling a device to coordinating behavior

Remote lighting removes the need to be near a switch. Automation adds choices about when devices should operate, which conditions should trigger them, and how they should work together.

Lights, air conditioning, curtains, and sensors each have their own functions. Connecting them through Home Assistant lets me observe their state and arrange their behavior within one system. As more devices join, the value extends from another way to control them to organizing them around the way I live.

Monitoring brings a different change. Temperature, battery charge, and air quality become information that remains available to inspect: whether a device is overheating, a battery needs replacing, or the indoor environment is changing. That information can also become an input to automation.

What appeals to me is being able to decide how the system should behave. A feature can begin with a practical need at home and continue to change after it is working.

## How the homelab grew

Through this process, “homelab” acquired a concrete meaning: a set of systems I build, run, and maintain to meet personal needs and try out technology.

It can begin with one Raspberry Pi. Home Assistant connects devices and runs automations. The host keeps it running, the network connects the parts, and storage holds configuration and historical data. Even a light switch on a screen already depends on several components working together.

When the needs expand to photos, files, media, or other self-hosted applications, that structure extends. Where data lives, which host runs a service, and which components need to remain online become decisions worth considering carefully.

The environment later added Immich for photo management, Samba for file sharing, Syncthing for synchronization, and media services including Jellyfin and Music Assistant. Its functions now cover more personal data and everyday activities.

These choices let me assemble a system around my needs. I can improve one function, move a service, or replace it. Understanding how the parts relate affects how confidently I can make those changes later.

The scale of a homelab does not need to be decided in advance. For me, it makes more sense to meet one clear need well, then decide what deserves the next investment.

## Building it means taking responsibility for it

That freedom comes with maintenance responsibilities.

Adding a device involves connecting it, naming it, and deciding how to use it. Adding an automation requires checking triggers and results. Updating a service raises questions about configuration compatibility and recovery after failure. Devices, batteries, networks, and hosts each have their own ways of failing.

Troubleshooting a newly built function is often manageable. Over time, the reasons for a choice, the location of configuration, and the dependencies become less clear. A service can keep running long after I have forgotten why it runs that way.

This is an easily underestimated cost of personal systems: some knowledge stays in the builder’s memory. A system may run for a long time, yet the next problem still requires getting to know it again.

I therefore think a homelab’s value has two parts: the functions it provides and the continuing effort required to keep them available.

Remote control of one light is a modest commitment. Putting home automation, important data, and frequently used services into the same environment increases that responsibility. Different uses can have different requirements. An experimental environment may be easy to rebuild; services that have become part of daily life need clearer recovery arrangements.

## Why keep investing in it

The reasons for having a homelab are concrete by this point.

First, it keeps solving my own problems. From lights, air conditioning, and curtains to environmental and device monitoring, each new function can be checked against actual use.

Second, it lets me understand and change the system. Why a device stopped responding, where a state came from, or why a rule ran are questions I can pursue through components I manage. Better understanding gives later changes a firmer basis.

Building also creates opportunities to learn. Making a home automation work reliably may involve device protocols, networking, Linux, containers, storage, and monitoring. A practical result connects those topics and gives me a way to test what I have learned.

These benefits belong alongside a time budget. Every new function leaves future work. Some needs justify more self-hosting; others are easier to meet with an existing service. A feature can also be removed when life changes. Deciding what to keep and simplify is part of owning the system.

## What remains worth understanding as AI improves

If AI can handle more installation, configuration, and troubleshooting, the need to perform every step personally will change. I care more about being able to explain why I need a function, what I am willing to spend on it, and how I will judge whether it improves everyday life.

A home automation running successfully is a starting point. When it should take effect, when someone should be able to intervene directly, and what should happen if a device disconnects involve practical preferences and trade-offs. AI can propose options; the people using the system still need to understand and accept those choices.

Understanding also has concrete objects: where photos are stored, which devices depend on the same host, what will stop working without the network, and how to retrieve data or adopt a different implementation. Those relationships determine the choices available when needed. Having an administrator account is one condition. Being able to assess state, change configuration, and restore essential functions makes that control meaningful.

For me, AI can lower the barrier to practicing these abilities. As it takes on more implementation work, I want to remain able to explain the system’s purpose and dependencies, judge whether the outcome is appropriate, and decide to continue, change course, or stop. The learning value of a homelab can develop in that direction too.

## The next question is ongoing management

Since 2022, Home Assistant has expanded from remote lighting into more home automation. Before 2026, I managed HASS and the homelab manually.

In 2026, I began exploring AI management further. That introduced new questions: when AI performs more operations for me, how can it understand the system, verify results, and recover from failure? How much maintenance will the additional tools and rules for managing AI require?

The Homelab Ops series will follow a personal system being built, used, and maintained, starting from real needs. The question running through it is what people must still understand and control as AI technology advances.

[The next article looks at the move from manual maintenance to AI operations](/en/posts/managing-homelab-with-ai/): what becomes easier as the scope grows, and which new responsibilities need attention.
