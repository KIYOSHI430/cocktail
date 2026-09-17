/**
 * 云函数：鸡尾酒法典 · 数据接口（CloudBase rdb / PostgreSQL 版）
 *
 * 数据库访问方式来自云开发控制台「接入指引 → 后端框架 → PostgreSQL 数据库」：
 *     const { data, error } = await cloudbase.rdb().from("表名").select("*").limit(10);
 *
 * 设计思路（决定了前端几乎不用改）：
 *   1. 前端打开页面时调一次 `bootstrap`，把「材料 + 配方 + 帖子 + 评论 + 设置 + 当前用户」整包拉下来
 *   2. 之后界面的读操作都在内存里进行（原来的同步代码照旧跑）
 *   3. 所有写操作都调这个云函数，服务端校验身份、写数据库，返回最新数据让前端覆盖内存
 *
 * 安全要点：
 *   - 数据库对公网关闭，只由云函数在环境内访问
 *   - 密码用 Node 自带的 scrypt 加盐哈希，明文不落库
 *   - 登录签发 token，存在 sessions 表，30 天有效
 */

const cloudbaseSDK = require("@cloudbase/node-sdk");
const crypto = require("crypto");

/* 云函数里会自动注入环境凭据，通常不用另外配；
   如果你在本地跑，就在环境变量里提供 CLOUDBASE_ENV_ID / CLOUDBASE_SECRETID / CLOUDBASE_SECRETKEY */
const ENV_ID = process.env.CLOUDBASE_ENV_ID ||
               process.env.TCB_ENV ||
               process.env.SCF_NAMESPACE ||
               cloudbaseSDK.SYMBOL_CURRENT_ENV;

/* 初始化失败不要让整个函数崩掉：记下原因，之后每个请求都返回可读的错误信息，
   这样在控制台里一眼就能看出问题（而不是看到一堆红色堆栈）。 */
let app = null;
let initError = "";
try {
  const initOptions = { env: ENV_ID };
  if (process.env.CLOUDBASE_SECRETID && process.env.CLOUDBASE_SECRETKEY) {
    initOptions.secretId = process.env.CLOUDBASE_SECRETID;
    initOptions.secretKey = process.env.CLOUDBASE_SECRETKEY;
  }
  app = cloudbaseSDK.init(initOptions);
} catch (e) {
  initError = e.message || String(e);
  console.error("[api] 云开发 SDK 初始化失败：", initError);
}

/* 注意：如果你不传 database，SDK 会拿**环境 ID** 当 schema 名发给 PostgREST，
   于是报 "Invalid schema: <环境ID>"。云开发 SQL 数据库的表都在 public 这个 schema 里，
   所以这里必须显式指定 database: "public"。 */
const RDB_SCHEMA = process.env.RDB_SCHEMA || "public";

function rdb() {
  if (!app) throw new Error("云开发 SDK 未就绪（" + (initError || "缺少环境信息") + "）");
  return app.rdb({ instance: "default", database: RDB_SCHEMA });
}

const SESSION_DAYS = 30;

/* 兜底：SDK 在初始化或请求异常时可能抛出未捕获的 Promise 异常。
   云函数里"崩掉"意味着整个服务不可用，所以这里统一捕获、只记日志，
   让请求仍能返回一个可读的错误信息（而不是控制台里一堆红色堆栈）。 */
process.on("unhandledRejection", function (e) {
  console.error("[api] 未处理的 Promise 异常：", (e && e.message) || e);
});
process.on("uncaughtException", function (e) {
  console.error("[api] 未捕获异常：", (e && e.message) || e);
});

/* ---------------- 数据库小工具（把 rdb() 的链式调用包一下） ---------------- */

function toError(error) {
  if (!error) return null;
  return new Error(error.message || error.error || JSON.stringify(error));
}

function applyFilters(query, filters) {
  (filters || []).forEach(function (f) {
    if (f.op === "in") query = query.in(f.col, f.val);
    else if (f.op === "neq") query = query.neq(f.col, f.val);
    else if (f.op === "gt") query = query.gt(f.col, f.val);
    else query = query.eq(f.col, f.val);
  });
  return query;
}

/** 查询多行 */
async function dbSelect(table, filters, options) {
  options = options || {};
  let query = rdb().from(table).select("*");
  query = applyFilters(query, filters);
  if (options.order) query = query.order(options.order, { ascending: options.asc !== false });
  if (options.limit) query = query.limit(options.limit);
  const { data, error } = await query;
  if (error) throw toError(error);
  return data || [];
}

/** 查询一行 */
async function dbSelectOne(table, filters) {
  const rows = await dbSelect(table, filters, { limit: 1 });
  return rows[0] || null;
}

/** 插入一行 */
async function dbInsert(table, row) {
  const { error } = await rdb().from(table).insert([row]);
  if (error) throw toError(error);
  return row;
}

/** 更新（按 id） */
async function dbUpdate(table, id, patch) {
  const { error } = await rdb().from(table).update(patch).eq("id", id);
  if (error) throw toError(error);
}

/** 删除（按 id） */
async function dbDelete(table, id) {
  const { error } = await rdb().from(table).delete().eq("id", id);
  if (error) throw toError(error);
}

function ok(data) { return { ok: true, data: data }; }
function fail(msg) { return { ok: false, msg: msg }; }
function newId(prefix) {
  return prefix + "-" + Date.now().toString(36) + crypto.randomBytes(3).toString("hex");
}

/* ---------------- 密码与会话 ---------------- */

function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  return { salt: s, hash: crypto.scryptSync(String(password), s, 64).toString("hex") };
}
function checkPassword(user, password) {
  if (!user || !user.hash || !user.salt) return false;
  const h = crypto.scryptSync(String(password), user.salt, 64).toString("hex");
  return h.length === String(user.hash).length &&
    crypto.timingSafeEqual(Buffer.from(h), Buffer.from(String(user.hash)));
}

/* ---------------- 邮箱与验证码 ---------------- */

const EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
const CODE_TTL_MS = 10 * 60 * 1000;    // 验证码 10 分钟有效
const CODE_GAP_MS = 60 * 1000;         // 同一邮箱 60 秒内只能发一次

