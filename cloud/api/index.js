/**
 * 云函数：鸡尾酒法典 · 数据接口（服务端）
 *
 * 设计思路（很重要，决定了前端几乎不用改）：
 *   1. 前端打开页面时调一次 `bootstrap`，把「材料 + 配方 + 帖子 + 评论 + 设置 + 当前用户」整包拉下来
 *   2. 之后界面上的读操作都在内存里进行（原来的同步代码照旧跑，一行不用改）
 *   3. 所有写操作（注册、登录、发帖、评论、点赞、改密码…）都调这个云函数，
 *      由服务端校验身份、写数据库，再把最新数据返回给前端覆盖内存
 *
 * 安全要点：
 *   - 数据库权限设成「仅管理端可写」，前端拿不到数据库，只能通过这个云函数
 *   - 密码用 Node 自带的 scrypt 加盐哈希，明文不落库
 *   - 登录后签发 token，存在 sessions 集合里，带过期时间
 *
 * 环境变量（云函数里自动注入，一般不用配）：
 *   TCB_ENV  当前云开发环境 ID
 */

const cloudbase = require("@cloudbase/node-sdk");
const crypto = require("crypto");

const app = cloudbase.init({ env: cloudbase.SYMBOL_CURRENT_ENV });
const db = app.database();
const _ = db.command;

const SESSION_DAYS = 30;
const COLL = {
  users: "users", sessions: "sessions", ingredients: "ingredients", recipes: "recipes",
  posts: "posts", comments: "comments", reports: "reports", settings: "settings"
};

/* ---------------- 工具 ---------------- */

function ok(data) { return { ok: true, data: data }; }
function fail(msg) { return { ok: false, msg: msg }; }

function newId(prefix) {
  return prefix + "-" + Date.now().toString(36) + crypto.randomBytes(3).toString("hex");
}

/* ---------------- 密码（scrypt，比前端那套强得多） ---------------- */

function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString("hex");
  const h = crypto.scryptSync(String(password), s, 64).toString("hex");
  return { salt: s, hash: h };
}

function checkPassword(user, password) {
  if (!user || !user.hash || !user.salt) return false;
  const h = crypto.scryptSync(String(password), user.salt, 64).toString("hex");
  return crypto.timingSafeEqual(Buffer.from(h, "hex"), Buffer.from(user.hash, "hex"));
}

function isPhone(v) { return /^1[3-9]\d{9}$/.test(String(v || "").trim()); }
function maskPhone(p) { return isPhone(p) ? p.slice(0, 3) + "****" + p.slice(7) : p; }

/* ---------------- 会话 ---------------- */

async function createSession(userId) {
  const token = crypto.randomBytes(24).toString("hex");
  const expiresAt = Date.now() + SESSION_DAYS * 86400000;
  await db.collection(COLL.sessions).add({ _id: token, userId: userId, expiresAt: expiresAt });
  return token;
}

async function userByToken(token) {
  if (!token) return null;
  try {
    const s = await db.collection(COLL.sessions).doc(token).get();
    const sess = s.data && s.data[0];
    if (!sess) return null;
    if (sess.expiresAt && sess.expiresAt < Date.now()) return null;
    const u = await db.collection(COLL.users).doc(sess.userId).get();
    return (u.data && u.data[0]) || null;
  } catch (e) {
    return null;
  }
}

/** 对外返回的用户信息（去掉盐和哈希） */
function publicUser(u) {
  if (!u) return null;
  return {
    id: u._id, phone: u.phone || "", phoneMasked: maskPhone(u.phone || ""),
    username: u.username, nickname: u.nickname || u.username, role: u.role || "user",
    intro: u.intro || "", createdAt: u.createdAt || "",
    favorites: u.favorites || [], postFavorites: u.postFavorites || [], myIngredients: u.myIngredients || []
  };
}

/* ---------------- 整包数据（前端启动时拉一次） ---------------- */

