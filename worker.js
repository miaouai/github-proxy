/**
 * GitHub Proxy Worker
 * 自动代理 GitHub 及其相关资源
 */

// ============ 防限流配置 ============
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_2) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/120.0.0.0'
];

const REFERRERS = [
  'https://github.com/',
  'https://www.google.com/',
  'https://www.bing.com/',
  ''  // 空 Referer 也有帮助
];

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
      const pathParts = url.pathname.split('/').filter(p => p);
      
      if (pathParts.length >= 2) {
        targetUrl = new URL(`https://github.com${url.pathname}${url.search}`);
      } else if (pathParts.length === 1) {
        targetUrl = new URL(`https://github.com/${pathParts[0]}${url.search}`);
      } else {
        targetUrl = new URL(`https://github.com${url.pathname}${url.search}`);
      }
    }

    // ============ 🔧 防限流优化 ============
    const headers = new Headers(request.headers);
    
    // 1. 随机 User-Agent
    const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
    headers.set('User-Agent', randomUA);
    
    // 2. 随机 Referer（偶尔为空）
    if (Math.random() > 0.3) {  // 70% 概率设置 Referer
      const randomReferrer = REFERRERS[Math.floor(Math.random() * REFERRERS.length)];
      if (randomReferrer) {
        headers.set('Referer', randomReferrer);
      }
    }
    
    headers.set('Accept', headers.get('Accept') || '*/*');
    headers.set('Accept-Language', headers.get('Accept-Language') || 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7');
    headers.set('Accept-Encoding', headers.get('Accept-Encoding') || 'gzip, deflate, br');
    headers.set('Connection', headers.get('Connection') || 'keep-alive');

    // 删除 Cloudflare 特有 header
    ['CF-Connecting-IP', 'CF-Ray', 'CF-Visitor', 'CDN-Loop', 
     'CF-IPCountry', 'CF-Request-ID', 'CF-Worker'].forEach(h => headers.delete(h));

    const newRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: 'follow'
    });

    try {
      const response = await fetch(newRequest);
      
      // 🔥 检测限流并返回友好提示
      if (response.status === 403) {
        const contentType = response.headers.get('Content-Type') || '';
        if (contentType.includes('text/html')) {
          const html = await response.text();
          if (html.includes('secondary rate limit') || html.includes('rate limit')) {
            return new Response(`<!DOCTYPE html>
<html>
<head>
  <title>GitHub Rate Limit</title>
  <style>
    body{font-family:system-ui,sans-serif;padding:40px;text-align:center;background:#f6f8fa}
    h1{color:#cb2431}
    .info{background:#fff;border:1px solid #d0d7de;border-radius:6px;padding:20px;margin:20px 0}
    a{color:#0969da;text-decoration:none}
  </style>
</head>
<body>
  <h1>⚠️ GitHub 限流提示</h1>
  <div class="info">
    <p>您的 IP 地址已被 GitHub 暂时限制访问。</p>
    <p><strong>解决方案：</strong></p>
    <ul style="text-align:left">
      <li>等待 5-15 分钟后重试（通常是暂时的）</li>
      <li>刷新页面可能会使用不同的 Cloudflare IP</li>
      <li>如果持续受限，建议联系管理员更换 Worker 部署区域</li>
    </ul>
    <p><a href="${request.url}" style="padding:8px 16px;background:#2da44e;color:#fff;border-radius:6px;display:inline-block;">稍后重试</a></p>
  </div>
  <p style="color:#57606a;font-size:12px;">错误详情：Too many requests - secondary rate limit</p>
</body>
</html>`, {
              status: 429,
              headers: { 'Content-Type': 'text/html; charset=utf-8' }
            });
          }
        }
      }

      const responseHeaders = new Headers(response.headers);

      // 处理重定向 - 重写 Location 头
      if (response.status >= 300 && response.status < 400 && response.headers.has('Location')) {
        let location = response.headers.get('Location');
        
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
        return new Response(null, { status: 204, headers: responseHeaders });
      }

      // 重写 HTML 中的链接
      const contentType = responseHeaders.get('Content-Type') || '';
      if (contentType.includes('text/html')) {
        const html = await response.text();
        let newHtml = html;
        
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
      console.error('Proxy error:', error.message);
      return new Response(`Proxy Error: ${error.message}`, {
        status: 502,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' }
      });
    }
  }
};