function normEmail(v) { return String(v || "").trim().toLowerCase(); }

/** 3246***@qq.com，展示用 */
function maskEmail(email) {
  const e = String(email || "");
  const at = e.indexOf("@");
  if (at <= 0) return e;
  const name = e.slice(0, at);
  return name.slice(0, Math.min(3, name.length)) + "***" + e.slice(at);
}

/** 数据库列不存在时给出人话提示（通常是升级 SQL 还没执行） */
function friendlyDbError(e) {
  const msg = String((e && e.message) || e || "");
  if (/column .*email.* does not exist/i.test(msg)) {
    return "数据库还没有 email 字段：请在云开发控制台执行升级 SQL（见 docs/邮箱验证码指南.md）";
  }
  if (/relation .*verify_codes.* does not exist/i.test(msg)) {
    return "数据库还没有验证码表：请在云开发控制台执行升级 SQL（见 docs/邮箱验证码指南.md）";
  }
  return msg;
}

/**
 * 自带的极简 SMTP 发信（QQ 邮箱 465 端口，隐式 TLS）。
 * 不依赖第三方包，避免云函数装依赖出问题。
 * 需要在云函数「环境变量」里配置：SMTP_USER / SMTP_PASS（QQ 邮箱授权码）。
 */
function smtpSend(to, subject, text) {
  return new Promise(function (resolve) {
    const host = process.env.SMTP_HOST || "smtp.qq.com";
    const port = Number(process.env.SMTP_PORT || 465);
    const user = String(process.env.SMTP_USER || "").trim();
    const pass = String(process.env.SMTP_PASS || "").trim();
    if (!user || !pass) return resolve({ ok: false, error: "未配置 SMTP_USER / SMTP_PASS" });

    const tls = require("tls");
    let finished = false;
    let socket = null;
    function finish(r) {
      if (finished) return;
      finished = true;
      try { if (socket) socket.destroy(); } catch (e) { /* 忽略 */ }
      resolve(r);
    }

    try {
      socket = tls.connect({ host: host, port: port, servername: host });
    } catch (e) {
      return finish({ ok: false, error: "SMTP 连接失败：" + e.message });
    }
    socket.setTimeout(20000, function () { finish({ ok: false, error: "SMTP 超时" }); });
    socket.on("error", function (e) { finish({ ok: false, error: "SMTP 出错：" + e.message }); });

    const body =
      "From: =?UTF-8?B?" + Buffer.from("鸡尾酒法典").toString("base64") + "?= <" + user + ">\r\n" +
      "To: <" + to + ">\r\n" +
      "Subject: =?UTF-8?B?" + Buffer.from(subject).toString("base64") + "?=\r\n" +
      "MIME-Version: 1.0\r\n" +
      "Content-Type: text/plain; charset=UTF-8\r\n" +
      "Content-Transfer-Encoding: base64\r\n\r\n" +
      Buffer.from(text, "utf8").toString("base64").replace(/(.{76})/g, "$1\r\n") +
      "\r\n.";

    const steps = [
      { cmd: "EHLO cocktail.local", ok: [250] },
      { cmd: "AUTH LOGIN", ok: [334] },
      { cmd: Buffer.from(user).toString("base64"), ok: [334] },
      { cmd: Buffer.from(pass).toString("base64"), ok: [235] },
      { cmd: "MAIL FROM:<" + user + ">", ok: [250] },
      { cmd: "RCPT TO:<" + to + ">", ok: [250, 251] },
      { cmd: "DATA", ok: [354] },
      { cmd: body, ok: [250] },
      { cmd: "QUIT", ok: [221], last: true }
    ];
    let step = 0;        // 已经发出去的命令条数
    let greeted = false; // 服务器开机问候（220）只处理一次
    let buf = "";

    function sendNext() {
      const next = steps[step++];
      try { socket.write(next.cmd + "\r\n"); }
      catch (e) { finish({ ok: false, error: "SMTP 写入失败：" + e.message }); }
    }

    function pump(line) {
      const code = Number(line.slice(0, 3));
      if (!greeted) {
        greeted = true;
        if (code !== 220) return finish({ ok: false, error: "SMTP 欢迎语异常：" + line.slice(0, 120) });
        return sendNext();
      }
      const expect = steps[step - 1];
      if (!expect || expect.ok.indexOf(code) < 0) {
        return finish({ ok: false, error: "SMTP 第 " + step + " 步返回 " + line.slice(0, 120) });
      }
      if (expect.last) return finish({ ok: true });
      sendNext();
    }

    socket.on("data", function (chunk) {
      buf += chunk.toString("utf8");
      let idx;
      // 完整的一行回复形如 "250 xxx"（多行回复是 "250-xxx"，要等最后一行）
      while ((idx = buf.indexOf("\r\n")) >= 0) {
        const line = buf.slice(0, idx);
        buf = buf.slice(idx + 2);
        if (/^\d{3}[ ]/.test(line)) pump(line);
      }
    });
  });
}

async function sendVerifyMail(to, code, purpose) {
  const title = purpose === "reset" ? "重置密码验证码" : "注册验证码";
  return smtpSend(
    to,
    "【鸡尾酒法典】" + title + "：" + code,
    "你的" + title + "是 " + code + "\n\n" +
    "10 分钟内有效，请勿把验证码告诉任何人。\n" +
    "如果这不是你本人的操作，忽略这封邮件即可。\n\n" +
    "—— 鸡尾酒法典"
  );
}

async function createSession(userId) {
  const token = crypto.randomBytes(24).toString("hex");
  await dbInsert("sessions", { token: token, user_id: userId, expires_at: Date.now() + SESSION_DAYS * 86400000 });
  return token;
}

async function userByToken(token) {
  if (!token) return null;
  const s = await dbSelectOne("sessions", [{ col: "token", val: token }]);
  if (!s || Number(s.expires_at) < Date.now()) return null;
  return dbSelectOne("users", [{ col: "id", val: s.user_id }]);
}