async function fetchAll(coll, limit) {
  const out = [];
  const pageSize = 100;
  for (let skip = 0; skip < (limit || 5000); skip += pageSize) {
    const res = await db.collection(coll).skip(skip).limit(pageSize).get();
    const rows = res.data || [];
    out.push.apply(out, rows);
    if (rows.length < pageSize) break;
  }
  return out;
}

async function bootstrap(token) {
  const [ingredients, recipes, posts, comments, settingsRows, user] = await Promise.all([
    fetchAll(COLL.ingredients, 1000),
    fetchAll(COLL.recipes, 2000),
    fetchAll(COLL.posts, 2000),
    fetchAll(COLL.comments, 5000),
    db.collection(COLL.settings).doc("site").get().catch(() => ({ data: [] })),
    userByToken(token)
  ]);

  // 给数据库记录补上前端在用的字段名（_id → id）
  const norm = rows => rows.map(r => Object.assign({}, r, { id: r._id }));

  return ok({
    ingredients: norm(ingredients),
    recipes: norm(recipes).map(r => Object.assign(r, {
      ingredients: (r.items || []).map(x => ({ id: x.id, amount: x.amount, optional: x.optional })),
      author: r.author || "官方",
      views: r.views || 0
    })),
    posts: norm(posts),
    comments: norm(comments),
    settings: (settingsRows.data && settingsRows.data[0]) || null,
    user: publicUser(user),
    serverTime: Date.now()
  });
}

/* ---------------- 账号 ---------------- */

async function register(payload, token) {
  const nickname = String(payload.nickname || "").trim();
  const phone = String(payload.phone || "").trim();
  const password = String(payload.password || "");

  if (nickname.length < 2 || nickname.length > 12) return fail("昵称需要 2-12 个字");
  if (!isPhone(phone)) return fail("请输入正确的 11 位手机号");
  if (password.length < 6) return fail("密码至少 6 位");
  if (payload.confirm !== undefined && password !== String(payload.confirm)) return fail("两次输入的密码不一致");

  const dup = await db.collection(COLL.users).where({ phone: phone }).limit(1).get();
  if (dup.data && dup.data.length) return fail("这个手机号已经注册过了");

  const ph = hashPassword(password);
  const user = {
    _id: newId("u"),
    phone: phone,
    username: phone,
    nickname: nickname,
    salt: ph.salt,
    hash: ph.hash,
    role: "user",
    intro: "",
    createdAt: new Date().toISOString(),
    favorites: [], postFavorites: [], myIngredients: []
  };
  await db.collection(COLL.users).add(user);
  const newToken = await createSession(user._id);
  return ok({ token: newToken, user: publicUser(user) });
}

async function login(payload) {
  const account = String(payload.account || "").trim();
  const password = String(payload.password || "");
  const where = isPhone(account) ? { phone: account } : { username: account };
  const res = await db.collection(COLL.users).where(where).limit(1).get();
  const user = (res.data || [])[0];
  if (!user || !checkPassword(user, password)) {
    return fail(isPhone(account) ? "手机号或密码不正确" : "账号或密码不正确");
  }
  const token = await createSession(user._id);
  return ok({ token: token, user: publicUser(user) });
}

async function changePassword(payload, token, me) {
  if (!me) return fail("请先登录");
  if (!checkPassword(me, payload.oldPwd)) return fail("当前密码不正确");
  const np = String(payload.newPwd || "");
  if (np.length < 6) return fail("新密码至少 6 位");
  if (np !== String(payload.confirmPwd || np)) return fail("两次输入的新密码不一致");
  const ph = hashPassword(np);
  await db.collection(COLL.users).doc(me._id).update({ salt: ph.salt, hash: ph.hash });
  return ok({ changed: true });
}

async function updateProfile(payload, token, me) {
  if (!me) return fail("请先登录");
  const patch = {};
  if (payload.nickname !== undefined) patch.nickname = String(payload.nickname).slice(0, 12);
  if (payload.intro !== undefined) patch.intro = String(payload.intro).slice(0, 100);
  if (payload.favorites) patch.favorites = payload.favorites;
  if (payload.postFavorites) patch.postFavorites = payload.postFavorites;
  if (payload.myIngredients) patch.myIngredients = payload.myIngredients;
  await db.collection(COLL.users).doc(me._id).update(patch);
  return ok({ updated: true });
}

