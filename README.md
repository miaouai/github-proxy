# 🐱 GitHub Proxy Worker v2.0

使用 Cloudflare Worker 代理 GitHub，解决中国大陆访问困难问题。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Cloudflare Workers](https://img.shields.io/badge/Platform-Cloudflare%20Workers-orange)
![Version](https://img.shields.io/badge/Version-2.0-green)

## ✨ 特性

- ✅ 代理所有 GitHub 域名
- ✅ **新增：静态资源代理（CSS/JS/图片）**
- ✅ **新增：敏感路径屏蔽（防止钓鱼警告）**
- ✅ 自动处理重定向链接
- ✅ CORS 支持
- ✅ Git clone 无障碍
- ✅ Release 下载无障碍

## 🆕 v2.0 更新内容

### 🔒 敏感路径屏蔽
为防止 Cloudflare 钓鱼警告，以下路径已被屏蔽：

| 路径 | 说明 |
|------|------|
| `/sponsors` | 赞助页面 |
| `/features/*` | 功能介绍页面 |
| `/marketplace` | 市场 |
| `/login`, `/signup` | 登录/注册（避免钓鱼） |
| `/settings`, `/account` | 账户设置 |
| `/notifications` | 通知中心 |
| `/dashboard` | 仪表盘 |

> 如需访问这些页面，请直接前往 GitHub 官网。

### 🎨 静态资源代理
新增 `github.githubassets.com` 域名代理，确保页面 CSS/JS 正常加载！

### 📍 改进的 URL 格式
现在支持明确指定目标域名的访问方式：

```
# 默认代理 github.com
https://proxy-domain/owner/repo

# 明确指定域名
https://proxy-domain/github.com/owner/repo
https://proxy-domain/github.githubassets.com/assets/xxx.css
https://proxy-domain/avatars.githubusercontent.com/u/xxx
```

## 🚀 快速部署

```bash
# 1. 克隆仓库
git clone https://github.com/miaouai/github-proxy.git
cd github-proxy

# 2. 登录 Cloudflare
wrangler login

# 3. 部署 Worker
wrangler deploy
```

## 📝 使用方法

假设你的 Worker 部署在 `https://github.eoser.workers.dev`

### 浏览网页

```
# GitHub 首页（默认代理 github.com）
https://github.eoser.workers.dev/

# 查看仓库
https://github.eoser.workers.dev/owner/repo

# 查看 Issue
https://github.eoser.workers.dev/owner/repo/issues

# 查看代码文件
https://github.eoser.workers.dev/owner/repo/blob/main/src.js

# 明确指定域名
https://github.eoser.workers.dev/github.com/owner/repo
```

### 代理其他 GitHub 域名

```
# 静态资源（CSS/JS）
https://github.eoser.workers.dev/github.githubassets.com/assets/xxx.css

# 头像
https://github.eoser.workers.dev/avatars.githubusercontent.com/u/xxx

# Raw 文件
https://github.eoser.workers.dev/raw.githubusercontent.com/owner/repo/main/file.md

# API
https://github.eoser.workers.dev/api.github.com/repos/owner/repo
```

### Git Clone

```bash
git clone https://github.eoser.workers.dev/owner/repo.git
```

### 下载 Release 文件

```
# Release 下载
https://github.eoser.workers.dev/owner/repo/releases/download/v1.0/release.tar.gz

# 源码压缩包
https://github.eoser.workers.dev/owner/repo/archive/refs/tags/v1.0.tar.gz
```

## 🌐 代理域名列表

| 原始域名 | 用途 | 代理格式 |
|----------|------|---------|
| `github.com` | 主站 | `/path` 或 `/github.com/path` |
| `github.githubassets.com` | 静态资源 | `/github.githubassets.com/path` |
| `avatars.githubusercontent.com` | 头像 | `/avatars.githubusercontent.com/path` |
| `raw.githubusercontent.com` | Raw 文件 | `/raw.githubusercontent.com/path` |
| `objects.githubusercontent.com` | Release 文件 | `/objects.githubusercontent.com/path` |
| `api.github.com` | API | `/api.github.com/path` |
| `codeload.github.com` | 代码下载 | `/codeload.github.com/path` |

## ⚙️ 配置自定义域名

在 Cloudflare 控制台绑定自己的域名：

| 类型 | 名称 | 内容 |
|------|------|------|
| CNAME | github | your-worker.your-account.workers.dev |

访问效果：
```
https://github.yourdomain.com/owner/repo
```

## 🔧 工作原理

```
用户 → 代理域名 → Cloudflare Worker → GitHub 服务器 → 返回内容
         ↓
    自动处理：
    1. 屏蔽敏感路径
    2. 替换链接中的域名
    3. 处理重定向
```

## ⚠️ 注意事项

- 🔒 敏感路径已屏蔽，防止钓鱼警告
- 📦 Release 下载和静态资源现在可以正常加载
- 🌐 IP 可能变化，严格检测的流量可能需要等待恢复
- 💡 建议绑定自定义域名以获得更好的稳定性

## 📄 License

MIT

---

Made with ❤️ by [喵有爱](https://github.com/miaouai)
