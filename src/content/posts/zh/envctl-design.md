---
title: '[07] envctl 的设计与边界'
description: '从本地 dotenv 的编辑需求出发，解释 envctl 的组件、凭据创建流程，以及它与 1Password、SOPS、Compose secrets 的分工。'
pubDate: 2026-10-26T18:38:15-07:00
updatedDate: 2026-10-26T18:52:41-07:00
translationKey: homelab-ops-envctl
categories: [Homelab Ops]
tags: [homelab, envctl, secrets, design]
toc: true
---

_envctl 管理本地 dotenv 的编辑、快照与执行。它能改善凭据的正常使用路径；排障读取与知识传播的处置见[上一篇](/posts/secrets-and-credentials/)。_

[envctl/bakctl v0.1.0](https://github.com/Jarvie8176/envctl/releases/tag/v0.1.0)把已有的本地工具整理成独立发布。它把按 key 编辑、加密、快照和恢复接在一起，服务于已有的本地 dotenv 工作流。

## 为什么保留本地载体

我已经用 1Password 维护凭据记录，希望配置能进入 Git，也希望部分常驻任务和故障处理不必每次实时访问 1Password。因此，1Password 仍是记录来源，SOPS + age 负责文件加密，本地或服务级载体提供运行输入。编辑 1Password 不会替签发服务撤销 token，也不会自动刷新这些副本。

| 位置              | 职责                          | 需要维护的边界                     |
| ----------------- | ----------------------------- | ---------------------------------- |
| 1Password         | 凭据记录与引用                | 权限、有效期、消费者与实际签发状态 |
| SOPS + age        | 加密配置，供 Git 工作流使用   | recipient、私钥、恢复与历史密文    |
| envctl + bakctl   | 本地 dotenv 编辑、快照与执行  | 文件格式、版本、读写与输出行为     |
| envsync + doco-cd | 生成并消费服务级 SOPS carrier | 交付、部署、过期副本与业务生效     |

carrier 是供消费者使用的配置副本。envsync 从 1Password 生成服务级 SOPS 文件，doco-cd 在部署时解密并进行 Compose 插值。控制器首次取得 Git 访问的 bootstrap 另有路径，现有受权限限制的本地明文配置也仍属于管理对象。各层并不要求每个消费者全部采用。[SOPS](https://getsops.io/docs/) · [age](https://github.com/FiloSottile/age)

## 原生能力足够时可以省去这一层

能够接受实时来源依赖的任务可用 `op run`。已有 SOPS 文件、只需要解密后执行的任务，可以先考虑 `sops exec-env`；程序需要文件时可评估 `exec-file`。envctl 的执行注入并不独有，其差异主要是按 key 从 stdin 编辑、保留其他行、候选密文回读、互斥与原子替换，以及配对的备份和恢复约定。[SOPS 进程执行](https://getsops.io/docs/usage/advanced/#passing-secrets-to-other-processes)

容器消费者还可使用 Compose `secrets:` 把文件交给指定服务，避免值直接进入容器环境。这一层处理消费方式，SOPS 处理保存形式，envctl 处理部分编辑操作；不需要为使用其中一个而加入全部组件。应用是否能直接读文件仍需确认，普通 Compose 文件挂载不会自动加密源文件，也不阻止 Docker 管理者读取。[Compose secrets](https://docs.docker.com/compose/how-tos/use-secrets/)

我的取舍是复用已有 dotenv 编辑需求，没有这一需求的消费者可以不用 envctl。凭据签发、轮换和执行权限则由各自的入口管理。

## 当前组件与默认行为

![凭据栈与 envctl 逻辑组件](/images/secrets/components-zh.png)

_当前实现集中在一个脚本中，图中按配置、编辑、存储、备份和执行划分职责。_

| 逻辑职责                | 内容                                 |
| ----------------------- | ------------------------------------ |
| CLI 与配置              | 选择目标、命令、SOPS 和密钥配置      |
| Document                | 修改键值，保留其他行，处理重复写入   |
| Storage 与 SOPS adapter | 读取、加解密、候选回读与文件替换     |
| Backup adapter          | 通过 bakctl 保存快照、查看历史与恢复 |
| Runner 与 Output        | 注入进程环境，或按命令输出键名和值   |

v0.1.0 的候选密文要通过解密回读后才原子替换，写入有互斥与输入检查。加密目标的临时文件和 bakctl 快照保存密文，合成测试覆盖相关路径。这部分工作关注写入完整性。[公开版安全模型](https://github.com/Jarvie8176/envctl/blob/v0.1.0/docs/security-model.md)

三个默认行为需要特别注意：历史目标是明文 `~/cc/.env`；只有终端 `.enc` 后缀触发自动加密；`exec` 继承父环境并注入文件内全部变量。`get/export` 刻意打印值，`list` 打印键名。按用途拆分文件可以减少注入内容，但目前没有逐命令变量白名单，也没有同用户隔离。

## 从空条目到执行的五步设计

我准备把现有能力接成下面的流程。envctl 已提供 stdin 编辑和进程注入，安全导入器、业务检查脚本和统一返回约定还需要编写。用虚构的 `op://demo-vault/demo-service/credential` 和 `DEMO_API_TOKEN` 举例：

![创建与注入凭据的五步目标设计](/images/secrets/use-case-zh.png)

1. **Agent 准备基础环境。** 在获准执行端准备 op、SOPS、age 与配对工具，检查实际版本、recipient、权限和恢复入口，用临时身份与合成值自检。首次 op 访问沿既有控制面完成认证引导。
2. **Agent 建立空条目。** 在指定 vault 记录服务、用途、消费者和待填字段，返回条目标识。秘密字段留给用户填写，导入前再检查内容。[1Password 条目接口](https://www.1password.dev/cli/reference/management-commands/item)
3. **Human 填写凭据。** 人在签发服务确认权限与期限，直接填入 1Password；对话只通知填写完成。敏感值不经过聊天复制。
4. **Agent 请求受控导入。** 参数只有引用、目标 key 和明确的加密文件。可信本地导入器先确认读取成功、字段存在、非空及格式正确，再经 stdin 调用写入；失败保持原值，返回状态而不返回秘密。`op read` 直接管道给 setter 时，下游可能在上游失败后先写入空值，`pipefail` 无法撤销它；v0.1.0 的密文回读也不能代替上游校验。
5. **Agent 请求受控执行。** 业务进程在内部使用凭据，返回约定的状态字段。值不展开到认证参数，不进入调试日志、原始响应或异常。验收用合成 canary 检查正常与失败路径的 stdout、stderr、参数和产物，并检查失败后旧载体不变。

这些步骤处理正常使用时的值流向；探索性排障和暴露后的轮换取舍见[上一篇](/posts/secrets-and-credentials/)。

## 用复杂度四问决定保留哪些副本

一个凭据可能出现在来源、服务 carrier、本地文件和 bootstrap 中。结构化来源关系并未减少副本，仍要用[上一篇系列中的四问](/posts/pr-review-too-many/)检验：

- **解决哪个已出现的问题？** 记录集中、Git 配置、减少实时访问依赖和启动引导，各自有用途；排障泄露不靠增加副本解决。
- **更简单的路径够不够？** 能用 op run、SOPS 原生执行或直接文件消费满足的任务，不再增加 envctl 副本。
- **增加什么维护？** 记录来源引用、消费者、生成与部署版本、更新时间、权限和更新入口；验证实际认证动作，不公开秘密哈希作为证明。
- **删掉会失去什么？** 删除缓存会恢复实时来源依赖；删除 envctl 会失去编辑与快照约定，但 SOPS 注入仍可用。按消费者决定，而不是统一堆栈。

我还需要补齐副本清单和过期检查，合并不必要的层，让更新失败、未部署和旧值继续使用成为可见状态。

## 接下来改什么

v0.1.0 先整理了配对 CLI、编辑、快照和写入保护。下一步是通用 op 导入器，以及贯穿五步流程的业务检查与返回格式。

另一个想做的是 agent 模式：要求显式加密文件，拒绝 get/export，让 exec 只注入声明变量，同时筛选父环境、限定执行动作和返回字段。它会减少顺手读出值的机会；任意程序的读取和输出仍要通过独立的执行权限约束。

安装见 [README 固定版本说明](https://github.com/Jarvie8176/envctl#install-a-fixed-release)与 [Releases](https://github.com/Jarvie8176/envctl/releases)。已有安装按[集成与迁移约定](https://github.com/Jarvie8176/envctl/blob/main/docs/integrations.md)先用独立前缀验证，再切换消费者；envctl 与 bakctl 保持同一版本，核对实际执行文件。复制安装的节点需要分别更新，切换后再检查实际的业务认证。
