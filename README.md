# 🐱 GitHub Proxy Worker v2.2

使用 Cloudflare Worker 代理 GitHub，解决中国大陆访问困难问题。**v2.0 全新架构，避免 Cloudflare 钓鱼警告！**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Cloudflare Workers](https://img.shields.io/badge/Platform-Cloudflare%20Workers-orange)

## ✨ 特性

- ✅ **v2.2 链接修复** - HTML 内部所有链接（导航栏、仓库链接等）自动重写为代理地址
- ✅ **v2.1 安全增强** - 仅 `/gh` 路径代理 GitHub，其他路径返回 404（降低 CF 钓鱼风险）
- ✅ **v2.1 头像修复** - 优化 HTML 链接重写逻辑，支持头像等静态资源正常加载
- ✅ **v2.0 新架构** - `/gh` 路径代理，避免钓鱼警告
- ✅ **精美展示页** - 根路径显示介绍页，大 GitHub 图标可点击
- ✅ **GitHub 主站代理** - 浏览仓库、Issue、PR
- ✅ **Raw 文件代理** - 直接访问源代码文件
- ✅ **Release 下载代理** - 下载 Release 版本包
- ✅ **Git LFS 支持** - 大文件存储对象
- ✅ **Gist 代理** - Gist 代码片段
- ✅ **头像代理** - User avatars
- ✅ **API 支持** - API 调用无障碍
- ✅ **代码克隆** - Git clone 无障碍
- ✅ **自动重定向** - 智能处理所有重定向链接
- ✅ **CORS 支持** - 跨域请求友好

## 🚀 快速开始

### 1️⃣ 克隆仓库

```bash
git clone https://github.com/miaouai/github-proxy.git
cd github-proxy
```

### 2️⃣ 登录 Cloudflare

```bash
wrangler login
```

### 3️⃣ 部署 Worker

```bash
wrangler deploy
```

部署成功后会返回类似：
```
🌀  Your worker has been deployed to:
     https://github-proxy.your-account.workers.dev
```

## 🔧 配置自定义域名

在 Cloudflare 控制台添加 DNS 记录或使用 Workers Routes：

### 方式一：绑定自定义域名

| 类型 | 名称 | 内容 | 代理状态 |
|------|------|------|----------|
| CNAME | `github` | `your-worker.your-account.workers.dev` | Proxied (橙色云朵) |

**访问效果（v2.2）：**
- `https://github.yourdomain.com` → 展示页（介绍页面）
- `https://github.yourdomain.com/` → 展示页（介绍页面）
- `https://github.yourdomain.com/gh` → GitHub 首页 ✅ **内部链接自动重写**
- `https://github.yourdomain.com/gh/miaouai/github-proxy` → 项目页面
- `https://github.yourdomain.com/gh/github.com/miaouai/repo` → 完整代理路径
- `https://github.yourdomain.com/random/path` → **404 Not Found**（安全策略）

> 💡 **v2.2 重要改进**: GitHub 页面内部的所有链接（导航栏、仓库跳转、用户页面等）都会被重写为 `your-domain.com/gh/github.com/...` 格式，确保所有点击都在代理下工作！
- `https://raw.githubusercontent.com/owner/repo/main/file.txt` → Raw 文件（自动代理）

### 方式二：在 wrangler.toml 中配置路由

```toml
routes = [
  { pattern = "github.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

## 📝 使用示例 (v2.0)

### 网页访问

```
# 展示页（介绍页面，有 GitHub 图标）
https://your-domain.com/

# 访问 GitHub 首页（点击 GitHub 图标或访问 /gh）
https://your-domain.com/gh

# 查看仓库
https://your-domain.com/gh/octocat/Hello-World

# 查看 Issue
https://your-domain.com/gh/octocat/Hello-World/issues

# 查看 PR
https://your-domain.com/gh/octocat/Hello-World/pulls
```

### Git 克隆

```bash
# HTTPS Clone
git clone https://your-domain.com/gh/owner/repo.git

# 也可以直接写完整 URL
git clone https://your-domain.com/gh/miaouai/github-proxy.git
```

### Raw 文件访问

```
# 方式 A - 通过 /gh 路径
https://your-domain.com/gh/raw.githubusercontent.com/owner/repo/main/src.js

# 方式 B - 直接使用原始域名（自动代理到 GitHub）
https://raw.githubusercontent.com/owner/repo/main/src.js
```

### Release 下载

```
# 下载 Release 包（通过 objects.githubusercontent.com）
https://your-domain.com/gh/objects.githubusercontent.com/owner/repo/releases/download/v1.0/release.tar.gz
```

## 🛠️ 支持的域名列表

| 原始域名 | 用途 | 是否代理 |
|---------|------|---------|
| `github.com` | 主站 | ✅ |
| `www.github.com` | 主站 www | ✅ |
| `raw.githubusercontent.com` | Raw 文件 | ✅ |
| `objects.githubusercontent.com` | Git LFS / Objects | ✅ |
| `gist.githubusercontent.com` | Gist | ✅ |
| `avatars.githubusercontent.com` | 头像 | ✅ |
| `api.github.com` | API | ✅ |
| `codeload.github.com` | Code download | ✅ |
| `clone.githubusercontent.com` | Clone | ✅ |

## ⚙️ 高级配置

### 环境变量

Worker 可以配置环境变量用于自定义行为（可选）：

```toml
[vars]
ENVIRONMENT = "production"
LOG_LEVEL = "info"
```

### 兼容性日期

更新 `wrangler.toml` 中的兼容性日期：

```toml
compatibility_date = "2024-01-01"
```

推荐使用最新的稳定版本。

## 🎨 展示页说明

v2.0 版本包含精美的 `index.html` 展示页！根路径会显示：

- 🖼️ **大 GitHub 图标** - 悬停动画效果
- 👆 **点击跳转** - 直接访问 `/gh` 代理 GitHub
- 📋 **功能列表** - 支持的域名和用途说明
- 💡 **使用示例** - 常见 URL 格式参考

展示页会自动加载在根路径 `https://your-domain.com/`。

## 🌟 工作原理

1. **智能路由** - 根据 Host 头判断是否为目标域名
2. **请求转发** - 将请求转发到 GitHub 原始服务器
3. **响应重写** - 自动重写 Location 头部中的 GitHub 域名
4. **CORS 支持** - 添加跨域头允许跨站请求
5. **错误处理** - 友好的错误提示

## ⚠️ 注意事项

- IP 地址可能随时间变化，部分严格检测的流量可能需要重新验证
- 建议绑定固定域名以获得更好的稳定性
- 免费配额：每月 10 万次请求（满足大多数个人需求）
- 付费计划：无限制且更快的响应速度

## 🐛 故障排查

### 无法访问页面

1. 检查 Worker 是否成功部署
2. 确认 DNS 记录已配置正确
3. 检查 Cloudflare 控制台中的 Routes 配置

### Git clone 失败 (v2.0)

**重要：** v2.0 使用 `/gh` 路径，确保 URL 格式正确：

```bash
# 正确的格式
git clone https://your-domain.com/gh/owner/repo.git

# ❌ 错误（旧版本用法，已废弃）
git clone https://your-domain.com/owner/repo.git
```

### 访问被拒绝

1. 尝试清除浏览器缓存
2. 检查用户代理（User-Agent）是否被识别
3. 可能需要等待几分钟让网络波动恢复

### Cloudflare 钓鱼警告

如遇到 Cloudflare 安全提示，可能是因为：
- 使用了旧的 URL 格式（根路径直接代理 GitHub）
- **解决方案：升级到 v2.0，使用 `/gh` 路径**

## 📄 License

MIT License - 自由使用、修改和分发

## 👤 作者

喵有爱 ([@miaouai](https://github.com/miaouai))

---

**Deployed with ❤️ using Cloudflare Workers | v2.0 - Safe & Fast**

## 🔄 从旧版本升级到 v2.0（重要！）

### ⚠️ URL 变更说明

| 项目 | 旧版本 (v1.x) | **新版本 (v2.0)** |
|------|--------------|------------------|
| 根路径行为 | 直接代理 GitHub | **显示精美展示页** |
| GitHub 主页 | `/` 或 `/owner/repo` | **`/gh` 和 `/gh/owner/repo`** |
| Cloudflare 安全 | ⚠️ 可能被标记为钓鱼 | ✅ **避免钓鱼警告** |

### v2.0 URL 示例

```
# 展示页 - 有介绍和大 GitHub 图标
https://your-domain.com/

# GitHub 首页
https://your-domain.com/gh

# 访问仓库
https://your-domain.com/gh/miaouai/github-proxy

# Git clone
git clone https://your-domain.com/gh/owner/repo.git

# Raw 文件
https://your-domain.com/gh/raw.githubusercontent.com/owner/repo/main/file.txt
```

### 升级步骤

1. 拉取最新代码：
   ```bash
   git pull origin main
   ```

2. 重新部署 Worker：
   ```bash
   wrangler deploy
   ```

3. **重要**：更新所有书签和脚本中的 URL，将旧格式改为 `/gh` 前缀的新格式

### 兼容性说明

- ❌ 旧版 `https://域名/owner/repo` URL 不再工作
- ✅ 但 `raw.githubusercontent.com` 等原始域名仍可直接访问（Worker 会自动代理）
- 💡 建议将所有自定义域名（raw, objects, avatars 等）都绑定到同一 Worker

---

**Deployed with ❤️ using Cloudflare Workers | v2.0 - Safe & Fast**
