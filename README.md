# 技术笔记

采用 [Chirping Astro](https://github.com/kannansuresh/chirping-astro) 的个人技术博客，记录 Yaaa、工程实践与知识沉淀。中文为原稿，英文和日文提供同篇阅读入口。

正式 URL 为 `https://blog.fnpg.me/tech/`。tech 独立部署到 Cloudflare Pages，经路径网关接入博客域名。其他主题可分别部署。

## 本地运行

需要 Bun 1.4.4；Node 22.12+ 用于相关工具。

```sh
bun install --frozen-lockfile
bun run dev
```

开发地址在 `/tech/`。全文搜索需要构建后运行：

```sh
bun run build
bun run validate:site
bun run preview:gateway
```

打开 `http://127.0.0.1:4321/tech/`。预览在 4322 端口服务构建目录，在 4321 端口使用与部署网关相同的路径逻辑。PORT 和 ORIGIN_PORT 可更改端口。

`.env.example` 列出公开配置。SITE_URL 使用正式 origin `https://blog.fnpg.me`；BASE_PATH=/tech。预览 canonical 仍指向正式域名。

## 写作与语言

文章位于 `src/content/posts/{zh,en,ja}/`，静态页面位于 `src/content/pages/{zh,en,ja}/`。支持 Markdown 和 MDX。

```yaml
---
title: 一次工作留下的知识
description: 用来源、验证范围与遗留事项组织工作记录。
pubDate: 2026-10-25T12:00:00-07:00
translationKey: durable-notes
categories: [Yaaa]
tags: [knowledge]
toc: true
---
```

同一篇文章共享 translationKey。中文无语言前缀，日英分别位于 /tech/ja/、/tech/en/。缺失译文不生成页面或语言链接。草稿使用 draft: true；公开 Git 仓库的草稿标记不能隐藏文件。

各语言按实际文章数量分页；分页的语言切换与 hreflang 只指向确实存在的同页码列表。

侧栏通过「专题 → Yaaa」两级导航组织系列内容，专题总览位于各语言的 `/topics/`。在 `src/config.ts` 的 TOPICS 中维护专题清单，侧栏二级入口与总览共用配置。文章标题下的日期、分类和阅读时长区域提供同篇语言切换，仅展示已存在的译文，并标明当前语言。

Yaaa 导读已包含完整中文稿、对应日英编辑译文及三语架构图。图片位于 `public/images/yaaa/`，PNG 用于正文显示，SVG 保留可编辑源；文章中的 `/images/` 链接由构建器统一加上 `/tech`。更新正文、译文和配图时参见 [内容维护](docs/content.md)。本地 LLM 调度、源版本校验、增量重译、语义检查与自动接受仍由 [epic #1](https://github.com/Jarvie8176/blog-tech/issues/1) 跟踪。

## Homelab Ops 专题

专题阅读顺序为：[01] 为什么要 Homelab → [02] 如何管理 Homelab → [03] homelab-ops what? → [04] Session closeout →《[05] PR review 太多了！》。各语言标题统一使用 `[NN]` 序号前缀。五篇均提供中、日、英版本。发布时间按这一内容顺序安排，列表仍按新到旧显示。

后续篇目包括 [06] 秘密泄露怎么办、[07] envctl 的设计与边界、[08] Runbook 运维协作，以及 [09] Fleet Sync 工具链分发。[09] 提供中文、英文和日文稿，每版包含六张对应语言的架构与流程图，说明异构节点同步的机制及当前实现边界；图示支持无 JavaScript 阅读和窄屏横向滚动。

[10] Homelab Ops 的 ADR 机制与决策演进提供中、英、日三语版本，介绍 MADR Light、记录结构、pending 与生命周期、真实替代链及自动编号和 CI。三张静态图均有对应语言的 PNG、SVG 与 Mermaid 源文件，支持无 JavaScript 阅读；局部替代范围索引明确作为改进建议。完整的 ADR-0049、ADR-0059 英文样本链接到已公开 Gist。

两篇开题文章已提供中、日、英版本，分别讨论为什么拥有 Homelab，以及如何从手动维护转向 AI 运维。专题入口为各语言的 `/topics/homelab-ops/`，侧栏和专题总览共用该入口。

量化部分提供月度规模、相对增幅和月度活动三类图表，每类均有中日英 PNG/SVG，位于 `public/images/homelab-ops/`。公开聚合数据为 `public/data/homelab-ops-monthly.csv`；`scripts/charts/homelab.py` 可离线重绘，不参与正常站点构建。维护口径见 [内容维护](docs/content.md#homelab-ops)。

## 检查

```sh
bun run typecheck
bun run lint
bun run format:check
bun test src gateway
bun run build
bun run validate:site
bunx playwright install chromium
bun run test:e2e
```

浏览器检查覆盖桌面和手机尺寸、三语言搜索、已删除与草稿页面排除、偏好隔离与无 JavaScript 阅读。静态检查核对真实构建产物的链接、资源、语言、canonical、RSS、草稿排除及 Pagefind。

PR 和 main CI 执行完整检查并保存静态产物；main 检查成功后，Publish Pages 工作流通过 Cloudflare API 发布同一份产物，并将网关 TECH_ORIGIN 切到对应的不可变部署地址，核对正式页源码版本，避免旧缓存保留已删除内容。过期提交与 PR 事件不会触发生产发布。评论服务未启用。Umami 访问统计由公开的 website ID 控制，配置与隐私说明见下文。

## 发布与维护

- [Pages 与路径网关部署契约](docs/deployment.md)
- [Chirping Astro 改造和升级记录](docs/theme-adoption.md)
- [建站 epic #1](https://github.com/Jarvie8176/blog-tech/issues/1)
- [主题选型 #2](https://github.com/Jarvie8176/blog-tech/issues/2)

上游代码与资源保留 MIT 许可证，见 [NOTICE.md](NOTICE.md)。仓库原有 [CC0 LICENSE](LICENSE) 不覆盖上游声明。

## 署名、版本与访问统计

页脚署名为 J. Kong，链接到 https://portfolio.fnpg.me/；GitHub 短 hash 指向实际构建提交。CI 使用 GITHUB_SHA，Pages 原生构建可使用 CF_PAGES_COMMIT_SHA，本地回退至 Git HEAD；无 Git 元数据时仅显示仓库链接。署名不修改现有许可证。

Umami 使用公开的 `PUBLIC_UMAMI_WEBSITE_ID` 与可选 `PUBLIC_UMAMI_SCRIPT_URL`（默认 https://cloud.umami.is/script.js）。在 GitHub Actions 仓库 Variables 配置这两个名称；构建读取公开标识，不接收 Umami API Token。ID 为空时不生成统计脚本，三语言隐私页同步显示启用状态。

脚本仅在 SITE_URL 对应的正式 hostname 采集，排除当前 URL 与 referrer 的查询参数/锚点，并启用 Do Not Track 检查。不设置用户 ID、搜索事件或会话回放。PR、本机和 Pages origin 的 hostname 不符合采集条件。启用前确认 Umami 中的站点属于 blog.fnpg.me，勿复用作品集的 website ID。
