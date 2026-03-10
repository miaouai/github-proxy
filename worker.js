/**
 * GitHub Proxy Worker v2.2
 * 自动代理 GitHub 及其相关资源
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const incomingHost = url.hostname;
    const requestPath = url.pathname;

    // ============ 精简后的黑名单 ============
    // 只屏蔽最容易触发 Cloudflare 警告的真实风险路径
    const BLOCKED_PATHS = [
      '/sponsors',           // 赞助 - 高风险
      '/marketplace',        // 市场 - 高风险  
      '/login',              // 登录 - 避免钓鱼
      '/logout',             // 登出 - 会话安全
      '/signup',             // 注册 - 避免钓鱼
      '/oauth',              // OAuth 授权
      '/sessions',           // 会话管理
      '/settings',           // 个人设置
      '/account',            // 账户管理
      '/security',           // 安全设置
      '/billing',            // 计费信息
      '/payment',            // 支付
      '/invitations',        // 邀请页面
      '/import',             // 导入仓库
    ];

    // 检查是否命中黑名单
    const isBlockedPath = BLOCKED_PATHS.some(blocked => 
      requestPath === blocked || requestPath.startsWith(blocked + '/')
    );

    if (isBlockedPath) {
      return new Response(`<!DOCTYPE html>
<html>
<head>
  <title>路径已屏蔽</title>
  <style>body{font-family:system-ui,sans-serif;padding:40px;text-align:center;color:#24292f}</style>
</head>
<body>
  <h1>⚠️ 该路径已被屏蔽</h1>
  <p>出于安全考虑，此路径不通过代理访问。</p>
  <p><a href="https://github.com${requestPath}" style="color:#0969da;">点击访问 GitHub 官网</a></p>
  <hr style="margin:20px 0;border:none;border-top:1px solid #d0d7de;">
  <p style="color:#57606a;font-size:12px;">屏蔽路径：${requestPath}</p>
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
      const pathParts = requestPath.split('/').filter(p => p);
      
      if (pathParts.length === 0) {
        // 根路径
        targetUrl = new URL(`https://github.com${url.search}`);
        targetHost = 'github.com';
      } else {
        const firstPart = pathParts[0];
        
        // 判断是否是"域名格式"（包含点号）且不是 git 关键字
        if (firstPart.includes('.') && !firstPart.toLowerCase().includes('git')) {
          // 域名格式：/domain.xxx/path → 代理任意域名
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
        
        // 替换 GitHub 已知域名为代理域名
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
      console.error('Proxy error:', error.message);
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
