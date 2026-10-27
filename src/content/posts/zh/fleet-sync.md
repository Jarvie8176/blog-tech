---
title: '[09] Fleet Sync：如何把运维工具链分发到异构节点'
description: '从 Homelab 的工具链分发问题出发，拆解首次安装、跨平台仓库同步、离线补齐与配置应用，说明 Fleet Sync 的架构、流程和验收边界。'
pubDate: 2026-10-26T22:21:33-07:00
translationKey: homelab-ops-fleet-sync
categories: [Homelab Ops]
tags: [homelab, fleet-sync, toolchain, automation, git]
toc: true
---

**Fleet Sync 是这个 homelab 自建的运维仓库自动同步服务。** Fleet 指的是一起管理的一组机器，例如家中的服务器、工作站和云端节点；Sync 则是让这些节点持续获取同一个受控来源的更新。在本项目中，fleet-sync 把 Git 仓库中的运维脚本、工具源码和配置文件同步到各节点的规范副本，并报告各节点的版本与同步状态。

它为运维工具链提供了持续分发源文件的基础。要让工具真正可用，还需要结合节点上的安装、依赖准备和配置应用流程。本文从这个完整需求出发，讨论 Fleet Sync 在其中承担的职责。

在一台机器上写好运维脚本，只完成了很小的一部分工作。要让它在 homelab 中持续发挥作用，还需要让其他节点拿到这份脚本、具备它依赖的工具，并在正确的用户和运行环境中执行。

机器一多，这件事就会变得琐碎：一台 Linux 服务器缺少解压工具，一台 Mac 上的命令只在交互式 shell 中可见，一台 ARM 节点需要不同的二进制，另一台机器错过更新后还在运行旧脚本。每次维护之前，都要先检查一遍环境，再手动补齐缺失部分。

我要解决的问题是：**如何让运维需要的工具链，自动到达需要它的节点，并持续保持可用？**

这里的目标可以具体表述为：工具链在受控来源更新后，已接入的目标节点能够取得适合自己的内容、完成必要安装或应用，并报告结果；暂时离线的节点恢复后能够补齐更新。operator 应当能确认哪些节点已经可用，哪些尚未完成，以及失败发生在哪里。

这个目标比同步一个 Git 仓库更广。现有 fleet-sync 先解决了其中的仓库分发和版本可见性，CLI 安装、环境接入和后续 apply 则由相邻机制承担。

本文接着[Runbook 的运维协作](/posts/runbook/)往下讨论：操作步骤已经清楚之后，怎样把执行它们所需的环境送到节点上。

## 先明确需要分发什么

本文所说的 toolchain，是执行运维任务所需的一组工具、脚本和配置。它包含几种更新方式不同的对象。

| 对象             | 本项目中的例子                           | 节点需要完成的动作                         |
| ---------------- | ---------------------------------------- | ------------------------------------------ |
| 自有工具和脚本   | 运维脚本、检查程序、just recipes         | 获取对应版本，放到稳定位置                 |
| 第三方 CLI       | just、btop、procs、op、sops、age         | 安装适合操作系统和架构的产物，确认可执行   |
| 运行时和基础依赖 | Bash、Python、Git、curl、tar、unzip      | 在执行相关脚本之前准备好                   |
| 配置和使用入口   | PATH、shell 配置、工具配置、SSH 访问模型 | 放到正确的用户或系统位置，必要时执行 apply |

仓库里的 `tools/cli-tools/install.sh` 已经编排了多种 CLI 的安装和 PATH 设置；独立的 preflight 则检查部分基础依赖。运维仓库的同步由 fleet-sync 负责。这些机制合在一起，才接近使用者所理解的“把工具装到节点上”。

因此，“仓库已更新”只说明源文件到位。脚本依赖的 CLI 可能尚未安装，配置可能尚未应用，服务进程也可能仍在运行旧代码。

## 不同节点需要兼容的能力

Homelab 的节点通常不是同一种机器。这套环境涉及 Linux、macOS 和 Windows；CPU 包括 x86_64 和 ARM64。节点的在线规律、网络条件和使用身份也不相同。

这些差异决定了分发系统需要描述的目标。

