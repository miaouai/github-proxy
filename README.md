# 🐱 GitHub Proxy Worker

使用 Cloudflare Worker 代理 GitHub，解决中国大陆访问困难问题。

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
![Cloudflare Workers](https://img.shields.io/badge/Platform-Cloudflare%20Workers-orange)

## ✨ 特性

- ✅ 代理所有 GitHub 域名
- ✅ 自动处理重定向链接
- ✅ CORS 支持
- ✅ Git clone 无障碍
- ✅ Release 下载无障碍

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
# GitHub 首页
https://github.eoser.workers.dev/

# 查看仓库
https://github.eoser.workers.dev/owner/repo

# 查看 Issue
https://github.eoser.workers.dev/owner/repo/issues

# 查看代码文件
https://github.eoser.workers.dev/owner/repo/blob/main/src.js
```

### Git Clone

```bash
git clone https://github.eoser.workers.dev/owner/repo.git
```

### 下载文件

```
# Release 文件
https://github.eoser.workers.dev/owner/repo/releases/download/v1.0/release.tar.gz

# 头像
https://github.eoser.workers.dev/octocat.png
```

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

1. 请求到达你的 Cloudflare Worker
2. Worker 转发到 GitHub 原始服务器
3. 响应返回并修改重定向链接中的域名
4. 你始终在你的域名下访问，不需要接触 GitHub 真实域名

## ⚠️ 注意事项

- IP 可能变化，严格检测的流量可能需要等待恢复
- 建议绑定固定域名提高稳定性
- 免费配额：每月 10 万次请求

## 📄 License

MIT

---

Built with ❤️ by Miaou
