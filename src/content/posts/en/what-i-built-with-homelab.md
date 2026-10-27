---
title: '[11] What I have built with my homelab'
description: 'Photo culling, media migration, email triage, immersive walks and city videos: the practical tools and creative work my homelab supports beyond operations.'
pubDate: 2026-10-26T23:55:00-07:00
updatedDate: 2026-10-27T00:46:34-07:00
translationKey: homelab-outcomes
categories: [Homelab Ops]
tags: [homelab, photography, workflow, Amanuensis, Trailwalk, VR]
toc: true
---

After a photo shoot, how do I bring the files home safely and pick the ones worth processing? After recording a trail, how do I let someone wearing a headset look around and hear the environment from the right direction? Could something also do a first pass through the email arriving every day?

Questions like these have gradually given my homelab a concrete purpose. It provides storage, compute and a place for services to keep running. It also lets me connect existing software with tools developed around my own habits.

AI handles the coding and media post-production for all of these projects. I set the requirements and direction, guide the choices and review the results. AI carries out the implementation, including writing code, performing edits and compositing in DaVinci Resolve, and using vision-language models (VLMs) to rate photos. I provide goals and feedback; AI implements them; actual use and rendered previews guide the next revision.

Earlier articles covered [how this environment began](/en/posts/why-homelab/) and [how I manage it](/en/posts/managing-homelab-with-ai/). This one looks at what it has helped produce: a photo workflow, media migration tools, an information assistant and two kinds of 360° experience. The project status described below is as of October 26, 2026; Cull Swipe usage and the rating comparison were checked again on October 27.

## Photo Pipeline and Cull Swipe

Photography continues long after the shutter closes. RAW and JPG files need to be imported, checked and culled. The selected photos need editing and export before they are ready to browse and share. Mature software exists for every stage, but connecting the stages raises personal questions: Has this photo already been rated? Will the next AI pass overwrite a human choice? If I switch tools, can I keep the work I have already done?

Photo Pipeline has grown around those questions. It connects import, human and AI culling, editing and publishing into a workflow. I keep master files separate from working copies, and store ratings and related metadata in XMP files beside the photos. Think of XMP as a small set of notes that travels with a photo, giving the results a way to survive a change of software.

The most directly usable result is **Cull Swipe**, a browser interface for culling photos. On a phone, tablet or desktop, I can rate photos by swiping cards. The rating is saved first, and the next photo appears only after the server confirms success. Refreshing the page also brings back photos that have already been rated.

![The actual Cull Swipe interface, showing a photo, an AI rating, the distribution of human ratings and a photo queue along the bottom](/images/what-i-built-with-homelab/cull-swipe.png)

_Cull Swipe in use. The large image supports the decision, while the queue and rating distribution help me revisit choices across the batch._

This part is already in use with real photos. A read-only check on October 27, 2026 found **371 photos with persisted human ratings submitted through Cull Swipe**, out of 5,777 currently browsable photos: 142 rejected, 69 with one star, 135 with two stars and 25 with three stars. Each rating matched the Cull Swipe provenance in its XMP file. This counts distinct shots with ratings still present, grouping a JPG and its RAW as one shot. It is not a lifetime count of photos viewed, and deployment acceptance submissions are not a measure of usage. Culling has become something I can do a few photos at a time whenever I have a moment.

AI uses VLMs to assist with ratings, selection and descriptions. Human choices take priority. I want AI to narrow the set that needs close attention, while I decide which photos to keep.

### How much do AI low scores overlap with human rejects

I compare two sets that match the actual decision: **AI ratings of 1–2 are reject suggestions, and the human reject marker (-1) is an actual rejection**. Any human star rating from 1 to 5 counts as not rejected; the star values do not have to match. AI has processed far more than these 102 shots. The current interface index contains **5,206 shots with AI scores**, each checked against VLM provenance in its XMP: 68 rated 1, 1,580 rated 2 and 3,558 rated 3. The figure of 102 is the reliably paired comparison sample. Of the 371 human-rated shots, 102 could be paired with an earlier AI rating in retained XMP metadata. The other 269 are excluded from this comparison. An older implementation can overwrite the original AI score when saving a human rating, so a missing retained score does not mean that AI never assessed the photo.

| AI assessment   | Human rejected | Human did not reject | Total |
| --------------- | -------------: | -------------------: | ----: |
| Low score (1–2) |              5 |                    4 |     9 |
| Rating of 3     |             32 |                   61 |    93 |
| Total           |             37 |                   65 |   102 |

I rejected 5 of the 9 AI low-score suggestions, giving a **55.6% hit rate**. Of the 37 photos I rejected, AI low scores identified 5, giving **13.5% coverage**. The two sets share 5 shots out of a union of 41, so their Jaccard overlap is **12.2%**. The [aggregate comparison data](/data/cull-swipe-rating-overlap-2026-10-27.json) contains only counts and the statistical definitions.

