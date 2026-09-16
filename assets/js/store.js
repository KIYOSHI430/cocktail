/* 数据层：本地存储（localStorage）、账号、配方/材料增删改查、材料匹配算法。
   原型阶段全部数据存在浏览器本地；以后接后端时，只需要把这层的函数改成接口请求。 */

(function () {
  "use strict";

  var KEY = "cocktail_app_v1";
  var state = null;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function nowISO() { return new Date().toISOString().slice(0, 10); }

  function newId(prefix) {
    return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ---------------- 初始化 ---------------- */

  function buildDefaultState() {
    var s = {
      version: 1,
      ingredients: clone(window.SEED.ingredients),
      recipes: clone(window.SEED.recipes).map(function (r) {
        r.status = "approved";      // approved 公开 / pending 待审核 / hidden 已下架
        r.author = r.author || "官方";
        r.authorId = r.authorId || "u-admin";
        r.createdAt = r.createdAt || "2026-01-01";
        r.views = r.views || 0;
        r.video = r.video || "";
        r.videoName = r.videoName || "";
        return r;
      }),
      users: clone(window.SEED.users).map(function (u) {
        u.favorites = [];
        u.myIngredients = [];
        return u;
      }),
      settings: clone(window.SEED.settings),
      sessionUserId: null,
      guestIngredients: []
    };
    return s;
  }

  function load() {
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.ingredients && parsed.recipes) {
          state = parsed;
          state.settings = Object.assign(clone(window.SEED.settings), state.settings || {});
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
      role: "user", createdAt: nowISO(), favorites: [], myIngredients: []
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
    return state.ingredients.slice();
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
      state = parsed;
      state.settings = Object.assign(clone(window.SEED.settings), state.settings || {});
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

    // 收藏 / 我的材料
    isFavorite: isFavorite,
    toggleFavorite: toggleFavorite,
    getMyIngredients: getMyIngredients,
    setMyIngredients: setMyIngredients,

    // 匹配
    matchRecipes: matchRecipes,

    // 设置与数据
    getSettings: getSettings,
    updateSettings: updateSettings,
    exportJSON: exportJSON,
    importJSON: importJSON,
    resetAll: resetAll
  };
})();
