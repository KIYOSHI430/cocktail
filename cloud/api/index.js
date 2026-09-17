/**
 * 云函数：鸡尾酒法典 · 数据接口（PostgreSQL 版）
 *
 * 设计思路（决定了前端几乎不用改）：
 *   1. 前端打开页面时调一次 `bootstrap`，把「材料 + 配方 + 帖子 + 评论 + 设置 + 当前用户」整包拉下来
 *   2. 之后界面的读操作都在内存里进行（原来的同步代码照旧跑）
 *   3. 所有写操作都调这个云函数，服务端校验身份、写数据库，返回最新数据让前端覆盖内存
 *
 * 需要配置的环境变量（云函数 → 配置 → 环境变量）：
 *   DATABASE_URL   PostgreSQL 连接串，从「SQL 型数据库 → 配置」里复制，
 *                  形如 postgresql://用户名:密码@内网地址:5432/数据库名
 *
 * 安全要点：
 *   - 数据库只允许这个云函数访问（同环境内网），前端拿不到连接信息
 *   - 密码用 Node 自带的 scrypt 加盐哈希，明文不落库
 *   - 登录签发 token，存在 sessions 表，30 天有效
 */

const { Pool } = require("pg");
const crypto = require("crypto");

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 8000
});

const SESSION_DAYS = 30;

/* ---------------- 数据库小工具 ---------------- */

async function q(sql, params) {
  const res = await pool.query(sql, params || []);
  return res.rows;
}
async function one(sql, params) {
  const rows = await q(sql, params);
  return rows[0] || null;
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
  return h.length === String(user.hash).length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(user.hash));
}

async function createSession(userId) {
  const token = crypto.randomBytes(24).toString("hex");
  await q("insert into sessions (token, user_id, expires_at) values ($1,$2,$3)",
    [token, userId, Date.now() + SESSION_DAYS * 86400000]);
  return token;
}

async function userByToken(token) {
  if (!token) return null;
  const s = await one("select * from sessions where token = $1", [token]);
  if (!s || Number(s.expires_at) < Date.now()) return null;
  return one("select * from users where id = $1", [s.user_id]);
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
  const row = await one("select data from settings where id = 'site'");
  return (row && row.data) || {};
}