/* ---------------- 帖子 ---------------- */

/** 规则审核（服务端再跑一遍，前端那份只是即时反馈） */
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

  const post = {
    _id: newId("post"),
    title: title,
    content: content,
    images: (payload.images || []).slice(0, 6),
    category: payload.category || "闲聊",
    recipeTags: (payload.recipeTags || []).slice(0, 3),
    authorId: me._id,
    username: me.username,
    nickname: me.nickname || me.username,
    status: status,
    review: { source: "rule", risk: rule.risk, reasons: rule.reasons, at: new Date().toISOString() },
    rejectReason: status === "rejected" ? rule.reasons.join("；") : "",
    likes: [], views: 0, comments: [],
    createdAt: new Date().toISOString()
  };
  await db.collection(COLL.posts).add(post);
  return ok({ post: Object.assign({}, post, { id: post._id }) });
}

async function addPostComment(payload, token, me) {
  if (!me) return fail("请先登录");
  const content = String(payload.content || "").trim();
  if (!content) return fail("回复不能为空");
  if (content.length > 500) return fail("回复最多 500 字");
  const comment = {
    _id: newId("pc"), userId: me._id, username: me.username,
    nickname: me.nickname || me.username, content: content,
    likes: [], createdAt: new Date().toISOString()
  };
  await db.collection(COLL.posts).doc(payload.postId).update({
    comments: _.push(comment)
  });
  return ok({ comment: comment });
}

async function togglePostLike(payload, token, me) {
  if (!me) return fail("登录后才能点赞");
  const res = await db.collection(COLL.posts).doc(payload.postId).get();
  const post = (res.data || [])[0];
  if (!post) return fail("帖子不存在");
  const liked = (post.likes || []).indexOf(me._id) >= 0;
  await db.collection(COLL.posts).doc(payload.postId).update({
    likes: liked ? _.pull(me._id) : _.push(me._id)
  });
  return ok({ liked: !liked });
}

async function setPostStatus(payload, token, me) {
  if (!me || me.role !== "admin") return fail("只有管理员可以审核");
  await db.collection(COLL.posts).doc(payload.id).update({
    status: payload.status,
    rejectReason: payload.status === "rejected" ? String(payload.reason || "管理员判定不适合发布") : "",
    manualReview: true,
    reviewedBy: me.username,
    reviewedAt: new Date().toISOString()
  });
  return ok({ updated: true });
}

async function deletePost(payload, token, me) {
  if (!me) return fail("请先登录");
  const res = await db.collection(COLL.posts).doc(payload.id).get();
  const post = (res.data || [])[0];
  if (!post) return fail("帖子不存在");
  if (me.role !== "admin" && post.authorId !== me._id) return fail("只能删除自己的帖子");
  await db.collection(COLL.posts).doc(payload.id).remove();
  return ok({ deleted: true });
}

/* ---------------- 评论 / 收藏 / 配方 ---------------- */

async function saveRecipe(payload, token, me) {
  if (!me) return fail("请先登录");
  const settings = await getSettings();
  if (me.role !== "admin" && settings.allowUserPublish === false) return fail("管理员暂时关闭了用户发布配方");
  const r = payload.recipe || {};
  if (!r.name || !String(r.name).trim()) return fail("请填写酒名");
  if (!r.items || !r.items.length) return fail("至少添加一种材料");
  if (!r.tags || !r.tags.length) return fail("至少选一个口味标签");

  const doc = {
    _id: r.id || newId("r"),
    name: String(r.name).trim(),
    en: r.en || "", alias: "", type: r.type === "classic" ? "classic" : "custom",
    emoji: r.emoji || "🍹", color: r.color || "#e0a94a",
    glass: r.glass || "", abv: r.abv || "", desc: r.desc || "",
    image: r.image || "", video: r.video || "", videoName: r.videoName || "",
    tags: r.tags.slice(0, 10),
    items: r.items.map(x => ({ id: x.id, amount: x.amount || "", optional: !!x.optional })),
    steps: r.steps || [],
    py: r.py || "", initial: r.initial || "#",
    authorId: me._id, author: me.nickname || me.username,
    status: (settings.needReview && me.role !== "admin") ? "pending" : "approved",
    views: 0, createdAt: new Date().toISOString()
  };
  await db.collection(COLL.recipes).add(doc);
  return ok({ recipe: doc });
}

