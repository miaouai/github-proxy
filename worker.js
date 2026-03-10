/**
 * GitHub Proxy Worker
 * 自动代理 GitHub 及其相关资源
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const incomingHost = url.hostname;

    // GitHub 原始域名列表
    const GITHUB_HOSTS = [
      'github.com',
      'www.github.com',
      'githubusercontent.com',
      'raw.githubusercontent.com',
      'objects.githubusercontent.com',
      'gist.githubusercontent.com',
      'avatars.githubusercontent.com',
      'api.github.com',
      'codeload.github.com',
      'clone.githubusercontent.com'
    ];

    // 判断是否是对 GitHub 原始域名的直接请求
    const isGitHubHost = GITHUB_HOSTS.some(host => 
      incomingHost === host || incomingHost.endsWith('.' + host)
    );

    let targetUrl;

    if (isGitHubHost) {
      // 直接访问 GitHub 域名
      targetUrl = new URL(request.url);
    } else {
      // 自定义域名或 workers.dev 域名访问
      // 解析路径：/owner/repo 或 /owner/repo/path/to/file
      const pathParts = url.pathname.split('/').filter(p => p);
      
      if (pathParts.length >= 2) {
        // 看起来像 /owner/repo/...
        targetUrl = new URL(`https://github.com${url.pathname}${url.search}`);
      } else if (pathParts.length === 1) {
        // 只有一个部分，可能是用户名
        targetUrl = new URL(`https://github.com/${pathParts[0]}${url.search}`);
      } else {
        // 根路径，返回 GitHub 首页
        targetUrl = new URL(`https://github.com${url.pathname}${url.search}`);
      }
    }

    // 构建转发请求
    const headers = new Headers(request.headers);
    headers.set('Host', targetUrl.hostname);
    headers.set('User-Agent', headers.get('User-Agent') || 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    // 删除 Cloudflare 特有 header
    headers.delete('CF-Connecting-IP');
    headers.delete('CF-Ray');
    headers.delete('CF-Visitor');
    headers.delete('CDN-Loop');
    headers.delete('CF-IPCountry');
    headers.delete('CF-Request-ID');

    // 保留关键 header
    if (!headers.has('Accept')) {
      headers.set('Accept', '*/*');
    }

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
        
        // 将 GitHub 域名重定向到当前域名
        GITHUB_HOSTS.forEach(host => {
          location = location.replace(`https://${host}`, `https://${incomingHost}`);
          location = location.replace(`http://${host}`, `https://${incomingHost}`);
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

      // ============ 🔧 新增：重写 HTML 中的链接 ============
      const contentType = responseHeaders.get('Content-Type') || '';
      if (contentType.includes('text/html')) {
        const html = await response.text();
        let newHtml = html;
        
        // 将所有 GitHub 域名的链接替换为代理域名
        GITHUB_HOSTS.forEach(host => {
          const regex = new RegExp(`(href|src|data-src|action)=["']https?://${host}/`, 'g');
          newHtml = newHtml.replace(regex, `$1="https://${incomingHost}/`);
        });
        
        const encoder = new TextEncoder();
        responseHeaders.set('Content-Length', encoder.encode(newHtml).length);
        
        return new Response(newHtml, {
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