首先是平台。相同工具在不同 OS 和 CPU 上可能需要不同的 release asset。现有的 just 安装脚本就根据 `uname` 选择 Linux 或 macOS，以及 x86_64 或 aarch64 的产物。原生 Windows 则需要单独的安装适配。

其次是执行身份。安装到某个用户的 `~/.local/bin`，只能说明这个用户目录里有一份工具。交互式 shell、SSH 非交互命令和系统服务使用的 PATH、HOME、凭证范围可能不同。验收需要在实际执行任务的身份下进行。

还有节点角色。用于操作和排障的工作站，与只承担单一服务的边缘节点，未必需要同一套工具。合理的目标是让每个节点具备其任务所需的能力，并明确版本要求。完全相同的安装清单、逐字相同的文件路径，都不是必然前提。

因此，一个完整的分发目标应至少包含：目标节点及用户、所需工具集合、平台对应的安装方式、预期版本或兼容条件，以及验证方法。当前实现只覆盖了其中一部分，这也是后续完善工具链管理的方向。

## 新节点接入与日常更新需要不同路径

刚接入的节点可能还没有 Git，也没有私有仓库凭证。要求它先 clone 运维仓库，再运行仓库里的安装器，会把引导过程卡在前置依赖上。

项目已有的 CLI 分发脚本采用了一条适合引导阶段的路径：控制端持有仓库，通过已有 SSH 通道把 `tools/cli-tools/` 打包传到目标临时目录，再在那里运行安装器。目标节点无需预先拥有 homelab-ops clone 或私有仓库读取凭证；安装器后续下载工具所需的网络访问仍然要满足。

以下图示在窄屏上可横向滚动；也可以打开矢量图放大查看。

**图 1 新节点的 CLI 引导与补装流程**

<div role="region" aria-label="CLI 引导流程：经 SSH 发送安装器，识别平台并补装工具，最后以实际用户验收，可横向滚动" tabindex="0" style="overflow-x: auto;">

<div style="min-width: 420px; width: 442px; max-width: 100%;">

![CLI 引导流程：经 SSH 发送安装器，识别平台并补装工具，最后以实际用户验收](/images/fleet-sync/01-toolchain-bootstrap.png)

</div>

</div>

[查看矢量图](/images/fleet-sync/01-toolchain-bootstrap.svg) · [Mermaid 源文件](/images/fleet-sync/01-toolchain-bootstrap.mmd)

图中展示已有安装脚本的执行关系。依赖检查目前只提示部分缺失项，verify 也主要输出检查报告；最下方虚线连接的任务验收，需要另行完成。安装下载失败或平台不受支持时，具体安装器会报告错误或按其规则跳过，不能将结束输出视为所有工具都已可用。

这条路径可以批量执行安装，适合首次接入和补装。脚本会先检查节点可达性，报告不可达节点，并继续处理能够连接的节点。不过，一次批量执行无法保证离线节点日后自行补装；被跳过的节点仍需要后续处理。

日常更新面对的是另一个阶段：节点已经有了基本执行环境，需要在仓库变化后持续获得新脚本、新检查项和新配置。每次都由 operator 发起 SSH 分发，会把长期维护重新变成一张人工待办清单。

这正是 fleet-sync 接手的部分：让已经接入的节点持续维护一份规范的运维仓库副本，并让同步状态可见。

## Fleet Sync 先统一脚本来源和访问入口

初版之前，同一个运维仓库散落在用户工作目录、部署工具内部目录和临时 clone 中。有的靠手动 pull，有的由 cron 更新。执行 runbook 时，既要找到文件，还要确认这一份是不是预期版本。

fleet-sync 在 Linux 和 macOS 节点上维护 `/opt/homelab-ops`，通过 `$HOMELAB_OPS` 提供统一入口。operator 和自动化程序可以从这份受分发机制维护的副本读取脚本和文档。开发修改则在自己的 clone 或 worktree 中进行，避免与自动更新相互覆盖。

初版使用 Go hub/spoke。节点 agent 主动通过 WebSocket 连接 hub，hub 发现远端更新后通知节点；节点再自行从 GitHub fetch，并更新到 `origin/main`。hub 同时汇总连接和 commit 状态，供监控展示。

这种划分适应了 NAT 后面的节点：agent 建立出站连接，hub 无需逐台建立入站连接。它也保留了节点直接访问 GitHub 的依赖，hub 没有承担 Git 内容镜像服务。为补偿 webhook 缺失，hub 每 60 秒运行一次 reconcile；这是检查频率，实际完成时间仍取决于网络和节点状态。