function publicUser(u) {
  if (!u) return null;
  return {
    id: u.id, email: u.email || "", phone: u.phone || "",
    emailMasked: maskEmail(u.email),
    phoneMasked: u.phone ? u.phone.slice(0, 3) + "****" + u.phone.slice(7) : "",
    username: u.username, nickname: u.nickname || u.username, role: u.role || "user",
    intro: u.intro || "", createdAt: u.created_at,
    favorites: u.favorites || [], postFavorites: u.post_favorites || [], myIngredients: u.my_ingredients || []
  };
}

/* ---------------- 行 → 前端数据结构 ---------------- */

function rowIngredient(r) {
  return {
    id: r.id, name: r.name, cat: r.cat, emoji: r.emoji, aka: r.aka, alias: r.alias,
    basic: r.is_basic, py: r.py, initial: r.initial
  };
}
function rowRecipe(r) {
  return {
    id: r.id, name: r.name, en: r.en, alias: r.alias, type: r.type, emoji: r.emoji, color: r.color,
    glass: r.glass, abv: r.abv, desc: r.desc, image: r.image, video: r.video, videoName: r.video_name,
    tags: r.tags || [], ingredients: r.items || [], steps: r.steps || [],
    py: r.py, initial: r.initial, authorId: r.author_id, author: r.author,
    status: r.status, views: r.views, createdAt: r.created_at
  };
}
function rowComment(r) {
  return {
    id: r.id, recipeId: r.target_id, targetType: r.target_type, targetId: r.target_id,
    userId: r.user_id, username: r.username, nickname: r.nickname, content: r.content,
    parentId: r.parent_id, likes: r.likes || [], pinned: r.pinned, hidden: r.hidden,
    createdAt: r.created_at
  };
}
function rowPost(r) {
  return {
    id: r.id, title: r.title, content: r.content, images: r.images || [], category: r.category,
    recipeTags: r.recipe_tags || [], authorId: r.author_id, username: r.username, nickname: r.nickname,
    status: r.status, review: r.review || {}, rejectReason: r.reject_reason,
    likes: r.likes || [], views: r.views, comments: r.comments || [], createdAt: r.created_at
  };
}

/* ---------------- 整包数据 ---------------- */

async function getSettings() {
  const row = await dbSelectOne("settings", [{ col: "id", val: "site" }]);
  return (row && row.data) || {};
}

async function bootstrap(token) {
  const [ingredients, recipes, posts, comments, settings, user] = await Promise.all([
    dbSelect("ingredients", [], { order: "py" }),
    dbSelect("recipes", [], { order: "created_at", asc: false, limit: 2000 }),
    dbSelect("posts", [], { order: "created_at", asc: false, limit: 1000 }),
    dbSelect("comments", [], { order: "created_at", asc: false, limit: 3000 }),
    getSettings(),
    userByToken(token)
  ]);
  // 管理员登录时，顺便把用户列表也带上（后台用户管理要用）
  let users = [];
  if (user && user.role === "admin") {
    const rows = await dbSelect("users", [], {});
    users = rows.map(function (u) {
      return {
        id: u.id, username: u.username, email: u.email || "", phone: u.phone || "", nickname: u.nickname,
        role: u.role, intro: u.intro, createdAt: u.created_at
      };
    });
  }
  return ok({
    ingredients: ingredients.map(rowIngredient),
    recipes: recipes.map(rowRecipe),
    posts: posts.map(rowPost),
    comments: comments.map(rowComment),
    settings: settings,
    user: publicUser(user),
    users: users,
    serverTime: Date.now()
  });
}

/* ---------------- 账号 ---------------- */

