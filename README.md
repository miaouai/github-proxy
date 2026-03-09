# GitHub Proxy Worker

使用 Cloudflare Worker 代理 GitHub，解决访问困难问题。

## 支持的功能

- GitHub 主站代理 (`github.com`)
- Raw 文件代理 (`raw.githubusercontent.com`)
- Release 文件代理 (`objects.githubusercontent.com`)
- Gist 代理 (`gist.githubusercontent.com`)
- 头像代理 (`avatars.githubusercontent.com`)
- API 调用 (`api.github.com`)
- 下载链接 (`codeload.github.com`)

## 快速部署

```bash
# 1. 克隆仓库
git clone https://github.com/YOUR_USERNAME/github-proxy.git
cd github-proxy

# 2. 登录 Cloudflare
wrangler login

# 3. 部署
wrangler deploy
```

## 自定义域名

部署后，在 Cloudflare 控制台添加路由：

**方式一：绑定自定义域名**
| 类型 | 名称 | 内容 | 代理 |
|------|------|------|------|
| CNAME | github | your-worker.your-account.workers.dev | Proxied |

**方式二：添加路由 (Worker 设置)**
```
# 在 wrangler.toml 中添加
routes = [
  { pattern = "your-domain.com/*", zone_name = "your-domain.com" }
]
```

## 使用示例

```
# 访问仓库
https://your-domain.com/owner/repo

# 访问 Raw 文件
https://raw.githubusercontent.com/owner/repo/main/file.txt
# 或自定义域名方式

# Clone 仓库
git clone https://your-domain.com/owner/repo.git
```

## 环境要求

- Node.js 18+
- Cloudflare 账户
- Wrangler CLI (`npm install -g wrangler`)

## License

MIT
