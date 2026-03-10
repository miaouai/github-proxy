/**
 * GitHub Proxy Worker v2.0
 * 自动代理 GitHub 及其相关资源
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const incomingHost = url.hostname;
    const requestPath = url.pathname;

    // ============ 敏感路径黑名单 ============
    // 这些路径可能被 Cloudflare 标记为钓鱼或滥用
    const BLOCKED_PATHS = [
      '/sponsors',           // 赞助页面
      '/features',           // 功能介绍（包含 /features/ai 等）
      '/marketplace',        // 市场
      '/login',              // 登录（避免钓鱼）
      '/signup',             // 注册
      '/sessions',           // 会话管理
      '/settings',           // 设置
      '/notifications',      // 通知
      '/account',            // 账户
      '/security',           // 安全设置
      '/billing',            // 计费
      '/organizations',      // 组织管理
      '/pulls',              // 个人 PR 列表
      '/issues',             // 个人 Issue 列表
      '/stars',              // 个人收藏
      '/following',          // 关注列表
      '/watching',           // 观看列表
      '/dashboard',          // 仪表盘
      '/explore',            // 探索页面
      '/trending',           // 趋势
      '/new',                // 新建仓库
    ];

    // 检查是否命中黑名单（精确匹配或前缀匹配）
    const isBlockedPath = BLOCKED_PATHS.some(blocked => {
      // features 需要前缀匹配
      if (blocked === '/features') {
        return requestPath.startsWith('/features');
      }
      // 其他路径精确匹配
      return requestPath === blocked || requestPath.startsWith(blocked + '/');
    });

    if (isBlockedPath) {
      return new Response(`<!-- GitHub Proxy: 该路径已被屏蔽，请访问 GitHub 官网 -->
<!DOCTYPE html>
<html>
<head><title>路径已屏蔽</title></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 40px; text-align: center;">
  <h1>⚠️ 该路径已被屏蔽</h1>
  <p>出于安全考虑，此路径不通过代理访问。</p>
  <p>如需访问，请前往 GitHub 官网：<a href="https://github.com${requestPath}">https://github.com${requestPath}</a></p>
  <hr>
  <p style="color: #666; font-size: 12px;">屏蔽路径：${requestPath}</p>
</body>
</html>`, {
        status: 403,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // ============ 域名判断 ============
    // 判断是否是 GitHub 官方域名
    const GITHUB_DOMAINS = [
      'github.com',
      'www.github.com',
      'github.githubassets.com',
      'avatars.githubusercontent.com',
      'raw.githubusercontent.com',
      'gist.githubusercontent.com',
      'objects.githubusercontent.com',
      'codeload.github.com',
      'api.github.com',
      'collector.github.com',
      'clone.githubusercontent.com'
    ];

    const isGitHubHost = GITHUB_DOMAINS.some(host => 
      incomingHost === host || incomingHost.endsWith('.' + host)
    );

    let targetUrl;
    let targetHost;

    if (isGitHubHost) {
      // 直接访问 GitHub 域名
      targetUrl = new URL(request.url);
      targetHost = incomingHost;
    } else {
      // 通过代理域名访问
      // 解析路径格式：/domain/path 或 /owner/repo
      
      // 简单判断：路径中是否包含 "."来判断是否是域名格式
      const pathParts = requestPath.split('/').filter(p => p);
      
      if (pathParts.length === 0) {
        // 根路径，返回 GitHub 首页
        targetUrl = new URL(`https://github.com${url.search}`);
        targetHost = 'github.com';
      } else {
        const firstPart = pathParts[0];
        
        // 判断第一部分是否是"域名格式"（包含点号）
        if (firstPart.includes('.') && !firstPart.includes('git')) {
          // 域名格式：/any.domain.com/path → 代理 any.domain.com
          // 这样可以代理任何域名，不限于 GitHub 域名
          targetHost = firstPart;
          const remainingPath = '/' + pathParts.slice(1).join('/');
          targetUrl = new URL(`https://${targetHost}${remainingPath}${url.search}`);
        } else {
          // 普通路径：/owner/repo → 默认 github.com
          targetHost = 'github.com';
          targetUrl = new URL(`https://github.com${requestPath}${url.search}`);
        }
      }
    }

    // ============ 构建转发请求 ============
    const headers = new Headers(request.headers);
    headers.set('Host', targetHost);
    headers.set('User-Agent', headers.get('User-Agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    headers.set('Accept', headers.get('Accept') || '*/*');

    // 删除 Cloudflare 特有 header
    headers.delete('CF-Connecting-IP');
    headers.delete('CF-Ray');
    headers.delete('CF-Visitor');
    headers.delete('CDN-Loop');
    headers.delete('CF-IPCountry');
    headers.delete('CF-Request-ID');
    headers.delete('CF-Worker');

    const newRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: 'follow'
    });

    try {
      const response = await fetch(newRequest);
      const responseHeaders = new Headers(response.headers);

      // 移除可能导致问题的 header
      responseHeaders.delete('Content-Encoding');
      responseHeaders.delete('Transfer-Encoding');
      responseHeaders.delete('Content-Length');

      // 设置 CORS
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
      responseHeaders.set('Access-Control-Allow-Headers', '*');
      responseHeaders.set('Access-Control-Max-Age', '86400');

      // 处理 OPTIONS 预检请求
      if (request.method === 'OPTIONS') {
        return new Response(null, {
          status: 204,
          headers: responseHeaders
        });
      }

      // ============ 处理 HTML 内容 ============
      const contentType = responseHeaders.get('Content-Type') || '';
      if (contentType.includes('text/html')) {
        let html = await response.text();
        
        // 替换常见 GitHub 域名为代理域名
        GITHUB_DOMAINS.forEach(domain => {
          const regex = new RegExp(`https?://${domain.replace(/\./g, '\\.')}`, 'g');
          html = html.replace(regex, `https://${incomingHost}/${domain}`);
        });
        
        responseHeaders.set('Content-Length', new TextEncoder().encode(html).length);
        
        return new Response(html, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders
        });
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders
      });

    } catch (error) {
      return new Response(`Proxy Error: ${error.message}`, {
        status: 502,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
  }
};