async function deleteRecipe(payload, token, me) {
  if (!me) return fail("请先登录");
  const res = await db.collection(COLL.recipes).doc(payload.id).get();
  const rec = (res.data || [])[0];
  if (!rec) return fail("配方不存在");
  if (me.role !== "admin" && rec.authorId !== me._id) return fail("只能删除自己发布的配方");
  await db.collection(COLL.recipes).doc(payload.id).remove();
  await db.collection(COLL.comments).where({ targetId: payload.id }).remove();
  return ok({ deleted: true });
}

async function toggleFavorite(payload, token, me) {
  if (!me) return fail("登录后才能收藏");
  const field = payload.kind === "post" ? "postFavorites" : "favorites";
  const list = (me[field] || []).slice();
  const idx = list.indexOf(payload.id);
  if (idx >= 0) list.splice(idx, 1); else list.push(payload.id);
  const patch = {};
  patch[field] = list;
  await db.collection(COLL.users).doc(me._id).update(patch);
  return ok({ faved: idx < 0, list: list });
}

/* ---------------- 设置 ---------------- */

async function getSettings() {
  try {
    const res = await db.collection(COLL.settings).doc("site").get();
    return (res.data && res.data[0]) || {};
  } catch (e) { return {}; }
}

async function updateSettings(payload, token, me) {
  if (!me || me.role !== "admin") return fail("只有管理员可以修改设置");
  const patch = Object.assign({}, payload.patch || {}, { updatedAt: new Date().toISOString() });
  delete patch._id;
  await db.collection(COLL.settings).doc("site").set(patch);
  return ok({ settings: await getSettings() });
}

/* ---------------- 入口 ---------------- */

const HANDLERS = {
  bootstrap: (p, t) => bootstrap(t),
  register: register,
  login: (p) => login(p),
  changePassword: changePassword,
  updateProfile: updateProfile,
  addPost: addPost,
  addPostComment: addPostComment,
  togglePostLike: togglePostLike,
  setPostStatus: setPostStatus,
  deletePost: deletePost,
  saveRecipe: saveRecipe,
  deleteRecipe: deleteRecipe,
  updateSettings: updateSettings
};

function parseEvent(event) {
  let body = event || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  if (body.body) {
    try { body = typeof body.body === "string" ? JSON.parse(body.body) : body.body; } catch (e) { /* 忽略 */ }
  }
  const query = body.queryStringParameters || {};
  const headers = body.headers || {};
  const token = body.token || query.token || headers["x-token"] || "";
  const action = body.action || query.action || "";
  const payload = body.payload || body;
  return { action: action, payload: payload, token: token };
}

/** HTTP 访问服务要返回 CORS 头，否则 GitHub Pages 上的网页调不动 */
function httpResponse(result) {
  return {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type, x-token",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS"
    },
    body: JSON.stringify(result)
  };
}

exports.main = async (event) => {
  const { action, payload, token } = parseEvent(event);
  if (!action) return httpResponse(fail("缺少 action"));
  if (action === "ping") return httpResponse(ok({ env: process.env.TCB_ENV || "unknown", time: Date.now() }));
  if (action === "options") return httpResponse(ok({}));

  const handler = HANDLERS[action];
  if (!handler) return httpResponse(fail("未知的 action：" + action));

  try {
    const me = await userByToken(token);
    const result = await handler(payload, token, me);
    return httpResponse(result);
  } catch (e) {
    console.error("[api] " + action + " 出错：", e);
    return httpResponse(fail("服务端出错：" + e.message));
  }
};
