/**
 * GitHub Proxy Worker v2.2.4
 * /gh 路径代理到 GitHub，根路径显示展示页
 * 避免 Cloudflare 钓鱼警告
 * 
 * v2.2.4 修复：头像和子域名链接加载问题（核心！）
 * - 🔥 github.com/user/repo → your-domain.com/gh/user/repo (去掉 github.com)
 * - ✅ avatars.githubusercontent.com/u/123 → your-domain.com/gh/avatars.githubusercontent.com/u/123 (保留完整子域名)
 * - 之前的错误把 avatars.githubusercontent.com 整个都当成路径删掉了！
 * 
 * v2.2.3: 处理相对路径 /user/repo → your-domain.com/gh/user/repo
 * v2.2.2: 修复链接重写逻辑
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
  ''
];

// GitHub 原始域名列表（用于直接请求时代理）
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

// 展示页 HTML
const LANDING_PAGE = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GitHub Proxy - 加速访问</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            flex-direction: column;
        }
        .container {
            max-width: 800px;
            width: 100%;
            background: white;
            border-radius: 20px;
            padding: 40px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            text-align: center;
            margin-bottom: 30px;
        }
        h1 { color: #333; font-size: 2.5rem; margin-bottom: 10px; }
        .subtitle { color: #666; margin-bottom: 30px; font-size: 1.1rem; }
        .github-logo {
            width: 200px;
            height: 200px;
            margin: 20px auto;
            cursor: pointer;
            transition: transform 0.3s, box-shadow 0.3s;
            border-radius: 50%;
            background: #24292e;
            padding: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .github-logo:hover {
            transform: scale(1.05);
            box-shadow: 0 10px 30px rgba(36, 41, 46, 0.4);
        }
        .github-logo svg {
            width: 100%;
            height: 100%;
            fill: white;
        }
        .click-hint {
            color: #0969da;
            font-size: 1.2rem;
            margin-top: 15px;
            font-weight: 500;
        }
        .features {
            list-style: none;
            margin: 30px 0;
            text-align: left;
        }
        .features li {
            padding: 12px;
            margin-bottom: 8px;
            background: #f8f9fa;
            border-left: 4px solid #007bff;
            border-radius: 4px;
            color: #495057;
        }
        .features li::before {
            content: "✓ ";
            color: #28a745;
            font-weight: bold;
            margin-right: 8px;
        }
        .status {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
            display: inline-block;
        }
        .footer {
            color: rgba(255,255,255,0.8);
            text-align: center;
            margin-top: 20px;
        }
        @media (max-width: 600px) {
            .container { padding: 20px; }
            h1 { font-size: 1.8rem; }
            .github-logo { width: 150px; height: 150px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="status">✅ 服务运行中 | Powered by Cloudflare Workers</div>
        <h1>🐱 GitHub Proxy</h1>
        <p class="subtitle">Cloudflare Worker 加速代理服务</p>
        
        <a href="/gh" id="github-link">
            <div class="github-logo">
                <svg viewBox="0 0 16 16" version="1.1" aria-hidden="true">
                    <path fill-rule="evenodd" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.52 0-.77.29-1.41.77-1.91-.78-.93-1.65-1.77-1.65-3.11 0-.69.23-1.32.63-1.84.29.81 1.13 1.36 2.02 1.65.63-.21 1.31-.55 2.02-.55.71 0 1.39.34 2.02.55.89-.29 1.73-.84 2.02-1.65.4.52.63 1.15.63 1.84 0 1.34-.87 2.18-1.65 3.11.48.5.77 1.14.77 1.91 0 2.63-1.86 3.32-3.64 3.52.23.2.44.55.51 1.07.46.21 1.61.55 2.33-.66.15-.24.6-.83 1.23-.82.67.01.27.38-.01.53-.34.19-.73.56-.82 1.13-.16.45-.68 1.31-2.69.94 0 .67-.01 1.3-.01 1.49 0 .21.15.45.55.38C13.71 14.53 16 11.54 16 8c0-4.42-3.58-8-8-8z"/>
                </svg>
            </div>
            <p class="click-hint">👆 点击访问 GitHub</p>
        </a>
        
        <ul class="features">
            <li>GitHub 主站代理 (<code>github.com</code>)</li>
            <li>Raw 文件代理 (<code>raw.githubusercontent.com</code>)</li>
            <li>Release 下载代理 (<code>objects.githubusercontent.com</code>)</li>
            <li>Gist 代理 (<code>gist.githubusercontent.com</code>)</li>
            <li>头像代理 (<code>avatars.githubusercontent.com</code>)</li>
            <li>API 调用支持 (<code>api.github.com</code>)</li>
            <li>代码克隆支持 (<code>codeload.github.com</code>)</li>
        </ul>
    </div>
    <div class="footer">
        <p>Built with ❤️ by Miaou | MIT License</p>
        <p>v2.1 - 仅通过 <code>/gh</code> 路径访问 GitHub</p>
    </div>
    <script>
        document.getElementById('github-link').addEventListener('click', function(e) {
            e.preventDefault();
            window.location.href = '/gh';
        });
    </script>
</body>
</html>`;

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const incomingHost = url.hostname;
    const pathname = url.pathname;

    // 判断是否是对 GitHub 原始域名的直接请求
    const isGitHubHost = GITHUB_HOSTS.some(host => 
      incomingHost === host || incomingHost.endsWith('.' + host)
    );

    // 如果是直接请求 GitHub 域名，直接代理（不重写链接）
    if (isGitHubHost) {
      return await proxyToGitHub(request, incomingHost);
    }

    // 自定义域名或 workers.dev 域名访问
    // 根路径或空路径返回展示页
    if (pathname === '/' || pathname === '') {
      return new Response(LANDING_PAGE, {
        status: 200,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }

    // /gh 路径代理到 GitHub
    if (pathname.startsWith('/gh')) {
      // 移除 /gh 前缀，获取 GitHub 路径
      let githubPath = pathname.substring(3);
      if (!githubPath.startsWith('/')) {
        githubPath = '/' + githubPath;
      }
      
      const targetUrl = new URL(`https://github.com${githubPath}${url.search}`);
      return await proxyToGitHub(request, incomingHost, targetUrl);
    }

    // 🔥 其他路径返回 404 或引导页（避免被 CF 判定为钓鱼网站）
    // 只允许 /gh 开头访问 GitHub，增强安全性
    return new Response(`<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>404 Not Found - GitHub Proxy</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0;
        }
        .container {
            background: white;
            padding: 60px 40px;
            border-radius: 20px;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
        }
        h1 { color: #cb2431; font-size: 4rem; margin: 0; }
        p { color: #666; font-size: 1.2rem; margin: 20px 0; }
        a { 
            color: #0969da; 
            text-decoration: none; 
            font-size: 1.1rem;
            display: inline-block;
            margin: 10px;
            padding: 10px 20px;
            border: 2px solid #0969da;
            border-radius: 8px;
        }
        a:hover { background: #0969da; color: white; }
    </style>
</head>
<body>
    <div class="container">
        <h1>404</h1>
        <p>🚫 此路径未启用代理</p>
        <p>本 Worker 仅支持通过 <code>/gh</code> 路径访问 GitHub</p>
        <a href="/">回到首页</a>
        <a href="/gh">访问 GitHub</a>
    </div>
</body>
</html>`, {
      status: 404,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
};

// 代理到 GitHub 的通用函数（自动重写 HTML 链接）
async function proxyToGitHub(request, incomingHost, targetUrl = null) {
  const url = new URL(request.url);
  
  if (!targetUrl) {
    targetUrl = new URL(request.url);
  }

  // ============ 🔧 防限流优化 ============
  const headers = new Headers(request.headers);
  
  // 1. 随机 User-Agent
  const randomUA = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
  headers.set('User-Agent', randomUA);
  
  // 2. 随机 Referer（偶尔为空）
  if (Math.random() > 0.3) {
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

    // 🔥 针对头像和静态资源，设置更友好的 CORS 和缓存策略
    const path = url.pathname;
    const isAvatarOrStatic = /avatars|raw|objects|codeload/.test(incomingHost) || 
                             /\.(png|jpg|jpeg|gif|svg|ico|css|js)$/i.test(path);
    
    if (isAvatarOrStatic) {
      // 允许跨域访问头像和静态资源
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', '*');
      
      // 延长缓存时间（图片资源）
      if (!responseHeaders.has('Cache-Control')) {
        responseHeaders.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');
      }
      responseHeaders.set('Vary', 'Accept-Encoding');
    }

    // 移除可能导致问题的 header
    responseHeaders.delete('Content-Encoding');
    responseHeaders.delete('Transfer-Encoding');
    // 不要删除 Content-Length，让浏览器正确判断完整性
    // responseHeaders.delete('Content-Length');

    // 设置 CORS
    responseHeaders.set('Access-Control-Allow-Origin', '*');
    responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    responseHeaders.set('Access-Control-Allow-Headers', '*');
    responseHeaders.set('Access-Control-Max-Age', '86400');

    // 处理 OPTIONS 预检请求
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: responseHeaders });
    }

    // 🔥 重写 HTML 中的所有 GitHub 链接（v2.2.3 - 修复相对路径）
    const contentType = responseHeaders.get('Content-Type') || '';
    if (contentType.includes('text/html')) {
      const html = await response.text();
      let newHtml = html;
      
      GITHUB_HOSTS.forEach(host => {
        // 🔥 v2.2.4: 处理完整 URL
        
        // 关键：区分 github.com 和其他子域名
        // - github.com/user/repo → your-domain.com/gh/user/repo (去掉 github.com)
        // - avatars.githubusercontent.com/u/123 → your-domain.com/gh/avatars.githubusercontent.com/u/123 (保留完整域名)
        
        const fullUrlRegex = new RegExp(
          `((?:href|src|action|poster|data-src)=["'])https?://${host}(/[^"']*?)("|\')`,
          'gi'
        );
        
        if (host === 'github.com' || host === 'www.github.com') {
          // github.com 去掉域名，直接加 /gh
          newHtml = newHtml.replace(fullUrlRegex, `$1https://${incomingHost}/gh$2$3`);
        } else {
          // 其他子域名保留完整域名路径
          newHtml = newHtml.replace(fullUrlRegex, `$1https://${incomingHost}/gh/${host}$2$3`);
        }
        
        const dataAttrRegex = new RegExp(
          `(data-[\\w-]+=["'])https?://${host}(/[^"']*?)("|\')`,
          'gi'
        );
        
        if (host === 'github.com' || host === 'www.github.com') {
          newHtml = newHtml.replace(dataAttrRegex, `$1https://${incomingHost}/gh$2$3`);
        } else {
          newHtml = newHtml.replace(dataAttrRegex, `$1https://${incomingHost}/gh/${host}$2$3`);
        }
      });
      
      // 🔥 v2.2.3: 处理相对路径 /user/repo → your-domain.com/gh/user/repo
      // 匹配 href="/*" 但不匹配 "//开头" 或 "http://开头" 或 "https://开头"
      const relativePathRegex = /((?:href|src|action)=["'])(\/[^"'\s]*?)("|\')/gi;
      newHtml = newHtml.replace(relativePathRegex, (match, attr, path, quote) => {
        // 排除已经是外部链接的情况
        if (path.startsWith('//') || path.includes('://')) {
          return match;
        }
        return `${attr}https://${incomingHost}/gh${path}${quote}`;
      });
      
      // 🎨 处理 style 属性中的 url()
      GITHUB_HOSTS.forEach(host => {
        const styleRegex = new RegExp(
          `(url\\(["\']?)https?://${host}(/[^)"\']*)["\']?\\)`,
          'gi'
        );
        
        if (host === 'github.com' || host === 'www.github.com') {
          newHtml = newHtml.replace(styleRegex, `url($1https://${incomingHost}/gh$2)`);
        } else {
          newHtml = newHtml.replace(styleRegex, `url($1https://${incomingHost}/gh/${host}$2)`);
        }
        
        // 📜 处理 @import
        const importRegex = new RegExp(
          `@import ["\']https?://${host}(/[^"\']*)["\']`,
          'gi'
        );
        
        if (host === 'github.com' || host === 'www.github.com') {
          newHtml = newHtml.replace(importRegex, `@import "https://${incomingHost}/gh$1"`);
        } else {
          newHtml = newHtml.replace(importRegex, `@import "https://${incomingHost}/gh/${host}$1"`);
        }
      });
      
      // 🔧 处理 script 标签内嵌的 JSON 数据
      const scriptDataRegex = /(<script[^>]*>)([\s\S]*?)(<\/script>)/gi;
      newHtml = newHtml.replace(scriptDataRegex, (match, openingTag, content, closingTag) => {
        if (!content.includes('http') && !content.includes('/')) return match;
        
        let newContent = content;
        GITHUB_HOSTS.forEach(host => {
          const scriptLinkRegex = new RegExp(
            `(https?)://${host}(/[^"'\s<>}]+)`,
            'gi'
          );
          
          if (host === 'github.com' || host === 'www.github.com') {
            newContent = newContent.replace(scriptLinkRegex, `$1://${incomingHost}/gh$2`);
          } else {
            newContent = newContent.replace(scriptLinkRegex, `$1://${incomingHost}/gh/${host}$2`);
          }
        });
        
        // 同时处理脚本内的相对路径
        const relativeInScript = /(:"?)(\/[^"'{},:\s]+)("?:)/gi;
        newContent = newContent.replace(relativeInScript, `$1https://${incomingHost}/gh$2$3`);
        
        return openingTag + newContent + closingTag;
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
