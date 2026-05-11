export default async (request, context) => {
  const url = new URL(request.url);

  // --- 测试：访问 你的域名/check-proxy 应该看到 OK ---
  if (url.pathname === "/check-proxy") {
    return new Response("Proxy is Running!", { status: 200 });
  }

  // 路由定义
  const targetMap = {
    "/api/deepseek": "https://api.deepseek.com",
    "/std-gen": "https://std.loliyc.com",
    "/x666": "https://x666.me"
  };

  let targetOrigin = "https://www.loliyc.com";
  let newPathname = url.pathname;

  // 匹配前缀
  for (const [prefix, target] of Object.entries(targetMap)) {
    if (url.pathname.startsWith(prefix)) {
      targetOrigin = target;
      newPathname = url.pathname.replace(prefix, "") || "/";
      break;
    }
  }

  try {
    const targetUrl = new URL(newPathname + url.search, targetOrigin);
    
    // 构造请求头
    const headers = new Headers(request.headers);
    headers.set("Host", targetUrl.hostname);
    headers.set("Referer", targetOrigin);
    // 强制模拟浏览器，防止被 WAF 拦截返回 404
    headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36");

    const res = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: headers,
      body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
      redirect: "manual"
    });

    // 注入跨域头
    const newResHeaders = new Headers(res.headers);
    newResHeaders.set("Access-Control-Allow-Origin", "*");

    return new Response(res.body, {
      status: res.status,
      headers: newResHeaders
    });
  } catch (err) {
    return new Response(`Proxy Error: ${err.message}`, { status: 500 });
  }
};

export const config = {
  path: "/*"
};export default async (request, context) => {
  const url = new URL(request.url);
  
  // 1. 路由映射表
  const routes = {
    "/api/deepseek": "https://api.deepseek.com",
    "/std-gen": "https://std.loliyc.com",
    "/x666": "https://x666.me"
  };

  let targetOrigin = "https://www.loliyc.com"; // 默认站点
  let newPathname = url.pathname;

  for (const [prefix, target] of Object.entries(routes)) {
    if (url.pathname.startsWith(prefix)) {
      targetOrigin = target;
      newPathname = url.pathname.replace(prefix, "") || "/";
      break;
    }
  }

  const targetUrl = new URL(newPathname + url.search, targetOrigin);

  // 2. 构造极其逼真的请求头
  const newHeaders = new Headers(request.headers);
  newHeaders.set("Host", targetUrl.hostname);
  newHeaders.set("Referer", targetOrigin + "/");
  newHeaders.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
  
  // 3. 避免压缩导致的读取问题
  newHeaders.delete("Accept-Encoding"); 

  try {
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: newHeaders,
      body: ["GET", "HEAD"].includes(request.method) ? null : request.body,
      redirect: "manual"
    });

    // 4. 处理重定向
    if ([301, 302].includes(response.status)) {
      const location = response.headers.get("location");
      if (location) {
        const redirUrl = new URL(location, targetOrigin);
        // 如果重定向还在原站范围内，改写回反代域名
        if (redirUrl.hostname === targetUrl.hostname) {
          return Response.redirect(url.origin + (url.pathname.startsWith("/x666") ? "/x666" : "") + redirUrl.pathname + redirUrl.search, response.status);
        }
      }
    }

    return response;
  } catch (e) {
    return new Response(`反代请求失败: ${e.message}`, { status: 500 });
  }
};
