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

    // ============ GitHub 域名配置 ============
    // 主域名 - 直接代理（访问代理域名时默认转到 github.com）
    const MAIN_DOMAIN = 'github.com';
    
    // GitHub 相关域名列表（用于重定向处理和路径解析）
    const GITHUB_DOMAINS = {
      'github.com': true,
      'www.github.com': true,
      'github.githubassets.com': true,  // ⭐ 静态资源（CSS/JS/图片）- 关键！
      'avatars.githubusercontent.com': true,
      'raw.githubusercontent.com': true,
      'gist.githubusercontent.com': true,
      'objects.githubusercontent.com': true,  // Release 文件下载
      'codeload.github.com': true,
      'api.github.com': true,
      'collector.github.com': true,  // 分析统计
      'clone.githubusercontent.com': true,
    };

    // 判断是否是对 GitHub 域名的直接请求
    const isGitHubHost = Object.keys(GITHUB_DOMAINS).some(host => 
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
      // 解析路径格式：/域名/路径 或 /owner/repo（默认 github.com）
      const pathParts = requestPath.split('/').filter(p => p);
      
      // 检查第一部分是否是已知的 GitHub 域名
      const firstPart = pathParts[0];
      let domainPrefix = '';
      let actualPath = '';
      
      if (firstPart && GITHUB_DOMAINS[firstPart]) {
        // 格式：/domain/path
        domainPrefix = firstPart;
        actualPath = '/' + pathParts.slice(1).join('/');
      } else {
        // 格式：/owner/repo 或其他路径，默认使用 github.com
        domainPrefix = MAIN_DOMAIN;
        actualPath = requestPath;
      }
      
      targetHost = domainPrefix;
      targetUrl = new URL(`https://${domainPrefix}${actualPath}${url.search}`);
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

      // 处理重定向 - 重写 Location 头
      if (response.status >= 300 && response.status < 400 && response.headers.has('Location')) {
        let location = response.headers.get('Location');
        
        // 将 GitHub 域名重定向改为代理域名格式
        Object.keys(GITHUB_DOMAINS).forEach(domain => {
          // https://domain/path -> https://proxy-domain/domain/path
          location = location.replace(
            new RegExp(`https?://${domain.replace(/\./g, '\\.')}`, 'g'),
            `https://${incomingHost}/${domain}`
          );
        });
        
        responseHeaders.set('Location', location);
      }

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
      // 替换 HTML 中的 GitHub 域名链接为代理域名
      const contentType = responseHeaders.get('Content-Type') || '';
      if (contentType.includes('text/html')) {
        let html = await response.text();
        
        // 替换 GitHub 域名链接
        Object.keys(GITHUB_DOMAINS).forEach(domain => {
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
