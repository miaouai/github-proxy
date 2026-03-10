# 🐱 GitHub Proxy Worker v2.2

使用 Cloudflare Worker 代理 GitHub，解决中国大陆访问困难问题。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Cloudflare Workers](https://img.shields.io/badge/Platform-Cloudflare%20Workers-orange)
![Version](https://img.shields.io/badge/Version-2.2-stable)

## ✨ 特性

- ✅ 代理所有 GitHub 相关域名 + **通用域名支持**
- ✅ **优化：精简黑名单，只屏蔽高风险路径**
- ✅ 自动处理重定向链接
- ✅ CORS 支持
- ✅ Git clone 无障碍
- ✅ Release 下载无障碍
- ✅ 静态资源（CSS/JS/图片）正常加载

## 🆕 v2.2 更新内容

### 🔓 大幅放宽访问限制
v2.1 的黑名单过于严格，导致很多公开页面无法访问。**v2.2 已修正：**

| ❌ v2.1 错误屏蔽 | ✅ v2.2 恢复正常 |
|------------------|----------------|
| `/explore` | ✅ 探索页面可访问 |
| `/trending` | ✅ 趋势页面可访问 |
| `/organizations` | ✅ 组织主页可访问 |
| `/pulls`, `/issues`, `/stars` | ✅ 全局列表可访问 |
| `/new` | ✅ 新建仓库可访问 |
| `/features/*` | ✅ 功能介绍页面可访问 |

### 🔒 现在的黑名单（仅保留高风险路径）
只屏蔽以下最敏感的账户相关页面：

| 路径 | 原因 |
|------|------|
| `/login`, `/signup`, `/logout` | 避免钓鱼风险 |
| `/oauth`, `/sessions` | OAuth 授权安全 |
| `/settings`, `/account` | 个人设置隐私 |
| `/security`, `/billing`, `/payment` | 敏感信息 |
| `/sponsors`, `/marketplace` | 可能触发警告 |
| `/invitations`, `/import` | 账户操作 |

### 🎨 图片加载修复
- 支持通用域名代理 → `your-proxy/any-domain.com/image.png`
- HTML 自动替换 GitHub 已知域名的链接
- GitHub CDN、头像、Raw 文件都能正常显示

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

假设你的 Worker 部署在 `https://your-worker.workers.dev`（请替换为你的实际域名）

### 浏览 GitHub 网页

```
# GitHub 首页
https://your-worker.workers.dev/

# 查看仓库（所有公开页面都可正常访问！）
https://your-worker.workers.dev/owner/repo
https://your-worker.workers.dev/explore
https://your-worker.workers.dev/trending
https://your-worker.workers.dev/organizations

# Issue 和 PR
https://your-worker.workers.dev/owner/repo/issues
https://your-worker.workers.dev/owner/repo/pulls
```

### 代理其他域名（通用模式）

```
# GitHub 静态资源（CSS/JS/图片）
https://your-worker.workers.dev/github.githubassets.com/assets/xxx.css

# GitHub 头像
https://your-worker.workers.dev/avatars.githubusercontent.com/u/123456

# Raw 文件
https://your-worker.workers.dev/raw.githubusercontent.com/owner/repo/main/file.md

# API 调用
https://your-worker.workers.dev/api.github.com/repos/owner/repo

# 甚至其他网站（实验性功能）
https://your-worker.workers.dev/example.com/path
```

### Git Clone

```bash
git clone https://your-worker.workers.dev/owner/repo.git
```

### 下载 Release 文件

```
# Release 下载
https://your-worker.workers.dev/owner/repo/releases/download/v1.0/release.tar.gz

# 源码压缩包
https://your-worker.workers.dev/owner/repo/archive/refs/tags/v1.0.tar.gz

# 明确指定 objects 域名
https://your-worker.workers.dev/objects.githubusercontent.com/xxx
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
                    1. 检查黑名单（仅高风险路径）
                    2. 判断目标域名：
                       - /owner/repo → github.com
                       - /domain.xxx/path → domain.xxx (任意域名)
                    3. 转发到目标服务器 → 返回内容 → 重写 GitHub 链接
```

## ⚠️ 注意事项

- ✅ **v2.2 已修复**: 公开页面全部可访问，包括 explore/trending/issues/prs 等
- 🔒 仅屏蔽账户管理和支付等高风险路径
- 📦 静态资源和图片现在应该能正常加载
- 💡 建议绑定自定义域名以获得更好的稳定性

## 📄 License

MIT

---

Made with ❤️ by [喵有爱](https://github.com/miaouai)
