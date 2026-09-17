/* 数据层：本地存储（localStorage）、账号、配方/材料增删改查、材料匹配算法。
   原型阶段全部数据存在浏览器本地；以后接后端时，只需要把这层的函数改成接口请求。 */

(function () {
  "use strict";

  var KEY = "cocktail_app_v1";
  var DATA_VERSION = 6;   // v6：帖子加酒款标签与收藏

  /** 早期版本的示例帖，上线前清理掉（只删示例账号发的同名帖） */
  var REMOVED_SEED_POSTS = [
    "分享一个在家做透明大冰块的方法",
    "喝了二十来款经典之后，按难度排个序",
    "尼格罗尼试了三种比例，说说感受"
  ];
  var state = null;

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  function nowISO() { return new Date().toISOString().slice(0, 10); }

  function newId(prefix) {
    return prefix + "-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  /* ================= 密码哈希 =================
     原型阶段没有后端，但也绝不能明文存密码：
       存的是 salt + 反复迭代的 SHA-256 结果，登录时重新算一遍比对。
     同一个密码每次注册都会得到不同的哈希（因为有随机 salt）。
     注意：这是本地哈希，强度不如服务端的 bcrypt/scrypt；
          正式上线接后端后，密码应改由服务端用 bcrypt/scrypt 处理。 */

  var HASH_ROUNDS = 12000;

  function sha256(msg) {
    function rrot(x, n) { return (x >>> n) | (x << (32 - n)); }
    var K = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    var H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    var bytes = [], i, c;
    for (i = 0; i < msg.length; i++) {
      c = msg.charCodeAt(i);
      if (c < 128) bytes.push(c);
      else if (c < 2048) bytes.push(192 | (c >> 6), 128 | (c & 63));
      else bytes.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
    }
    var bitLen = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    bytes.push(0, 0, 0, 0,
      (bitLen >>> 24) & 255, (bitLen >>> 16) & 255, (bitLen >>> 8) & 255, bitLen & 255);

    var w = new Array(64);
    for (var off = 0; off < bytes.length; off += 64) {
      for (i = 0; i < 16; i++) {
        w[i] = (bytes[off + i * 4] << 24) | (bytes[off + i * 4 + 1] << 16) |
               (bytes[off + i * 4 + 2] << 8) | bytes[off + i * 4 + 3];
      }
      for (i = 16; i < 64; i++) {
        var s0 = rrot(w[i - 15], 7) ^ rrot(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        var s1 = rrot(w[i - 2], 17) ^ rrot(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      var a = H[0], b = H[1], cc = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
      for (i = 0; i < 64; i++) {
        var S1 = rrot(e, 6) ^ rrot(e, 11) ^ rrot(e, 25);
        var ch = (e & f) ^ (~e & g);
        var t1 = (h + S1 + ch + K[i] + w[i]) | 0;
        var S0 = rrot(a, 2) ^ rrot(a, 13) ^ rrot(a, 22);
        var maj = (a & b) ^ (a & cc) ^ (b & cc);
        var t2 = (S0 + maj) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0;
        d = cc; cc = b; b = a; a = (t1 + t2) | 0;
      }
      H[0] = (H[0] + a) | 0; H[1] = (H[1] + b) | 0; H[2] = (H[2] + cc) | 0; H[3] = (H[3] + d) | 0;
      H[4] = (H[4] + e) | 0; H[5] = (H[5] + f) | 0; H[6] = (H[6] + g) | 0; H[7] = (H[7] + h) | 0;
    }
    return H.map(function (x) { return ("00000000" + (x >>> 0).toString(16)).slice(-8); }).join("");
  }

  function makeSalt() {
    return sha256(String(Date.now()) + Math.random() + Math.random()).slice(0, 24);
  }

  /** 加盐 + 迭代哈希，返回十六进制字符串 */
  function hashPassword(password, salt) {
    var h = salt + "|" + String(password || "");
    for (var i = 0; i < HASH_ROUNDS; i++) h = sha256(h + "|" + salt + "|" + i);
    return h;
  }

  /** 把账号里的明文密码换成哈希（老数据升级时调用） */
  function hashifyPassword(u) {
    if (u.password && !u.hash) {
      u.salt = u.salt || makeSalt();
      u.hash = hashPassword(u.password, u.salt);
      delete u.password;
    }
    if (!u.salt) u.salt = makeSalt();
    return u;
  }

  function checkPassword(u, password) {
    if (u && u.hash && u.salt) return hashPassword(password, u.salt) === u.hash;
    return false;
  }

  /** 立刻修改某个账号的密码（同样只存哈希） */
  function setPassword(userId, newPassword) {
    var u = state.users.filter(function (x) { return x.id === userId; })[0];
    if (!u) return { ok: false, msg: "账号不存在" };
    if (String(newPassword || "").length < 6) return { ok: false, msg: "密码至少 6 位" };
    if (cloudOn()) {
      cloudSync("changePassword", {
        oldPwd: arguments[2] || "", newPwd: newPassword, confirmPwd: newPassword
      });
      return { ok: true };
    }
    u.salt = makeSalt();
    u.hash = hashPassword(newPassword, u.salt);
    delete u.password;
    persist();
    return { ok: true };
  }

  /* ---------------- 初始化 ---------------- */

  /* ================= 云端模式 =================
     开启后：
       - 打开页面先调一次 bootstrap，把「材料 / 配方 / 帖子 / 评论 / 设置 / 当前用户」整包拉下来
       - 之后界面上的读操作都在内存里跑（原来的同步代码照旧）
       - 写操作本地先乐观更新（界面立刻有反应），同时异步提交到云函数
     这样界面代码一行都不用改。 */

  var CLOUD = { url: "", token: "", on: false, ready: false, error: "", user: null };
  var TOKEN_KEY = "cocktail_cloud_token";

  function cloudOn() { return !!CLOUD.on; }

  function cloudCall(action, payload) {
    if (!cloudOn()) return Promise.resolve({ ok: false, msg: "未开启云端模式" });
    return fetch(CLOUD.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-token": CLOUD.token || "" },
      body: JSON.stringify({ action: action, payload: payload || {}, token: CLOUD.token || "" })
    }).then(function (r) { return r.json(); }).catch(function (e) {
      return { ok: false, msg: "网络错误：" + (e && e.message ? e.message : e) };
    });
  }

  /** 把云端返回的当前用户同步进本地 state（界面里到处都在读 state.users） */
  function applyCloudUser(u) {
    if (!u) {
      state.users = [];
      state.sessionUserId = null;
      return null;
    }
    var local = {
      id: u.id, username: u.username, email: u.email || "", phone: u.phone || "",
      nickname: u.nickname || u.username, role: u.role || "user",
      intro: u.intro || "", createdAt: u.createdAt || "",
      favorites: u.favorites || [], postFavorites: u.postFavorites || [],
      myIngredients: u.myIngredients || []
    };
    /* 注意：管理员登录时 bootstrap 会带回全部用户名单，这里要把自己"并"进名单，
       不能直接覆盖，否则管理后台的用户管理里就只剩自己一个人了。 */
    var others = (state.users || []).filter(function (x) { return x.id !== local.id; });
    state.users = [local].concat(others);
    state.sessionUserId = local.id;
    return local;
  }

  /** 云端整套数据落到本地内存（并写一份缓存） */
  function applyBootstrap(data) {
    if (data.ingredients) state.ingredients = data.ingredients;
    if (data.recipes) state.recipes = data.recipes;
    if (data.posts) state.posts = data.posts;
    if (data.comments) state.comments = data.comments;
    if (data.settings) state.settings = Object.assign(clone(window.SEED.settings), data.settings);
    // 用户名单以云端为准：管理员会拿到全部用户，普通访客拿到空名单
    state.users = data.users || [];
    applyCloudUser(data.user);
    CLOUD.ready = true;
    persist();
  }

  /**
   * 开启云端模式并拉取数据。
   * 返回 Promise，完成后调用方重新 render 一次即可。
   */
  function initCloud(options) {
    options = options || {};
    CLOUD.url = String(options.api || "").trim();
    if (!CLOUD.url) { CLOUD.on = false; return Promise.resolve({ ok: false, msg: "未配置云函数地址" }); }
    CLOUD.on = true;
    try { CLOUD.token = localStorage.getItem(TOKEN_KEY) || ""; } catch (e) { CLOUD.token = ""; }
    return cloudCall("bootstrap").then(function (res) {
      if (!res.ok) {
        CLOUD.error = res.msg || "拉取数据失败";
        console.error("[cloud] bootstrap 失败：", CLOUD.error);
        return res;
      }
      applyBootstrap(res.data);
      console.log("[cloud] 已连接：材料 " + state.ingredients.length + " 种，配方 " + state.recipes.length + " 款");
      return res;
    });
  }

  function setToken(t) {
    CLOUD.token = t || "";
    try { localStorage.setItem(TOKEN_KEY, CLOUD.token); } catch (e) { /* 忽略 */ }
  }

  /** 写操作提交到云端；失败时发一个事件，由界面提示用户 */
  function cloudSync(action, payload, onDone) {
    if (!cloudOn()) return;
    cloudCall(action, payload).then(function (res) {
      if (!res.ok) {
        console.warn("[cloud] " + action + " 失败：" + res.msg);
        try {
          document.dispatchEvent(new CustomEvent("cloud-error", { detail: { action: action, msg: res.msg } }));
        } catch (e) { /* 忽略 */ }
      } else if (onDone) {
        onDone(res.data);
      }
    });
  }

  /** 云端模式下重新拉一次数据（登录、数据结构变化后用） */
  function refresh() {
    if (!cloudOn()) return Promise.resolve({ ok: false });
    return cloudCall("bootstrap").then(function (res) {
      if (res.ok) applyBootstrap(res.data);
      return res;
    });
  }

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

  /** 把种子里的示例帖换算成真实时间，并补上作者信息 */
  function seedPosts() {
    var now = Date.now();
    function authorOf(key) {
      var u = window.SEED.users.filter(function (x) { return x.username === key; })[0];
      return u || { id: "u-" + key, username: key, nickname: key };
    }
    return clone(window.SEED.posts || []).map(function (p) {
      var a = p.authorId
        ? (window.SEED.users.filter(function (x) { return x.id === p.authorId; })[0] ||
           { id: p.authorId, username: p.authorKey || p.authorId, nickname: p.authorKey || p.authorId })
        : authorOf(p.authorKey || "admin");
      return {
        id: p.id || newId("post"),
        title: p.title,
        content: p.content,
        images: [],
        category: p.category || "闲聊",
        recipeTags: (p.recipeTags || []).slice(0, 3),
        authorId: a.id, username: a.username, nickname: a.nickname || a.username,
        createdAt: new Date(now - (p.hoursAgo || 0) * 3600 * 1000).toISOString(),
        status: "approved",
        review: { source: "rule", risk: 0, reasons: [], at: new Date().toISOString() },
        rejectReason: "", likes: p.likes || [], views: 0,
        comments: (p.comments || []).map(function (c) {
          var ca = c.authorId
            ? (window.SEED.users.filter(function (x) { return x.id === c.authorId; })[0] ||
               { id: c.authorId, username: c.authorKey || c.authorId, nickname: c.authorKey || c.authorId })
            : authorOf(c.authorKey || "demo");
          return {
            id: newId("pc"), userId: ca.id, username: ca.username, nickname: ca.nickname || ca.username,
            content: c.content, createdAt: new Date(now - (c.hoursAgo || 0) * 3600 * 1000).toISOString(), likes: []
          };
        })
      };
    });
  }

  function normalizeUser(u) {
    u.favorites = u.favorites || [];
    u.postFavorites = u.postFavorites || [];
    u.myIngredients = u.myIngredients || [];
    u.nickname = u.nickname || u.username;
    u.email = u.email || "";
    u.phone = u.phone || "";
    u.intro = u.intro || "";
    u.createdAt = u.createdAt || nowISO();
    hashifyPassword(u);      // 老数据里的明文密码会在这里被换成哈希
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
    var alias = ((window.SEED.aliases || {}).ingredients || {})[i.id] || "";
    return Object.assign({}, i, {
      py: py.p, initial: py.i,
      alias: alias,
      akaPy: String(i.aka || "").toLowerCase()
    });
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
      posts: seedPosts(),
      dailyOverride: null,
      settings: clone(window.SEED.settings),
      sessionUserId: null,
      guestIngredients: [],
      verifyCodes: {}
    };
    return s;
  }

  /**
   * 把「种子里的新内容」补进用户已有的数据里：
   *   新增的材料、新增的配方、新增的示例帖。
   * 这个操作是**幂等**的（按 id / 标题去重），所以每次打开页面都可以安全地跑一遍，
   * 不用再依赖"记得改版本号"——避免出现"新加了酒谱但老用户看不到"的问题。
   * 用户自己发布的内容、收藏、设置都不会被动。
   */
  function mergeSeedData(s) {
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

    // 新增的酒款标签
    s.recipes.forEach(function (r) {
      if (!Array.isArray(r.tags) || !r.tags.length) {
        var t = (window.SEED.tags || {})[r.id];
        if (t) r.tags = t.slice();
      }
    });

    s.recipes.forEach(normalizeRecipe);
    s.users.forEach(normalizeUser);

    // 管理员账号升级：老版本是"用户名 admin + 明文密码"，后来是手机号，
    // 现在统一用邮箱登录。只在对应字段还空着时补，之后你在后台改过的都不会被覆盖。
    var seedAdmin = (window.SEED.users || []).filter(function (u) { return u.role === "admin"; })[0];
    if (seedAdmin) {
      var adm = s.users.filter(function (u) { return u.id === "u-admin"; })[0] ||
                s.users.filter(function (u) { return u.role === "admin"; })[0];
      if (adm && !adm.email) adm.email = seedAdmin.email;
      if (adm && "17345930612" === adm.username) adm.username = seedAdmin.username;
      if (adm && !adm.phone) {
        adm.id = "u-admin";
        adm.phone = seedAdmin.phone;
        adm.username = seedAdmin.username;
        adm.nickname = adm.nickname || seedAdmin.nickname;
        adm.role = "admin";
        adm.salt = seedAdmin.salt;
        adm.hash = seedAdmin.hash;
        delete adm.password;
      }
    }

    // 新的示例帖（按标题去重）
    var seedPs = seedPosts();
    if (!Array.isArray(s.posts)) s.posts = seedPs;
    else {
      // 清理掉不再保留的示例帖（只删示例账号发的、标题对得上的，不会误删用户自己的帖子）
      s.posts = s.posts.filter(function (p) {
        var isSeedAuthor = p.authorId === "u-admin" || p.authorId === "u-demo";
        return !(isSeedAuthor && REMOVED_SEED_POSTS.indexOf(p.title) >= 0);
      });
      var titles = {};
      s.posts.forEach(function (p) { titles[p.title] = true; });
      seedPs.forEach(function (p) { if (!titles[p.title]) s.posts.push(p); });
    }
    s.posts.forEach(function (p) { if (!Array.isArray(p.recipeTags)) p.recipeTags = []; });

    // 评论：同样只清理示例评论，用户自己发的评论一条不动
    var seedCs = seedComments();
    if (!Array.isArray(s.comments)) s.comments = seedCs;
    else {
      var keep = {};
      seedCs.forEach(function (c) { keep[c.id] = true; });
      s.comments = s.comments.filter(function (c) {
        return String(c.id).indexOf("c-seed-") !== 0 || keep[c.id];
      });
      var have = {};
      s.comments.forEach(function (c) { have[c.id] = true; });
      seedCs.forEach(function (c) { if (!have[c.id]) s.comments.push(c); });
    }

    return { ingredients: addedIng, recipes: addedRec };
  }

  /**
   * 老数据升级：在补齐新内容的基础上，再做一次性的版本改动
   * （比如管理员密码升级、站点更名）。
   */
  function migrate(s) {
    var added = mergeSeedData(s);

    s.settings = Object.assign(clone(window.SEED.settings), s.settings || {});
    if (!Array.isArray(s.comments)) s.comments = seedComments();
    if (!Array.isArray(s.reports)) s.reports = [];
    if (typeof s.dailyOverride === "undefined") s.dailyOverride = null;
    if (!s.verifyCodes) s.verifyCodes = s.smsCodes || {};
    delete s.smsCodes;

    // 站点更名：只有还停留在旧名字时才跟着改，你自己设过的名字不会被覆盖
    if (s.settings.siteName === "今晚喝什么") s.settings.siteName = "鸡尾酒法典";

    s.version = DATA_VERSION;
    console.log("[数据升级] 新增材料 " + added.ingredients + " 种，新增配方 " + added.recipes + " 款");
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
          state.posts = state.posts || [];
          state.dailyOverride = state.dailyOverride || null;
          state.verifyCodes = state.verifyCodes || state.smsCodes || {};
          delete state.smsCodes;
          state.users.forEach(normalizeUser);
          // 每次打开都补齐一次新增的材料/配方/示例帖（幂等，用户内容不受影响）
          if (oldVersion >= DATA_VERSION) {
            var added = mergeSeedData(state);
            if (added.ingredients || added.recipes) {
              console.log("[内容更新] 补充材料 " + added.ingredients + " 种，配方 " + added.recipes + " 款");
            }
          }
          persist();
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
      return true;
    } catch (e) {
      console.warn("写入本地数据失败（可能是浏览器隐私模式或空间不足）", e);
      return false;
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

  /* ---------- 邮箱 ---------- */

  var EMAIL_RE = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

  function isEmail(v) {
    return EMAIL_RE.test(String(v || "").trim());
  }

  function isPhone(v) {
    return /^1[3-9]\d{9}$/.test(String(v || "").trim());
  }

  /** 3246***@qq.com，展示用 */
  function maskEmail(email) {
    var e = String(email || "");
    var at = e.indexOf("@");
    if (at <= 0) return e;
    return e.slice(0, Math.min(3, at)) + "***" + e.slice(at);
  }

  /** 138****1234，展示用（老账号可能还留着手机号） */
  function maskPhone(phone) {
    var p = String(phone || "");
    return isPhone(p) ? p.slice(0, 3) + "****" + p.slice(7) : p;
  }

  function emailTaken(email) {
    var e = String(email || "").trim().toLowerCase();
    return (state.users || []).some(function (u) { return String(u.email || "").toLowerCase() === e; });
  }

  function phoneTaken(phone) {
    phone = String(phone || "").trim();
    return (state.users || []).some(function (u) { return u.phone === phone; });
  }

  /**
   * 发送邮箱验证码。
   *   云端模式：云函数生成验证码并存进数据库；配了 SMTP 就真发邮件，
   *            没配就把验证码返回给页面显示出来（演示模式）。
   *   本地模式：直接生成，只存在这台电脑的浏览器里，用于离线调试。
   */
  function sendEmailCode(email, purpose, cb) {
    email = String(email || "").trim().toLowerCase();
    purpose = purpose || "register";
    if (!isEmail(email)) return { ok: false, msg: "请输入正确的邮箱地址" };
    if (purpose === "register" && emailTaken(email)) return { ok: false, msg: "这个邮箱已经注册过了，直接登录就行" };

    if (cloudOn()) {
      cloudCall("sendCode", { email: email, purpose: purpose }).then(function (res) {
        if (res.ok && res.data && res.data.code) {
          state.verifyCodes = state.verifyCodes || {};
          state.verifyCodes[email] = { code: res.data.code, at: Date.now(), purpose: purpose };
          persist();
        }
        if (cb) cb(res.ok ? Object.assign({ ok: true }, res.data) : { ok: false, msg: res.msg });
      });
      return { ok: true, pending: true };
    }

    var code = String(Math.floor(100000 + Math.random() * 900000));
    state.verifyCodes = state.verifyCodes || {};
    state.verifyCodes[email] = { code: code, at: Date.now(), purpose: purpose };
    persist();
    var demo = { ok: true, mode: "demo", code: code, msg: "验证码（演示模式）：" + code };
    if (cb) cb(demo);
    return demo;
  }

  /** 本地模式下校验验证码（云端模式由云函数在注册时校验） */
  function checkEmailCode(email, code, purpose) {
    email = String(email || "").trim().toLowerCase();
    code = String(code || "").trim();
    var rec = (state.verifyCodes || {})[email];
    if (!rec || !rec.code) return { ok: false, msg: "请先获取验证码" };
    if (Date.now() - rec.at > 10 * 60 * 1000) return { ok: false, msg: "验证码已过期，请重新获取" };
    if (rec.code !== code) return { ok: false, msg: "验证码不正确" };
    return { ok: true };
  }

  /** 注册表单的统一校验，返回 { ok, msg, values } */
  function validateRegister(data) {
    data = data || {};
    var values = {
      nickname: String(data.nickname || "").trim(),
      email: String(data.email || "").trim().toLowerCase(),
      code: String(data.code || "").trim(),
      password: String(data.password || ""),
      confirm: String(data.confirm == null ? data.password : data.confirm)
    };
    if (values.nickname.length < 2) return { ok: false, msg: "昵称至少 2 个字" };
    if (values.nickname.length > 12) return { ok: false, msg: "昵称最多 12 个字" };
    if (!isEmail(values.email)) return { ok: false, msg: "请输入正确的邮箱地址" };
    if (!/^\d{6}$/.test(values.code)) return { ok: false, msg: "请输入 6 位数字验证码" };
    if (values.password.length < 6) return { ok: false, msg: "密码至少 6 位" };
    if (data.confirm !== undefined && values.password !== values.confirm) return { ok: false, msg: "两次输入的密码不一致" };
    return { ok: true, values: values };
  }

  /**
   * 注册：昵称 + 邮箱 + 验证码 + 密码。
   * 昵称可以重复（不唯一），邮箱唯一。
   */
  function register(data) {
    var cb = arguments[1];
    var check = validateRegister(data);
    var values = check.values || {};

    /* 云端模式：交给云函数注册（验证码也由服务端校验），成功后本地同步 */
    if (cloudOn()) {
      if (!check.ok) {
        if (cb) setTimeout(function () { cb({ ok: false, msg: check.msg }); }, 0);
        return { ok: false, msg: check.msg };
      }
      cloudCall("register", {
        nickname: values.nickname, email: values.email, code: values.code,
        password: values.password, confirm: values.confirm
      }).then(function (res) {
        if (res.ok) {
          setToken(res.data.token);
          applyCloudUser(res.data.user);
          refresh();
        }
        if (cb) cb(res.ok ? { ok: true, user: currentUser() } : { ok: false, msg: res.msg });
      });
      return { ok: true, pending: true };
    }

    if (!check.ok) return { ok: false, msg: check.msg };
    if (emailTaken(values.email)) return { ok: false, msg: "这个邮箱已经注册过了" };
    var vc = checkEmailCode(values.email, values.code, "register");
    if (!vc.ok) return { ok: false, msg: vc.msg };

    var user = {
      id: newId("u"),
      email: values.email,
      phone: "",
      username: values.email,    // 兼容旧逻辑（唯一标识）
      nickname: values.nickname,
      role: "user", intro: "",
      createdAt: nowISO(), favorites: [], postFavorites: [], myIngredients: []
    };
    user.salt = makeSalt();
    user.hash = hashPassword(values.password, user.salt);
    state.users.push(user);
    state.sessionUserId = user.id;
    delete state.verifyCodes[values.email];
    persist();
    return { ok: true, user: user };
  }

  /** 登录：邮箱 + 密码；老账号也可以用手机号或原来的用户名登录 */
  function login(account, password) {
    /* 云端模式：交给云函数校验，成功后把 token 和用户信息落到本地 */
    if (cloudOn()) {
      var cb = arguments[2];
      cloudCall("login", { account: String(account || "").trim(), password: String(password || "") })
        .then(function (res) {
          if (res.ok) {
            setToken(res.data.token);
            applyCloudUser(res.data.user);
          }
          if (cb) cb(res.ok ? { ok: true, user: currentUser() } : { ok: false, msg: res.msg });
        });
      return { ok: true, pending: true };
    }
    var key = String(account || "").trim();
    var lower = key.toLowerCase();
    var user = state.users.filter(function (u) {
      if (!checkPassword(u, password)) return false;
      if (isPhone(key)) return u.phone === key;
      if (isEmail(key)) return String(u.email || "").toLowerCase() === lower;
      return String(u.username || "").toLowerCase() === lower;
    })[0];
    if (!user) {
      return { ok: false, msg: isEmail(key) ? "邮箱或密码不正确" : (isPhone(key) ? "手机号或密码不正确" : "账号或密码不正确") };
    }
    state.sessionUserId = user.id;
    persist();
    return { ok: true, user: user };
  }

  function logout() {
    state.sessionUserId = null;
    if (cloudOn()) { setToken(""); CLOUD.user = null; state.users = []; }
    persist();
  }

  function updateUser(id, patch) {
    var u = state.users.filter(function (x) { return x.id === id; })[0];
    if (!u) return;
    var next = Object.assign({}, patch);
    if (next.password) {
      // 改密码：生成新 salt 并只存哈希
      u.salt = makeSalt();
      u.hash = hashPassword(next.password, u.salt);
      delete next.password;
    }
    Object.assign(u, next);
    if (u.email) u.username = u.email;
    else if (u.phone) u.username = u.phone;
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
    cloudSync("saveRecipe", {
      recipe: {
        id: recipe.id, name: recipe.name, en: recipe.en, type: recipe.type,
        emoji: recipe.emoji, glass: recipe.glass, abv: recipe.abv, desc: recipe.desc,
        image: recipe.image, video: recipe.video, videoName: recipe.videoName,
        tags: recipe.tags, items: recipe.ingredients, steps: recipe.steps,
        py: recipe.py || "", initial: recipe.initial || "#"
      }
    }, function (data) {
      if (data && data.recipe) {
        state.recipes = state.recipes.filter(function (x) { return x.id !== recipe.id; });
        state.recipes.unshift(data.recipe);
        persist();
      }
    });
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
    cloudSync("deleteRecipe", { id: id });
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
    if (idx >= 0) {
      me.favorites.splice(idx, 1);
      persist();
      cloudSync("toggleFavorite", { id: id, kind: "recipe" });
      return { ok: true, fav: false };
    }
    me.favorites.push(id);
    persist();
    cloudSync("toggleFavorite", { id: id, kind: "recipe" });
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
      "suggestVideo", "comment", "deleteOwnComment", "report", "post"
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
    if (action === "post" && s.allowUserPost === false) return false;
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
    cloudSync("addComment", { recipeId: recipeId, content: content, parentId: c.parentId }, function (data) {
      if (data && data.comment) {
        state.comments = state.comments.filter(function (x) { return x.id !== c.id; });
        state.comments.push(data.comment);
        persist();
      }
    });
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
    cloudSync("deleteComment", { id: id });
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
    cloudSync("toggleCommentLike", { id: id });
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
    cloudSync("setCommentFlags", { id: id, pinned: patch.pinned, hidden: patch.hidden });
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

  /* ================= 交流区（发帖） =================
     审核分三层：
       1. 规则层（本地，0 成本）——明显违规直接拦，命中就带理由
       2. AI 层（可选，云函数）——判断"有没有广告感、有没有攻击性、跟调酒有没有关系"
       3. 人工层——管理员在后台复核，可改判
     规则层现在就能跑；AI 层只要在后台填上云函数地址就自动启用。 */

  var POST_CATEGORIES = ["求助", "分享", "心得", "器材", "闲聊"];

  var RULE_PATTERNS = [
    { re: /(微信|weixin|wechat|vx|威信|薇信|加我|私聊|私我)/i, score: 40, reason: "疑似引流（提到微信/私聊）" },
    { re: /(加群|拉群|进群|群号|扫码|二维码)/, score: 40, reason: "疑似引流（拉群/扫码）" },
    { re: /(qq|扣扣)\s*[:：]?\s*\d{5,}/i, score: 45, reason: "疑似留下联系方式" },
    { re: /1[3-9]\d{9}/, score: 50, reason: "疑似手机号" },
    { re: /(https?:\/\/|www\.)/i, score: 25, reason: "包含外部链接" },
    { re: /(代购|出售|购买|下单|批发|招商|代理|秒杀|特价|包邮|货源)/, score: 35, reason: "疑似广告或交易" },
    { re: /(赌博|博彩|彩票|冰毒|大麻|枪支|迷药)/, score: 80, reason: "涉及违法内容" },
    { re: /(色情|约炮|援交|裸聊)/, score: 80, reason: "涉及低俗内容" },
    { re: /(未成年|学生妹|灌醉)/, score: 60, reason: "涉及未成年人或不当内容" },
    { re: /(傻[逼比]|智障|去死|滚蛋)/, score: 30, reason: "疑似侮辱性用语" },
    { re: /(垃圾人|贱人|恶心东西|有多远滚多远)/, score: 35, reason: "疑似辱骂" }
  ];

  /** 只做规则的本地审核，返回风险分与命中原因 */
  function ruleReview(title, content) {
    var text = String(title || "") + "\n" + String(content || "");
    var reasons = [];
    var score = 0;
    RULE_PATTERNS.forEach(function (p) {
      if (p.re.test(text)) { score += p.score; reasons.push(p.reason); }
    });
    if (/(.)\1{6,}/.test(text)) { score += 35; reasons.push("有大量重复字符"); }
    var plain = text.replace(/\s/g, "");
    if (plain.length < 6) { score += 20; reasons.push("内容太短"); }
    if (plain.length > 0 && !/[\u4e00-\u9fa5a-zA-Z0-9]/.test(plain)) { score += 25; reasons.push("没有有效文字"); }
    return { risk: Math.min(100, score), reasons: reasons };
  }

  /** 把风险分换成处理结果 */
  function statusByRisk(risk) {
    if (risk >= 70) return "rejected";
    if (risk >= 30) return "pending";
    return "approved";
  }

  function postCategories() { return POST_CATEGORIES.slice(); }

  /** 帖子里挂的「调的是什么酒」标签：最多 3 个，必须是真实存在的配方 */
  function cleanRecipeTags(ids) {
    var out = [];
    (Array.isArray(ids) ? ids : []).forEach(function (id) {
      if (out.length >= 3) return;
      if (out.indexOf(id) >= 0) return;
      if (getRecipe(id)) out.push(id);
    });
    return out;
  }

  function addPost(data) {
    var me = currentUser();
    if (!me) return { ok: false, msg: "请先登录后再发帖" };
    if (!can("post")) return { ok: false, msg: "管理员暂时关闭了发帖" };
    var title = String((data && data.title) || "").trim();
    var content = String((data && data.content) || "").trim();
    if (title.length < 2) return { ok: false, msg: "标题至少 2 个字" };
    if (title.length > 40) return { ok: false, msg: "标题最多 40 个字" };
    if (content.length < 5) return { ok: false, msg: "正文至少 5 个字" };
    if (content.length > 2000) return { ok: false, msg: "正文最多 2000 个字" };

    var mode = state.settings.postReviewMode || "auto";
    var rule = ruleReview(title, content);
    var status = mode === "none" ? "approved" : (mode === "all" ? "pending" : statusByRisk(rule.risk));
    if (me.role === "admin") status = "approved";   // 管理员自己发的直接通过

    var post = {
      id: newId("post"),
      title: title,
      content: content,
      images: Array.isArray(data.images) ? data.images.slice(0, 6) : [],
      category: POST_CATEGORIES.indexOf(data.category) >= 0 ? data.category : "闲聊",
      recipeTags: cleanRecipeTags(data.recipeTags),
      authorId: me.id, username: me.username, nickname: me.nickname || me.username,
      createdAt: new Date().toISOString(),
      status: status,
      review: { source: "rule", risk: rule.risk, reasons: rule.reasons, at: new Date().toISOString() },
      rejectReason: status === "rejected" ? rule.reasons.join("；") : "",
      likes: [], views: 0, comments: []
    };
    state.posts.unshift(post);
    if (!persist()) {
      // 浏览器本地空间写满了（多图最容易触发）：回滚并告知用户
      state.posts.shift();
      return { ok: false, msg: "本地存储空间不足，帖子没发出去。少传两张图试试，或等接入云开发后再传大图。" };
    }
    cloudSync("addPost", {
      title: title, content: content, category: post.category,
      images: post.images, recipeTags: post.recipeTags
    }, function (data) {
      if (data && data.post) {
        state.posts = state.posts.filter(function (x) { return x.id !== post.id; });
        state.posts.unshift(data.post);
        persist();
      }
    });
    return { ok: true, post: post, rule: rule };
  }

  /** 帖子是否需要送 AI 复核（配了云函数地址、且开启开关时） */
  function aiReviewEndpoint() {
    var s = state.settings;
    return s.aiReviewEnabled && s.aiReviewEndpoint ? String(s.aiReviewEndpoint) : "";
  }

  /** 用云函数做 AI 复核，结果回写帖子。失败就保留规则层结论。 */
  function aiReviewPost(postId) {
    var url = aiReviewEndpoint();
    if (!url || typeof fetch !== "function") return Promise.resolve({ ok: false, msg: "未配置 AI 审核" });
    var post = (state.posts || []).filter(function (p) { return p.id === postId; })[0];
    if (!post) return Promise.resolve({ ok: false, msg: "帖子不存在" });
    return fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: post.title, content: post.content, category: post.category })
    }).then(function (res) { return res.json(); }).then(function (data) {
      if (!data || typeof data.risk !== "number") throw new Error("返回格式不对");
      post.review = {
        source: "ai", risk: data.risk,
        reasons: Array.isArray(data.reasons) ? data.reasons : [],
        model: data.model || "ai",
        at: new Date().toISOString()
      };
      if (!post.manualReview) post.status = statusByRisk(data.risk);
      if (post.status === "rejected") post.rejectReason = post.review.reasons.join("；");
      persist();
      return { ok: true, status: post.status, review: post.review };
    }).catch(function (e) {
      return { ok: false, msg: e.message };
    });
  }

  function listPosts(options) {
    options = options || {};
    var me = currentUser();
    var isAdmin = !!(me && me.role === "admin");
    var list = (state.posts || []).slice();
    if (options.status && options.status !== "all") list = list.filter(function (p) { return p.status === options.status; });
    if (options.category && options.category !== "全部") list = list.filter(function (p) { return p.category === options.category; });
    if (options.authorId) list = list.filter(function (p) { return p.authorId === options.authorId; });
    if (options.recipeTag) {
      list = list.filter(function (p) { return (p.recipeTags || []).indexOf(options.recipeTag) >= 0; });
    }
    if (options.onlyFav) {
      var favs = me ? (me.postFavorites || []) : [];
      list = list.filter(function (p) { return favs.indexOf(p.id) >= 0; });
    }
    var q = String(options.q || "").trim().toLowerCase();
    if (q) {
      list = list.filter(function (p) {
        return (p.title + " " + p.content + " " + p.nickname).toLowerCase().indexOf(q) >= 0;
      });
    }
    if (!isAdmin && !options.authorId) {
      // 普通用户只看得到通过的，以及自己发的（待审/被拒自己能看到状态）
      list = list.filter(function (p) {
        return p.status === "approved" || (me && p.authorId === me.id);
      });
    }
    var sort = options.sort || "new";
    list.sort(function (a, b) {
      if (sort === "hot") {
        var d = postHeat(b) - postHeat(a);
        if (d) return d;
      }
      return String(b.createdAt).localeCompare(String(a.createdAt));   // 时间倒序兜底
    });
    return list.map(function (p) {
      var out = Object.assign({}, p);
      out.likeCount = (p.likes || []).length;
      out.liked = !!(me && (p.likes || []).indexOf(me.id) >= 0);
      out.mine = !!(me && p.authorId === me.id);
      out.commentCount = (p.comments || []).length;
      out.heat = postHeat(p);
      out.faved = !!(currentUser() && (currentUser().postFavorites || []).indexOf(p.id) >= 0);
      out.recipeTags = p.recipeTags || [];
      out.isAdminAuthor = (state.users.filter(function (u) { return u.id === p.authorId; })[0] || {}).role === "admin";
      return out;
    });
  }

  /** 热度 = 点赞 3 分 + 回复 2 分 + 浏览 0.2 分，越新越占优 */
  function postHeat(p) {
    var likes = (p.likes || []).length;
    var comments = (p.comments || []).length;
    var views = p.views || 0;
    return likes * 3 + comments * 2 + views * 0.2;
  }

  /* 帖子收藏 */
  function isPostFavorite(id) {
    var me = currentUser();
    if (!me) return false;
    return (me.postFavorites || []).indexOf(id) >= 0;
  }

  function togglePostFavorite(id) {
    var me = currentUser();
    if (!me) return { ok: false, msg: "登录后才能收藏帖子" };
    if (!state.posts.some(function (p) { return p.id === id; })) return { ok: false, msg: "帖子不存在" };
    me.postFavorites = me.postFavorites || [];
    var i = me.postFavorites.indexOf(id);
    if (i >= 0) me.postFavorites.splice(i, 1); else me.postFavorites.push(id);
    cloudSync("toggleFavorite", { id: id, kind: "post" });
    persist();
    return { ok: true, faved: i < 0 };
  }

  /** 某款酒下有多少帖子、最近几条（配方页讨论区用） */
  function postsByRecipe(recipeId, limit) {
    var list = listPosts({ status: "all", sort: "hot", recipeTag: recipeId });
    return typeof limit === "number" ? list.slice(0, limit) : list;
  }

  function countPostsByRecipe(recipeId) {
    return postsByRecipe(recipeId).length;
  }

  function getPost(id) {
    return listPosts({ status: "all", authorId: null }).filter(function (p) { return p.id === id; })[0] || null;
  }

  function addPostComment(postId, content) {
    var me = currentUser();
    if (!me) return { ok: false, msg: "请先登录" };
    if (!can("post")) return { ok: false, msg: "管理员暂时关闭了交流区" };
    content = String(content || "").trim();
    if (!content) return { ok: false, msg: "回复不能为空" };
    if (content.length > 500) return { ok: false, msg: "回复最多 500 字" };
    var p = (state.posts || []).filter(function (x) { return x.id === postId; })[0];
    if (!p) return { ok: false, msg: "帖子不存在" };
    var c = {
      id: newId("pc"), userId: me.id, username: me.username, nickname: me.nickname || me.username,
      content: content, createdAt: new Date().toISOString(), likes: []
    };
    p.comments.push(c);
    cloudSync("addPostComment", { postId: postId, content: content }, function (data) {
      if (data && data.comment) {
        p.comments = p.comments.filter(function (x) { return x.id !== c.id; });
        p.comments.push(data.comment);
        persist();
      }
    });
    persist();
    return { ok: true, comment: c };
  }

  function deletePostComment(postId, commentId) {
    var me = currentUser();
    if (!me) return { ok: false, msg: "请先登录" };
    var p = (state.posts || []).filter(function (x) { return x.id === postId; })[0];
    if (!p) return { ok: false, msg: "帖子不存在" };
    var c = p.comments.filter(function (x) { return x.id === commentId; })[0];
    if (!c) return { ok: false, msg: "回复不存在" };
    if (me.role !== "admin" && c.userId !== me.id && p.authorId !== me.id) return { ok: false, msg: "只能删自己的回复" };
    p.comments = p.comments.filter(function (x) { return x.id !== commentId; });
    cloudSync("deletePostComment", { postId: postId, commentId: commentId });
    persist();
    return { ok: true };
  }

  function togglePostLike(postId) {
    var me = currentUser();
    if (!me) return { ok: false, msg: "登录后才能点赞" };
    var p = (state.posts || []).filter(function (x) { return x.id === postId; })[0];
    if (!p) return { ok: false, msg: "帖子不存在" };
    p.likes = p.likes || [];
    var i = p.likes.indexOf(me.id);
    if (i >= 0) p.likes.splice(i, 1); else p.likes.push(me.id);
    cloudSync("togglePostLike", { postId: postId });
    persist();
    return { ok: true, liked: i < 0, count: p.likes.length };
  }

  function addPostView(id) {
    var p = (state.posts || []).filter(function (x) { return x.id === id; })[0];
    if (p) { p.views = (p.views || 0) + 1; persist(); }
  }

  function setPostStatus(id, status, reason) {
    var me = currentUser();
    if (!me || me.role !== "admin") return { ok: false, msg: "只有管理员可以审核" };
    var p = (state.posts || []).filter(function (x) { return x.id === id; })[0];
    if (!p) return { ok: false, msg: "帖子不存在" };
    p.status = status;
    p.manualReview = true;
    p.rejectReason = status === "rejected" ? String(reason || "").trim() : "";
    if (status === "rejected" && !p.rejectReason) p.rejectReason = "管理员判定不适合发布";
    p.reviewedBy = me.username;
    p.reviewedAt = new Date().toISOString();
    cloudSync("setPostStatus", { id: id, status: status, reason: p.rejectReason });
    persist();
    return { ok: true, post: p };
  }

  function deletePost(id) {
    var me = currentUser();
    if (!me) return { ok: false, msg: "请先登录" };
    var p = (state.posts || []).filter(function (x) { return x.id === id; })[0];
    if (!p) return { ok: false, msg: "帖子不存在" };
    if (me.role !== "admin" && p.authorId !== me.id) return { ok: false, msg: "只能删除自己的帖子" };
    state.posts = (state.posts || []).filter(function (x) { return x.id !== id; });
    cloudSync("deletePost", { id: id });
    persist();
    return { ok: true };
  }

  function postStats() {
    var list = state.posts || [];
    var today = new Date().toISOString().slice(0, 10);
    return {
      total: list.length,
      approved: list.filter(function (p) { return p.status === "approved"; }).length,
      pending: list.filter(function (p) { return p.status === "pending"; }).length,
      rejected: list.filter(function (p) { return p.status === "rejected"; }).length,
      today: list.filter(function (p) { return String(p.createdAt).slice(0, 10) === today; }).length,
      comments: list.reduce(function (n, p) { return n + (p.comments || []).length; }, 0)
    };
  }

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
    cloudSync("addReport", {
      recipeId: recipeId || null, type: rep.type, content: rep.content, suggest: rep.suggest
    });
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
      var hay = [i.name, i.aka, i.alias, i.cat, i.emoji, i.py, i.initial].join(" ").toLowerCase();
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
        // 材料名 + 材料别名也算进搜索范围：搜 "Gin"、"毡酒" 都能找到用到它的酒
        var ingText = r.ingredients.map(function (x) {
          var ing = getIngredient(x.id);
          var alias = ((window.SEED.aliases || {}).ingredients || {})[x.id] || "";
          return ingredientName(x.id) + " " + (ing ? ing.aka : "") + " " + alias;
        }).join(" ");
        var rAlias = ((window.SEED.aliases || {}).recipes || {})[r.id] || "";
        var hay = [r.name, r.en, rAlias, r.desc, r.author, r.glass, r.abv, ingText, r.py, r.initial]
          .join(" ").toLowerCase();
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

  /* ================= 每日推荐 ================= */

  function hashStr(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }

  /** 可复现的伪随机数（同一天抽出来的一定一样） */
  function seededRandom(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6D2B79F5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function dayKey(offset) {
    var d = new Date();
    if (offset) d.setDate(d.getDate() + offset);
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  /** 主页上那句日期，例如 2026年9月17日 · 星期四 */
  function todayLabel() {
    var d = new Date();
    var week = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"][d.getDay()];
    return d.getFullYear() + "年" + (d.getMonth() + 1) + "月" + d.getDate() + "日 · " + week;
  }

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + "-" + (d.getMonth() + 1) + "-" + d.getDate();
  }

  /**
   * 按日期算出来的一批推荐（可复现：同一天同样的输入一定是同样结果）。
   * 挑选时会尽量避开口味重复的（标签重合 3 个以上就跳过）。
   */
  function baseDailyPicks(count, salt) {
    count = count || 4;
    var rnd = seededRandom(hashStr(dayKey(0) + "|" + (salt || "main")));
    var pool = visibleRecipes().filter(function (r) { return r.status === "approved"; }).slice();
    for (var i = pool.length - 1; i > 0; i--) {
      var j = Math.floor(rnd() * (i + 1));
      var t = pool[i]; pool[i] = pool[j]; pool[j] = t;
    }
    var picked = [], used = {}, rest = [];
    pool.forEach(function (r) {
      if (picked.length >= count) { rest.push(r); return; }
      var overlap = (r.tags || []).filter(function (t) { return used[t]; }).length;
      if (picked.length && overlap >= 3) { rest.push(r); return; }
      picked.push(r);
      (r.tags || []).forEach(function (t) { used[t] = true; });
    });
    var k = 0;
    while (picked.length < count && k < rest.length) picked.push(rest[k++]);
    return picked;
  }

  /**
   * 每日推荐：同一天默认就是这几杯。
   * 如果用户点过「换一批」，就用换过的那批（换的结果会存下来，刷新页面也还在，到第二天自动恢复成新的每日推荐）。
   */
  function dailyPicks(count) {
    count = count || 4;
    var ov = state.dailyOverride;
    if (ov && ov.date === todayKey() && Array.isArray(ov.ids) && ov.ids.length) {
      var all = visibleRecipes();
      var list = [];
      ov.ids.forEach(function (id) {
        var r = all.filter(function (x) { return x.id === id && x.status === "approved"; })[0];
        if (r && !list.some(function (x) { return x.id === id; })) list.push(r);
      });
      // 换的那批至少还剩两杯可用，就继续用它；不够的用默认推荐补上
      if (list.length >= Math.min(2, count)) {
        if (list.length < count) {
          baseDailyPicks(count * 3, "fill").forEach(function (r) {
            if (list.length < count && !list.some(function (x) { return x.id === r.id; })) list.push(r);
          });
        }
        return list.slice(0, count);
      }
    }
    return baseDailyPicks(count, "main");
  }

  /** 换一批：结果会写进本地存储，刷新后仍然是这一批 */
  function shuffleDaily(count) {
    count = count || 4;
    var picks = baseDailyPicks(count, "s" + Date.now() + "-" + Math.random());
    state.dailyOverride = { date: todayKey(), ids: picks.map(function (r) { return r.id; }), at: new Date().toISOString() };
    persist();
    return picks;
  }

  /** 回到"今天默认的推荐"（清掉换过的那批） */
  function resetDaily() {
    state.dailyOverride = null;
    persist();
    return baseDailyPicks(4, "main");
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
    cloudSync("updateSettings", { patch: patch });
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
      state.posts = state.posts || [];
      state.dailyOverride = state.dailyOverride || null;
      state.verifyCodes = state.verifyCodes || state.smsCodes || {};
      delete state.smsCodes;
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
    // 云端
    initCloud: initCloud,
    cloudOn: cloudOn,
    refresh: refresh,
    cloudError: function () { return CLOUD.error; },
    categories: function () { return window.SEED.categories.slice(); },
    nowISO: nowISO,

    // 账号
    currentUser: currentUser,
    isAdmin: isAdmin,
    register: register,
    login: login,
    sendEmailCode: sendEmailCode,
    checkEmailCode: checkEmailCode,
    isEmail: isEmail,
    maskEmail: maskEmail,
    emailTaken: emailTaken,
    // 兼容旧调用名
    sendSmsCode: sendEmailCode,
    checkSmsCode: checkEmailCode,
    isPhone: isPhone,
    maskPhone: maskPhone,
    phoneTaken: phoneTaken,
    hashPassword: hashPassword,
    makeSalt: makeSalt,
    checkPassword: checkPassword,
    setPassword: setPassword,
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
    dailyPicks: dailyPicks,
    shuffleDaily: shuffleDaily,
    resetDaily: resetDaily,
    todayLabel: todayLabel,
    storageInfo: storageInfo,

    // 勘误
    reportTypes: reportTypes,
    addReport: addReport,
    listReports: listReports,
    reportStats: reportStats,
    updateReport: updateReport,
    deleteReport: deleteReport,

    // 交流区
    postCategories: postCategories,
    addPost: addPost,
    listPosts: listPosts,
    getPost: getPost,
    addPostComment: addPostComment,
    deletePostComment: deletePostComment,
    togglePostLike: togglePostLike,
    addPostView: addPostView,
    setPostStatus: setPostStatus,
    deletePost: deletePost,
    postStats: postStats,
    postHeat: postHeat,
    isPostFavorite: isPostFavorite,
    togglePostFavorite: togglePostFavorite,
    postsByRecipe: postsByRecipe,
    countPostsByRecipe: countPostsByRecipe,
    ruleReview: ruleReview,
    aiReviewPost: aiReviewPost,
    aiReviewEndpoint: aiReviewEndpoint,

    // 设置与数据
    getSettings: getSettings,
    updateSettings: updateSettings,
    exportJSON: exportJSON,
    importJSON: importJSON,
    resetAll: resetAll
  };
})();
