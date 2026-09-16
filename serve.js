/* 本机小服务器：方便用手机在同一局域网里预览，也可以直接用 `node serve.js` 打开网站。
   用法：在本文件夹执行  node serve.js  ，然后浏览器打开提示的地址。*/

var http = require("http");
var fs = require("fs");
var path = require("path");
var os = require("os");

var ROOT = __dirname;
var PORT = 5173;

var MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon"
};

var server = http.createServer(function (req, res) {
  var urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  var filePath = path.join(ROOT, urlPath);

  // 防止跳出目录
  if (filePath.indexOf(ROOT) !== 0) {
    res.writeHead(403); res.end("Forbidden"); return;
  }

  fs.readFile(filePath, function (err, data) {
    if (err) { res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" }); res.end("找不到文件：" + urlPath); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath).toLowerCase()] || "application/octet-stream" });
    res.end(data);
  });
});

server.listen(PORT, function () {
  var ips = [];
  var ifaces = os.networkInterfaces();
  Object.keys(ifaces).forEach(function (name) {
    ifaces[name].forEach(function (i) {
      if (i.family === "IPv4" && !i.internal) ips.push(i.address);
    });
  });
  console.log("服务已启动：");
  console.log("  本机访问：http://localhost:" + PORT + "/");
  ips.forEach(function (ip) { console.log("  手机访问：http://" + ip + ":" + PORT + "/  （需与电脑同一 WiFi）"); });
  console.log("按 Ctrl + C 停止。");
});
