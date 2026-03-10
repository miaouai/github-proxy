# 🐱 GitHub Proxy Worker

使用 Cloudflare Worker 代理 GitHub，解决中国大陆访问困难问题。支持 GitHub 主站、Raw 文件、Release 下载、Gist、头像等所有功能。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Cloudflare Workers](https://img.shields.io/badge/Platform-Cloudflare%20Workers-orange)

## ✨ 特性

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

访问效果：
- `https://github.yourdomain.com` → GitHub 首页
- `https://github.yourdomain.com/miaouai/github-proxy` → 项目页面
- `https://raw.githubusercontent.com/owner/repo/main/file.txt` → Raw 文件

### 方式二：在 wrangler.toml 中配置路由

```toml
routes = [
  { pattern = "github.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

## 📝 使用示例

### 网页访问

```
# GitHub 首页
https://your-domain.com/

# 查看仓库
https://your-domain.com/octocat/Hello-World

# 查看 Issue
https://your-domain.com/octocat/Hello-World/issues

# 查看 PR
https://your-domain.com/octocat/Hello-World/pulls
```

### Git 克隆

```bash
# HTTPS Clone
git clone https://your-domain.com/owner/repo.git

# 也可以直接写完整 URL
git clone https://your-domain.com/miaouai/github-proxy.git
```

### Raw 文件访问

```
# 访问源码文件
https://your-domain.com/raw.githubusercontent.com/owner/repo/main/src.js
或
https://raw.githubusercontent.com/owner/repo/main/src.js
```

### Release 下载

```
# 下载 Release 包（自动通过 objects.githubusercontent.com）
https://your-domain.com/owner/repo/releases/download/v1.0/release.tar.gz
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

## 🎨 Pages 部署

此仓库包含一个简单的 `index.html` 欢迎页面！启用 GitHub Pages 后访问：

```bash
# 在 Cloudflare Dashboard 开启 Pages
# 或手动设置 Workers 默认路由为 index.html
```

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

### Git clone 失败

确保使用正确的 URL 格式：
```bash
git clone https://your-domain.com/owner/repo.git
# 不是
git clone https://github.uiai.fun/owner/repo.git
```

### 访问被拒绝

1. 尝试清除浏览器缓存
2. 检查用户代理（User-Agent）是否被识别
3. 可能需要等待几分钟让网络波动恢复

## 📄 License

MIT License - 自由使用、修改和分发

## 👤 作者

喵有爱 ([@miaouai](https://github.com/miaouai))

---

**Deployed with ❤️ using Cloudflare Workers**
