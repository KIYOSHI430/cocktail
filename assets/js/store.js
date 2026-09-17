/* 数据层：本地存储（localStorage）、账号、配方/材料增删改查、材料匹配算法。
   原型阶段全部数据存在浏览器本地；以后接后端时，只需要把这层的函数改成接口请求。 */

(function () {
  "use strict";

  var KEY = "cocktail_app_v1";
  var DATA_VERSION = 4;   // v4：新增拼音索引与勘误表
  var state = null;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function nowISO() { return new Date().toISOString().slice(0, 10); }

  function newId(prefix) {
    return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ---------------- 初始化 ---------------- */

  /** 把种子里的示例评论换算成真实时间 */
  function seedComments() {
    var now = Date.now();
    return clone(window.SEED.comments || []).map(function (c) {
      c.createdAt = new Date(now - (c.hoursAgo || 0) * 3600 * 1000).toISOString();
      delete c.hoursAgo;
      c.parentId = c.parentId || null;
      c.likes = c.likes || [];
      c.pinned = !!c.pinned;
      c.hidden = false;
      return c;
    });
  }

  function normalizeUser(u) {
    u.favorites = u.favorites || [];
    u.myIngredients = u.myIngredients || [];
    u.nickname = u.nickname || u.username;
    u.intro = u.intro || "";
    u.createdAt = u.createdAt || nowISO();
    return u;
  }

  function normalizeRecipe(r) {
    r.status = r.status || "approved";      // approved 公开 / pending 待审核 / hidden 已下架
    r.author = r.author || "官方";
    r.authorId = r.authorId || "u-admin";
    r.createdAt = r.createdAt || "2026-01-01";
    r.views = r.views || 0;
    r.video = r.video || "";
    r.videoName = r.videoName || "";
    r.ingredients = r.ingredients || [];
    r.steps = r.steps || [];
    // 标签：老数据没有 tags 字段时，从种子表里补
    if (!Array.isArray(r.tags)) r.tags = (window.SEED.tags || {})[r.id] || [];
    // 只在"从未设置过图片"时补演示图（管理员换过图或手动清空过的都不会被覆盖）
    if (typeof r.image === "undefined") {
      var seedImg = (window.SEED.images || {})[r.id];
      r.image = seedImg || "";
    }
    r.imageThumb = r.image ? (r.imageThumb || thumbFor(r.image)) : "";
    var py = pinyinOf("recipes", r.id);
    r.py = py.p;
    r.initial = py.i;
    return r;
  }

  /** 读取种子里的拼音索引，格式 "jinjiu|J" */
  function pinyinOf(kind, id) {
    var block = (window.SEED.pinyin || {})[kind] || {};
    var raw = block[id];
    if (!raw) return { p: "", i: "#" };
    var parts = String(raw).split("|");
    return { p: parts[0] || "", i: parts[1] || "#" };
  }

  /** 材料带上拼音字段（用于首字母排序与拼音搜索） */
  function decorateIngredient(i) {
    var py = pinyinOf("ingredients", i.id);
    return Object.assign({}, i, { py: py.p, initial: py.i, akaPy: String(i.aka || "").toLowerCase() });
  }

  /** 演示图库支持在后面加 /preview 取小图，其它图源直接用原图 */
  function thumbFor(url) {
    if (!url) return "";
    return /thecocktaildb\.com\/images\/media\/drink\//.test(url) ? url + "/preview" : url;
  }

  function buildDefaultState() {
    var s = {
      version: DATA_VERSION,
      ingredients: clone(window.SEED.ingredients),
      recipes: clone(window.SEED.recipes).map(normalizeRecipe),
      users: clone(window.SEED.users).map(normalizeUser),
      comments: seedComments(),
      reports: [],
      settings: clone(window.SEED.settings),
      sessionUserId: null,
      guestIngredients: []
    };
    return s;
  }

  /**
   * 老数据升级：保留用户自己的账号、配方、收藏，只补上新增的材料、配方、评论与新设置项。
   * 这样你之前打开的页面不会因为升级而"看不到新内容"。
   */
  function migrate(s) {
    if (!Array.isArray(s.ingredients)) s.ingredients = [];
    if (!Array.isArray(s.recipes)) s.recipes = [];
    if (!Array.isArray(s.users)) s.users = [];

    var haveIng = {};
    s.ingredients.forEach(function (i) { haveIng[i.id] = true; });
    var addedIng = 0;
    window.SEED.ingredients.forEach(function (i) {
      if (!haveIng[i.id]) { s.ingredients.push(clone(i)); addedIng++; }
    });

    var haveRec = {};
    s.recipes.forEach(function (r) { haveRec[r.id] = true; });
    var addedRec = 0;
    window.SEED.recipes.forEach(function (r) {
      if (!haveRec[r.id]) { s.recipes.push(clone(r)); addedRec++; }
    });

    s.recipes.forEach(normalizeRecipe);
    s.users.forEach(normalizeUser);

    // 早期版本的管理员密码较弱，升级时换成新的强密码（如果你自己改过就不会动）
    var admin = s.users.filter(function (u) { return u.username === "admin"; })[0];
    if (admin && admin.password === "admin123") admin.password = "Cocktail@2026";

    s.settings = Object.assign(clone(window.SEED.settings), s.settings || {});
    if (!Array.isArray(s.comments)) s.comments = seedComments();
    if (!Array.isArray(s.reports)) s.reports = [];

    // 站点更名：只有还停留在旧名字时才跟着改，你自己设过的名字不会被覆盖
    if (s.settings.siteName === "今晚喝什么") s.settings.siteName = "鸡尾酒法典";

    s.version = DATA_VERSION;
    console.log("[数据升级] 新增材料 " + addedIng + " 种，新增配方 " + addedRec + " 款");
    return s;
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.ingredients && parsed.recipes) {
          var oldVersion = parsed.version || 1;   // 先记下旧版本，migrate 会改写 version
          state = oldVersion < DATA_VERSION ? migrate(parsed) : parsed;
          state.settings = Object.assign(clone(window.SEED.settings), state.settings || {});
          state.comments = state.comments || [];
          state.reports = state.reports || [];
          state.users.forEach(normalizeUser);
          state.recipes.forEach(normalizeRecipe);
          if (oldVersion < DATA_VERSION) persist();
          return;
        }
      }
    } catch (e) {
      console.warn("读取本地数据失败，已重置为初始数据", e);
    }
    state = buildDefaultState();
    persist();
  }

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      console.warn("写入本地数据失败（可能是浏览器隐私模式或空间不足）", e);
    }
  }

  /* ---------------- 账号 ---------------- */

  function currentUser() {
    if (!state.sessionUserId) return null;
    return state.users.filter(function (u) { return u.id === state.sessionUserId; })[0] || null;
  }

  function isAdmin() {
    var u = currentUser();
    return !!(u && u.role === "admin");
  }

  function register(username, password) {
    username = String(username || "").trim();
    password = String(password || "");
    if (username.length < 2) return { ok: false, msg: "用户名至少 2 个字符" };
    if (password.length < 6) return { ok: false, msg: "密码至少 6 位" };
    var exists = state.users.some(function (u) { return u.username.toLowerCase() === username.toLowerCase(); });
    if (exists) return { ok: false, msg: "该用户名已被注册" };
    var user = {
      id: newId("u"), username: username, password: password,
      role: "user", nickname: username, intro: "",
      createdAt: nowISO(), favorites: [], myIngredients: []
    };
    state.users.push(user);
    state.sessionUserId = user.id;
    persist();
    return { ok: true, user: user };
  }

  function login(username, password) {
    username = String(username || "").trim().toLowerCase();
    var user = state.users.filter(function (u) {
      return u.username.toLowerCase() === username && u.password === String(password);
    })[0];
    if (!user) return { ok: false, msg: "用户名或密码不正确" };
    state.sessionUserId = user.id;
    persist();
    return { ok: true, user: user };
  }

  function logout() {
    state.sessionUserId = null;
    persist();
  }

  function updateUser(id, patch) {
    var u = state.users.filter(function (x) { return x.id === id; })[0];
    if (!u) return;
    Object.assign(u, patch);
    persist();
  }

  function deleteUser(id) {
    var me = currentUser();
    if (me && me.id === id) return { ok: false, msg: "不能删除当前登录的账号" };
    var admins = state.users.filter(function (u) { return u.role === "admin"; });
    var target = state.users.filter(function (u) { return u.id === id; })[0];
    if (target && target.role === "admin" && admins.length <= 1) {
      return { ok: false, msg: "至少要保留一个管理员" };
    }
    state.users = state.users.filter(function (u) { return u.id !== id; });
    if (state.sessionUserId === id) state.sessionUserId = null;
    persist();
    return { ok: true };
  }

  /* ---------------- 材料 ---------------- */

  function listIngredients() {
    return state.ingredients.map(decorateIngredient);
  }

  function getIngredient(id) {
    return state.ingredients.filter(function (i) { return i.id === id; })[0] || null;
  }

  function ingredientName(id) {
    var i = getIngredient(id);
    return i ? i.name : "(已删除材料:" + id + ")";
  }

  function addIngredient(data) {
    var name = String(data.name || "").trim();
    if (!name) return { ok: false, msg: "请填写材料名称" };
    var dup = state.ingredients.some(function (i) { return i.name === name; });
    if (dup) return { ok: false, msg: "该材料已存在" };
    var item = {
      id: newId("ing"),
      name: name,
      cat: data.cat || window.SEED.categories[0],
      emoji: data.emoji || "🍹",
      aka: data.aka || "",
      basic: !!data.basic
    };
    state.ingredients.push(item);
    persist();
    return { ok: true, item: item };
  }

  function updateIngredient(id, patch) {
    var item = getIngredient(id);
    if (!item) return { ok: false, msg: "材料不存在" };
    Object.assign(item, patch);
    persist();
    return { ok: true, item: item };
  }

  function deleteIngredient(id) {
    var item = getIngredient(id);
    if (!item) return { ok: false, msg: "材料不存在" };
    var affected = 0;
    state.recipes.forEach(function (r) {
      var before = r.ingredients.length;
      r.ingredients = r.ingredients.filter(function (x) { return x.id !== id; });
      if (r.ingredients.length !== before) affected++;
    });
    state.ingredients = state.ingredients.filter(function (i) { return i.id !== id; });
    persist();
    return { ok: true, affected: affected, name: item.name };
  }

  /* ---------------- 配方 ---------------- */

  function listRecipes() {
    return state.recipes.slice();
  }

  function getRecipe(id) {
    return state.recipes.filter(function (r) { return r.id === id; })[0] || null;
  }

  /** 当前用户能看到的配方（未登录：只有公开的；作者本人：能看到自己的待审核） */
  function visibleRecipes() {
    var me = currentUser();
    return state.recipes.filter(function (r) {
      if (r.status === "approved") return true;
      if (!me) return false;
      if (me.role === "admin") return true;
      return r.authorId === me.id;
    });
  }

  function addRecipe(data) {
    var me = currentUser();
    if (!me) return { ok: false, msg: "请先登录" };
    if (!can("publishRecipe")) {
      return { ok: false, msg: me.role === "admin" ? "发布失败" : "管理员暂时关闭了用户自助发布配方" };
    }
    if (!data.name || !String(data.name).trim()) return { ok: false, msg: "请填写酒名" };
    if (!data.ingredients || !data.ingredients.length) return { ok: false, msg: "至少添加一种材料" };
    var needReview = !!state.settings.needReview && me.role !== "admin";
    var recipe = {
      id: newId("r"),
      name: String(data.name).trim(),
      en: data.en || "",
      type: data.type === "classic" ? "classic" : "custom",
      emoji: data.emoji || "🍹",
      color: data.color || "#e0a94a",
      glass: data.glass || "",
      abv: data.abv || "",
      desc: data.desc || "",
      ingredients: data.ingredients,
      steps: data.steps || [],
      video: data.video || "",
      videoName: data.videoName || "",
      image: data.image || "",         // 用户上传时可以直接带图，没图就用 emoji 卡片
      imageThumb: data.image ? thumbFor(data.image) : "",
      tags: Array.isArray(data.tags) ? data.tags.slice(0, 8) : [],
      author: me.username,
      authorId: me.id,
      createdAt: nowISO(),
      views: 0,
      status: needReview ? "pending" : "approved"
    };
    state.recipes.unshift(recipe);
    persist();
    return { ok: true, recipe: recipe, needReview: needReview };
  }

  function updateRecipe(id, patch) {
    var r = getRecipe(id);
    if (!r) return { ok: false, msg: "配方不存在" };
    var me = currentUser();
    if (!me) return { ok: false, msg: "请先登录" };
    if (me.role !== "admin" && r.authorId !== me.id) return { ok: false, msg: "只能修改自己发布的配方" };
    Object.assign(r, patch);
    persist();
    return { ok: true, recipe: r };
  }

  function deleteRecipe(id) {
    var r = getRecipe(id);
    if (!r) return { ok: false, msg: "配方不存在" };
    var me = currentUser();
    if (!me) return { ok: false, msg: "请先登录" };
    if (me.role !== "admin" && r.authorId !== me.id) return { ok: false, msg: "只能删除自己发布的配方" };
    state.recipes = state.recipes.filter(function (x) { return x.id !== id; });
    state.comments = state.comments.filter(function (c) { return c.recipeId !== id; });   // 评论跟着配方一起清掉
    state.users.forEach(function (u) {
      u.favorites = (u.favorites || []).filter(function (fid) { return fid !== id; });
    });
    persist();
    return { ok: true };
  }

  function addView(id) {
    var r = getRecipe(id);
    if (r) { r.views = (r.views || 0) + 1; persist(); }
  }

  /** 任何登录用户都可以给配方补充/修正教学视频（站长可在后台关闭该权限） */
  function setRecipeVideo(id, url, name) {
    var me = currentUser();
    if (!me) return { ok: false, msg: "请先登录" };
    if (!state.settings.allowUserVideo && me.role !== "admin") return { ok: false, msg: "管理员已关闭用户补充视频的功能" };
    var r = getRecipe(id);
    if (!r) return { ok: false, msg: "配方不存在" };
    if (!/^https?:\/\//i.test(String(url || ""))) return { ok: false, msg: "请填写以 http/https 开头的完整链接" };
    r.video = String(url).trim();
    r.videoName = String(name || "").trim() || "观看教学视频";
    persist();
    return { ok: true, recipe: r };
  }

  /** 管理员给配方换图（支持图片链接，也支持上传后转成的 data:image） */
  function setRecipeImage(id, url) {
    var me = currentUser();
    if (!me) return { ok: false, msg: "请先登录" };
    if (me.role !== "admin") return { ok: false, msg: "只有管理员可以修改配方图片" };
    var r = getRecipe(id);
    if (!r) return { ok: false, msg: "配方不存在" };
    url = String(url || "").trim();
    if (url && !/^(https?:\/\/|data:image\/)/i.test(url)) {
      return { ok: false, msg: "请填写以 http/https 开头的图片链接" };
    }
    r.image = url;
    r.imageThumb = url ? thumbFor(url) : "";
    persist();
    return { ok: true, recipe: r };
  }

  /* ---------------- 收藏 ---------------- */

  function isFavorite(id) {
    var me = currentUser();
    if (!me) return false;
    return (me.favorites || []).indexOf(id) >= 0;
  }

  function toggleFavorite(id) {
    var me = currentUser();
    if (!me) return { ok: false, msg: "登录后才能收藏" };
    me.favorites = me.favorites || [];
    var idx = me.favorites.indexOf(id);
    if (idx >= 0) { me.favorites.splice(idx, 1); persist(); return { ok: true, fav: false }; }
    me.favorites.push(id);
    persist();
    return { ok: true, fav: true };
  }

  /* ---------------- 我的材料 ---------------- */

  function getMyIngredients() {
    var me = currentUser();
    if (me) return (me.myIngredients || []).slice();
    return (state.guestIngredients || []).slice();
  }

  function setMyIngredients(ids) {
    var me = currentUser();
    if (me) { me.myIngredients = ids.slice(); }
    else { state.guestIngredients = ids.slice(); }
    persist();
  }

  /* ---------------- 匹配算法 ---------------- */

  /**
   * 根据已有材料计算每款酒还差哪些材料。
   * 规则：
   *  - 标了 basic:true 的材料（冰块等）默认不参与计算；
   *  - optional:true 的材料（装饰用）不计入"差几种"，但会单独标出来；
   *  - 返回结果按"缺的材料数"分档，档内按材料使用率排序。
   */
  function matchRecipes(selectedIds, options) {
    options = options || {};
    var maxMissing = typeof options.maxMissing === "number" ? options.maxMissing : 3;
    var owned = {};
    (selectedIds || []).forEach(function (id) { owned[id] = true; });

    var onlyFav = !!options.onlyFav;
    var typeFilter = options.type || "all";
    var favs = currentUser() ? (currentUser().favorites || []) : [];

    var buckets = { ready: [], miss1: [], miss2: [], miss3: [], all: [] };
    // 一种材料都没勾选时不给结果，避免"什么都没选却显示差 2 种"的误导
    if (!(selectedIds || []).length) return buckets;

    var results = [];
    visibleRecipes().forEach(function (r) {
      if (r.status === "pending") return;
      if (typeFilter !== "all" && r.type !== typeFilter) return;
      if (onlyFav && favs.indexOf(r.id) < 0) return;

      var need = r.ingredients.filter(function (x) { return !getIngredient(x.id) || !getIngredient(x.id).basic; });
      if (!need.length) return;

      var missing = [], optionalMissing = [];
      need.forEach(function (x) {
        if (owned[x.id]) return;
        if (x.optional) optionalMissing.push(x);
        else missing.push(x);
      });
      if (missing.length > maxMissing) return;

      var have = need.length - missing.length - optionalMissing.length;
      results.push({
        recipe: r,
        missing: missing,
        optionalMissing: optionalMissing,
        haveCount: have,
        needCount: need.length,
        rate: need.length ? have / need.length : 1
      });
    });

    results.sort(function (a, b) {
      if (a.missing.length !== b.missing.length) return a.missing.length - b.missing.length;
      if (b.rate !== a.rate) return b.rate - a.rate;
      return (b.recipe.views || 0) - (a.recipe.views || 0);
    });

    results.forEach(function (item) {
      var key = item.missing.length === 0 ? "ready" : "miss" + item.missing.length;
      if (buckets[key]) buckets[key].push(item);
    });
    buckets.all = results;
    return buckets;
  }

  /* ---------------- 站点设置 / 数据备份 ---------------- */

  /* ================= 权限体系 =================
     角色只有两种，界限很清楚：
       普通用户 user ：浏览、收藏、勾选材料、发布配方、推荐/补充视频、发表评论、管理自己的内容
       管理员   admin：在上面全部基础上，增加材料库、配方审核、评论管理、用户管理、站点设置
     访客 guest：只能浏览，做任何写操作都会被提示先登录。  */

  var PERMISSIONS = {
    guest: ["browse"],
    user: [
      "browse", "favorite",
      "publishRecipe", "editOwnRecipe", "deleteOwnRecipe",
      "suggestVideo", "comment", "deleteOwnComment", "report"
    ]
  };

  function can(action) {
    var u = currentUser();
    var role = u ? u.role : "guest";
    if (role === "admin") return true;               // 管理员不受开关限制
    var allowed = PERMISSIONS[role] || PERMISSIONS.guest;
    if (allowed.indexOf(action) < 0) return false;
    var s = state.settings;
    if (action === "publishRecipe" && !s.allowUserPublish) return false;
    if (action === "suggestVideo" && !s.allowUserVideo) return false;
    if (action === "comment" && !s.allowUserComment) return false;
    if (action === "editOwnRecipe" && !s.allowUserEditOwnRecipe) return false;
    if (action === "deleteOwnRecipe" && !s.allowUserDeleteOwnRecipe) return false;
    if (action === "deleteOwnComment" && !s.allowUserDeleteOwnComment) return false;
    if (action === "report" && s.allowUserReport === false) return false;
    return true;
  }

  function roleLabel() {
    var u = currentUser();
    if (!u) return "游客";
    return u.role === "admin" ? "管理员" : "普通用户";
  }

  function permissionList() {
    var u = currentUser();
    var role = u ? u.role : "guest";
    var base = ["浏览配方库、材料库与评论区"];
    if (role === "admin") {
      return base.concat([
        "新增 / 编辑 / 删除任何材料",
        "审核、下架、删除任何配方",
        "管理全部评论（置顶、隐藏、删除）",
        "管理用户与管理员权限",
        "修改站点设置、备份与恢复数据"
      ]);
    }
    var list = base;
    if (role === "guest") return list.concat(["登录后可以发布配方、评论、收藏"]);
    list = list.concat(["发布经典 / 特调配方", "给任何配方推荐或补充教学视频", "发表评论、回复、点赞"]);
    if (state.settings.allowUserEditOwnRecipe) list.push("编辑自己发布的配方");
    if (state.settings.allowUserDeleteOwnRecipe) list.push("删除自己发布的配方");
    if (state.settings.allowUserDeleteOwnComment) list.push("删除自己的评论");
    list.push("不能修改材料库、他人的配方、他人的评论与站点设置");
    return list;
  }

  /* ================= 评论系统 ================= */

  function decorateComment(c) {
    var me = currentUser();
    var likes = c.likes || [];
    return {
      id: c.id,
      recipeId: c.recipeId,
      userId: c.userId,
      username: c.username,
      nickname: c.nickname || c.username,
      content: c.content,
      createdAt: c.createdAt,
      parentId: c.parentId || null,
      pinned: !!c.pinned,
      hidden: !!c.hidden,
      isAdmin: (state.users.filter(function (u) { return u.id === c.userId; })[0] || {}).role === "admin",
      likeCount: likes.length,
      liked: !!(me && likes.indexOf(me.id) >= 0),
      mine: !!(me && me.id === c.userId)
    };
  }

  /** 某款配方下的评论（含二级回复），管理员能看到被隐藏的内容 */
  function listComments(recipeId, options) {
    options = options || {};
    var sort = options.sort === "new" ? "new" : "hot";
    var me = currentUser();
    var all = state.comments.filter(function (c) {
      if (c.recipeId !== recipeId) return false;
      if (!c.hidden) return true;
      if (!me) return false;
      return me.role === "admin" || c.userId === me.id;
    });
    var tops = all.filter(function (c) { return !c.parentId; });
    function repliesOf(id) {
      return all.filter(function (c) { return c.parentId === id; })
        .sort(function (a, b) { return String(a.createdAt).localeCompare(String(b.createdAt)); })
        .map(decorateComment);
    }
    tops.sort(function (a, b) {
      if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
      if (sort === "hot") {
        var d = (b.likes || []).length - (a.likes || []).length;
        if (d) return d;
      }
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
    return tops.map(function (c) {
      var item = decorateComment(c);
      item.replies = repliesOf(c.id);
      return item;
    });
  }

  function countComments(recipeId) {
    var me = currentUser();
    return state.comments.filter(function (c) {
      if (c.recipeId !== recipeId) return false;
      if (!c.hidden) return true;
      return !!(me && (me.role === "admin" || c.userId === me.id));
    }).length;
  }

  function addComment(recipeId, content, parentId) {
    var me = currentUser();
    if (!me) return { ok: false, msg: "请先登录后再发表评论" };
    if (!can("comment")) return { ok: false, msg: "管理员暂时关闭了评论功能" };
    content = String(content || "").trim();
    if (!content) return { ok: false, msg: "评论内容不能为空" };
    if (content.length > 500) return { ok: false, msg: "评论最多 500 个字" };
    if (!getRecipe(recipeId)) return { ok: false, msg: "配方不存在" };
    if (parentId) {
      var parent = state.comments.filter(function (c) { return c.id === parentId; })[0];
      if (!parent) return { ok: false, msg: "要回复的评论不存在" };
      if (parent.parentId) parentId = parent.parentId;   // 只做两级，回复的回复归到同一层
    }
    var c = {
      id: newId("c"), recipeId: recipeId, userId: me.id, username: me.username,
      nickname: me.nickname || me.username, content: content,
      createdAt: new Date().toISOString(), parentId: parentId || null,
      likes: [], pinned: false, hidden: false
    };
    state.comments.push(c);
    persist();
    return { ok: true, comment: decorateComment(c) };
  }

  function deleteComment(id) {
    var me = currentUser();
    if (!me) return { ok: false, msg: "请先登录" };
    var target = state.comments.filter(function (c) { return c.id === id; })[0];
    if (!target) return { ok: false, msg: "评论不存在" };
    if (me.role !== "admin") {
      if (target.userId !== me.id) return { ok: false, msg: "只能删除自己的评论" };
      if (!can("deleteOwnComment")) return { ok: false, msg: "管理员关闭了删除自己评论的权限" };
    }
    // 删主楼时连同回复一起删
    state.comments = state.comments.filter(function (c) { return c.id !== id && c.parentId !== id; });
    persist();
    return { ok: true };
  }

  function toggleCommentLike(id) {
    var me = currentUser();
    if (!me) return { ok: false, msg: "登录后才能点赞" };
    var c = state.comments.filter(function (x) { return x.id === id; })[0];
    if (!c) return { ok: false, msg: "评论不存在" };
    c.likes = c.likes || [];
    var i = c.likes.indexOf(me.id);
    if (i >= 0) c.likes.splice(i, 1); else c.likes.push(me.id);
    persist();
    return { ok: true, liked: i < 0, count: c.likes.length };
  }

  function setCommentFlags(id, patch) {
    var me = currentUser();
    if (!me || me.role !== "admin") return { ok: false, msg: "只有管理员可以操作" };
    var c = state.comments.filter(function (x) { return x.id === id; })[0];
    if (!c) return { ok: false, msg: "评论不存在" };
    if (typeof patch.pinned === "boolean") c.pinned = patch.pinned;
    if (typeof patch.hidden === "boolean") c.hidden = patch.hidden;
    persist();
    return { ok: true };
  }

  /** 后台评论管理用的全量列表 */
  function adminComments(options) {
    options = options || {};
    var q = String(options.q || "").trim().toLowerCase();
    var list = state.comments.slice();
    if (options.onlyHidden) list = list.filter(function (c) { return c.hidden; });
    if (q) {
      list = list.filter(function (c) {
        var r = getRecipe(c.recipeId);
        var hay = [c.content, c.username, c.nickname, r ? r.name : ""].join(" ").toLowerCase();
        return hay.indexOf(q) >= 0;
      });
    }
    list.sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
    return list.map(function (c) {
      var r = getRecipe(c.recipeId);
      var item = decorateComment(c);
      item.recipeName = r ? r.name : "(配方已删除)";
      item.replyCount = state.comments.filter(function (x) { return x.parentId === c.id; }).length;
      return item;
    });
  }

  function commentStats() {
    var today = new Date().toISOString().slice(0, 10);
    return {
      total: state.comments.length,
      today: state.comments.filter(function (c) { return String(c.createdAt).slice(0, 10) === today; }).length,
      hidden: state.comments.filter(function (c) { return c.hidden; }).length,
      pinned: state.comments.filter(function (c) { return c.pinned; }).length,
      users: Object.keys(state.comments.reduce(function (acc, c) { acc[c.userId] = 1; return acc; }, {})).length
    };
  }

  /* ================= 检索 ================= */

  /* ================= 勘误（用户报错，管理员处理） ================= */

  var REPORT_TYPES = ["图片有误", "材料有误", "用量有误", "步骤有误", "标签有误", "材料库有误", "其他问题"];

  function reportTypes() { return REPORT_TYPES.slice(); }

  function addReport(recipeId, data) {
    var me = currentUser();
    if (!me) return { ok: false, msg: "请先登录后再提交勘误" };
    if (!can("report")) return { ok: false, msg: "管理员暂时关闭了勘误提交" };
    var content = String((data && data.content) || "").trim();
    if (content.length < 4) return { ok: false, msg: "请把问题写得再具体一点（至少 4 个字）" };
    if (content.length > 300) return { ok: false, msg: "说明最多 300 个字" };
    var r = recipeId ? getRecipe(recipeId) : null;
    if (recipeId && !r) return { ok: false, msg: "配方不存在" };
    var rep = {
      id: newId("rep"),
      recipeId: recipeId || null,
      recipeName: r ? r.name : "材料库",
      type: REPORT_TYPES.indexOf(data.type) >= 0 ? data.type : "其他问题",
      content: content,
      suggest: String((data && data.suggest) || "").trim().slice(0, 200),
      userId: me.id, username: me.username, nickname: me.nickname || me.username,
      status: "pending", createdAt: new Date().toISOString(),
      handledBy: "", handledAt: ""
    };
    state.reports.push(rep);
    persist();
    return { ok: true, report: rep };
  }

  function decorateReport(rep) {
    var out = Object.assign({}, rep);
    var u = state.users.filter(function (x) { return x.id === rep.userId; })[0];
    out.userIsAdmin = !!(u && u.role === "admin");
    return out;
  }

  function listReports(options) {
    options = options || {};
    var list = (state.reports || []).slice();
    if (options.status && options.status !== "all") list = list.filter(function (r) { return r.status === options.status; });
    if (options.recipeId) list = list.filter(function (r) { return r.recipeId === options.recipeId; });
    var q = String(options.q || "").trim().toLowerCase();
    if (q) {
      list = list.filter(function (r) {
        return [r.content, r.suggest, r.recipeName, r.username, r.type].join(" ").toLowerCase().indexOf(q) >= 0;
      });
    }
    list.sort(function (a, b) {
      if (a.status === "pending" && b.status !== "pending") return -1;
      if (b.status === "pending" && a.status !== "pending") return 1;
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
    return list.map(decorateReport);
  }

  function reportStats() {
    var list = state.reports || [];
    var today = new Date().toISOString().slice(0, 10);
    return {
      total: list.length,
      pending: list.filter(function (r) { return r.status === "pending"; }).length,
      done: list.filter(function (r) { return r.status === "done"; }).length,
      ignored: list.filter(function (r) { return r.status === "ignored"; }).length,
      today: list.filter(function (r) { return String(r.createdAt).slice(0, 10) === today; }).length
    };
  }

  function updateReport(id, patch) {
    var me = currentUser();
    if (!me || me.role !== "admin") return { ok: false, msg: "只有管理员可以处理勘误" };
    var rep = (state.reports || []).filter(function (x) { return x.id === id; })[0];
    if (!rep) return { ok: false, msg: "记录不存在" };
    if (patch.status) {
      rep.status = patch.status;
      rep.handledBy = me.username;
      rep.handledAt = new Date().toISOString();
    }
    if (typeof patch.note === "string") rep.note = patch.note;
    persist();
    return { ok: true, report: rep };
  }

  function deleteReport(id) {
    var me = currentUser();
    if (!me || me.role !== "admin") return { ok: false, msg: "只有管理员可以删除" };
    state.reports = (state.reports || []).filter(function (x) { return x.id !== id; });
    persist();
    return { ok: true };
  }

  /** 材料检索：支持名称、英文别名、分类，多个关键词用空格分隔 */
  function searchIngredients(q, cat) {
    var terms = String(q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    return state.ingredients.map(decorateIngredient).filter(function (i) {
      if (cat && cat !== "全部" && i.cat !== cat) return false;
      if (!terms.length) return true;
      // 中文名 / 英文别名 / 拼音全拼 / 拼音首字母 都能搜到
      var hay = [i.name, i.aka, i.cat, i.emoji, i.py, i.initial].join(" ").toLowerCase();
      return terms.every(function (t) { return hay.indexOf(t) >= 0; });
    });
  }

  /** 配方检索：关键词（空格分词）+ 分类/基酒/酒感/收藏/只看能调 + 多种排序 */
  function searchRecipes(options) {
    options = options || {};
    var terms = String(options.q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
    var me = currentUser();
    var favs = me ? (me.favorites || []) : [];
    var mine = (options.myIngredients || []).slice();
    var owned = {};
    mine.forEach(function (id) { owned[id] = true; });

    var list = visibleRecipes().filter(function (r) { return r.status !== "pending"; });

    if (options.type && options.type !== "all") list = list.filter(function (r) { return r.type === options.type; });
    if (options.abv && options.abv !== "all") list = list.filter(function (r) { return r.abv === options.abv; });
    if (options.base && options.base !== "all") {
      list = list.filter(function (r) {
        return r.ingredients.some(function (x) {
          var ing = getIngredient(x.id);
          return x.id === options.base || (ing && ing.aka && ing.aka.toLowerCase() === String(options.base).toLowerCase());
        });
      });
    }
    if (options.onlyFav) list = list.filter(function (r) { return favs.indexOf(r.id) >= 0; });
    if (options.authorId) list = list.filter(function (r) { return r.authorId === options.authorId; });

    // 口味标签筛选：默认「同时满足所有标签」，可选「满足任一标签」
    if (options.tags && options.tags.length) {
      var mode = options.tagMode === "any" ? "any" : "all";
      list = list.filter(function (r) {
        var rt = r.tags || [];
        if (mode === "any") {
          return options.tags.some(function (t) { return rt.indexOf(t) >= 0; });
        }
        return options.tags.every(function (t) { return rt.indexOf(t) >= 0; });
      });
    }

    if (terms.length) {
      list = list.filter(function (r) {
        var ingText = r.ingredients.map(function (x) { return ingredientName(x.id); }).join(" ");
        var hay = [r.name, r.en, r.desc, r.author, r.glass, r.abv, ingText, r.py, r.initial].join(" ").toLowerCase();
        return terms.every(function (t) { return hay.indexOf(t) >= 0; });
      });
    }

    // 计算差缺情况（勾了材料才有意义）
    list = list.map(function (r) {
      var need = r.ingredients.filter(function (x) {
        var ing = getIngredient(x.id);
        return !ing || !ing.basic;
      });
      var missing = need.filter(function (x) { return !owned[x.id] && !x.optional; }).map(function (x) { return x.id; });
      var copy = Object.assign({}, r);
      copy._needCount = need.length;
      // 一种材料都没勾选时不要显示「差 X 种」，否则每款酒都像缺很多东西
      copy._missing = mine.length ? missing : null;
      return copy;
    });

    if (options.onlyMakeable && mine.length) {
      list = list.filter(function (r) { return r._missing.length === 0; });
    }

    var sort = options.sort || "hot";
    list.sort(function (a, b) {
      if (sort === "new") return String(b.createdAt).localeCompare(String(a.createdAt));
      if (sort === "name") return a.name.localeCompare(b.name, "zh");
      if (sort === "easy") return a._needCount - b._needCount;
      if (sort === "match" && mine.length) {
        if (a._missing.length !== b._missing.length) return a._missing.length - b._missing.length;
        return (b.views || 0) - (a.views || 0);
      }
      return (b.views || 0) - (a.views || 0);
    });
    return list;
  }

  /** 统计配方库里做基酒用的材料（用于筛选下拉） */
  function baseSpirits() {
    var baseCat = "基酒";
    var used = {};
    state.recipes.forEach(function (r) {
      r.ingredients.forEach(function (x) {
        var ing = getIngredient(x.id);
        if (ing && ing.cat === baseCat) used[x.id] = (used[x.id] || 0) + 1;
      });
    });
    return Object.keys(used).map(function (id) {
      return { id: id, name: ingredientName(id), count: used[id] };
    }).sort(function (a, b) { return b.count - a.count; });
  }

  /* ================= 标签 ================= */

  function tagGroups() {
    return clone(window.SEED.tagGroups || []);
  }

  function allTags() {
    var out = [];
    tagGroups().forEach(function (g) { g.tags.forEach(function (t) { if (out.indexOf(t) < 0) out.push(t); }); });
    // 用户自己敲的标签也一起纳入
    state.recipes.forEach(function (r) {
      (r.tags || []).forEach(function (t) { if (out.indexOf(t) < 0) out.push(t); });
    });
    return out;
  }

  /** 每个标签下有多少款酒（用于「想喝啥」页面的角标） */
  function tagCounts() {
    var counts = {};
    visibleRecipes().forEach(function (r) {
      if (r.status !== "approved") return;
      (r.tags || []).forEach(function (t) { counts[t] = (counts[t] || 0) + 1; });
    });
    return counts;
  }

  /** 根据标签随机推荐一杯（没选标签就从全部里抽） */
  function randomRecipe(tags, tagMode) {
    var list = searchRecipes({ tags: tags || [], tagMode: tagMode || "all" });
    if (!list.length) return null;
    return list[Math.floor(Math.random() * list.length)];
  }

  /** 本地存储占用情况（用户上传的图片会占空间，后台可以看这个数字） */
  function storageInfo() {
    var raw = "";
    try { raw = localStorage.getItem(KEY) || ""; } catch (e) { raw = ""; }
    var bytes = raw.length;
    return {
      bytes: bytes,
      kb: Math.round(bytes / 1024),
      mb: Math.round(bytes / 1024 / 1024 * 10) / 10,
      percent: Math.min(100, Math.round(bytes / (5 * 1024 * 1024) * 100))
    };
  }

  /** 补货推荐：再买哪几种材料，能解锁最多新酒 */
  function suggestRestock(selectedIds, limit) {
    var buckets = matchRecipes(selectedIds, { maxMissing: 3 });
    var score = {};
    buckets.miss1.concat(buckets.miss2, buckets.miss3).forEach(function (item) {
      item.missing.forEach(function (x) {
        var rec = score[x.id] || (score[x.id] = { id: x.id, name: ingredientName(x.id), direct: 0, total: 0, recipes: [] });
        if (item.missing.length === 1) rec.direct++;
        rec.total++;
        if (rec.recipes.length < 3) rec.recipes.push(item.recipe.name);
      });
    });
    var arr = Object.keys(score).map(function (k) { return score[k]; });
    arr.sort(function (a, b) {
      if (b.direct !== a.direct) return b.direct - a.direct;
      return b.total - a.total;
    });
    return arr.slice(0, limit || 6);
  }

  function getSettings() { return state.settings; }

  function updateSettings(patch) {
    Object.assign(state.settings, patch);
    persist();
  }

  function exportJSON() {
    return JSON.stringify(state, null, 2);
  }

  function importJSON(text) {
    try {
      var parsed = JSON.parse(text);
      if (!parsed || !parsed.ingredients || !parsed.recipes || !parsed.users) {
        return { ok: false, msg: "文件结构不对，缺少必要字段" };
      }
      state = (parsed.version || 1) < DATA_VERSION ? migrate(parsed) : parsed;
      state.settings = Object.assign(clone(window.SEED.settings), state.settings || {});
      state.comments = state.comments || [];
      state.reports = state.reports || [];
      state.users.forEach(normalizeUser);
      state.recipes.forEach(normalizeRecipe);
      state.sessionUserId = null;
      persist();
      return { ok: true };
    } catch (e) {
      return { ok: false, msg: "JSON 解析失败：" + e.message };
    }
  }

  function resetAll() {
    state = buildDefaultState();
    persist();
  }

  /* ---------------- 对外接口 ---------------- */

  window.Store = {
    init: load,
    categories: function () { return window.SEED.categories.slice(); },
    nowISO: nowISO,

    // 账号
    currentUser: currentUser,
    isAdmin: isAdmin,
    register: register,
    login: login,
    logout: logout,
    users: function () { return state.users.slice(); },
    updateUser: updateUser,
    deleteUser: deleteUser,

    // 材料
    listIngredients: listIngredients,
    getIngredient: getIngredient,
    ingredientName: ingredientName,
    addIngredient: addIngredient,
    updateIngredient: updateIngredient,
    deleteIngredient: deleteIngredient,

    // 配方
    listRecipes: listRecipes,
    visibleRecipes: visibleRecipes,
    getRecipe: getRecipe,
    addRecipe: addRecipe,
    updateRecipe: updateRecipe,
    deleteRecipe: deleteRecipe,
    addView: addView,
    setRecipeVideo: setRecipeVideo,
    setRecipeImage: setRecipeImage,

    // 收藏 / 我的材料
    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    getMyIngredients: getMyIngredients,
    setMyIngredients: setMyIngredients,

    // 匹配
    matchRecipes: matchRecipes,
    suggestRestock: suggestRestock,

    // 权限
    can: can,
    roleLabel: roleLabel,
    permissionList: permissionList,

    // 评论
    listComments: listComments,
    countComments: countComments,
    addComment: addComment,
    deleteComment: deleteComment,
    toggleCommentLike: toggleCommentLike,
    setCommentFlags: setCommentFlags,
    adminComments: adminComments,
    commentStats: commentStats,

    // 检索
    searchRecipes: searchRecipes,
    searchIngredients: searchIngredients,
    baseSpirits: baseSpirits,

    // 标签
    tagGroups: tagGroups,
    allTags: allTags,
    tagCounts: tagCounts,
    randomRecipe: randomRecipe,
    storageInfo: storageInfo,

    // 勘误
    reportTypes: reportTypes,
    addReport: addReport,
    listReports: listReports,
    reportStats: reportStats,
    updateReport: updateReport,
    deleteReport: deleteReport,

    // 设置与数据
    getSettings: getSettings,
    updateSettings: updateSettings,
    exportJSON: exportJSON,
    importJSON: importJSON,
    resetAll: resetAll
  };
})();
