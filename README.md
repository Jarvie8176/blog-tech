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

侧栏通过「专题 → Yaaa」两级导航组织系列内容，专题总览位于各语言的 `/topics/`。在 `src/config.ts` 的 TOPICS 中维护专题清单，侧栏二级入口与总览共用配置。文章标题下的日期、分类和阅读时长区域提供同篇语言切换，仅展示已存在的译文，并标明当前语言。

Yaaa 导读已包含完整中文稿、对应日英编辑译文及三语架构图。图片位于 `public/images/yaaa/`，PNG 用于正文显示，SVG 保留可编辑源；文章中的 `/images/` 链接由构建器统一加上 `/tech`。更新正文、译文和配图时参见 [内容维护](docs/content.md)。本地 LLM 调度、源版本校验、增量重译、语义检查与自动接受仍由 [epic #1](https://github.com/Jarvie8176/blog-tech/issues/1) 跟踪。

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

浏览器检查覆盖桌面和手机尺寸、三语言搜索、缺失译文、偏好隔离与无 JavaScript 阅读。静态检查核对真实构建产物的链接、资源、语言、canonical、RSS、草稿排除及 Pagefind。

PR 和 main CI 执行完整检查并保存静态产物；main 检查成功后，Publish Pages 工作流通过 Cloudflare API 发布同一份产物。过期提交与 PR 事件不会触发生产发布。本版未启用统计或评论服务。

## 发布与维护

- [Pages 与路径网关部署契约](docs/deployment.md)
- [Chirping Astro 改造和升级记录](docs/theme-adoption.md)
- [建站 epic #1](https://github.com/Jarvie8176/blog-tech/issues/1)
- [主题选型 #2](https://github.com/Jarvie8176/blog-tech/issues/2)

上游代码与资源保留 MIT 许可证，见 [NOTICE.md](NOTICE.md)。仓库原有 [CC0 LICENSE](LICENSE) 不覆盖上游声明。