**图 2a 控制通道连接多个异构节点**

<div role="region" aria-label="Fleet Sync 控制通道：Linux、macOS 和 Windows agent 主动连接 hub，接收指令并回报状态，可横向滚动" tabindex="0" style="overflow-x: auto;">

<div style="min-width: 740px; width: 909px; max-width: 100%;">

![Fleet Sync 控制通道：Linux、macOS 和 Windows agent 主动连接 hub，接收指令并回报状态](/images/fleet-sync/02-fleet-sync-architecture.png)

</div>

</div>

[查看矢量图](/images/fleet-sync/02-fleet-sync-architecture.svg) · [Mermaid 源文件](/images/fleet-sync/02-fleet-sync-architecture.mmd)

图 2a 展示控制与状态通道，WebSocket 都由节点主动建立。每条连接承载 hub 下发的同步指令及节点回报的状态。图中 A–D 是平台角色示例；Windows 对应已有的原生服务接入实现，部署状态另行验收。为突出已有周期同步路径，图中省略了需要可达入口的可选 webhook 触发。

**图 2b 各节点直接从 GitHub 拉取内容**

<div role="region" aria-label="内容通道：每个 agent 直接从 GitHub 拉取 Git 内容，再更新本地工作树，可横向滚动" tabindex="0" style="overflow-x: auto;">

<div style="min-width: 680px; width: 773px; max-width: 100%;">

![内容通道：每个 agent 直接从 GitHub 拉取 Git 内容，再更新本地工作树](/images/fleet-sync/02b-fleet-sync-content.png)

</div>

</div>

[查看矢量图](/images/fleet-sync/02b-fleet-sync-content.svg) · [Mermaid 源文件](/images/fleet-sync/02b-fleet-sync-content.mmd)

图 2b 对图 2a 的每个节点分别成立。节点主动发起 HTTPS fetch，GitHub 返回 refs 和 objects；agent 再更新本地工作树。Git 内容不经过 hub，节点之间也不互传。

各节点共用同步协议和 Git 版本标识，差异留在 agent 构建、服务管理和本地路径上：

| 节点平台             | agent 运行方式                     | 规范仓库位置                 | 本地适配点                                |
| -------------------- | ---------------------------------- | ---------------------------- | ----------------------------------------- |
| Linux amd64 / arm64  | 对应架构 binary，systemd 服务      | `/opt/homelab-ops`           | 服务用户、目录权限、Git 凭证              |
| macOS x86_64 / arm64 | 对应架构 binary，launchd daemon    | `/opt/homelab-ops`           | 当前部署使用 root 身份，需匹配其 Git 环境 |
| Windows amd64        | 原生 Windows SCM 服务，LocalSystem | `C:\ProgramData\homelab-ops` | Windows Git、服务账户凭证及目录 ACL       |

仓库内容可以对应同一个 commit，但各平台执行哪些脚本、安装哪些第三方产物，仍由本地适配决定。例如 Linux 的 shell 安装器不会因为 Git 同步成功，就自动变成 Windows 安装器。

**图 3 一次仓库更新如何在两个不同平台上收敛**

<div role="region" aria-label="更新时序：hub 发现 B 版本后通知 Linux 和 Mac，两者独立拉取并回报实际 commit，可横向滚动" tabindex="0" style="overflow-x: auto;">

<div style="min-width: 600px; width: 616px; max-width: 100%;">

![更新时序：hub 发现 B 版本后通知 Linux 和 Mac，两者独立拉取并回报实际 commit](/images/fleet-sync/03-fleet-sync-sequence.png)

</div>

</div>

[查看矢量图](/images/fleet-sync/03-fleet-sync-sequence.svg) · [Mermaid 源文件](/images/fleet-sync/03-fleet-sync-sequence.mmd)

图中以远端在同步期间保持 commit B 为例，省略周期 heartbeat。两个节点的拉取互相独立，消息在图上的先后位置不表示必须按 Linux、Mac 的顺序执行；也没有要求所有机器同时完成的事务屏障。

这里有三个影响实际行为的细节：

