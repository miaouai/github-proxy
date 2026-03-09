/**
 * GitHub Proxy Worker
 * 自动代理 GitHub 及其相关资源
 * 支持任意自定义域名
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

    // 判断是否是对 GitHub 的请求
    const isGitHubRequest = GITHUB_HOSTS.some(host => 
      incomingHost === host || incomingHost.endsWith('.' + host)
    );

    let targetUrl;

    if (isGitHubRequest) {
      // 如果请求直接访问 GitHub 域名（如在某些网络环境下直接使用）
      targetUrl = new URL(request.url);
    } else {
      // 自定义域名访问，如 user.github.io 或自定义域名
      // 尝试从 Host 头推断目标
      targetUrl = new URL(request.url);
      targetUrl.hostname = 'github.com';
      targetUrl.pathname = '/' + incomingHost + url.pathname;
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
