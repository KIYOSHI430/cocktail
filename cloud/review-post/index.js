/**
 * 云函数：帖子 AI 审核（腾讯云开发 CloudBase / 任意 Node 环境都能跑）
 *
 * 作用：网页把帖子标题+正文发到这里，这里去调大模型，返回风险分。
 *      API Key 存在云函数的「环境变量」里，永远不会出现在网页代码中。
 *
 * 支持的模型（都是 OpenAI 兼容接口，换环境变量即可切换）：
 *   腾讯混元（默认）： AI_BASE_URL=https://api.hunyuan.cloud.tencent.com/v1  AI_MODEL=hunyuan-lite
 *   豆包 / 火山方舟：  AI_BASE_URL=https://ark.cn-beijing.volces.com/api/v3  AI_MODEL=doubao-lite-32k
 *   智谱 GLM：         AI_BASE_URL=https://open.bigmodel.cn/api/paas/v4      AI_MODEL=glm-4-flash
 *   DeepSeek：         AI_BASE_URL=https://api.deepseek.com                 AI_MODEL=deepseek-chat
 *
 * 需要配置的环境变量：
 *   AI_API_KEY   必填，模型服务的 Key（各平台控制台里创建）
 *   AI_BASE_URL  选填，默认腾讯混元
 *   AI_MODEL     选填，默认 hunyuan-lite
 *   AI_SYSTEM_PROMPT  选填，想改判罚标准时用来覆盖默认规则
 *
 * 返回：{ risk: 0-100, reasons: ["..."], model: "..." }
 */

const https = require("https");

const API_KEY = process.env.AI_API_KEY || "";
const BASE_URL = process.env.AI_BASE_URL || "https://api.hunyuan.cloud.tencent.com/v1";
const MODEL = process.env.AI_MODEL || "hunyuan-lite";

const DEFAULT_RULES = [
  "你是中文调酒社区「鸡尾酒法典」的内容审核员，只按下面 5 条规则判断，不要自己加别的标准。",
  "【规则】",
  "1. 广告：卖货、代购、招商、代理、微商，留微信/QQ/电话/群号，拉群、扫码、推广链接 → 风险 80-100",
  "2. 色情：色情、擦边、低俗、约炮、援交、性暗示 → 风险 80-100",
  "3. 暴力：打架斗殴、伤害他人、恐吓威胁、毒品枪支等违禁品 → 风险 80-100",
  "4. 辱骂：脏话、人身攻击、地域歧视、嘲讽侮辱他人 → 风险 60-79",
  "5. 灌水：与调酒完全无关的刷屏、无意义重复、只发几个字或纯表情 → 风险 30-49",
  "【不算违规】正常的求助、问配方、分享心得、聊器材、晒作品、吐槽某杯酒难喝、讨论价格，都给 0-19。",
  "只输出一个 JSON，不要任何多余文字，格式：",
  '{"risk": 数字, "reasons": ["简短中文理由", "可多条"]}'
].join("\n");

const SYSTEM_PROMPT = process.env.AI_SYSTEM_PROMPT || DEFAULT_RULES;

function callModel(title, content, category) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL.replace(/\/$/, "") + "/chat/completions");
    const payload = JSON.stringify({
      model: MODEL,
      temperature: 0,
      max_tokens: 200,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: "分类：" + (category || "未填") + "\n标题：" + title + "\n正文：" + content }
      ]
    });

    const req = https.request({
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + API_KEY,
        "Content-Length": Buffer.byteLength(payload)
      },
      timeout: 15000
    }, (res) => {
      let raw = "";
      res.on("data", (c) => { raw += c; });
      res.on("end", () => {
        if (res.statusCode < 200 || res.statusCode >= 300) {
          return reject(new Error("模型接口返回 " + res.statusCode + "：" + raw.slice(0, 200)));
        }
        try {
          const data = JSON.parse(raw);
          const text = (data.choices && data.choices[0] && data.choices[0].message &&
            data.choices[0].message.content) || "";
          resolve(text);
        } catch (e) {
          reject(new Error("模型返回的不是 JSON：" + raw.slice(0, 200)));
        }
      });
    });

    req.on("timeout", () => { req.destroy(new Error("模型接口超时")); });
    req.on("error", reject);
    req.write(payload);
    req.end();
  });
}

/** 模型有时候会把 JSON 包在 ```json 里，这里做一次容错提取 */
function parseRisk(text) {
  const cleaned = String(text).replace(/```json|```/g, "").trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("没能从模型回复里解析出 JSON");
  const obj = JSON.parse(match[0]);
  const risk = Math.max(0, Math.min(100, Math.round(Number(obj.risk) || 0)));
  const reasons = Array.isArray(obj.reasons) ? obj.reasons.slice(0, 3).map(String) : [];
  return { risk, reasons };
}

exports.main = async (event) => {
  // 云函数 HTTP 访问时，参数可能在 body、queryStringParameters 或 event 本身
  let body = event || {};
  if (typeof body === "string") {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  if (body.body) {
    try { body = typeof body.body === "string" ? JSON.parse(body.body) : body.body; } catch (e) { /* 忽略 */ }
  }

  const title = String(body.title || "").slice(0, 200);
  const content = String(body.content || "").slice(0, 3000);
  const category = String(body.category || "");

  if (!API_KEY) {
    return { risk: 40, reasons: ["云函数没配 AI_API_KEY，转人工审核"], model: "none" };
  }
  if (!title && !content) {
    return { risk: 100, reasons: ["内容为空"], model: MODEL };
  }

  try {
    const text = await callModel(title, content, category);
    const result = parseRisk(text);
    return { risk: result.risk, reasons: result.reasons, model: MODEL };
  } catch (e) {
    // 模型挂了不要卡住用户：给一个中间分，交给人工复核
    return { risk: 40, reasons: ["AI 审核失败（" + e.message + "），转人工"], model: MODEL };
  }
};