- **同步到最新主分支，而不是强制执行某个消息版本。** hub 发出目标 B 后，agent 会 fetch 并 reset 到自己获取的 `origin/main`。若远端已经前进到 C，节点可能直接报告 C，hub 再通过后续 reconcile 更新目标。
- **离线节点重新注册时补齐。** agent 断线后退避重连，并重新报告本地 commit；hub 对落后节点发送待同步指令。恢复取决于 hub 和 Git 来源重新可达，初版不能被理解为 hub 故障时仍有独立的节点定时拉取。
- **失败按节点保留可见性。** 一个节点 Git 拉取失败，不会让已经完成的其他节点回退；该节点仍会在后续对账中被识别为落后。对同一仓库的重复同步，agent 使用本地锁避免并发写工作树。

图解以 homelab-ops 单仓为例。

2026 年 6 月 27 日的验收确认，当时六个 agents 全部连接并同步，告警和 dashboard 已上线。这证明规范仓库分发这一步已经实际工作过。

但同步到最新安装脚本，不会自动重新执行安装器，更不会自动升级全部 CLI。以现有 just 安装器为例，默认行为是发现已有可执行文件就跳过；首次安装时才解析上游最新 release。它解决的是缺失工具的安装，没有实现按指定版本持续对账。要进一步管理版本，还需要明确版本选择、升级和验证规则。

## 从仓库同步走向拉取与应用

随着 ssh-manifest、dotfiles 等内容进入需求，分发对象逐渐扩展到多个仓库。相应地，节点拿到文件之后还可能需要应用配置、刷新工具入口，或者让服务重新加载。

后继方案 fleet-dist 将过程拆成通知、拉取和 apply 三步。

GitHub push 经过验签 bridge 转为 ntfy 消息。节点收到通知后，读取自己的 manifest，拉取其中配置的仓库，再运行对应 hook。通知中的 SHA 只是变更提示，实际拉取以当时的 `origin/main` 为准，所以迟到消息不会要求节点退回旧 commit。

节点还定期拉取全部配置仓库。当前 systemd timer 的周期为 15 分钟，另加最多 60 秒随机延迟。通知服务失效或者节点错过消息后，只要 Git 和本地执行环境恢复可用，后续定期运行仍有机会补齐更新。

**图 4a 后继方案的两条触发路径**

<div role="region" aria-label="fleet-dist 的通知和定时触发：GitHub 经 bridge 与 ntfy 通知节点，节点 timer 周期补偿，可横向滚动" tabindex="0" style="overflow-x: auto;">

<div style="min-width: 430px; width: 433px; max-width: 100%;">

![fleet-dist 的通知和定时触发：GitHub 经 bridge 与 ntfy 通知节点，节点 timer 周期补偿](/images/fleet-sync/04a-fleet-dist-triggers.png)

</div>

</div>

[查看矢量图](/images/fleet-sync/04a-fleet-dist-triggers.svg) · [Mermaid 源文件](/images/fleet-sync/04a-fleet-dist-triggers.mmd)

通知触发用于及时发现变化，节点 timer 用于周期补偿。两者最后都进入同一个本地拉取流程。

**图 4b 节点执行拉取与应用**

<div role="region" aria-label="fleet-dist 节点流程：按 manifest 加锁并拉取仓库，执行 hooks，分别记录 fetch、同步和 apply 状态，可横向滚动" tabindex="0" style="overflow-x: auto;">

<div style="min-width: 510px; width: 514px; max-width: 100%;">

![fleet-dist 节点流程：按 manifest 加锁并拉取仓库，执行 hooks，分别记录 fetch、同步和 apply 状态](/images/fleet-sync/04-fleet-dist-flow.png)

</div>

</div>

[查看矢量图](/images/fleet-sync/04-fleet-dist-flow.svg) · [Mermaid 源文件](/images/fleet-sync/04-fleet-dist-flow.mmd)

**此图展示 fleet-dist 的后继实现，目前仍在迁移。** 每个接入节点都独立执行同一流程，但读取自己的 manifest；不同节点可以选择不同 repo、路径和 hooks。图中展开普通仓库更新路径，省略锁等待超时、首次 clone 失败等提前退出，以及认证敏感仓库的独立目录切换分支。