In this sample, AI low scores overlap only modestly with my rejection choices. They miss 32 photos I wanted to reject and flag 4 that I did not reject. I still need to browse the photos myself; these results do not establish a large reduction in the set I need to review. These are 102 pairs retained from personal use, with AI suggestions visible during selection and rating, rather than a random or blinded evaluation. Unpaired photos are counted as neither correct nor incorrect AI decisions.

The full photo workflow is still being connected. Import, ratings and some metadata processing have produced real results. Editing metadata round trips, final exports and visibility after publication still need verification across the whole workflow. There is also a plan to release Cull Swipe as an independent self-hosted application; Docker packaging, general configuration and a public alpha have yet to ship.

## rmig and the tools that grew around moving media

As photos and videos accumulate, moving them becomes a job of its own. Finishing a directory copy still leaves questions about missing files, matching contents and where to resume after an interruption.

Those needs went into **[rmig](https://github.com/Jarvie8176/tools/tree/main/rclone-migrate)** in the public [tools repository](https://github.com/Jarvie8176/tools). It organizes migration jobs around transfer tools such as rclone and rsync, retaining file manifests, verification records and job logs. It can also import existing verification records from external tools. For a transfer that runs for hours, those records help establish how far the job actually got. The same repository contains [backup-verification](https://github.com/Jarvie8176/tools/tree/main/backup-verification), which checks memory-card contents against NAS backups.

![An explanatory rmig diagram: review the file manifest, copy to the destination, verify the results and retain a completion record, while keeping the source media](/images/what-i-built-with-homelab/rmig-flow-en.png)

_The media migration flow in rmig. Copying and verification are recorded separately, and the migrations discussed here retain the source files. Automatic notifications for state changes still need to be connected._

The Richmond driving footage is a practical example: four original Insta360 video files totaling about 140 GB. A job like that runs for hours. Watching a terminal continuously is not a useful way to establish the result. The migration leaves a completion record that can be queried later for that batch.

The toolchain has gradually gained background workers, progress observation and result queries. A useful distinction is whether the program is alive and whether files are still moving. Recording actual progress makes it possible to detect a job that appears to be running but has stopped advancing. Automatic state-change notifications are still being completed; the existing history queries and notification drills each cover a narrower scope.

rmig gives me a repeatable way to move the next batch of photos or large videos. Photography and video production supply the real needs, and the tools grow with them.

## Amanuensis

Information needs sorting just as media does.

I started Amanuensis because I wanted something to take a first look at my inbox: what deserves attention, what can wait for a later batch, and what only needs to be kept. Email collection, triage and digest delivery are running, with digests sent to Discord during scheduled delivery windows.

![An anonymized digest sample from the public Amanuensis page, grouping email by category and highlighting items that need attention](/images/what-i-built-with-homelab/amanuensis-digest.png)

_A digest example from the [public showcase](https://portfolio.fnpg.me/projects/amanuensis/#production-samples). The page anonymizes, edits and reconstructs actual output; this screenshot shows that public sample._

This changes how information reaches me. Email that once required opening each message can first be classified and presented as a set of things to consider. When a classification is wrong, the existing feedback workflow lets me correct it and turn that correction into a candidate for a future rule.

To make this suitable for personal information, sensitivity also affects the processing path. Highly sensitive sources use local inference and wait if that path is unavailable. Less sensitive sources that are allowed to use cloud processing have their own routing rules. Those constraints directly affect when the assistant can produce a result.

The clearest outcome so far is this continuously running email triage and digest workflow. The broader Yaaa personal assistant is still under construction. Memory across tools, general conversation and execution after approval remain future work. Amanuensis already takes on one small daily task: the first round of sorting after information has been collected.

The earlier related email collection and sorting project, [email-ingest](https://github.com/Anthrop-OS/email-ingest), is public and offers a look at how the email intake works. The complete current Amanuensis implementation remains in a private repository. The overall flow is shown in the [public walkthrough](https://portfolio.fnpg.me/projects/amanuensis/walkthrough/).

## Trailwalk

Trailwalk extends the homelab into outdoor content production.

I want to preserve a trail experience with 360° video and spatial audio, so that someone unable to visit can still get a sense of the place. A headset lets the viewer look around. As they turn their head, the sound should remain oriented consistently with the scene.

![Six real outdoor samples in the public Trailwalk gallery, including forest, waterfall, coastal and highland trails](/images/what-i-built-with-homelab/trailwalk-gallery.png)

_Real footage in the [public Trailwalk gallery](https://portfolio.fnpg.me/projects/trailwalk/#gallery). The samples open as draggable 360° panoramas in the browser. This is an entry point for browsing the material; the walking-pad application is still in development._

This involves two independently recorded sources: Insta360 footage and environmental audio from a Zoom H3-VR. Making them feel like one experience means finding the right recording, aligning the timing and handling the relationship between the image's orientation and the sound field. The media pipeline has therefore gained tools for pairing, synchronization, GPS extraction, sound-field rotation and consistency checks.

One delivered result is a roughly seven-minute trail video at 5.7K and close to 60 fps, with four-channel AmbiX spatial audio. Both 150 Mbps and 200 Mbps versions received playback spot checks in the Quest system gallery. Those checks confirmed the 360° image, sound direction during head turns, smoothness, audio/video synchronization and seeking.

Trailwalk now has content that can be experienced in a headset. The next ambition is to connect actual walking-pad speed to playback, so that the scene advances according to how fast someone walks indoors. Reading the walking pad's speed has been tested, while variable-speed playback, spatial audio quality and integration of the full application remain at the prototype validation stage.

Content production and the interactive application have their own progress. The trail film is available to experience now; making the scene advance at the viewer's walking speed is the next part to complete.

## City Tour

City Tour uses similar recording and audio-processing capabilities for an urban driving experience.

The completed content so far is a **360° driving video through Richmond**, about 90 minutes and 12 seconds long, at 5760 × 2880 and approximately 59.94 fps, with spatial audio. An urban tour also needs to help viewers understand where they are passing, so I added 11 location introductions in Chinese and English, 43 road cues and a map.

That information has to remain readable in a headset. Where the map and text belong, whether they overlap and whether they remain legible in a spherical image all require actual rendered previews. In one short preview, a location card overlapped the map. I used the preview to guide revisions; AI adjusted the layout in DaVinci Resolve/Fusion and rendered another sample for confirmation before the full output.

![An actual City Tour render with a bilingual Steveston Fisherman's Wharf card, a Richmond route map and a Bayview Street road cue](/images/what-i-built-with-homelab/city-tour-richmond.jpg)

_An actual v9 render preview from Richmond City Tour, looking forward near Fisherman's Wharf. The location card and map on the left and the road cue on the right help locate the journey. This is a flat preview of a single viewing direction._

The length introduced another production problem. Two full renders stopped at roughly 87%; investigation found that the Fusion composition kept consuming large amounts of memory. The eventual approach rendered separate windows around the appearances of the overlays, then stitched them together. That produced 107 segments, followed by verification of the complete stitched picture and spatial audio.

The resulting full version is about 33 GB and has been transferred to a Quest. Spot checks around Fisherman's Wharf, the joins and the latter part of the video confirmed the picture, spatial sound direction, audio/video synchronization and smoothness. This acceptance check sampled the video rather than watching the entire 90 minutes continuously.

At the time of writing, the video has also been uploaded to YouTube as private and is awaiting platform transcoding and verification in the actual player. A complete browser and WebXR experience remains planned work.

City Tour has produced something concrete: a city journey with location information that I can revisit in a headset. From camera originals through audio synchronization, route information, overlay layout and final playback, the homelab supports a substantial part of the work in between.

## Other things already in use

Some smaller projects also come from specific everyday needs.

**KC Assist** is a tool for Kantai Collection. Its deployed expedition planning and solver interface organizes candidate fleets according to goals, resource balance and consumption preferences. It also saves, loads and edits fleet snapshots. The interface brings repeatedly checked data together so I can trigger the solver manually and compare plans. Controlled execution is still being validated; the usable planning interface is one part of the wider automation work.

![The actual KC Assist expedition solver, comparing candidate plans on the left and showing estimated returns, costs, fleet composition and equipment suggestions on the right](/images/what-i-built-with-homelab/kc-assist.png)

_The actual KC Assist solver interface. Candidate plans, estimated returns and equipment changes appear together. The figures in the screenshot are estimates for the current plan. The project's source code is not public._

Japanese study material has a lighter workflow: keep it in one archive, then transfer it from a computer to an iPad for reading. Access to the material is already in place. OCR and management of the full lifecycle of study records remain on the task list. It has already solved the problem of getting material onto the device where I read it.

![An explanatory study-material workflow: a central archive, computer transfer and access, then iPad reading; a dashed box marks OCR and study-record lifecycle management as future work](/images/what-i-built-with-homelab/study-flow-en.png)

_The workflow for accessing study material. The solid boxes are in place; the dashed box contains future work._

Alongside the Home Assistant home automation mentioned earlier, these projects cover very different activities: organizing photos, making videos, handling email, studying and gaming. They share some storage and compute while developing at their own pace.

I will keep refining the photo workflow, producing new trail and city content, and adjusting how Amanuensis filters information. Every use brings another set of specific questions. What makes the homelab valuable to me is its ability to accommodate those questions and help turn an idea into something I can use, watch or share.

The public showcase is implemented in [portfolio](https://github.com/Jarvie8176/portfolio), and the technical blog in [blog-tech](https://github.com/Jarvie8176/blog-tech). They provide places to present and document these projects; whether each project's own source is public is stated separately.