/** 生成并保存一个验证码；发信失败时把验证码原样返回（演示模式） */
async function sendCode(payload) {
  const email = normEmail(payload.email);
  const purpose = payload.purpose === "reset" ? "reset" : "register";
  if (!EMAIL_RE.test(email)) return fail("请输入正确的邮箱地址");

  try {
    if (purpose === "register") {
      const exists = await dbSelectOne("users", [{ col: "email", val: email }]);
      if (exists) return fail("这个邮箱已经注册过了，直接登录就行");
    }

    const rows = await dbSelect("verify_codes", [{ col: "target", val: email }], { order: "created_at", asc: false, limit: 1 });
    const last = rows[0];
    if (last && Date.now() - new Date(last.created_at).getTime() < CODE_GAP_MS) {
      return fail("验证码刚发过，请 60 秒后再试");
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    await dbInsert("verify_codes", {
      id: newId("vc"), target: email, code: code, purpose: purpose,
      expires_at: Date.now() + CODE_TTL_MS, created_at: new Date().toISOString()
    });

    const mail = await sendVerifyMail(email, code, purpose);
    if (mail.ok) {
      return ok({ sent: true, mode: "smtp", msg: "验证码已发送到 " + maskEmail(email) + "，10 分钟内有效" });
    }
    // 还没配 SMTP：走演示模式，把验证码返回给页面显示出来，方便先跑通流程
    return ok({
      sent: true, mode: "demo", code: code,
      mailError: mail.error,
      msg: "验证码（演示模式）：" + code
    });
  } catch (e) {
    return fail("发送验证码失败：" + friendlyDbError(e));
  }
}

/** 校验并作废一个验证码 */
async function consumeCode(email, code, purpose) {
  const target = normEmail(email);
  code = String(code || "").trim();
  if (!/^\d{6}$/.test(code)) return { ok: false, msg: "请输入 6 位数字验证码" };
  const rows = await dbSelect("verify_codes", [{ col: "target", val: target }, { col: "code", val: code }],
    { order: "created_at", asc: false, limit: 1 });
  const rec = rows[0];
  if (!rec) return { ok: false, msg: "验证码不正确，请重新获取" };
  if (Number(rec.expires_at) < Date.now()) return { ok: false, msg: "验证码已过期，请重新获取" };
  try { await dbDelete("verify_codes", rec.id); } catch (e) { /* 删不掉也不影响注册 */ }
  return { ok: true, purpose: rec.purpose };
}

async function register(payload) {
  const nickname = String(payload.nickname || "").trim();
  const email = normEmail(payload.email);
  const phone = String(payload.phone || "").trim();
  const password = String(payload.password || "");
  if (nickname.length < 2 || nickname.length > 12) return fail("昵称需要 2-12 个字");
  if (!EMAIL_RE.test(email)) return fail("请输入正确的邮箱地址");
  if (password.length < 6) return fail("密码至少 6 位");
  if (payload.confirm !== undefined && password !== String(payload.confirm)) return fail("两次输入的密码不一致");

  let codeResult;
  try {
    codeResult = await consumeCode(email, payload.code, "register");
  } catch (e) {
    return fail("验证失败：" + friendlyDbError(e));
  }
  if (!codeResult.ok) return fail(codeResult.msg);

  try {
    const exists = await dbSelectOne("users", [{ col: "email", val: email }]);
    if (exists) return fail("这个邮箱已经注册过了，直接登录就行");

    const ph = hashPassword(password);
    const id = newId("u");
    await dbInsert("users", {
      id: id, email: email, phone: phone, username: email, nickname: nickname,
      salt: ph.salt, hash: ph.hash, role: "user", intro: "",
      favorites: [], post_favorites: [], my_ingredients: [],
      created_at: new Date().toISOString()
    });
    const newToken = await createSession(id);
    const user = await dbSelectOne("users", [{ col: "id", val: id }]);
    return ok({ token: newToken, user: publicUser(user) });
  } catch (e) {
    return fail("注册失败：" + friendlyDbError(e));
  }
}

async function login(payload) {
  const account = String(payload.account || "").trim();
  const lower = account.toLowerCase();
  const password = String(payload.password || "");
  const isEmail = account.indexOf("@") >= 0;
  const isPhone = /^1[3-9]\d{9}$/.test(account);
  let user = null;
  try {
    if (isEmail) user = await dbSelectOne("users", [{ col: "email", val: lower }]);
    if (!user && isPhone) user = await dbSelectOne("users", [{ col: "phone", val: account }]);
    if (!user) user = await dbSelectOne("users", [{ col: "username", val: account }]);
    if (!user && isEmail) user = await dbSelectOne("users", [{ col: "username", val: lower }]);
  } catch (e) {
    return fail("登录失败：" + friendlyDbError(e));
  }
  if (!user || !checkPassword(user, password)) {
    return fail(isEmail ? "邮箱或密码不正确" : (isPhone ? "手机号或密码不正确" : "账号或密码不正确"));
  }
  const token = await createSession(user.id);
  return ok({ token: token, user: publicUser(user) });
}

async function changePassword(payload, token, me) {
  if (!me) return fail("请先登录");
  if (!checkPassword(me, payload.oldPwd)) return fail("当前密码不正确");
  const np = String(payload.newPwd || "");
  if (np.length < 6) return fail("新密码至少 6 位");
  if (np !== String(payload.confirmPwd || np)) return fail("两次输入的新密码不一致");
  const ph = hashPassword(np);
  await dbUpdate("users", me.id, { salt: ph.salt, hash: ph.hash });
  return ok({ changed: true });
}

async function updateProfile(payload, token, me) {
  if (!me) return fail("请先登录");
  const patch = {};
  if (payload.nickname !== undefined) patch.nickname = String(payload.nickname).slice(0, 12);
  if (payload.intro !== undefined) patch.intro = String(payload.intro).slice(0, 100);
  if (payload.favorites) patch.favorites = payload.favorites;
  if (payload.postFavorites) patch.post_favorites = payload.postFavorites;
  if (payload.myIngredients) patch.my_ingredients = payload.myIngredients;
  if (!Object.keys(patch).length) return ok({ updated: false });
  await dbUpdate("users", me.id, patch);
  const user = await dbSelectOne("users", [{ col: "id", val: me.id }]);
  return ok({ user: publicUser(user) });
}

async function toggleFavorite(payload, token, me) {
  if (!me) return fail("登录后才能收藏");
  const isPost = payload.kind === "post";
  const list = (isPost ? (me.post_favorites || []) : (me.favorites || [])).slice();
  const idx = list.indexOf(payload.id);
  if (idx >= 0) list.splice(idx, 1); else list.push(payload.id);
  const patch = {};
  patch[isPost ? "post_favorites" : "favorites"] = list;
  await dbUpdate("users", me.id, patch);
  return ok({ faved: idx < 0, list: list });
}

/* ---------------- 帖子 ---------------- */

const RULES = [
  { re: /(微信|weixin|wechat|vx|加我|私聊|私我)/i, score: 40, reason: "疑似引流（提到微信/私聊）" },
  { re: /(加群|拉群|进群|群号|扫码|二维码)/, score: 40, reason: "疑似引流（拉群/扫码）" },
  { re: /1[3-9]\d{9}/, score: 50, reason: "疑似手机号" },
  { re: /(https?:\/\/|www\.)/i, score: 25, reason: "包含外部链接" },
  { re: /(代购|出售|购买|下单|批发|招商|代理|秒杀|特价|包邮|货源)/, score: 35, reason: "疑似广告或交易" },
  { re: /(赌博|博彩|彩票|冰毒|大麻|枪支|迷药)/, score: 80, reason: "涉及违法内容" },
  { re: /(色情|约炮|援交|裸聊)/, score: 80, reason: "涉及低俗内容" },
  { re: /(未成年|学生妹|灌醉)/, score: 60, reason: "涉及未成年人或不当内容" },
  { re: /(傻[逼比]|智障|去死|滚蛋)/, score: 30, reason: "疑似侮辱性用语" },
  { re: /(垃圾人|贱人|恶心东西)/, score: 35, reason: "疑似辱骂" }
];
function ruleReview(title, content) {
  const text = String(title || "") + "\n" + String(content || "");
  let score = 0;
  const reasons = [];
  RULES.forEach(function (r) { if (r.re.test(text)) { score += r.score; reasons.push(r.reason); } });
  if (/(.)\1{6,}/.test(text)) { score += 35; reasons.push("有大量重复字符"); }
  if (text.replace(/\s/g, "").length < 6) { score += 20; reasons.push("内容太短"); }
  return { risk: Math.min(100, score), reasons: reasons };
}
function statusByRisk(risk) {
  if (risk >= 70) return "rejected";
  if (risk >= 30) return "pending";
  return "approved";
}

async function addPost(payload, token, me) {
  if (!me) return fail("请先登录");
  const title = String(payload.title || "").trim();
  const content = String(payload.content || "").trim();
  if (title.length < 2 || title.length > 40) return fail("标题需要 2-40 个字");
  if (content.length < 5 || content.length > 2000) return fail("正文需要 5-2000 个字");

  const settings = await getSettings();
  const mode = settings.postReviewMode || "auto";
  const rule = ruleReview(title, content);
  let status = mode === "none" ? "approved" : (mode === "all" ? "pending" : statusByRisk(rule.risk));
  if (me.role === "admin") status = "approved";

  const id = newId("post");
  const doc = {
    id: id, title: title, content: content,
    images: payload.images || [], category: payload.category || "闲聊",
    recipe_tags: payload.recipeTags || [],
    author_id: me.id, username: me.username, nickname: me.nickname || me.username,
    status: status,
    review: { source: "rule", risk: rule.risk, reasons: rule.reasons, at: new Date().toISOString() },
    reject_reason: status === "rejected" ? rule.reasons.join("；") : "",
    likes: [], views: 0, comments: [],
    created_at: new Date().toISOString()
  };
  await dbInsert("posts", doc);
  return ok({ post: rowPost(doc) });
}

async function addPostComment(payload, token, me) {
  if (!me) return fail("请先登录");
  const content = String(payload.content || "").trim();
  if (!content) return fail("回复不能为空");
  if (content.length > 500) return fail("回复最多 500 字");
  const post = await dbSelectOne("posts", [{ col: "id", val: payload.postId }]);
  if (!post) return fail("帖子不存在");
  const list = (post.comments || []).slice();
  const comment = {
    id: newId("pc"), userId: me.id, username: me.username,
    nickname: me.nickname || me.username, content: content,
    likes: [], createdAt: new Date().toISOString()
  };
  list.push(comment);
  await dbUpdate("posts", payload.postId, { comments: list });
  return ok({ comment: comment });
}

/** 删帖子里的回复：本人、帖主、管理员都可以删 */
async function deletePostComment(payload, token, me) {
  if (!me) return fail("请先登录");
  const post = await dbSelectOne("posts", [{ col: "id", val: payload.postId }]);
  if (!post) return fail("帖子不存在");
  const list = (post.comments || []).slice();
  const c = list.filter(function (x) { return x.id === payload.commentId; })[0];
  if (!c) return fail("回复不存在");
  if (me.role !== "admin" && c.userId !== me.id && post.author_id !== me.id) return fail("只能删除自己的回复");
  await dbUpdate("posts", payload.postId, {
    comments: list.filter(function (x) { return x.id !== payload.commentId; })
  });
  return ok({ deleted: true });
}

async function togglePostLike(payload, token, me) {
  if (!me) return fail("登录后才能点赞");
  const post = await dbSelectOne("posts", [{ col: "id", val: payload.postId }]);
  if (!post) return fail("帖子不存在");
  const list = (post.likes || []).slice();
  const idx = list.indexOf(me.id);
  if (idx >= 0) list.splice(idx, 1); else list.push(me.id);
  await dbUpdate("posts", payload.postId, { likes: list });
  return ok({ liked: idx < 0, count: list.length });
}

async function setPostStatus(payload, token, me) {
  if (!me || me.role !== "admin") return fail("只有管理员可以审核");
  await dbUpdate("posts", payload.id, {
    status: payload.status,
    reject_reason: payload.status === "rejected" ? String(payload.reason || "管理员判定不适合发布") : "",
    reviewed_by: me.username, reviewed_at: new Date().toISOString()
  });
  return ok({ updated: true });
}

async function deletePost(payload, token, me) {
  if (!me) return fail("请先登录");
  const post = await dbSelectOne("posts", [{ col: "id", val: payload.id }]);
  if (!post) return fail("帖子不存在");
  if (me.role !== "admin" && post.author_id !== me.id) return fail("只能删除自己的帖子");
  await dbDelete("posts", payload.id);
  return ok({ deleted: true });
}

/* ---------------- 配方 / 评论 / 勘误 / 设置 ---------------- */

async function saveRecipe(payload, token, me) {
  if (!me) return fail("请先登录");
  const settings = await getSettings();
  if (me.role !== "admin" && settings.allowUserPublish === false) return fail("管理员暂时关闭了用户发布配方");
  const r = payload.recipe || {};
  if (!r.name || !String(r.name).trim()) return fail("请填写酒名");
  if (!r.items || !r.items.length) return fail("至少添加一种材料");
  if (!r.tags || !r.tags.length) return fail("至少选一个口味标签");
  const id = r.id || newId("r");
  const doc = {
    id: id, name: String(r.name).trim(), en: r.en || "", alias: "",
    type: r.type === "classic" ? "classic" : "custom",
    emoji: r.emoji || "🍹", color: r.color || "#e0a94a",
    glass: r.glass || "", abv: r.abv || "", desc: r.desc || "",
    image: r.image || "", video: r.video || "", video_name: r.videoName || "",
    tags: r.tags.slice(0, 10), items: r.items, steps: r.steps || [],
    py: r.py || "", initial: r.initial || "#",
    author_id: me.id, author: me.nickname || me.username,
    status: (settings.needReview && me.role !== "admin") ? "pending" : "approved",
    views: 0, created_at: new Date().toISOString()
  };
  const existed = await dbSelectOne("recipes", [{ col: "id", val: id }]);
  if (existed) {
    if (me.role !== "admin" && existed.author_id !== me.id) return fail("只能修改自己发布的配方");
    delete doc.id; delete doc.created_at; delete doc.views; delete doc.author_id;
    await dbUpdate("recipes", id, doc);
  } else {
    await dbInsert("recipes", doc);
  }
  const recipe = await dbSelectOne("recipes", [{ col: "id", val: id }]);
  return ok({ recipe: rowRecipe(recipe) });
}

async function deleteRecipe(payload, token, me) {
  if (!me) return fail("请先登录");
  const rec = await dbSelectOne("recipes", [{ col: "id", val: payload.id }]);
  if (!rec) return fail("配方不存在");
  if (me.role !== "admin" && rec.author_id !== me.id) return fail("只能删除自己发布的配方");
  const cs = await dbSelect("comments", [{ col: "target_id", val: payload.id }]);
  for (const c of cs) await dbDelete("comments", c.id);
  await dbDelete("recipes", payload.id);
  return ok({ deleted: true });
}

async function addComment(payload, token, me) {
  if (!me) return fail("请先登录");
  const content = String(payload.content || "").trim();
  if (!content) return fail("评论不能为空");
  if (content.length > 500) return fail("评论最多 500 字");
  const id = newId("c");
  const doc = {
    id: id, target_type: "recipe", target_id: payload.recipeId,
    user_id: me.id, username: me.username, nickname: me.nickname || me.username,
    content: content, parent_id: payload.parentId || null,
    likes: [], pinned: false, hidden: false, created_at: new Date().toISOString()
  };
  await dbInsert("comments", doc);
  return ok({ comment: rowComment(doc) });
}

async function deleteComment(payload, token, me) {
  if (!me) return fail("请先登录");
  const c = await dbSelectOne("comments", [{ col: "id", val: payload.id }]);
  if (!c) return fail("评论不存在");
  if (me.role !== "admin" && c.user_id !== me.id) return fail("只能删除自己的评论");
  const replies = await dbSelect("comments", [{ col: "parent_id", val: payload.id }]);
  for (const r of replies) await dbDelete("comments", r.id);
  await dbDelete("comments", payload.id);
  return ok({ deleted: true });
}

/** 管理员维护材料库：新增或修改（有 id 就是修改） */
async function saveIngredient(payload, token, me) {
  if (!me || me.role !== "admin") return fail("只有管理员可以维护材料库");
  const src = payload.ingredient || {};
  const name = String(src.name || "").trim();
  if (!name) return fail("请填写材料名称");
  const id = src.id || newId("ing");
  const doc = {
    id: id, name: name,
    cat: String(src.cat || "").trim() || "其他",
    emoji: src.emoji || "",
    aka: String(src.aka || "").slice(0, 80),
    alias: String(src.alias || "").slice(0, 120),
    is_basic: !!src.basic,
    py: src.py || "", initial: src.initial || "#"
  };
  const existed = await dbSelectOne("ingredients", [{ col: "id", val: id }]);
  if (existed) {
    delete doc.id;
    await dbUpdate("ingredients", id, doc);
  } else {
    await dbInsert("ingredients", doc);
  }
  const row = await dbSelectOne("ingredients", [{ col: "id", val: id }]);
  return ok({ ingredient: rowIngredient(row) });
}

/** 管理员删材料：顺手把引用它的配方也清一遍，否则刷新后又会冒出来 */
async function deleteIngredient(payload, token, me) {
  if (!me || me.role !== "admin") return fail("只有管理员可以维护材料库");
  const ing = await dbSelectOne("ingredients", [{ col: "id", val: payload.id }]);
  if (!ing) return fail("材料不存在");
  const recipes = await dbSelect("recipes", [], { limit: 2000 });
  let affected = 0;
  for (const r of recipes) {
    const items = Array.isArray(r.items) ? r.items : [];
    const next = items.filter(function (x) { return x.id !== payload.id; });
    if (next.length !== items.length) { await dbUpdate("recipes", r.id, { items: next }); affected++; }
  }
  await dbDelete("ingredients", payload.id);
  return ok({ deleted: true, affected: affected, name: ing.name });
}

/** 管理员改配方：状态 / 图片 / 视频 / 标签（视频也允许普通用户补充） */
async function updateRecipeFields(payload, token, me) {
  if (!me) return fail("请先登录");
  const rec = await dbSelectOne("recipes", [{ col: "id", val: payload.id }]);
  if (!rec) return fail("配方不存在");
  const isAdmin = me.role === "admin";
  if (!isAdmin && rec.author_id !== me.id) return fail("只能修改自己发布的配方");

  const patch = payload.patch || {};
  const doc = {};
  if (typeof patch.image === "string") {
    if (!isAdmin) return fail("只有管理员可以修改配方图片");
    doc.image = patch.image.slice(0, 400000);
  }
  if (typeof patch.video === "string") {
    const settings = await getSettings();
    if (!isAdmin && settings.allowUserVideo === false) return fail("管理员暂时关闭了用户补充视频");
    doc.video = patch.video.slice(0, 500);
    if (patch.videoName !== undefined) doc.video_name = String(patch.videoName).slice(0, 60);
  } else if (typeof patch.videoName === "string") {
    doc.video_name = patch.videoName.slice(0, 60);
  }
  if (Array.isArray(patch.tags)) doc.tags = patch.tags.slice(0, 10);
  if (typeof patch.status === "string") {
    if (!isAdmin) return fail("只有管理员可以修改配方状态");
    doc.status = patch.status;
  }
  if (!Object.keys(doc).length) return ok({ updated: false });
  await dbUpdate("recipes", payload.id, doc);
  const row = await dbSelectOne("recipes", [{ col: "id", val: payload.id }]);
  return ok({ recipe: rowRecipe(row) });
}

/** 管理员管理用户：改昵称 / 简介 / 邮箱 / 角色 / 重置密码 */
async function saveUser(payload, token, me) {
  if (!me || me.role !== "admin") return fail("只有管理员可以管理用户");
  const id = payload.id;
  const patch = payload.patch || {};
  const target = await dbSelectOne("users", [{ col: "id", val: id }]);
  if (!target) return fail("用户不存在");

  const doc = {};
  if (patch.nickname !== undefined) doc.nickname = String(patch.nickname).slice(0, 12);
  if (patch.intro !== undefined) doc.intro = String(patch.intro).slice(0, 100);
  if (patch.email !== undefined) {
    const email = normEmail(patch.email);
    if (!EMAIL_RE.test(email)) return fail("邮箱格式不正确");
    const other = await dbSelectOne("users", [{ col: "email", val: email }]);
    if (other && other.id !== id) return fail("这个邮箱已经被别的账号用了");
    doc.email = email;
    doc.username = email;
  }
  if (patch.role !== undefined) {
    const role = patch.role === "admin" ? "admin" : "user";
    if (target.role === "admin" && role !== "admin") {
      const admins = await dbSelect("users", [{ col: "role", val: "admin" }]);
      if (admins.length <= 1) return fail("至少要保留一个管理员");
    }
    doc.role = role;
  }
  if (patch.password) {
    const pw = String(patch.password);
    if (pw.length < 6) return fail("密码至少 6 位");
    const ph = hashPassword(pw);
    doc.salt = ph.salt;
    doc.hash = ph.hash;
  }
  if (!Object.keys(doc).length) return ok({ updated: false });
  await dbUpdate("users", id, doc);
  const row = await dbSelectOne("users", [{ col: "id", val: id }]);
  return ok({ user: { id: row.id, nickname: row.nickname, email: row.email || "", role: row.role } });
}

/** 管理员删用户：不能删自己，也不能把最后一个管理员删掉 */
async function deleteUser(payload, token, me) {
  if (!me || me.role !== "admin") return fail("只有管理员可以管理用户");
  const id = payload.id;
  if (id === me.id) return fail("不能删除当前登录的账号");
  const target = await dbSelectOne("users", [{ col: "id", val: id }]);
  if (!target) return fail("用户不存在");
  if (target.role === "admin") {
    const admins = await dbSelect("users", [{ col: "role", val: "admin" }]);
    if (admins.length <= 1) return fail("至少要保留一个管理员");
  }
  try {
    const { error } = await rdb().from("sessions").delete().eq("user_id", id);
    if (error) throw toError(error);
  } catch (e) { /* 会话清不掉不影响删号 */ }
  await dbDelete("users", id);
  return ok({ deleted: true });
}

async function toggleCommentLike(payload, token, me) {
  if (!me) return fail("登录后才能点赞");
  const c = await dbSelectOne("comments", [{ col: "id", val: payload.id }]);
  if (!c) return fail("评论不存在");
  const list = (c.likes || []).slice();
  const idx = list.indexOf(me.id);
  if (idx >= 0) list.splice(idx, 1); else list.push(me.id);
  await dbUpdate("comments", payload.id, { likes: list });
  return ok({ liked: idx < 0, count: list.length });
}

async function setCommentFlags(payload, token, me) {
  if (!me || me.role !== "admin") return fail("只有管理员可以操作");
  const patch = {};
  if (typeof payload.pinned === "boolean") patch.pinned = payload.pinned;
  if (typeof payload.hidden === "boolean") patch.hidden = payload.hidden;
  if (Object.keys(patch).length) await dbUpdate("comments", payload.id, patch);
  return ok({ updated: true });
}

async function addReport(payload, token, me) {
  if (!me) return fail("请先登录后再提交勘误");
  const content = String(payload.content || "").trim();
  if (content.length < 4) return fail("请把问题写得再具体一点");
  const id = newId("rep");
  let recipeName = "材料库";
  if (payload.recipeId) {
    const r = await dbSelectOne("recipes", [{ col: "id", val: payload.recipeId }]);
    if (r) recipeName = r.name;
  }
  await dbInsert("reports", {
    id: id, recipe_id: payload.recipeId || null, recipe_name: recipeName,
    type: payload.type || "其他问题", content: content,
    suggest: String(payload.suggest || "").slice(0, 200),
    user_id: me.id, username: me.username, nickname: me.nickname || me.username,
    status: "pending", created_at: new Date().toISOString()
  });
  return ok({ id: id });
}

async function listReports(payload, token, me) {
  if (!me || me.role !== "admin") return fail("只有管理员可以查看勘误");
  return ok({ reports: await dbSelect("reports", [], { order: "created_at", asc: false, limit: 500 }) });
}

async function updateReport(payload, token, me) {
  if (!me || me.role !== "admin") return fail("只有管理员可以处理勘误");
  if (payload.remove) await dbDelete("reports", payload.id);
  else if (payload.status) await dbUpdate("reports", payload.id, { status: payload.status });
  return ok({ updated: true });
}

async function updateSettings(payload, token, me) {
  if (!me || me.role !== "admin") return fail("只有管理员可以修改设置");
  const cur = await getSettings();
  const next = Object.assign({}, cur, payload.patch || {});
  const row = await dbSelectOne("settings", [{ col: "id", val: "site" }]);
  if (row) await dbUpdate("settings", "site", { data: next, updated_at: new Date().toISOString() });
  else await dbInsert("settings", { id: "site", data: next, updated_at: new Date().toISOString() });
  return ok({ settings: next });
}

async function adminUsers(payload, token, me) {
  if (!me || me.role !== "admin") return fail("只有管理员可以查看用户");
  const rows = await dbSelect("users", [], { order: "created_at" });
  return ok({
    users: rows.map(function (u) {
      return { id: u.id, email: u.email || "", phone: u.phone || "", username: u.username, nickname: u.nickname, role: u.role, intro: u.intro, created_at: u.created_at };
    })
  });
}

/* ---------------- 入口 ----------------
   新版云开发控制台创建的是「HTTP 函数」：需要一个监听端口的 HTTP 服务
   （模板 HTTP Node.js Hello World 的 scf_bootstrap 就是执行 node index.js，端口 9000）。
   这里同时保留 exports.main，这样无论被当成 HTTP 函数还是事件函数调用都能工作。 */

const HANDLERS = {
  bootstrap: (p, t) => bootstrap(t),
  sendCode: sendCode,
  register: register,
  login: (p) => login(p),
  changePassword: changePassword,
  updateProfile: updateProfile,
  toggleFavorite: toggleFavorite,
  addPost: addPost,
  addPostComment: addPostComment,
  deletePostComment: deletePostComment,
  togglePostLike: togglePostLike,
  setPostStatus: setPostStatus,
  deletePost: deletePost,
  saveRecipe: saveRecipe,
  deleteRecipe: deleteRecipe,
  updateRecipeFields: updateRecipeFields,
  saveIngredient: saveIngredient,
  deleteIngredient: deleteIngredient,
  saveUser: saveUser,
  deleteUser: deleteUser,
  addComment: addComment,
  deleteComment: deleteComment,
  toggleCommentLike: toggleCommentLike,
  setCommentFlags: setCommentFlags,
  addReport: addReport,
  listReports: listReports,
  updateReport: updateReport,
  updateSettings: updateSettings,
  adminUsers: adminUsers
};

/** 统一的处理入口：返回 { ok, data } 或 { ok:false, msg } */
async function handle(action, payload, token) {
  if (!action) return fail("缺少 action");

  if (action === "ping") {
    try {
      const rows = await dbSelect("ingredients", [], { limit: 1 });
      return ok({
        db: "ok",
        schema: RDB_SCHEMA,
        ingredients: rows.length,
        env: process.env.TCB_ENV || process.env.SCF_NAMESPACE || "",
        time: Date.now()
      });
    } catch (e) {
      return fail("数据库连不上：" + e.message);
    }
  }

  /* 自检：一步一步试数据库操作，看看到底哪一步不通（部署后访问 ?action=debug 即可） */
  if (action === "debug") {
    const out = {};
    try {
      const rows = await dbSelect("users", [], { limit: 5 });
      out.selectUsers = {
        count: rows.length,
        rows: rows.map(function (u) {
          return { id: u.id, email: u.email || "", phone: u.phone || "", role: u.role, hasHash: !!u.hash, hashLen: (u.hash || "").length };
        })
      };
    } catch (e) { out.selectUsers = "错误：" + e.message; }

    try {
      const one = await dbSelectOne("users", [{ col: "email", val: "3246713776@qq.com" }]);
      out.findByEmail = one ? { id: one.id, role: one.role, hashLen: (one.hash || "").length } : "没找到这个邮箱，先执行升级 SQL";
    } catch (e) { out.findByEmail = "错误：" + e.message; }

    try {
      const sid0 = "debug-vc-" + Date.now();
      await dbInsert("verify_codes", {
        id: sid0, target: "debug@example.com", code: "000000",
        purpose: "register", expires_at: Date.now() + 60000, created_at: new Date().toISOString()
      });
      await dbDelete("verify_codes", sid0);
      out.verifyCodes = "验证码表可读可写";
    } catch (e) { out.verifyCodes = "错误：" + e.message; }

    out.smtp = (process.env.SMTP_USER && process.env.SMTP_PASS)
      ? "已配置（" + process.env.SMTP_USER + "）"
      : "未配置，验证码走演示模式（直接显示在页面上）";

    try {
      const sid = "debug-" + Date.now();
      await dbInsert("sessions", { token: sid, user_id: "u-admin", expires_at: Date.now() + 60000 });
      out.insertSession = "成功";
      await dbDelete("sessions", sid);
      out.deleteSession = "成功";
    } catch (e) { out.insertSession = "错误：" + e.message; }

    try {
      await dbUpdate("users", "u-admin", { intro: "站点管理员：负责材料库、配方审核、评论管理与用户权限。" });
      out.updateUser = "成功";
    } catch (e) { out.updateUser = "错误：" + e.message; }

    try {
      const rows = await dbSelect("ingredients", [], { limit: 2 });
      out.selectIngredients = rows.length;
      const rows2 = await dbSelect("recipes", [], { limit: 2 });
      out.selectRecipes = rows2.length;
    } catch (e) { out.selectTables = "错误：" + e.message; }

    return ok(out);
  }

  const handler = HANDLERS[action];
  if (!handler) return fail("未知的 action：" + action);
  try {
    const me = await userByToken(token);
    return await handler(payload, token, me);
  } catch (e) {
    console.error("[api] " + action + " 出错：", e);
    return fail("服务端出错（" + action + "）：" + e.message);
  }
}

/* ---------- 方式一：HTTP 函数（新版控制台默认，模板就是这种） ---------- */

const http = require("http");

function readBody(req) {
  return new Promise(function (resolve) {
    let raw = "";
    req.on("data", function (chunk) { raw += chunk; if (raw.length > 5e6) req.destroy(); });
    req.on("end", function () { resolve(raw); });
    req.on("error", function () { resolve(""); });
  });
}

const server = http.createServer(async function (req, res) {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type, x-token",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Content-Type": "application/json; charset=utf-8"
  };
  if (req.method === "OPTIONS") { res.writeHead(204, cors); res.end(); return; }

  let payload = {};
  const raw = await readBody(req);
  if (raw) { try { payload = JSON.parse(raw); } catch (e) { payload = {}; } }

  const url = new URL(req.url || "/", "http://localhost");
  const action = payload.action || url.searchParams.get("action") || "";
  const token = payload.token || url.searchParams.get("token") || req.headers["x-token"] || "";
  const data = payload.payload || payload;

  let result;
  try {
    result = await handle(action, data, token);
  } catch (e) {
    result = fail("服务端异常：" + e.message);
  }
  res.writeHead(200, cors);
  res.end(JSON.stringify(result));
});

const PORT = process.env.PORT || 9000;
server.listen(PORT, function () {
  console.log("[api] 已启动，监听端口 " + PORT);
});

/* ---------- 方式二：事件函数（如果哪天用事件方式调用，也能工作） ---------- */

exports.main = async function (event) {
  let body = event || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  if (body.body) {
    try { body = typeof body.body === "string" ? JSON.parse(body.body) : body.body; } catch (e) { /* 忽略 */ }
  }
  const query = body.queryStringParameters || {};
  const headers = body.headers || {};
  const action = body.action || query.action || "";
  const token = body.token || query.token || headers["x-token"] || "";
  try {
    return await handle(action, body.payload || body, token);
  } catch (e) {
    return fail("服务端异常：" + e.message);
  }
};