有一个实现边界值得直接画出来：当前 `pull-repo.sh` 在 fetch 失败后仍会继续走 hook 循环，此时处理的是保留下来的旧内容，并分别记录 fetch 与 apply 结果。`apply_ok=1` 因而不能独自证明本轮已更新；如果某个 hook 只允许针对新拉取内容执行，需要额外约束，不能假定通用框架已经提供这种保证。

相较图 2a 的 hub reconcile，图 4a 的 timer 位于每个节点。bridge 或 ntfy 中断时，节点仍能自行发起拉取；监控读取节点生成的结果，不再依赖旧 hub 汇总全部同步状态。

从工具链分发的角度，apply 提供了连接“文件到位”和“环境可用”的位置。例如，将来可以通过 hook 更新工具链接、应用配置或调用安装流程。但通用 hook 机制的存在，不代表这些接入已经完成。尤其是升级二进制、修改系统配置和重启服务，需要各自的权限、重复执行行为和失败处理约定。

普通运维脚本和影响 SSH 访问的配置，也应有不同的写入权限。分发服务可以获得完成任务所需的有限权限，凭证仍由独立机制提供。工具文件能够被读取，不意味着读取它的人应当获得修改访问控制或使用所有凭证的能力。

## 验收目标是能执行预期任务

判断工具链分发是否完成，需要从目标节点的使用场景反推验收条件。

| 检查层次 | 要回答的问题                             |
| -------- | ---------------------------------------- |
| 来源     | 文件或安装产物来自哪里，预期版本是什么？ |
| 到达     | 节点是否成功取得本轮内容？               |
| 安装     | 二进制是否适配平台，依赖是否齐全？       |
| 入口     | 目标用户和服务是否能找到并执行命令？     |
| 应用     | 配置、链接或需要的 reload 是否完成？     |
| 持续状态 | 上次验证有多新，哪些预期节点尚未完成？   |

现有 fleet-dist 实现分别记录 fetch、checkout 一致性、apply 结果和运行时间，再由本地 textfile 接入监控。这为仓库与 hook 提供了状态依据，完整工具链的版本和任务验证仍需要相应检查。

已有 CLI verify 会列出工具版本或标记 `MISSING`，便于检查。但它主要是报告机制，不能仅凭脚本退出成功，就认定所有工具都满足要求。同样，安装器整体完成，也不能忽略其中跳过的离线节点或缺失依赖。

fleet-sync 自身还遇到过一个与此直接相关的事故：CI 成功、镜像 digest 改变、health 正常，但镜像内实际仍是旧二进制。排查通过新代码独有的字符串发现了版本错误；同源代码更换 builder 后得到正确结果，具体底层原因没有最终确认。这说明仓库同步、安装产物和运行版本需要分别核对，单个“健康”信号覆盖不了整条工具链。

因此，一次有意义的验收可以是：以将来实际执行维护任务的用户，在它真实使用的非交互环境中，确认工具版本，并运行一个无副作用的检查命令。对于长期运行的服务，还应确认当前进程使用了预期版本。

## 当前实现走到了哪里

把已有能力放回最初的问题，可以看到三个层次。

第一层是引导与补装。已有 CLI 安装脚本能通过 SSH 分发安装逻辑，按平台处理部分工具，并提供可达性与版本报告。它仍依赖基础环境，部分依赖只给出修复提示，也没有统一的版本收敛策略。

第二层是持续分发运维源文件。原 fleet-sync 已经部署运行，为节点维护规范仓库副本并提供同步可见性。这是它目前最明确的职责。

第三层是拉取之后的应用与持续验证。fleet-dist 已交付核心 agent、bridge 和监控，但截至 2026 年 10 月 26 日整理的项目记录，全 fleet 迁移尚未完成，工具版本的持续管理也有待接入。

后续完善应围绕工具链本身展开：哪些角色需要哪些工具，版本要求如何表达，安装和 apply 如何重复执行，离线节点如何补齐，以及如何在目标身份下验证可用。如果这些要求发展成复杂的依赖和系统状态管理，就需要重新评估引入配置管理工具，而不必把全部逻辑继续堆进 shell hook。

这项工作的完成标准，应当落在下一次真实维护上：operator 或自动化程序到达一个已接入的目标节点后，可以直接使用预期工具执行任务；如果做不到，系统能够明确指出缺少什么、落后在哪里，以及哪一步需要处理。