async function bootstrap(token) {
  const [ingredients, recipes, posts, comments, settings, user] = await Promise.all([
    q("select * from ingredients order by initial, py"),
    q("select * from recipes order by created_at desc"),
    q("select * from posts order by created_at desc limit 1000"),
    q("select * from comments order by created_at desc limit 3000"),
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

  const exists = await one("select id from users where phone = $1", [phone]);
  if (exists) return fail("这个手机号已经注册过了");

  const ph = hashPassword(password);
  const id = newId("u");
  await q("insert into users (id, phone, username, nickname, salt, hash, role, intro) values ($1,$2,$3,$4,$5,$6,'user','')",
    [id, phone, phone, nickname, ph.salt, ph.hash]);
  const newToken = await createSession(id);
  const user = await one("select * from users where id = $1", [id]);
  return ok({ token: newToken, user: publicUser(user) });
}

async function login(payload) {
  const account = String(payload.account || "").trim();
  const password = String(payload.password || "");
  const isPhone = /^1[3-9]\d{9}$/.test(account);
  const user = await one(isPhone ? "select * from users where phone = $1" : "select * from users where username = $1",
    [account]);
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
  await q("update users set salt = $1, hash = $2 where id = $3", [ph.salt, ph.hash, me.id]);
  return ok({ changed: true });
}

async function updateProfile(payload, token, me) {
  if (!me) return fail("请先登录");
  const sets = [], params = [];
  function set(col, val) { params.push(val); sets.push(col + " = $" + params.length); }
  if (payload.nickname !== undefined) set("nickname", String(payload.nickname).slice(0, 12));
  if (payload.intro !== undefined) set("intro", String(payload.intro).slice(0, 100));
  if (payload.favorites) set("favorites", JSON.stringify(payload.favorites));
  if (payload.postFavorites) set("post_favorites", JSON.stringify(payload.postFavorites));
  if (payload.myIngredients) set("my_ingredients", JSON.stringify(payload.myIngredients));
  if (!sets.length) return ok({ updated: false });
  params.push(me.id);
  await q("update users set " + sets.join(", ") + " where id = $" + params.length, params);
  const user = await one("select * from users where id = $1", [me.id]);
  return ok({ user: publicUser(user) });
}

async function toggleFavorite(payload, token, me) {
  if (!me) return fail("登录后才能收藏");
  const isPost = payload.kind === "post";
  const list = (isPost ? (me.post_favorites || []) : (me.favorites || [])).slice();
  const idx = list.indexOf(payload.id);
  if (idx >= 0) list.splice(idx, 1); else list.push(payload.id);
  const col = isPost ? "post_favorites" : "favorites";
  await q("update users set " + col + " = $1 where id = $2", [JSON.stringify(list), me.id]);
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
  await q("insert into posts (id, title, content, images, category, recipe_tags, author_id, username, nickname, status, review, reject_reason, likes, views, comments) " +
          "values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'[]'::jsonb,0,'[]'::jsonb)",
    [id, title, content, JSON.stringify(payload.images || []), payload.category || "闲聊",
     JSON.stringify(payload.recipeTags || []), me.id, me.username, me.nickname,
     status, JSON.stringify({ source: "rule", risk: rule.risk, reasons: rule.reasons }),
     status === "rejected" ? rule.reasons.join("；") : ""]);
  const post = await one("select * from posts where id = $1", [id]);
  return ok({ post: rowPost(post) });
}

async function addPostComment(payload, token, me) {
  if (!me) return fail("请先登录");
  const content = String(payload.content || "").trim();
  if (!content) return fail("回复不能为空");
  if (content.length > 500) return fail("回复最多 500 字");
  const post = await one("select comments from posts where id = $1", [payload.postId]);
  if (!post) return fail("帖子不存在");
  const list = post.comments || [];
  const comment = {
    id: newId("pc"), userId: me.id, username: me.username,
    nickname: me.nickname || me.username, content: content,
    likes: [], createdAt: new Date().toISOString()
  };
  list.push(comment);
  await q("update posts set comments = $1 where id = $2", [JSON.stringify(list), payload.postId]);
  return ok({ comment: comment });
}

async function togglePostLike(payload, token, me) {
  if (!me) return fail("登录后才能点赞");
  const post = await one("select likes from posts where id = $1", [payload.postId]);
  if (!post) return fail("帖子不存在");
  const list = post.likes || [];
  const idx = list.indexOf(me.id);
  if (idx >= 0) list.splice(idx, 1); else list.push(me.id);
  await q("update posts set likes = $1 where id = $2", [JSON.stringify(list), payload.postId]);
  return ok({ liked: idx < 0, count: list.length });
}

async function setPostStatus(payload, token, me) {
  if (!me || me.role !== "admin") return fail("只有管理员可以审核");
  await q("update posts set status = $1, reject_reason = $2 where id = $3",
    [payload.status,
     payload.status === "rejected" ? String(payload.reason || "管理员判定不适合发布") : "",
     payload.id]);
  return ok({ updated: true });
}

async function deletePost(payload, token, me) {
  if (!me) return fail("请先登录");
  const post = await one("select author_id from posts where id = $1", [payload.id]);
  if (!post) return fail("帖子不存在");
  if (me.role !== "admin" && post.author_id !== me.id) return fail("只能删除自己的帖子");
  await q("delete from posts where id = $1", [payload.id]);
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
  await q('insert into recipes (id, name, en, type, emoji, color, glass, abv, "desc", image, video, video_name, tags, items, steps, py, initial, author_id, author, status) ' +
          "values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20) " +
          'on conflict (id) do update set name = excluded.name, items = excluded.items, steps = excluded.steps, tags = excluded.tags, "desc" = excluded."desc"',
    [id, r.name, r.en || "", r.type === "classic" ? "classic" : "custom", r.emoji || "🍹", r.color || "#e0a94a",
     r.glass || "", r.abv || "", r.desc || "", r.image || "", r.video || "", r.videoName || "",
     JSON.stringify(r.tags.slice(0, 10)), JSON.stringify(r.items), JSON.stringify(r.steps || []),
     r.py || "", r.initial || "#", me.id, me.nickname || me.username,
     (settings.needReview && me.role !== "admin") ? "pending" : "approved"]);
  const recipe = await one("select * from recipes where id = $1", [id]);
  return ok({ recipe: rowRecipe(recipe) });
}

async function deleteRecipe(payload, token, me) {
  if (!me) return fail("请先登录");
  const rec = await one("select author_id from recipes where id = $1", [payload.id]);
  if (!rec) return fail("配方不存在");
  if (me.role !== "admin" && rec.author_id !== me.id) return fail("只能删除自己发布的配方");
  await q("delete from comments where target_id = $1", [payload.id]);
  await q("delete from recipes where id = $1", [payload.id]);
  return ok({ deleted: true });
}

async function addComment(payload, token, me) {
  if (!me) return fail("请先登录");
  const content = String(payload.content || "").trim();
  if (!content) return fail("评论不能为空");
  if (content.length > 500) return fail("评论最多 500 字");
  const id = newId("c");
  await q("insert into comments (id, target_type, target_id, user_id, username, nickname, content, parent_id) " +
          "values ($1,'recipe',$2,$3,$4,$5,$6,$7)",
    [id, payload.recipeId, me.id, me.username, me.nickname || me.username, content, payload.parentId || null]);
  const c = await one("select * from comments where id = $1", [id]);
  return ok({ comment: rowComment(c) });
}

async function deleteComment(payload, token, me) {
  if (!me) return fail("请先登录");
  const c = await one("select * from comments where id = $1", [payload.id]);
  if (!c) return fail("评论不存在");
  if (me.role !== "admin" && c.user_id !== me.id) return fail("只能删除自己的评论");
  await q("delete from comments where id = $1 or parent_id = $1", [payload.id]);
  return ok({ deleted: true });
}

async function toggleCommentLike(payload, token, me) {
  if (!me) return fail("登录后才能点赞");
  const c = await one("select likes from comments where id = $1", [payload.id]);
  if (!c) return fail("评论不存在");
  const list = c.likes || [];
  const idx = list.indexOf(me.id);
  if (idx >= 0) list.splice(idx, 1); else list.push(me.id);
  await q("update comments set likes = $1 where id = $2", [JSON.stringify(list), payload.id]);
  return ok({ liked: idx < 0, count: list.length });
}

async function addReport(payload, token, me) {
  if (!me) return fail("请先登录后再提交勘误");
  const content = String(payload.content || "").trim();
  if (content.length < 4) return fail("请把问题写得再具体一点");
  const id = newId("rep");
  let recipeName = "材料库";
  if (payload.recipeId) {
    const r = await one("select name from recipes where id = $1", [payload.recipeId]);
    if (r) recipeName = r.name;
  }
  await q("insert into reports (id, recipe_id, recipe_name, type, content, suggest, user_id, username, nickname, status) " +
          "values ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending')",
    [id, payload.recipeId || null, recipeName, payload.type || "其他问题", content,
     String(payload.suggest || "").slice(0, 200), me.id, me.username, me.nickname || me.username]);
  return ok({ id: id });
}

async function listReports(payload, token, me) {
  if (!me || me.role !== "admin") return fail("只有管理员可以查看勘误");
  return ok({ reports: await q("select * from reports order by created_at desc limit 500") });
}

async function updateReport(payload, token, me) {
  if (!me || me.role !== "admin") return fail("只有管理员可以处理勘误");
  if (payload.remove) await q("delete from reports where id = $1", [payload.id]);
  else if (payload.status) await q("update reports set status = $1 where id = $2", [payload.status, payload.id]);
  return ok({ updated: true });
}

async function updateSettings(payload, token, me) {
  if (!me || me.role !== "admin") return fail("只有管理员可以修改设置");
  const cur = await getSettings();
  const next = Object.assign({}, cur, payload.patch || {});
  await q("insert into settings (id, data, updated_at) values ('site', $1, now()) " +
          "on conflict (id) do update set data = $1, updated_at = now()", [JSON.stringify(next)]);
  return ok({ settings: next });
}

async function adminUsers(payload, token, me) {
  if (!me || me.role !== "admin") return fail("只有管理员可以查看用户");
  return ok({ users: await q("select id, phone, username, nickname, role, intro, created_at from users order by created_at") });
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
  if (action === "ping") {
    try {
      await q("select 1");
      return httpResponse(ok({ db: "ok", time: Date.now() }));
    } catch (e) {
      return httpResponse(fail("数据库连不上：" + e.message + "（检查 DATABASE_URL 环境变量）"));
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
