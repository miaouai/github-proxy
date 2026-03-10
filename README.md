# 🐱 GitHub Proxy Worker v2.0

使用 Cloudflare Worker 代理 GitHub，解决中国大陆访问困难问题。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Cloudflare Workers](https://img.shields.io/badge/Platform-Cloudflare%20Workers-orange)
![Version](https://img.shields.io/badge/Version-2.0-green)

## ✨ 特性

- ✅ 代理所有 GitHub 相关域名
- ✅ **新增：通用域名代理（支持任何域名）**
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

### 🌐 通用域名代理
**重大改进！** 现在支持代理任意域名（不仅是 GitHub 相关）：

```
# 格式：/目标域名/路径 → 代理 目标域名/path
你的代理域名/any.website.com/page/path
     ↓
实际访问 https://any.website.com/page/path
```

这样可以代理：
- GitHub 静态资源（github.githubassets.com）
- GitHub CDN（avatars.githubusercontent.com, raw.githubusercontent.com 等）
- **任何其他需要代理的网站**

### 🔗 HTML 链接自动替换
GitHub 页面中的链接会自动替换为代理域名格式，保持浏览流畅！

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

假设你的 Worker 部署在 `https://your-domain.workers.dev`（请替换为你的实际域名）

### 浏览 GitHub 网页

```
# GitHub 首页
https://your-domain.workers.dev/

# 查看仓库
https://your-domain.workers.dev/owner/repo

# 查看 Issue
https://your-domain.workers.dev/owner/repo/issues

# 明确指定域名
https://your-domain.workers.dev/github.com/owner/repo
```

### 代理其他域名（通用模式）

```
# GitHub 静态资源（CSS/JS/图片）
https://your-domain.workers.dev/github.githubassets.com/assets/xxx.css

# GitHub 头像
https://your-domain.workers.dev/avatars.githubusercontent.com/u/123456

# Raw 文件
https://your-domain.workers.dev/raw.githubusercontent.com/owner/repo/main/file.md

# API 调用
https://your-domain.workers.dev/api.github.com/repos/owner/repo

# 甚至其他网站（实验性功能）
https://your-domain.workers.dev/example.com/path
```

### Git Clone

```bash
git clone https://your-domain.workers.dev/owner/repo.git
```

### 下载 Release 文件

```
# Release 下载
https://your-domain.workers.dev/owner/repo/releases/download/v1.0/release.tar.gz

# 源码压缩包
https://your-domain.workers.dev/owner/repo/archive/refs/tags/v1.0.tar.gz

# 明确指定 objects 域名
https://your-domain.workers.dev/objects.githubusercontent.com/xxx
```

## 🌐 支持的域名列表

| 原始域名 | 用途 | 代理格式 |
|----------|------|---------|
| `github.com` | 主站 | `/path` 或 `/github.com/path` |
| `github.githubassets.com` | 静态资源 | `/github.githubassets.com/path` |
| `avatars.githubusercontent.com` | 头像 | `/avatars.githubusercontent.com/path` |
| `raw.githubusercontent.com` | Raw 文件 | `/raw.githubusercontent.com/path` |
| `objects.githubusercontent.com` | Release 文件 | `/objects.githubusercontent.com/path` |
| `api.github.com` | API | `/api.github.com/path` |
| `codeload.github.com` | 代码下载 | `/codeload.github.com/path` |
| **任意域名** | 通用代理 | `/your-domain.com/path` |

## ⚙️ 配置自定义域名

在 Cloudflare 控制台绑定自己的域名：

| 类型 | 名称 | 内容 |
|------|------|------|
| CNAME | proxy | your-worker.your-account.workers.dev |

访问效果：
```
https://proxy.yourdomain.com/owner/repo
```

## 🔧 工作原理

```
用户请求 → 代理域名 → Cloudflare Worker
                                    ↓
                    判断路径格式：
                    - /owner/repo → github.com
                    - /domain.xxx/path → domain.xxx (任意域名)
                                    ↓
                 转发到目标服务器 → 返回内容 → 重写链接
```

## ⚠️ 注意事项

- 🔒 敏感路径已屏蔽，防止钓鱼警告
- 📦 Release 下载和静态资源现在可以正常加载
- 🌍 通用域名代理功能可用于任何网站（注意使用合规性）
- 💡 建议绑定自定义域名以获得更好的稳定性

## 📄 License

MIT

---

Made with ❤️ by [喵有爱](https://github.com/miaouai)
