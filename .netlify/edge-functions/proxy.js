export default async (request, context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  let targetOrigin = "";
  let newPathname = path;

  // --- 路由分流逻辑 ---
  
  if (path.startsWith("/api/deepseek")) {
    // 1. DeepSeek API
    // 映射关系: /api/deepseek/v1/chat/completions -> api.deepseek.com/v1/chat/completions
    targetOrigin = "https://api.deepseek.com";
    newPathname = path.replace("/api/deepseek", ""); 
  } 
  else if (path.startsWith("/x666")) {
    // 2. x666.me
    // 映射关系: 你的域名/x666 -> x666.me/
    targetOrigin = "https://x666.me";
    newPathname = path.replace("/x666", "");
    // 如果访问的是 /x666 后面没带斜杠，补上斜杠防止原站跳转
    if (newPathname === "") newPathname = "/";
  } 
  else {
    // 3. 默认站点: loliyc.com
    targetOrigin = "https://www.loliyc.com";
  }

  // 构建最终请求的目标 URL
  const targetUrl = new URL(newPathname + url.search, targetOrigin);

  // --- 请求头构造 ---
  const newHeaders = new Headers(request.headers);
  
  // 必须重置 Host，否则会被目标服务器拒绝访问（尤其是开启了防护的站点）
  newHeaders.set("Host", targetUrl.hostname);
  newHeaders.set("Referer", targetOrigin + "/");
  
  // 确保 Origin 正确，避免 API 请求被拦截
  if (request.headers.has("Origin")) {
    newHeaders.set("Origin", targetOrigin);
  }

  try {
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      redirect: "manual" // 手动处理重定向，防止跳回原站域名
    });

    // --- 响应处理 ---
    const responseHeaders = new Headers(response.headers);
    
    // 注入 CORS 头，方便前端直接调用 DeepSeek
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "*");

    // 移除干扰的安全策略头，防止在反代域名下无法加载资源
    responseHeaders.delete("content-security-policy");
    responseHeaders.delete("x-frame-options");

    // 处理重定向 (301/302)
    if ([301, 302, 307, 308].includes(response.status)) {
      const location = responseHeaders.get("location");
      if (location) {
        // 如果原站想跳回自己的域名，强行拦截并换成我们的反代域名
        const redirectUrl = new URL(location);
        if (redirectUrl.hostname === targetUrl.hostname) {
          redirectUrl.hostname = url.hostname;
          redirectUrl.protocol = url.protocol;
          responseHeaders.set("location", redirectUrl.toString());
        }
      }
    }

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });

  } catch (error) {
    return new Response(`Proxy Error: ${error.message}`, { status: 502 });
  }
};

export const config = {
  path: "/*",
};
