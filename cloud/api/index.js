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
   如果你想在本地跑，就在环境变量里提供 CLOUDBASE_ENV_ID / CLOUDBASE_SECRETID / CLOUDBASE_SECRETKEY */
const initOptions = { env: process.env.CLOUDBASE_ENV_ID || cloudbaseSDK.SYMBOL_CURRENT_ENV };
if (process.env.CLOUDBASE_SECRETID && process.env.CLOUDBASE_SECRETKEY) {
  initOptions.secretId = process.env.CLOUDBASE_SECRETID;
  initOptions.secretKey = process.env.CLOUDBASE_SECRETKEY;
}
const app = cloudbaseSDK.init(initOptions);

const SESSION_DAYS = 30;

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
  let query = app.rdb().from(table).select("*");
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
  const { error } = await app.rdb().from(table).insert([row]);
  if (error) throw toError(error);
  return row;
}

/** 更新（按 id） */
async function dbUpdate(table, id, patch) {
  const { error } = await app.rdb().from(table).update(patch).eq("id", id);
  if (error) throw toError(error);
}

/** 删除（按 id） */
async function dbDelete(table, id) {
  const { error } = await app.rdb().from(table).delete().eq("id", id);
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
    id: u.id, phone: u.phone || "",
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
  return ok({
    ingredients: ingredients.map(rowIngredient),
    recipes: recipes.map(rowRecipe),
    posts: posts.map(rowPost),
    comments: comments.map(rowComment),
    settings: settings,
    user: publicUser(user),
    serverTime: Date.now()
  });
}

/* ---------------- 账号 ---------------- */

async function register(payload) {
  const nickname = String(payload.nickname || "").trim();
  const phone = String(payload.phone || "").trim();
  const password = String(payload.password || "");
  if (nickname.length < 2 || nickname.length > 12) return fail("昵称需要 2-12 个字");
  if (!/^1[3-9]\d{9}$/.test(phone)) return fail("请输入正确的 11 位手机号");
  if (password.length < 6) return fail("密码至少 6 位");
  if (payload.confirm !== undefined && password !== String(payload.confirm)) return fail("两次输入的密码不一致");

  const exists = await dbSelectOne("users", [{ col: "phone", val: phone }]);
  if (exists) return fail("这个手机号已经注册过了");

  const ph = hashPassword(password);
  const id = newId("u");
  await dbInsert("users", {
    id: id, phone: phone, username: phone, nickname: nickname,
    salt: ph.salt, hash: ph.hash, role: "user", intro: "",
    favorites: [], post_favorites: [], my_ingredients: [],
    created_at: new Date().toISOString()
  });
  const newToken = await createSession(id);
  const user = await dbSelectOne("users", [{ col: "id", val: id }]);
  return ok({ token: newToken, user: publicUser(user) });
}

async function login(payload) {
  const account = String(payload.account || "").trim();
  const password = String(payload.password || "");
  const isPhone = /^1[3-9]\d{9}$/.test(account);
  const user = await dbSelectOne("users", [{ col: isPhone ? "phone" : "username", val: account }]);
  if (!user || !checkPassword(user, password)) {
    return fail(isPhone ? "手机号或密码不正确" : "账号或密码不正确");
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
      return { id: u.id, phone: u.phone, username: u.username, nickname: u.nickname, role: u.role, intro: u.intro, created_at: u.created_at };
    })
  });
}

/* ---------------- 入口 ---------------- */

const HANDLERS = {
  bootstrap: (p, t) => bootstrap(t),
  register: register,
  login: (p) => login(p),
  changePassword: changePassword,
  updateProfile: updateProfile,
  toggleFavorite: toggleFavorite,
  addPost: addPost,
  addPostComment: addPostComment,
  togglePostLike: togglePostLike,
  setPostStatus: setPostStatus,
  deletePost: deletePost,
  saveRecipe: saveRecipe,
  deleteRecipe: deleteRecipe,
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

function parseEvent(event) {
  let body = event || {};
  if (typeof body === "string") { try { body = JSON.parse(body); } catch (e) { body = {}; } }
  if (body.body) {
    try { body = typeof body.body === "string" ? JSON.parse(body.body) : body.body; } catch (e) { /* 忽略 */ }
  }
  const query = body.queryStringParameters || {};
  const headers = body.headers || {};
  return {
    action: body.action || query.action || "",
    payload: body.payload || body,
    token: body.token || query.token || headers["x-token"] || ""
  };
}

/** HTTP 网关要返回 CORS 头，否则 GitHub Pages 上的网页调不动 */
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

  if (action === "ping") {
    try {
      const rows = await dbSelect("ingredients", [], { limit: 1 });
      return httpResponse(ok({ db: "ok", ingredients: rows.length, time: Date.now() }));
    } catch (e) {
      return httpResponse(fail("数据库连不上：" + e.message));
    }
  }

  const handler = HANDLERS[action];
  if (!handler) return httpResponse(fail("未知的 action：" + action));
  try {
    const me = await userByToken(token);
    return httpResponse(await handler(payload, token, me));
  } catch (e) {
    console.error("[api] " + action + " 出错：", e);
    return httpResponse(fail("服务端出错：" + e.message));
  }
};
