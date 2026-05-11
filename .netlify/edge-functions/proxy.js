export default async (request, context) => {
  const url = new URL(request.url);
  const path = url.pathname;

  let targetOrigin = "";
  let newPathname = path;

  // --- 自动化分流逻辑 ---
  if (path.startsWith("/api/deepseek")) {
    // 转发 DeepSeek API
    targetOrigin = "https://api.deepseek.com";
    newPathname = path.replace("/api/deepseek", "");
  } 
  else if (path.startsWith("/std-gen")) {
    // 转发图片生成接口 (配合你的卡片使用)
    targetOrigin = "https://std.loliyc.com";
    newPathname = path.replace("/std-gen", "");
  }
  else if (path.startsWith("/x666")) {
    // 转发 x666.me
    targetOrigin = "https://x666.me";
    newPathname = path.replace("/x666", "");
  } 
  else {
    // 默认显示 loliyc.com
    targetOrigin = "https://www.loliyc.com";
  }

  const targetUrl = new URL(newPathname + url.search, targetOrigin);

  // 构造请求头，伪装身份
  const newHeaders = new Headers(request.headers);
  newHeaders.set("Host", targetUrl.hostname);
  newHeaders.set("Referer", targetOrigin + "/");

  try {
    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: newHeaders,
      body: request.body,
      redirect: "manual"
    });

    const responseHeaders = new Headers(response.headers);
    // 允许所有人调用 (CORS)
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    
    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });
  } catch (e) {
    return new Response("代理请求失败", { status: 500 });
  }
};
