# 社区发帖文案草稿（V2EX / Linux.do / 掘金）

> 发布前替换 `PLACEHOLDER` 占位（如有），并按平台规则勾选"原创/自荐"。

---

## 1. V2EX · 分享创造

**标题：**

```
免费无注册的 HTML/代码分享工具，带端到端加密，还内置了给 AI 代理用的接口
```

**正文：**

```
大家好，这是我的项目：https://openanthropic.com

一个极简的 HTML 文件 / 代码片段分享工具，核心诉求是"粘贴即分享"：

- 无需注册，粘贴代码或拖入 .html 就能拿到链接，任何浏览器直接打开
- 可选端到端加密（浏览器内加密，服务器看不到内容）
- 链接可编辑：拿到 edit token 就能原地更新内容，链接不变（适合持续迭代的场景）
- 支持密码保护、过期时间（1小时～30天）
- 作品广场：愿意公开的作品可以发布到 /gallery，可搜索、按最新/最热排序
- 底层是 Cloudflare Workers + D1 + R2，全免费，没有水印没有广告

另外一个比较少见的点：它是对 AI 代理友好的。

现在大家用 ChatGPT / Claude 生成 HTML 之后，往往没地方放、没法直接分享。这里：

- 内置 MCP 服务器（远程 streamable-http，/mcp），AI 助手可以直接调用 upload/view 等工具
- 提供 A2A JSON-RPC 端点（POST /a2a），符合 A2A v1.0 规范，SendMessage 一段 HTML 进去、分享链接出来
- 有 /ai-html-publish 专门的落地页和 /api/gallery JSON 接口，给 agent 和搜索引擎用

技术上没什么高深的，主要花心思在：内容可编辑且链接稳定、加密内容的密钥不经过服务器、被举报内容 451 下架 + 申诉流程这类治理细节。

完全免费，求反馈，也求拍打。有什么想加的功能直接评论就行。
```

---

## 2. Linux.do · 分享与发现

**标题：**

```
[分享] openanthropic.com：给 AI 代理设计的 HTML 发布服务（MCP + A2A），人类当然也能用
```

**正文：**

```
起因：我经常让 Claude/ChatGPT 写单文件 HTML（小工具、可视化、demo），生成完之后卡在同一个问题——怎么把这坨 HTML 变成一个能发给别人、能在手机上打开的链接？

试过几个方案，要么要注册、要么有水印、要么链接过两天就没了。于是自己写了一个：

https://openanthropic.com

特点（对代理友好优先）：

1. 无注册即用：POST 一段 HTML → 返回 /view/<id>，移动端也能正常渲染（沙箱 CSP）
2. MCP 服务器：远程 /mcp（streamable-http），工具包括 upload / list_assets / view / delete / get_info / search_gallery。Claude、Cursor 等可以直接接入
3. A2A 端点：POST /a2a，A2A v1.0 JSON-RPC，SendMessage 进 HTML、返回完成态 Task 带分享链接；agent card 在 /.well-known/agent-card.json，已收录进 a2aregistry.org
4. MCP Registry 官方已收录：io.github.shisongsong/oh-my-share
5. 可选端到端加密、可编辑链接（edit token）、密码保护、过期时间、作品广场、举报下架（451 + 申诉）

技术栈：Cloudflare Workers + D1 + R2，一个 worker 全搞定，每天调度任务做 IndexNow 和站点统计。

踩过的坑（踩得挺爽）：
- D1 的 LIKE 参数限 50 字节，超了直接报错，搜索词得循环截断
- Cloudflare 会把强 ETag 降级成弱 ETag，回显时要先剥 W/ 前缀再比对
- 用户内容页不能加严格 CSP（会干掉人家自己的 script），最后只上了 sandbox CSP
- 加密文件的视图页要跟普通页共用 ETag 逻辑，但内容完全不可读，分流要放在取 R2 对象之前

已知不足：中文社区还没什么人用，作品广场比较空。欢迎来玩，也欢迎提需求。

链接：https://openanthropic.com
GitHub：https://github.com/shisongsong/oh-my-share
```

---

## 3. 掘金 · 技术文章

**标题：**

```
用 Cloudflare Workers 做了一个对 AI 友好的 HTML 分享工具：从 MCP 到 A2A 的完整接入
```

**导语：**

```
AI 生成的 HTML 越来越多，但"生成"和"发布"之间还缺一步。这篇文章讲我怎么用一个 Cloudflare Worker 把这一步补齐，以及怎么同时服务人类用户和 AI 代理。
```

**正文结构：**

```markdown
## 为什么需要又一个 pastebin

- LLM 单文件 HTML 输出暴涨（落地页、可视化、小工具）
- 现有分享工具对"代理"不可用：没有 API、注册墙、水印
- 需求不是"存代码"，而是"把 HTML 变成链接"

## 产品形态

- 粘贴即分享 / 拖拽上传 .html，免注册
- 可编辑链接（edit token → 原地更新，链接不变）
- 可选端到端加密（Web Crypto，密钥走 URL fragment，服务器只见密文）
- 密码保护、过期时间、作品广场（可搜索）、举报 451 下架

## 架构：一个 Worker 全包

- Cloudflare Workers（路由 + SSR）+ D1（元数据）+ R2（内容对象）
- 每日 cron：统计快照 + IndexNow 提交
- 关键代码路径：/view/<id> 读 R2 直出（带 ETag/Last-Modified/304）

## 给 AI 代理的三层接口

1. HTTP JSON：POST /api/upload、GET /api/gallery（CORS 全开）
2. MCP（Model Context Protocol）：远程 /mcp，streamable-http，
   工具 upload / view / search_gallery …，已发布到官方 MCP Registry
3. A2A（Agent2Agent）：POST /a2a，v1.0 JSON-RPC（SendMessage / GetTask），
   agent card 声明 supportedInterfaces: JSONRPC，被 a2aregistry 收录

附：各自的一段 curl / 客户端配置示例

## 实现细节与坑

- D1 LIKE 50 字节限制 → 查询前按 UTF-8 截断
- ETag 强→弱降级：回显比较前剥 W/ 前缀
- 用户 HTML 的安全头策略：全局 nosniff，/view/ 单独 sandbox CSP + no-referrer，
  绝不上全局 CSP（会杀掉用户页面里的 script）
- 免费/付费能力位：subscriptions 表 + trialing 状态，注册送 3 天加密试用
- 治理：举报 → 立即下架（451）+ IndexNow 重爬请求 + 人工申诉恢复

## 已经收录在哪

- 官方 MCP Registry：io.github.shisongsong/oh-my-share
- a2aregistry.org：com.openanthropic.oh_my_share
- 站点地图 / llms.txt / robots / IndexNow 全套 SEO

## 小结

- 链接：https://openanthropic.com
- 欢迎试用 MCP/A2A 接入，有问题提 issue
```

---

## 发布检查清单

- [ ] V2EX：发到「分享创造」节点，勾选原创，首楼说明是自己项目
- [ ] Linux.do：发到「分享与发现」，注意论坛对外链的格式要求
- [ ] 掘金：标记原创，封面图可用 /og-image.png
- [ ] 发完后把三条 URL 提交给 IndexNow（monitor/submit_sitemap.sh 或手动 curl）
