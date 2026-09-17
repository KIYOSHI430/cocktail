/* 界面层：路由、渲染、交互 */

(function () {
  "use strict";

  var view = document.getElementById("view");
  var toastEl = document.getElementById("toast");

  /* 页面级临时状态 */
  var libFilter = { q: "", type: "all", base: "all", abv: "all", fav: false, onlyMakeable: false, sort: "hot" };
  var adminTab = "ingredients";
  var adminCommentQuery = "";
  var adminCommentOnlyHidden = false;
  var reportFilter = { status: "pending", q: "" };
  var postAdminFilter = { status: "pending", q: "" };
  var draft = { ingredients: [], search: "", cat: "全部" };
  var draftTags = [];
  var modalTags = [];
  var tagFilter = { tags: [], mode: "all" };
  var deckState = { i: 0, drag: 0, picks: [], salt: "" };
  var postState = { category: "全部", sort: "new", q: "", recipeTag: "", onlyFav: false };
  var postDraftImages = [];
  var postDraftTags = [];
  var matchQuery = "";
  var matMode = "cat";   // cat = 按种类分组；abc = 全部按字母排序
  var editingIngredientId = null;
  var authMode = "login";
  var smsTimer = null;
  var commentState = { recipeId: null, sort: "hot", page: 1, replyTo: null };

  /* ---------------- 工具 ---------------- */

  function esc(s) {
    return String(s === null || s === undefined ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function toast(msg) {
    toastEl.textContent = msg;
    toastEl.classList.add("show");
    clearTimeout(toastEl._t);
    toastEl._t = setTimeout(function () { toastEl.classList.remove("show"); }, 2200);
  }

  function openModal(html) {
    var root = document.getElementById("modal");
    root.innerHTML = '<div class="modal-mask" data-action="close-modal"></div><div class="modal-box">' + html + "</div>";
    root.classList.remove("hidden");
  }

  function closeModal() {
    var root = document.getElementById("modal");
    root.classList.add("hidden");
    root.innerHTML = "";
  }

  function typeLabel(t) { return t === "classic" ? "经典" : "特调"; }

  function grad(color) {
    return "background:linear-gradient(160deg," + (color || "#e0a94a") + "55," + (color || "#e0a94a") + "22);";
  }

  function terms(q) {
    return String(q || "").trim().toLowerCase().split(/\s+/).filter(Boolean);
  }

  function highlight(text, list) {
    var out = esc(text);
    list.forEach(function (t) {
      if (!t) return;
      var safe = t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      try { out = out.replace(new RegExp("(" + safe + ")", "gi"), "<mark>$1</mark>"); } catch (e) { /* 忽略非法正则 */ }
    });
    return out;
  }

  function timeAgo(iso) {
    var t = new Date(iso).getTime();
    if (isNaN(t)) return "";
    var diff = Date.now() - t;
    var min = Math.floor(diff / 60000);
    if (min < 1) return "刚刚";
    if (min < 60) return min + " 分钟前";
    var hour = Math.floor(min / 60);
    if (hour < 24) return hour + " 小时前";
    var day = Math.floor(hour / 24);
    if (day === 1) return "昨天";
    if (day < 30) return day + " 天前";
    return String(iso).slice(0, 10);
  }

  var AVATAR_COLORS = ["#e0a94a", "#7ec8a9", "#e2705e", "#8e7cc3", "#4fc3f7", "#f2a03d", "#e46b7f", "#79c47a"];
  function avatarHTML(name, extraClass) {
    var n = String(name || "?");
    var color = AVATAR_COLORS[n.charCodeAt(0) % AVATAR_COLORS.length];
    return '<span class="avatar ' + (extraClass || "") + '" style="background:' + color + '">' + esc(n.charAt(0).toUpperCase()) + "</span>";
  }

  /* ---------------- 路由 ---------------- */

  function currentRoute() {
    var h = location.hash.replace(/^#\/?/, "");
    if (!h) return { name: "recipes", params: [] };
    var parts = h.split("/");
    return { name: parts[0] || "recipes", params: parts.slice(1) };
  }

  function go(hash) { location.hash = hash; }

  function render() {
    var r = currentRoute();
    window.scrollTo({ top: 0 });
    toggleMenu(false);
    switch (r.name) {
      case "recipe": renderRecipeDetail(r.params[0]); break;
      case "posts": {
        // #/posts/recipe/<id> 表示只看某杯酒相关的帖子
        postState.recipeTag = (r.params[0] === "recipe" && r.params[1]) ? r.params[1] : "";
        postState.onlyFav = false;
        renderPosts();
        break;
      }
      case "post": renderPostDetail(r.params[0]); break;
      case "home": renderHome(); break;
      case "tags": {
        if (r.params[0]) {
          var t = decodeURIComponent(r.params[0]);
          if (tagFilter.tags.indexOf(t) < 0) tagFilter.tags = [t];
        }
        renderTags();
        break;
      }
      case "match": renderMatch(); break;
      case "new": renderNew(); break;
      case "me": renderMe(); break;
      case "admin": renderAdmin(); break;
      case "recipes": renderLibrary(); break;
      default: renderHome();
    }
    renderHeader();
  }

  /* ---------------- 顶栏 ---------------- */

  function renderHeader() {
    var me = Store.currentUser();
    var foot = document.getElementById("footData");
    if (foot) foot.textContent = Store.cloudOn() ? "数据存储在云端" : "数据保存在本机浏览器";
    var box = document.getElementById("userBox");
    if (me) {
      box.innerHTML =
        '<span class="who">' + esc(me.nickname || me.username) +
        (me.role === "admin" ? ' <b class="role">管理员</b>' : "") + "</span>" +
        '<button class="btn ghost sm" data-action="logout">退出</button>';
    } else {
      box.innerHTML =
        '<button class="btn ghost sm" data-action="open-login">登录</button>' +
        '<button class="btn sm" data-action="open-register">注册</button>';
    }
    var adminLink = document.querySelector('[data-nav="admin"]');
    if (adminLink) adminLink.classList.toggle("hidden", !(me && me.role === "admin"));

    // 手机端抽屉菜单（顶栏在窄屏会把导航收进这里）
    var drawerNav = document.getElementById("drawerNav");
    var drawerUser = document.getElementById("drawerUser");
    // 只在「路由或登录状态变了」时才重建抽屉，避免每次打开菜单都做一遍 DOM 操作（会卡）
    var drawerSig = currentRoute().name + "|" + (me ? me.id + "|" + me.role + "|" + (me.nickname || "") : "guest");
    if (drawerNav && drawerNav.__sig !== drawerSig) {
      drawerNav.__sig = drawerSig;
      var items = [
        ["home", "#/home", "首页", "每日推荐"],
        ["recipes", "#/recipes", "配方库", "全部酒谱"],
        ["posts", "#/posts", "交流区", "发帖交流学习"],
        ["tags", "#/tags", "想喝啥", "按口味点单"],
        ["match", "#/match", "我有啥", "看材料配酒"],
        ["new", "#/new", "添加配方", "分享你的特调"],
        ["me", "#/me", "我的", "收藏与资料"]
      ];
      if (me && me.role === "admin") items.push(["admin", "#/admin", "管理后台", "材料 / 评论 / 用户"]);
      var route = currentRoute().name;
      drawerNav.innerHTML = items.map(function (it, idx) {
        return '<a href="' + it[1] + '" data-action="close-menu" class="' + (route === it[0] ? "on" : "") + '">' +
          '<span class="di">' + ("0" + (idx + 1)).slice(-2) + '</span><span class="dt">' + esc(it[2]) + "<em>" + esc(it[3]) + "</em></span></a>";
      }).join("");
    }
    if (drawerUser && drawerUser.__sig !== drawerSig) {
      drawerUser.__sig = drawerSig;
      drawerUser.innerHTML = me
        ? '<div class="du-info"><b>' + esc(me.nickname || me.username) + "</b>" +
          '<span class="mute-text">' + Store.roleLabel() + "</span></div>" +
          '<button class="btn ghost sm" data-action="logout">退出登录</button>'
        : '<div class="du-info"><b>还没登录</b><span class="mute-text">登录后可以发配方、评论、收藏</span></div>' +
          '<div class="du-btns"><button class="btn sm" data-action="open-register">注册</button>' +
          '<button class="btn ghost sm" data-action="open-login">登录</button></div>';
    }

    var name = Store.getSettings().siteName || "鸡尾酒法典";
    var brandText = document.querySelector(".brand-text");
    if (brandText) brandText.innerHTML = esc(name) + "<em>" + esc(Store.getSettings().slogan || "调酒灵感") + "</em>";
    document.title = name + " · 调酒灵感";

    var route = currentRoute().name;
    document.querySelectorAll("#mainNav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-nav") === route);
    });
  }

  function toggleMenu(force) {
    var el = document.getElementById("mobileDrawer");
    if (!el) return;
    var open = typeof force === "boolean" ? force : !el.classList.contains("open");
    if (open) renderHeader();   // 每次打开前刷新内容（登录状态、管理员入口可能变了）
    el.classList.toggle("open", open);
    document.body.classList.toggle("menu-open", open);
  }

  /* ---------------- 卡片 ---------------- */

  function badgesFor(r, missing) {
    if (!missing) return "";
    if (missing.length === 0) return '<span class="badge ok">现在就能调</span>';
    if (missing.length <= 2) return '<span class="badge warn">差 ' + missing.length + " 种</span>";
    return '<span class="badge mute">差 ' + missing.length + " 种</span>";
  }

  function recipeCard(r, missingArr, q) {
    var missing = missingArr || r._missing || null;
    var badge = badgesFor(r, missing);
    var missingLine = "";
    if (missing && missing.length) {
      missingLine = '<div class="miss-line">还差：' +
        missing.slice(0, 4).map(function (x) { return esc(Store.ingredientName(x)); }).join("、") +
        (missing.length > 4 ? " 等" : "") + "</div>";
    }
    var fav = Store.isFavorite(r.id);
    var hl = terms(q || "");
    var tags = (r.tags || []).slice(0, 3).map(function (t) {
      return '<button class="tag-mini" data-action="open-tag" data-value="' + esc(t) + '">' + esc(t) + "</button>";
    }).join("") + ((r.tags || []).length > 3 ? '<span class="tag-mini more">+' + (r.tags.length - 3) + "</span>" : "");
    var img = r.imageThumb
      ? '<img class="art-img" src="' + esc(r.imageThumb) + '" alt="' + esc(r.name) + '" loading="lazy" onload="this.classList.add(\'loaded\')" onerror="this.classList.add(\'failed\')">'
      : "";
    return '<article class="card" data-id="' + r.id + '">' +
      '<div class="card-art" style="' + grad(r.color) + '" data-action="open-recipe" data-id="' + r.id + '">' +
        img +
        '<span class="emoji">' + esc(r.emoji || "🍹") + "</span>" +
        '<span class="pill ' + (r.type === "classic" ? "cls" : "ctm") + '">' + typeLabel(r.type) + "</span>" +
        '<button class="fav ' + (fav ? "on" : "") + '" data-action="toggle-fav" data-id="' + r.id + '" title="收藏">' + (fav ? "★" : "☆") + "</button>" +
      "</div>" +
      '<div class="card-body" data-action="open-recipe" data-id="' + r.id + '">' +
        "<h3>" + highlight(r.name, hl) + (r.en ? ' <em>' + highlight(r.en, hl) + "</em>" : "") + "</h3>" +
        '<p class="desc">' + highlight(r.desc || "", hl) + "</p>" +
        (tags ? '<div class="card-tags">' + tags + "</div>" : "") +
        '<div class="meta">' + (badge || ('<span class="badge mute">' + r.ingredients.length + " 种材料</span>")) +
          (r.glass ? '<span class="mute-text">' + esc(r.glass) + "</span>" : "") +
          '<span class="mute-text">' + esc(r.author || "官方") + "</span>" +
        "</div>" + missingLine +
      "</div></article>";
  }

  function statBox(n, label) {
    return '<div class="stat"><b>' + n + "</b><span>" + label + "</span></div>";
  }

  function option(value, label, current) {
    return '<option value="' + value + '"' + (value === current ? " selected" : "") + ">" + label + "</option>";
  }

  function chipButton(action, value, label, current) {
    return '<button class="chip ' + (current === value ? "on" : "") + '" data-action="' + action + '" data-value="' + value + '">' + label + "</button>";
  }

  /* ---------------- 视图一：配方库 ---------------- */

  /* ---------------- 交流区（发帖） ---------------- */

  function postStatusBadge(p) {
    if (p.status === "approved") return "";
    if (p.status === "pending") return '<span class="badge warn">待审核</span>';
    return '<span class="badge no">未通过</span>';
  }

  function postCardHTML(p) {
    var excerpt = String(p.content || "").replace(/\s+/g, " ").slice(0, 90);
    var cover = p.images && p.images.length
      ? '<img class="post-thumb" src="' + esc(p.images[0]) + '" alt="" loading="lazy" onerror="this.classList.add(\'failed\')">'
      : "";
    var recipeTags = (p.recipeTags || []).map(function (rid) {
      var r = Store.getRecipe(rid);
      if (!r) return "";
      return '<button class="tag-mini" data-action="post-tag" data-value="' + rid + '" title="看关于这杯酒的帖子">' + esc(r.name) + "</button>";
    }).join("");
    return '<article class="post-card" data-action="open-post" data-id="' + p.id + '">' +
      cover +
      '<div class="post-main">' +
        '<div class="post-top"><span class="post-cat">' + esc(p.category) + "</span>" + postStatusBadge(p) +
          '<button class="post-fav' + (p.faved ? " on" : "") + '" data-action="post-fav" data-id="' + p.id + '" title="收藏帖子">' + (p.faved ? "★" : "☆") + "</button>" +
        "</div>" +
        "<h3>" + esc(p.title) + "</h3>" +
        '<p class="post-excerpt">' + esc(excerpt) + (p.content.length > 90 ? "…" : "") + "</p>" +
        (recipeTags ? '<div class="card-tags post-tags">' + recipeTags + "</div>" : "") +
        '<div class="post-foot"><span>' + esc(p.nickname) + " · " + timeAgo(p.createdAt) + "</span>" +
          "<span>赞 " + p.likeCount + " · 回复 " + p.commentCount + "</span></div>" +
      "</div></article>";
  }

  function renderPosts() {
    var me = Store.currentUser();
    var cats = ["全部"].concat(Store.postCategories());
    var tagRecipe = postState.recipeTag ? Store.getRecipe(postState.recipeTag) : null;
    view.innerHTML =
      '<section class="page-head"><h1>交流区</h1><p>配方之外的地方：求推荐、问问题、晒作品、聊器材。发出去的内容会先过一遍审核（明显广告和违规会被拦下）。</p></section>' +
      (tagRecipe
        ? '<div class="tag-filter-bar">正在看关于「<b>' + esc(tagRecipe.name) + "</b>」的帖子" +
          '<button class="link-btn" data-action="post-tag-clear">查看全部帖子</button></div>'
        : "") +
      '<section class="toolbar filter-bar">' +
        '<input id="postSearch" class="input search" type="search" placeholder="搜索帖子标题、内容或作者" value="' + esc(postState.q) + '">' +
        '<div class="chips">' + cats.map(function (c) {
          return '<button class="chip ' + (postState.category === c ? "on" : "") + '" data-action="post-cat" data-value="' + esc(c) + '">' + esc(c) + "</button>";
        }).join("") +
        '<button class="chip ' + (postState.onlyFav ? "on" : "") + '" data-action="post-fav-filter">★ 我收藏的帖子</button>' +
        "</div>" +
        '<div class="toolbar-right">' +
          '<select id="postSort" class="input select">' +
            option("new", "按时间（最新）", postState.sort) + option("hot", "按热度（最热）", postState.sort) +
          "</select>" +
          '<button class="btn" data-action="new-post">我要发帖</button>' +
        "</div>" +
      "</section>" +
      '<div class="result-count" id="postCount"></div>' +
      '<section class="post-list" id="postList"></section>';
    refreshPostList();
  }

  function refreshPostList() {
    var list = Store.listPosts({
      category: postState.category, sort: postState.sort, status: "all", q: postState.q,
      recipeTag: postState.recipeTag, onlyFav: postState.onlyFav
    });
    renderPostList(list);
  }

  function renderPostList(list) {
    var host = document.getElementById("postList");
    if (!host) return;
    var count = document.getElementById("postCount");
    if (count) count.textContent = "共 " + list.length + " 条" + (postState.q ? " · 关键词：" + postState.q : "");
    host.innerHTML = list.length
      ? list.map(postCardHTML).join("")
      : '<div class="empty">还没有帖子。<br><span class="mute-text">点右上角「我要发帖」，来做第一个开口的人。</span></div>';
  }

  function openPostEditor(presetRecipeId) {
    var me = Store.currentUser();
    if (!me) { toast("登录后就能发帖"); authModal("login"); return; }
    if (!Store.can("post")) { toast("管理员暂时关闭了发帖"); return; }
    postDraftImages = [];
    postDraftTags = presetRecipeId && Store.getRecipe(presetRecipeId) ? [presetRecipeId] : [];
    openModal(
      "<h2>发帖</h2>" +
      '<form id="postForm" class="form">' +
        '<label class="field"><span>分类</span><select class="input" name="category">' +
          Store.postCategories().map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("") +
        "</select></label>" +
        '<label class="field"><span>标题 *</span><input class="input" name="title" maxlength="40" placeholder="一句话说清楚你想聊什么"></label>' +
        '<label class="field"><span>正文 *</span><textarea class="input" name="content" rows="6" maxlength="2000" placeholder="详细说说：你手头有什么、试过什么、想解决什么问题"></textarea></label>' +
        '<label class="field"><span>调的是哪杯酒<em class="opt">选填，最多 3 个</em></span>' +
          '<input class="input" id="postTagSearch" placeholder="搜酒名，比如：尼格罗尼（带上标签后，这杯酒的配方页会显示你的帖子）"></label>' +
        '<div class="tag-results" id="postTagResults"></div>' +
        '<div class="tag-chosen" id="postTagChosen"></div>' +
        '<label class="field"><span>配图<em class="opt">选填，最多 6 张</em></span>' +
          '<input class="input" type="file" id="postImages" accept="image/*" multiple></label>' +
        '<div class="img-grid" id="postImagePreview"></div>' +
        '<p class="mute-text">提交前会自动检查一遍（广告、联系方式、违规内容会被拦或转人工审核）。</p>' +
        '<div class="form-foot"><button class="btn" type="submit">发布</button>' +
        '<button type="button" class="btn ghost" data-action="close-modal">取消</button></div>' +
      "</form>"
    );
    renderPostImagePreview();
    renderPostTagPicker();
  }

  /** 发帖时选「这杯酒」标签 */
  function renderPostTagPicker(keyword) {
    var chosen = document.getElementById("postTagChosen");
    var results = document.getElementById("postTagResults");
    if (chosen) {
      chosen.innerHTML = postDraftTags.map(function (rid) {
        var r = Store.getRecipe(rid);
        return '<span class="tag-pill on">' + esc(r ? r.name : rid) +
          '<button type="button" class="tag-x" data-action="post-tag-remove" data-value="' + rid + '">×</button></span>';
      }).join("");
    }
    if (!results) return;
    var q = String(keyword || "").trim();
    if (!q) { results.innerHTML = ""; return; }
    var list = Store.searchRecipes({ q: q, sort: "hot" }).slice(0, 6);
    results.innerHTML = list.length
      ? list.map(function (r) {
          var on = postDraftTags.indexOf(r.id) >= 0;
          return '<button type="button" class="tag-result' + (on ? " on" : "") + '" data-action="post-tag-add" data-value="' + r.id + '">' +
            esc(r.name) + (r.en ? ' <em>' + esc(r.en) + "</em>" : "") + (on ? " ✓" : "") + "</button>";
        }).join("")
      : '<span class="mute-text">没找到这杯酒，可以去配方库看看叫什么名字</span>';
  }

  /** 一次可以选多张，逐张压缩后追加 */
  function addPostImages(fileList) {
    var files = Array.prototype.slice.call(fileList);
    var room = 6 - postDraftImages.length;
    if (room <= 0) { toast("最多 6 张图"); return; }
    var queue = files.slice(0, room);
    if (files.length > room) toast("最多 6 张图，多余的不加了");
    var failed = 0;
    queue.forEach(function (file) {
      if (file.size > 8 * 1024 * 1024) { failed++; return; }
      downscaleImage(file, 900, function (dataUrl) {
        if (dataUrl) { postDraftImages.push(dataUrl); renderPostImagePreview(); }
        else { failed++; toast("有图片读取失败，换一张试试"); }
      });
    });
    if (failed) toast("有 " + failed + " 张图片过大，已跳过（单张 8MB 以内）");
  }

  function renderPostImagePreview() {
    var host = document.getElementById("postImagePreview");
    if (!host) return;
    host.innerHTML = postDraftImages.map(function (src, i) {
      return '<div class="img-cell"><img src="' + src + '" alt="">' +
        '<button type="button" class="img-del" data-action="post-img-remove" data-idx="' + i + '" title="移除">×</button></div>';
    }).join("") +
    (postDraftImages.length < 6
      ? '<label class="img-add"><input type="file" id="postImagesMore" accept="image/*" multiple><span>+ 添加</span></label>'
      : "");
  }

  function submitPost(form) {
    var fd = new FormData(form);
    var res = Store.addPost({
      title: fd.get("title"), content: fd.get("content"), category: fd.get("category"),
      images: postDraftImages.slice(), recipeTags: postDraftTags.slice()
    });
    if (!res.ok) { toast(res.msg); return; }
    postDraftImages = [];
    postDraftTags = [];
    closeModal();
    if (res.post.status === "rejected") {
      toast("内容没通过审核：" + res.post.rejectReason);
      return;
    }
    toast(res.post.status === "pending" ? "已提交，等管理员审核后公开" : "发布成功");
    // 配了云函数就顺手做一次 AI 复核
    if (Store.aiReviewEndpoint()) {
      Store.aiReviewPost(res.post.id).then(function (r) {
        if (r.ok) {
          toast(r.status === "approved" ? "AI 审核通过" : (r.status === "pending" ? "AI 建议人工复核" : "AI 判定未通过"));
          render();
        }
      });
    }
    go("#/post/" + res.post.id);
  }

  function renderPostDetail(id) {
    var p = Store.getPost(id);
    if (!p) { view.innerHTML = '<div class="empty">找不到这个帖子。<a href="#/posts">返回交流区</a></div>'; return; }
    Store.addPostView(id);
    var me = Store.currentUser();
    var canMod = me && (me.role === "admin" || p.authorId === me.id);
    var imgs = (p.images || []).map(function (src, i) {
      return '<img src="' + esc(src) + '" alt="" data-action="post-img-view" data-src="' + esc(src) +
        '" data-post="' + p.id + '" data-idx="' + i + '" onerror="this.classList.add(\'failed\')">';
    }).join("");
    var reasons = (p.review && p.review.reasons && p.review.reasons.length)
      ? '<p class="mute-text">审核依据：' + esc(p.review.reasons.join("；")) +
        (p.review.source === "ai" ? "（AI 模型：" + esc(p.review.model || "ai") + "，风险分 " + p.review.risk + "）" : "（规则检查，风险分 " + p.review.risk + "）") + "</p>"
      : "";
    var recipeTags = (p.recipeTags || []).map(function (rid) {
      var r = Store.getRecipe(rid);
      if (!r) return "";
      return '<a class="tag-pill" href="#/recipe/' + rid + '">' + esc(r.emoji || "") + " " + esc(r.name) + "</a>";
    }).join("");

    view.innerHTML =
      '<a class="back" href="#/posts">← 返回交流区</a>' +
      '<article class="panel post-detail">' +
        '<div class="post-top"><span class="post-cat">' + esc(p.category) + "</span>" + postStatusBadge(p) + "</div>" +
        "<h1>" + esc(p.title) + "</h1>" +
        '<div class="post-meta">' + esc(p.nickname) + (p.isAdminAuthor ? ' <span class="badge role-badge">管理员</span>' : "") +
          " · " + timeAgo(p.createdAt) + " · 浏览 " + (p.views || 0) + "</div>" +
        (recipeTags ? '<div class="detail-tags">' + recipeTags + "</div>" : "") +
        '<div class="post-body">' + esc(p.content).replace(/\n/g, "<br>") + "</div>" +
        (imgs ? '<div class="post-images">' + imgs + "</div>" : "") +
        (p.status === "rejected" && p.rejectReason ? '<p class="post-reject">未通过原因：' + esc(p.rejectReason) + "</p>" : "") +
        reasons +
        '<div class="detail-actions">' +
          '<button class="btn ' + (p.liked ? "" : "ghost") + '" data-action="post-like" data-id="' + p.id + '">' + (p.liked ? "已赞 " : "赞 ") + p.likeCount + "</button>" +
          '<button class="btn ' + (p.faved ? "" : "ghost") + '" data-action="post-fav" data-id="' + p.id + '">' + (p.faved ? "★ 已收藏" : "☆ 收藏帖子") + "</button>" +
          (canMod ? '<button class="btn ghost danger" data-action="post-del" data-id="' + p.id + '">删除</button>' : "") +
        "</div>" +
      "</article>" +
      '<section class="panel comments">' +
        '<div class="panel-head"><h2>回复 <span class="count">' + p.commentCount + "</span></h2></div>" +
        (me
          ? '<form id="postCommentForm" class="comment-form" data-id="' + p.id + '">' +
              '<div class="comment-form-row">' + avatarHTML(me.nickname || me.username) +
              '<textarea class="input" name="content" rows="2" maxlength="500" placeholder="说点什么…"></textarea></div>' +
              '<div class="comment-form-foot"><span class="mute-text">以「' + esc(me.nickname || me.username) + "」的身份回复</span>" +
              '<button class="btn" type="submit">回复</button></div>' +
            "</form>"
          : '<div class="comment-login">登录后就能参与讨论。<button class="btn sm" data-action="open-login">登录</button></div>') +
        ((p.comments || []).length
          ? '<ul class="comment-list">' + p.comments.map(function (c) {
              var canDel = me && (me.role === "admin" || c.userId === me.id || p.authorId === me.id);
              return '<li class="comment">' + avatarHTML(c.nickname) +
                '<div class="c-body"><div class="c-head"><b>' + esc(c.nickname) + "</b><time>" + timeAgo(c.createdAt) + "</time></div>" +
                '<div class="c-text">' + esc(c.content).replace(/\n/g, "<br>") + "</div>" +
                (canDel ? '<div class="c-actions"><button class="c-op danger" data-action="post-comment-del" data-id="' + c.id + '" data-post="' + p.id + '">删除</button></div>' : "") +
                "</div></li>";
            }).join("") + "</ul>"
          : '<div class="empty sm">还没有人回复</div>') +
      "</section>";
  }

  /* ---------------- 视图零：主页 · 每日推荐 ---------------- */

  function deckOffsets(total) {
    var out = [];
    for (var i = 0; i < total; i++) {
      var o = i - deckState.i;
      if (o > total / 2) o -= total;
      if (o < -total / 2) o += total;
      out.push(o);
    }
    return out;
  }

  function applyDeck() {
    var deck = document.getElementById("deck");
    if (!deck) return;
    var cards = Array.prototype.slice.call(deck.querySelectorAll(".deck-card"));
    var total = cards.length;
    if (!total) return;
    var offs = deckOffsets(total);
    cards.forEach(function (card, i) {
      var o = offs[i];
      var abs = Math.abs(o);
      // 视觉上只有三档位置：-1（左后）/ 0（当前）/ +1（右后）。
      // 更远的卡直接「瞬移」到左右两侧并隐藏，避免它横穿屏幕造成的闪烁。
      var pos = Math.max(-1, Math.min(1, o));
      var hidden = abs > 1;
      var dx = (pos === 0 ? deckState.drag : 0);
      var changingSide = hidden !== card.__hidden;
      card.__hidden = hidden;
      if (changingSide) card.style.transition = hidden ? "none" : "";
      card.style.visibility = hidden ? "hidden" : "visible";
      card.style.transform =
        "translate3d(calc(" + (pos * 7) + "% + " + Math.round(dx) + "px), " + (Math.abs(pos) * 1.8).toFixed(2) + "%, 0) " +
        "scale(" + (1 - Math.abs(pos) * 0.055).toFixed(3) + ") " +
        "rotate(" + (pos * 1.1 + dx / 70).toFixed(2) + "deg)";
      card.style.zIndex = String(20 - abs);
      card.style.pointerEvents = (pos === 0 ? "auto" : "none");
      card.classList.toggle("is-front", pos === 0);
    });
    var dots = document.getElementById("deckDots");
    if (dots) {
      Array.prototype.slice.call(dots.children).forEach(function (d, i) {
        d.classList.toggle("on", i === deckState.i);
      });
    }
    var counter = document.getElementById("deckCounter");
    if (counter) counter.textContent = (deckState.i + 1) + " / " + total;
  }

  function deckGo(delta) {
    var total = (deckState.picks || []).length;
    if (!total) return;
    deckState.i = ((deckState.i + delta) % total + total) % total;
    deckState.drag = 0;
    applyDeck();
  }

  function bindDeck() {
    var deck = document.getElementById("deck");
    if (!deck) return;
    var startX = 0, dragging = false;

    deck.addEventListener("pointerdown", function (e) {
      if (e.target.closest("a, button")) return;
      dragging = true;
      startX = e.clientX;
      deckState.drag = 0;
      deck.classList.add("dragging");
      try { deck.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
    });
    deck.addEventListener("pointermove", function (e) {
      if (!dragging) return;
      deckState.drag = e.clientX - startX;
      // 用 rAF 限流：不管指针事件多密，一帧最多重排一次
      if (!deckState.raf) {
        deckState.raf = requestAnimationFrame(function () {
          deckState.raf = 0;
          applyDeck();
        });
      }
    });
    function finish() {
      if (!dragging) return;
      dragging = false;
      if (deckState.raf) { cancelAnimationFrame(deckState.raf); deckState.raf = 0; }
      deck.classList.remove("dragging");
      var d = deckState.drag;
      deckState.drag = 0;
      if (Math.abs(d) > 55) deckGo(d < 0 ? 1 : -1);
      else applyDeck();
    }
    deck.addEventListener("pointerup", finish);
    deck.addEventListener("pointercancel", finish);
    deck.addEventListener("keydown", function (e) {
      if (e.key === "ArrowLeft") { deckGo(-1); }
      else if (e.key === "ArrowRight") { deckGo(1); }
    });
  }

  function deckCardHTML(r, idx, total) {
    // 用原图（700×700）而不是小缩略图，并按较小尺寸显示，保证清晰
    var img = r.image
      ? '<img class="deck-img" src="' + esc(r.image) + '" alt="' + esc(r.name) + '" ' +
        'onload="this.classList.add(\'loaded\')" onerror="this.classList.add(\'failed\')">'
      : "";
    var tags = (r.tags || []).slice(0, 4).join(" · ");
    return '<article class="deck-card">' +
      // 半透明底色只铺在图片区（没图时当占位），卡片本体保持不透明，后面几张才不会透上来
      '<div class="deck-media" style="' + grad(r.color) + '">' +
        img +
        (r.image ? "" : '<span class="deck-emoji">' + esc(r.emoji || "🍹") + "</span>") +
      "</div>" +
      '<div class="deck-body">' +
        '<span class="kicker">第 ' + (idx + 1) + " 杯 · " + typeLabel(r.type) + "</span>" +
        "<h2>" + esc(r.name) + (r.en ? "<em>" + esc(r.en) + "</em>" : "") + "</h2>" +
        '<p class="deck-desc">' + esc(r.desc || "") + "</p>" +
        (tags ? '<div class="deck-tags">' + esc(tags) + "</div>" : "") +
        '<div class="deck-cta">' +
          '<a class="btn" href="#/recipe/' + r.id + '">查看配方</a>' +
          '<span class="deck-sub">' + r.ingredients.length + " 种材料" + (r.glass ? " · " + esc(r.glass) : "") + "</span>" +
        "</div>" +
      "</div>" +
    "</article>";
  }

  function renderHome() {
    if (!deckState.picks || !deckState.picks.length) {
      deckState.picks = Store.dailyPicks(4);
      deckState.i = 0;
    }
    var picks = deckState.picks;
    var all = Store.visibleRecipes().filter(function (r) { return r.status === "approved"; });
    var homePosts = Store.listPosts({ status: "all", sort: "new" }).slice(0, 3);
    var postsHTML = '<section class="home-posts">' +
      '<div class="panel-head">' +
        '<div><span class="kicker">交流区 · COMMUNITY</span>' +
        "<h2>大家都在聊什么</h2></div>" +
        '<div class="chips"><a class="chip" href="#/posts">全部帖子</a>' +
        '<button class="chip" data-action="new-post">我要发帖</button></div>' +
      "</div>" +
      (homePosts.length
        ? '<div class="post-list">' + homePosts.map(postCardHTML).join("") + "</div>"
        : '<div class="empty sm">还没有人发言。发第一条帖，问问大家某杯酒怎么做？</div>') +
      "</section>";

    view.innerHTML =
      '<section class="home">' +
        '<div class="home-head">' +
          '<div class="home-head-main">' +
            '<span class="kicker">每日推荐 · DAILY PICKS</span>' +
            "<h1>今天为你挑了 " + picks.length + " 杯</h1>" +
            '<p class="home-date">' + esc(Store.todayLabel()) + "</p>" +
          "</div>" +
          '<button class="link-btn deck-shuffle" data-action="deck-shuffle">换一批</button>' +
        "</div>" +
        '<div class="deck" id="deck" tabindex="0">' +
          picks.map(function (r, i) { return deckCardHTML(r, i, picks.length); }).join("") +
        "</div>" +
        '<div class="deck-bar">' +
          '<button class="deck-arrow" data-action="deck-prev" aria-label="上一杯">←</button>' +
          '<div class="deck-dots" id="deckDots">' + picks.map(function (r, i) {
            return '<span data-action="deck-dot" data-value="' + i + '"></span>';
          }).join("") + "</div>" +
          '<span class="deck-counter" id="deckCounter"></span>' +
          '<button class="deck-arrow" data-action="deck-next" aria-label="下一杯">→</button>' +
          '<span class="deck-hint">左右滑动切换</span>' +
        "</div>" +
      "</section>" +

      postsHTML +

      '<section class="home-actions">' +
        '<a class="qa" href="#/match"><b>按材料找酒</b><span>勾一勾冰箱里有什么，看你今晚能调哪几杯</span></a>' +
        '<a class="qa" href="#/tags"><b>按口味找酒</b><span>甜 · 酸 · 苦 · 气泡 · 长饮短饮 · 无酒精</span></a>' +
        '<a class="qa" href="#/recipes"><b>全部配方</b><span>' + all.length + " 款经典与特调，含材料、做法与教学视频</span></a>" +
      "</section>" +

      '<section class="home-foot">' +
        '<span class="kicker">酒库现状</span>' +
        '<div class="home-stats">' +
          statBox(all.length, "款配方") +
          statBox(Store.listIngredients().length, "种材料") +
          statBox(all.filter(function (r) { return r.type === "classic"; }).length, "款经典") +
          statBox(all.filter(function (r) { return r.type === "custom"; }).length, "款特调") +
        "</div>" +
      "</section>";

    applyDeck();
    bindDeck();
    requestAnimationFrame(function () {
      var d = document.getElementById("deck");
      if (d) d.classList.add("ready");
    });
  }

  function libResults() {
    return Store.searchRecipes({
      q: libFilter.q, type: libFilter.type, base: libFilter.base, abv: libFilter.abv,
      onlyFav: libFilter.fav, onlyMakeable: libFilter.onlyMakeable, sort: libFilter.sort,
      myIngredients: Store.getMyIngredients()
    });
  }

  function renderLibrary() {
    var all = Store.visibleRecipes().filter(function (r) { return r.status === "approved"; });
    var bases = Store.baseSpirits();

    view.innerHTML =
      '<section class="hero">' +
        '<div class="hero-text"><h1>今晚喝什么？</h1><p>' + esc(Store.getSettings().slogan || "") + "</p>" +
        '<div class="hero-actions"><button class="btn" data-action="random">随便来一杯</button>' +
        '<a class="btn ghost" href="#/match">按我的材料找酒</a></div></div>' +
        '<div class="hero-stats">' +
          statBox(all.length, "款配方") +
          statBox(Store.listIngredients().length, "种材料") +
          statBox(all.filter(function (r) { return r.type === "classic"; }).length, "款经典") +
        "</div>" +
      "</section>" +

      '<section class="toolbar filter-bar">' +
        '<input id="libSearch" class="input search" type="search" placeholder="搜索：酒名 / 材料 / 英文名，空格可分隔多个关键词" value="' + esc(libFilter.q) + '">' +
        '<div class="chips">' +
          chipButton("lib-type", "all", "全部", libFilter.type) +
          chipButton("lib-type", "classic", "经典鸡尾酒", libFilter.type) +
          chipButton("lib-type", "custom", "特调", libFilter.type) +
          '<button class="chip ' + (libFilter.fav ? "on" : "") + '" data-action="lib-fav">★ 我的收藏</button>' +
          '<button class="chip ' + (libFilter.onlyMakeable ? "on" : "") + '" data-action="lib-makeable">只用我有的材料</button>' +
        "</div>" +
        '<div class="toolbar-right">' +
          '<select id="libBase" class="input select" title="按基酒筛选">' +
            option("all", "全部基酒", libFilter.base) +
            bases.map(function (b) { return option(b.id, b.name + "（" + b.count + "）", libFilter.base); }).join("") +
          "</select>" +
          '<select id="libAbv" class="input select" title="按酒感筛选">' +
            option("all", "全部酒感", libFilter.abv) + option("低", "低酒感", libFilter.abv) +
            option("中", "中等酒感", libFilter.abv) + option("高", "高酒感", libFilter.abv) +
            option("超高", "超高酒感", libFilter.abv) + option("无", "无酒精", libFilter.abv) +
          "</select>" +
          '<select id="libSort" class="input select" title="排序">' +
            option("hot", "最热门", libFilter.sort) + option("new", "最新发布", libFilter.sort) +
            option("match", "匹配度最高", libFilter.sort) + option("easy", "最容易做", libFilter.sort) +
            option("name", "按名称", libFilter.sort) +
          "</select>" +
          '<button class="btn ghost sm" data-action="lib-reset">重置</button>' +
        "</div>" +
      "</section>" +

      '<div class="result-count" id="libCount"></div>' +
      '<section id="recipeGrid" class="grid"></section>';

    refreshLibrary();
  }

  function gridHTML(list, q) {
    if (!list.length) {
      return '<div class="empty">没有符合条件的配方。<br><span class="mute-text">试试减少关键词、换个基酒，或者去 <a href="#/new">添加一个</a>。</span></div>';
    }
    return list.map(function (r) { return recipeCard(r, r._missing, q); }).join("");
  }

  function refreshLibrary() {
    var list = libResults();
    var grid = document.getElementById("recipeGrid");
    var count = document.getElementById("libCount");
    if (grid) grid.innerHTML = gridHTML(list, libFilter.q);
    if (count) {
      var parts = ["共 " + list.length + " 款"];
      if (libFilter.q) parts.push("关键词：" + libFilter.q);
      if (libFilter.type !== "all") parts.push(libFilter.type === "classic" ? "经典" : "特调");
      if (libFilter.base !== "all") parts.push("基酒：" + Store.ingredientName(libFilter.base));
      if (libFilter.abv !== "all") parts.push("酒感：" + libFilter.abv);
      if (libFilter.fav) parts.push("仅收藏");
      if (libFilter.onlyMakeable) parts.push("仅用已有材料");
      count.innerHTML = esc(parts.join(" · "));
    }
  }

  /* ---------------- 视图二：配方详情 + 评论区 ---------------- */

  function renderRecipeDetail(id) {
    var r = Store.getRecipe(id);
    if (!r) { view.innerHTML = '<div class="empty">找不到这款配方。<a href="#/recipes">返回配方库</a></div>'; return; }
    var me = Store.currentUser();
    var canDelete = me && (me.role === "admin" || (r.authorId === me.id && Store.can("deleteOwnRecipe")));
    Store.addView(id);

    var mine = Store.getMyIngredients();
    var owned = {};
    mine.forEach(function (x) { owned[x] = true; });

    var ingHTML = r.ingredients.map(function (x) {
      var ing = Store.getIngredient(x.id);
      var isBasic = !ing || ing.basic;
      var have = !isBasic && owned[x.id];
      var tag = isBasic ? '<span class="badge mute">常备</span>'
        : have ? '<span class="badge ok">有</span>'
        : (x.optional ? '<span class="badge mute">可选</span>' : '<span class="badge no">缺</span>');
      return "<li>" + (ing ? esc(ing.emoji || "") : "❓") + ' <span class="ing-name">' + esc(Store.ingredientName(x.id)) + "</span>" +
        '<span class="amount">' + esc(x.amount || "") + "</span>" + tag + "</li>";
    }).join("");

    var stepsHTML = (r.steps || []).map(function (s, i) {
      return "<li><b>" + (i + 1) + "</b><span>" + esc(s) + "</span></li>";
    }).join("");

    var videoHTML = r.video
      ? '<a class="video-link" href="' + esc(r.video) + '" target="_blank" rel="noreferrer">▶ ' + esc(r.videoName || "观看教学视频") + "</a>"
      : '<span class="mute-text">还没有视频链接</span>';

    view.innerHTML =
      '<a class="back" href="#/recipes">← 返回配方库</a>' +
      '<section class="detail">' +
        '<div class="detail-hero" style="' + grad(r.color) + '">' +
          (r.image ? '<img class="hero-img" src="' + esc(r.image) + '" alt="' + esc(r.name) + '" onload="this.classList.add(\'loaded\')" onerror="this.classList.add(\'failed\')">' : "") +
          '<span>' + esc(r.emoji || "🍹") + "</span>" +
          (me && me.role === "admin" ? '<button class="btn ghost sm hero-change" data-action="set-image" data-id="' + r.id + '">编辑图片与标签</button>' : "") +
        "</div>" +
        '<div class="detail-main">' +
          "<h1>" + esc(r.name) + (r.en ? ' <em>' + esc(r.en) + "</em>" : "") + "</h1>" +
          '<div class="tags">' +
            '<span class="pill ' + (r.type === "classic" ? "cls" : "ctm") + '">' + typeLabel(r.type) + "</span>" +
            (r.glass ? '<span class="pill">杯型：' + esc(r.glass) + "</span>" : "") +
            (r.abv ? '<span class="pill">酒感：' + esc(r.abv) + "</span>" : "") +
            '<span class="pill">' + esc(r.author || "官方") + " 发布</span>" +
            '<span class="pill">' + (r.views || 0) + " 次查看</span>" +
            '<span class="pill">评论 ' + Store.countComments(r.id) + "</span>" +
            (r.status !== "approved" ? '<span class="pill warn-pill">' + (r.status === "pending" ? "待审核" : "已下架") + "</span>" : "") +
          "</div>" +
          '<p class="lead">' + esc(r.desc || "") + "</p>" +
          ((r.tags && r.tags.length)
            ? '<div class="detail-tags">' + r.tags.map(function (t) {
                return '<button class="tag-pill" data-action="open-tag" data-value="' + esc(t) + '">' + esc(t) + "</button>";
              }).join("") + "</div>"
            : "") +
          '<div class="detail-actions">' +
            '<button class="btn ' + (Store.isFavorite(r.id) ? "" : "ghost") + '" data-action="toggle-fav" data-id="' + r.id + '">' + (Store.isFavorite(r.id) ? "★ 已收藏" : "☆ 收藏") + "</button>" +
            (Store.can("suggestVideo") ? '<button class="btn ghost" data-action="add-video" data-id="' + r.id + '">推荐视频</button>' : "") +
            '<button class="btn ghost" data-action="report" data-id="' + r.id + '">勘误</button>' +
            (canDelete ? '<button class="btn ghost danger" data-action="delete-recipe" data-id="' + r.id + '">删除</button>' : "") +
          "</div>" +
          '<h2>需要的材料</h2><ul class="ing-list">' + ingHTML + "</ul>" +
          '<div class="tip">勾选状态来自你「我有啥」里选择的材料，去那里更新一下再回来看看。</div>' +
          "<h2>做法</h2><ol class=\"steps\">" + (stepsHTML || "<li>暂无步骤</li>") + "</ol>" +
          "<h2>教学视频</h2><p>" + videoHTML + "</p>" +
        "</div>" +
      "</section>" +
      '<section class="panel comments" id="comments">' +
        '<div id="commentComposer"></div>' +
        '<div id="commentListWrap"></div>' +
      "</section>" +
      (function () {
        // 配方页最下方：关于这杯酒的帖子
        var posts = Store.postsByRecipe(id, 3);
        var total = Store.countPostsByRecipe(id);
        return '<section class="panel recipe-posts">' +
          '<div class="panel-head">' +
            '<div><span class="kicker">讨论区 · DISCUSSION</span>' +
            "<h2>关于「" + esc(r.name) + "」的讨论 <span class=\"count\">" + total + "</span></h2></div>" +
            '<div class="chips">' +
              '<button class="chip" data-action="new-post" data-id="' + r.id + '">就这杯酒发帖</button>' +
              (total > 3 ? '<a class="chip" href="#/posts/recipe/' + r.id + '">查看全部 ' + total + " 条</a>" : "") +
            "</div>" +
          "</div>" +
          (posts.length
            ? '<div class="post-list">' + posts.map(postCardHTML).join("") + "</div>"
            : '<div class="empty sm">还没有人聊这杯酒。<br><span class="mute-text">点「就这杯酒发帖」，发帖时会自动带上这杯酒的标签。</span></div>') +
          "</section>";
      })();

    if (commentState.recipeId !== id) {
      commentState = { recipeId: id, sort: "hot", page: 1, replyTo: null };
    }
    renderCommentComposer();
    renderCommentList();
  }

  /* ----- 评论区 ----- */

  function renderCommentComposer() {
    var host = document.getElementById("commentComposer");
    if (!host) return;
    var me = Store.currentUser();
    var total = Store.countComments(commentState.recipeId);

    var head = '<div class="panel-head"><h2>评论区 <span class="count">' + total + "</span></h2>" +
      '<div class="chips">' +
        '<button class="chip ' + (commentState.sort === "hot" ? "on" : "") + '" data-action="comment-sort" data-value="hot">最热</button>' +
        '<button class="chip ' + (commentState.sort === "new" ? "on" : "") + '" data-action="comment-sort" data-value="new">最新</button>' +
      "</div></div>";

    var form;
    if (!me) {
      form = '<div class="comment-login">登录后就能参与讨论、点赞和回复。<button class="btn sm" data-action="open-login">登录</button></div>';
    } else if (!Store.can("comment")) {
      form = '<div class="comment-login">管理员暂时关闭了评论功能。</div>';
    } else {
      form = '<form id="commentForm" class="comment-form" data-id="' + commentState.recipeId + '">' +
        '<div class="comment-form-row">' + avatarHTML(me.nickname || me.username) +
        '<textarea class="input" name="content" rows="2" maxlength="500" placeholder="说点什么…比如这杯酒好不好喝、有什么小技巧"></textarea></div>' +
        '<div class="comment-form-foot"><span class="mute-text">以「' + esc(me.nickname || me.username) + "」的身份发表（" + Store.roleLabel() + "）</span>" +
        '<button class="btn" type="submit">发表评论</button></div>' +
      "</form>";
    }
    host.innerHTML = head + form;
  }

  function commentItemHTML(c, depth) {
    var me = Store.currentUser();
    var isAdmin = me && me.role === "admin";
    var actions =
      '<button class="c-op' + (c.liked ? " on" : "") + '" data-action="comment-like" data-id="' + c.id + '">赞 ' + c.likeCount + "</button>" +
      (depth === 0 && me ? '<button class="c-op" data-action="comment-reply" data-id="' + c.id + '">回复</button>' : "") +
      ((c.mine || isAdmin) ? '<button class="c-op danger" data-action="comment-delete" data-id="' + c.id + '">删除</button>' : "") +
      (isAdmin ? '<button class="c-op" data-action="comment-pin" data-id="' + c.id + '">' + (c.pinned ? "取消置顶" : "置顶") + "</button>" : "") +
      (isAdmin ? '<button class="c-op" data-action="comment-hide" data-id="' + c.id + '">' + (c.hidden ? "恢复显示" : "隐藏") + "</button>" : "");

    var replies = (c.replies || []).map(function (x) { return commentItemHTML(x, 1); }).join("");

    var replyForm = (commentState.replyTo === c.id && depth === 0)
      ? '<form class="comment-form reply" data-id="' + commentState.recipeId + '" data-parent="' + c.id + '">' +
          '<textarea class="input" name="content" rows="2" maxlength="500" placeholder="回复 @' + esc(c.nickname) + '"></textarea>' +
          '<div class="comment-form-foot"><button class="btn sm" type="submit">回复</button>' +
          '<button type="button" class="btn ghost sm" data-action="comment-cancel-reply">取消</button></div>' +
        "</form>"
      : "";

    return '<li class="comment ' + (depth ? "is-reply" : "") + (c.hidden ? " is-hidden" : "") + '">' +
      avatarHTML(c.nickname || c.username) +
      '<div class="c-body">' +
        '<div class="c-head"><b>' + esc(c.nickname || c.username) + "</b>" +
          (c.isAdmin ? '<span class="badge role-badge">管理员</span>' : "") +
          (c.pinned ? '<span class="badge warn">置顶</span>' : "") +
          (c.hidden ? '<span class="badge no">已隐藏</span>' : "") +
          "<time>" + timeAgo(c.createdAt) + "</time></div>" +
        '<div class="c-text">' + esc(c.content).replace(/\n/g, "<br>") + "</div>" +
        '<div class="c-actions">' + actions + "</div>" +
        replyForm +
        (replies ? '<ul class="reply-list">' + replies + "</ul>" : "") +
      "</div></li>";
  }

  function renderCommentList() {
    var host = document.getElementById("commentListWrap");
    if (!host) return;
    var list = Store.listComments(commentState.recipeId, { sort: commentState.sort });
    if (!list.length) {
      host.innerHTML = '<div class="empty sm">还没有人评论，来说说你的感受吧</div>';
      return;
    }
    var size = Store.getSettings().commentPageSize || 10;
    var shown = list.slice(0, commentState.page * size);
    host.innerHTML = '<ul class="comment-list">' + shown.map(function (c) { return commentItemHTML(c, 0); }).join("") + "</ul>" +
      (list.length > shown.length
        ? '<button class="btn ghost more-btn" data-action="comment-more">加载更多评论（还有 ' + (list.length - shown.length) + " 条）</button>"
        : "");
  }

  function submitComment(form) {
    var fd = new FormData(form);
    var parentId = form.getAttribute("data-parent") || null;
    var res = Store.addComment(form.getAttribute("data-id"), fd.get("content"), parentId);
    if (!res.ok) { toast(res.msg); return; }
    commentState.replyTo = null;
    toast(parentId ? "回复成功" : "评论发表成功");
    renderCommentComposer();
    renderCommentList();
    renderHeader();
  }

  /* ---------------- 视图三：我有啥（材料匹配） ---------------- */

  /* ---------------- 视图：想喝啥（按口味标签） ---------------- */

  function tagPickerHTML(scope, selected) {
    var counts = Store.tagCounts();
    var groups = Store.tagGroups();
    var known = [];
    groups.forEach(function (g) { g.tags.forEach(function (t) { known.push(t); }); });
    var custom = selected.filter(function (t) { return known.indexOf(t) < 0; });

    var groupsHTML = groups.map(function (g) {
      return '<div class="tag-row"><span class="tag-row-name"><b>' + esc(g.name) + "</b><em>" + esc(g.en || "") + "</em></span>" +
        '<div class="tag-chips">' + g.tags.map(function (t) {
          var on = selected.indexOf(t) >= 0;
          return '<button type="button" class="tag-chip ' + (on ? "on" : "") + '" data-action="toggle-tag" data-scope="' + scope + '" data-value="' + esc(t) + '">' +
            esc(t) + (counts[t] ? '<em>' + counts[t] + "</em>" : "") + "</button>";
        }).join("") + "</div></div>";
    }).join("");

    var customHTML = custom.length
      ? '<div class="tag-row"><span class="tag-row-name"><b>自定义</b><em>CUSTOM</em></span><div class="tag-chips">' +
        custom.map(function (t) {
          return '<button type="button" class="tag-chip on" data-action="toggle-tag" data-scope="' + scope + '" data-value="' + esc(t) + '">' + esc(t) + "</button>";
        }).join("") + "</div></div>"
      : "";

    var inputId = scope === "draft" ? "customTagInput" : "modalTagInput";
    return '<div class="tag-selected">已选 ' + selected.length + " 个：" +
      (selected.length
        ? selected.map(function (t) {
            return '<button type="button" class="tag-pill on" data-action="toggle-tag" data-scope="' + scope + '" data-value="' + esc(t) + '">' + esc(t) + " ×</button>";
          }).join("")
        : '<span class="mute-text">还没选，点下面的标签；也可以自己敲一个</span>') +
      "</div>" +
      groupsHTML + customHTML +
      '<div class="row tight custom-tag-row">' +
        '<input class="input narrow-w" id="' + inputId + '" placeholder="自定义标签，如「烟熏味」「家乡味」">' +
        '<button type="button" class="btn ghost sm" data-action="add-custom-tag" data-scope="' + scope + '">加为标签</button>' +
        '<span class="mute-text">最多 10 个标签，每个不超过 8 个字</span>' +
      "</div>";
  }

  function renderTags() {
    var t = tagFilter.tags;
    view.innerHTML =
      '<section class="page-head"><h1>想喝啥</h1><p>点几个你现在的口味（比如「酸 + 气泡 + 夏日」），下面就会只剩符合条件的酒；拿不定主意就让它随机挑一杯。</p></section>' +
      '<section class="panel">' +
        '<div class="panel-head">' +
          '<div class="chips">' +
            '<button class="chip ' + (tagFilter.mode === "all" ? "on" : "") + '" data-action="tag-mode" data-value="all">同时满足全部</button>' +
            '<button class="chip ' + (tagFilter.mode === "any" ? "on" : "") + '" data-action="tag-mode" data-value="any">满足任一即可</button>' +
            '<button class="chip" data-action="tag-clear">清空标签</button>' +
          "</div>" +
          '<span class="mute-text" id="tagHint"></span>' +
        "</div>" +
        '<div id="tagPickerWrap">' + tagPickerHTML("filter", t) + "</div>" +
      "</section>" +
      '<section class="panel">' +
        '<div class="panel-head"><h2>符合条件</h2><span class="mute-text" id="tagCount"></span>' +
          '<button class="btn" data-action="tag-random" style="margin-left:auto">随机一杯</button>' +
        "</div>" +
        '<div id="tagResults"></div>' +
      "</section>";
    renderTagResults();
  }

  function renderTagResults() {
    var host = document.getElementById("tagResults");
    if (!host) return;
    var list = Store.searchRecipes({ tags: tagFilter.tags, tagMode: tagFilter.mode, sort: "hot" });
    var count = document.getElementById("tagCount");
    var hint = document.getElementById("tagHint");
    if (count) count.textContent = tagFilter.tags.length ? "共 " + list.length + " 款" : "还没选标签，下面是全部 " + list.length + " 款";
    if (hint) hint.textContent = tagFilter.tags.length ? "点了" + tagFilter.tags.length + "个标签，按「" + (tagFilter.mode === "all" ? "同时满足" : "满足任一") + "」筛选" : "";
    host.innerHTML = list.length
      ? '<div class="grid small">' + list.map(function (r) { return recipeCard(r, r._missing, ""); }).join("") + "</div>"
      : '<div class="empty">没有同时满足这些标签的酒。<br><span class="mute-text">试试切换到「满足任一即可」，或者去掉一个标签。</span></div>';
  }

  /** 给「随机一杯」用的结果弹窗 */
  function showRandomModal(r, title) {
    openModal(
      "<h2>" + esc(title || "今晚就喝它") + "</h2>" +
      '<div class="detail-hero small" style="' + grad(r.color) + '">' +
        (r.imageThumb ? '<img class="hero-img" src="' + esc(r.imageThumb) + '" alt="" onerror="this.classList.add(\'failed\')">' : "") +
        '<span>' + esc(r.emoji || "🍹") + "</span>" +
      "</div>" +
      '<h3 class="center">' + esc(r.name) + (r.en ? " <em>" + esc(r.en) + "</em>" : "") + "</h3>" +
      '<div class="tag-center">' + (r.tags || []).map(function (t) {
        return '<span class="tag-pill">' + esc(t) + "</span>";
      }).join("") + "</div>" +
      '<p class="center">' + esc(r.desc || "") + "</p>" +
      '<div class="form-foot center"><a class="btn" href="#/recipe/' + r.id + '" data-action="close-modal">看看怎么做</a>' +
      '<button class="btn ghost" data-action="' + (title ? "tag-random" : "random") + '">换一杯</button></div>'
    );
  }

  function selectedTagsFor(scope) {
    return scope === "modal" ? modalTags : (scope === "filter" ? tagFilter.tags : draftTags);
  }

  function refreshTagPicker(scope) {
    var wrap = document.getElementById(scope === "draft" ? "draftTagPicker" : (scope === "modal" ? "modalTagPicker" : "tagPickerWrap"));
    if (!wrap) return;
    if (scope === "filter") wrap.innerHTML = tagPickerHTML("filter", tagFilter.tags);
    else wrap.innerHTML = tagPickerHTML(scope, selectedTagsFor(scope));
  }

  function addCustomTag(scope) {
    var input = document.getElementById(scope === "draft" ? "customTagInput" : "modalTagInput");
    if (!input) return;
    var val = String(input.value || "").trim().replace(/^#/, "");
    if (!val) { toast("先输入标签内容"); return; }
    if (val.length > 8) { toast("标签最多 8 个字"); return; }
    var arr = selectedTagsFor(scope);
    if (arr.length >= 10) { toast("最多 10 个标签"); return; }
    if (arr.indexOf(val) < 0) arr.push(val);
    input.value = "";
    if (scope === "filter") { renderTags(); }
    else { refreshTagPicker(scope); }
    toast("已添加标签「" + val + "」");
  }

  function selectedSet() {
    var s = {};
    Store.getMyIngredients().forEach(function (id) { s[id] = true; });
    return s;
  }

  function renderMatch() {
    view.innerHTML =
      '<section class="page-head"><h1>我有啥</h1><p>勾选你手头有的材料（冰块这类常备品不用勾），下面会按「现在就能调 / 差 1 种 / 差 2 种 / 差 3 种」帮你排好，并告诉你补哪几种最划算。</p></section>' +
      '<div class="match-layout">' +
        '<section class="panel">' +
          '<div class="panel-head">' +
            '<input id="matchSearch" class="input search" type="search" placeholder="搜索材料：名称 / 英文名，可空格分隔" value="' + esc(matchQuery) + '">' +
            '<div class="chips">' +
              '<button class="chip ' + (matMode === "cat" ? "on" : "") + '" data-action="mat-mode" data-value="cat">按种类</button>' +
              '<button class="chip ' + (matMode === "abc" ? "on" : "") + '" data-action="mat-mode" data-value="abc">按字母</button>' +
            "</div>" +
            '<div class="chips"><button class="chip" data-action="match-common">常见基酒一键勾选</button>' +
            '<button class="chip" data-action="match-clear">全部清空</button></div>' +
          "</div>" +
          '<div class="selected-bar" id="selectedBar"></div>' +
          '<div class="picker-body">' +
            '<div id="ingPickerWrap"></div>' +
            '<div class="az-index" id="azIndex"></div>' +
          "</div>" +
          '<p class="mute-text picker-foot">材料按大类分组、组内按拼音首字母 A→Z 排列；搜「jinjiu」也能搜到金酒。' +
          "「按种类」是大类分组、「按字母」是全部按 A→Z 并配右侧字母表。" +
          "发现材料缺失或写错？<button class=\"link-btn\" data-action=\"report\">提交勘误</button></p>" +
        "</section>" +
        '<section class="panel results-panel">' +
          '<div class="panel-head"><h2>能调的酒</h2><span id="matchCount" class="mute-text"></span></div>' +
          '<div id="restockWrap"></div>' +
          '<div id="matchResults"></div>' +
        "</section>" +
      "</div>";

    renderSelectedBar();
    renderMatchPicker();
    renderMatchResults();
  }

  function renderSelectedBar() {
    var bar = document.getElementById("selectedBar");
    if (!bar) return;
    var ids = Store.getMyIngredients();
    if (!ids.length) {
      bar.innerHTML = '<span class="mute-text">还没选材料。下面点一下就会加入，已选的材料会出现在这里，点一下可以移除。</span>';
      return;
    }
    bar.innerHTML = '<span class="sel-label">已选 ' + ids.length + " 种：</span>" +
      ids.map(function (id) {
        var ing = Store.getIngredient(id);
        return '<button class="sel-chip on" data-action="match-toggle" data-id="' + id + '">' +
          esc(ing ? (ing.emoji + " " + ing.name) : id) + " ×</button>";
      }).join("");
  }

  function renderMatchPicker() {
    var wrap = document.getElementById("ingPickerWrap");
    if (!wrap) return;
    var selected = selectedSet();
    var list = Store.searchIngredients(matchQuery, "全部").filter(function (i) { return !i.basic; });
    var html;

    function byLetter(a, b) {
      if (a.initial !== b.initial) return String(a.initial).localeCompare(String(b.initial));
      return String(a.py).localeCompare(String(b.py));
    }
    function chip(i) {
      return '<button class="ing-chip ' + (selected[i.id] ? "on" : "") + '" data-action="match-toggle" data-id="' + i.id +
        '" title="' + esc(i.aka || i.name) + '"><span class="e">' + esc(i.emoji || "🍹") + "</span>" +
        '<span class="nm">' + esc(i.name) + "</span></button>";
    }

    if (matMode === "abc") {
      /* 模式二：完全按字母排序，不分种类，配右侧字母检索表 */
      var all = list.slice().sort(byLetter);
      var groups = [];
      all.forEach(function (i) {
        var last = groups[groups.length - 1];
        if (!last || last.letter !== i.initial) { last = { letter: i.initial, items: [] }; groups.push(last); }
        last.items.push(i);
      });
      html = groups.map(function (g) {
        return '<div class="letter-group" data-letter="' + esc(g.letter) + '">' +
          '<span class="letter">' + esc(g.letter) + "</span>" +
          '<div class="ing-picker">' + g.items.map(chip).join("") + "</div></div>";
      }).join("");
    } else {
      /* 模式一：按种类分组，组内仍按字母顺序，但不显示字母标签 */
      html = Store.categories().map(function (cat) {
        var items = list.filter(function (i) { return i.cat === cat; }).sort(byLetter);
        if (!items.length) return "";
        var chosen = items.filter(function (i) { return selected[i.id]; }).length;
        return '<div class="cat-block" data-cat="' + esc(cat) + '">' +
          '<h3><span>' + esc(cat) + '</span> <span class="mute-text">' + chosen + "/" + items.length + "</span>" +
          '<button class="mini-btn" data-action="match-cat-all">全选</button>' +
          '<button class="mini-btn" data-action="match-cat-none">取消</button></h3>' +
          '<div class="ing-picker">' + items.map(chip).join("") + "</div></div>";
      }).join("");
    }

    wrap.innerHTML = html || '<div class="empty sm">没有找到匹配的材料，换个关键词试试。</div>';
    renderAzIndex();
  }

  /** 右侧 A–Z 快速索引：像通讯录那样，点字母直接跳到那一组 */
  function renderAzIndex() {
    var host = document.getElementById("azIndex");
    if (!host) return;
    // 只有「按字母」模式才需要字母检索表
    host.style.display = matMode === "abc" ? "" : "none";
    if (matMode !== "abc") return;
    var avail = {};
    document.querySelectorAll("#ingPickerWrap .letter-group").forEach(function (g) {
      avail[g.getAttribute("data-letter")] = true;
    });
    var letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    host.innerHTML =
      '<button type="button" data-action="az-top" title="回到顶部">↑</button>' +
      letters.map(function (L) {
        return '<button type="button" data-action="az-jump" data-value="' + L + '" class="' + (avail[L] ? "" : "off") + '">' + L + "</button>";
      }).join("") +
      '<button type="button" data-action="az-jump" data-value="#" class="' + (avail["#"] ? "" : "off") + '">#</button>';
  }

  function syncMatchChip(id, on) {
    document.querySelectorAll('.ing-chip[data-id="' + id + '"]').forEach(function (el) {
      el.classList.toggle("on", on);
    });
  }

  function updateCatCounts() {
    var selected = selectedSet();
    document.querySelectorAll("#ingPickerWrap .cat-block").forEach(function (block) {
      var chips = block.querySelectorAll(".ing-chip");
      var chosen = 0;
      chips.forEach(function (c) { if (selected[c.getAttribute("data-id")]) chosen++; });
      var counter = block.querySelector("h3 .mute-text");
      if (counter) counter.textContent = chosen + "/" + chips.length;
    });
  }

  function renderMatchResults() {
    var wrap = document.getElementById("matchResults");
    if (!wrap) return;
    var selected = Object.keys(selectedSet());
    var count = document.getElementById("matchCount");
    var restock = document.getElementById("restockWrap");
    if (!selected.length) {
      wrap.innerHTML = '<div class="empty">先在左边勾几种你有的材料<br><span class="mute-text">勾选后这里会自动列出能调的酒</span></div>';
      if (count) count.textContent = "已选 0 种材料";
      if (restock) restock.innerHTML = "";
      return;
    }
    var b = Store.matchRecipes(selected, { maxMissing: 3 });
    if (count) count.textContent = "已选 " + selected.length + " 种材料 · 能调 " + b.ready.length + " 款";

    if (restock) {
      var sug = Store.suggestRestock(selected, 5);
      restock.innerHTML = sug.length
        ? '<div class="restock"><h3>补货建议</h3><p class="hint">按「补上之后能多调几款酒」排序</p>' +
          sug.map(function (s) {
            return '<div class="restock-row"><span class="e">' + esc((Store.getIngredient(s.id) || {}).emoji || "🍹") + "</span>" +
              "<b>" + esc(s.name) + '</b><span class="mute-text">+' + s.total + " 款可调" +
              (s.direct ? "（其中 " + s.direct + " 款马上能做）" : "") + "</span></div>";
          }).join("") + "</div>"
        : "";
    }

    function block(title, items, hint) {
      if (!items.length) return "";
      return '<div class="result-block"><h3>' + title + ' <span class="count">' + items.length + "</span></h3>" +
        (hint ? '<p class="hint">' + hint + "</p>" : "") +
        '<div class="grid small">' + items.map(function (it) {
          return recipeCard(it.recipe, it.missing.map(function (x) { return x.id; }), "");
        }).join("") + "</div></div>";
    }

    var html =
      block("现在就能调", b.ready, "材料齐了，直接开做") +
      block("差 1 种材料", b.miss1, "差一点点，看看上面的补货建议") +
      block("差 2 种材料", b.miss2) +
      block("差 3 种材料", b.miss3);

    wrap.innerHTML = html || '<div class="empty">目前这些材料还调不出酒，再勾几种基酒或果汁试试。</div>';
  }

  /* ---------------- 视图四：添加配方 ---------------- */

  function renderNew() {
    var me = Store.currentUser();
    if (!me) {
      view.innerHTML = '<div class="empty">添加配方需要先登录。<br><br><button class="btn" data-action="open-login">立即登录</button> ' +
        '<button class="btn ghost" data-action="open-register">注册新账号</button></div>';
      return;
    }
    if (!Store.can("publishRecipe")) {
      view.innerHTML = '<div class="empty">管理员暂时关闭了用户自助发布配方。你可以先浏览配方库，或者给喜欢的配方推荐教学视频。</div>';
      return;
    }
    draft.ingredients = draft.ingredients || [];

    view.innerHTML =
      '<section class="page-head"><h1>添加配方</h1><p>配方分「经典鸡尾酒」和「特调」两类，选好材料再写做法，提交后其他用户就能看到了。</p></section>' +
      '<form id="recipeForm" class="panel form" autocomplete="off">' +
        '<div class="row">' +
          '<label class="field"><span>酒名 *</span><input class="input" name="name" placeholder="例如：青提气泡特调" required></label>' +
          '<label class="field"><span>英文名</span><input class="input" name="en" placeholder="例如：Green Grape Tonic"></label>' +
        "</div>" +
        '<div class="row">' +
          '<label class="field"><span>类型 *</span><select class="input" name="type"><option value="classic">经典鸡尾酒</option><option value="custom" selected>特调</option></select></label>' +
          '<label class="field"><span>图标 emoji<em class="opt">选填</em></span><input class="input" name="emoji" placeholder="留空就自动挑一个" maxlength="4"></label>' +
          '<label class="field"><span>杯型</span><input class="input" name="glass" placeholder="高球杯 / 马天尼杯"></label>' +
          '<label class="field"><span>酒感</span><input class="input" name="abv" placeholder="低 / 中 / 高"></label>' +
        "</div>" +
        '<label class="field"><span>一句话介绍</span><textarea class="input" name="desc" rows="2" placeholder="这杯酒什么味道？适合什么场合？"></textarea></label>' +

        '<h3 class="form-title">配方图片 <span class="mute-text">（必填，建议 4:3 或 1:1，越好看越有人点）</span></h3>' +
        '<div class="upload-row">' +
          '<div class="img-preview" id="draftImgPreview"><span class="mute-text">还没有图片</span></div>' +
          '<div class="upload-tools">' +
            '<input class="input" type="file" id="draftImgFile" accept="image/*">' +
            '<input class="input" name="image" id="draftImgUrl" placeholder="或者粘贴一个图片链接 https://...">' +
            '<span class="mute-text">上传的图会自动压缩到 1000px 以内；没有照片也可以先用 emoji 卡片。</span>' +
          "</div>" +
        "</div>" +

        '<h3 class="form-title">选择材料 <span class="mute-text">（点一下加入下方清单，可填用量、勾选「装饰用」）</span></h3>' +
        '<div class="picker-tools">' +
          '<input id="ingSearch" class="input search" type="search" placeholder="搜索材料：名称 / 英文名" value="' + esc(draft.search) + '">' +
          '<select id="ingCat" class="input select">' +
            ['<option value="全部">全部分类</option>'].concat(Store.categories().map(function (c) {
              return '<option value="' + esc(c) + '"' + (draft.cat === c ? " selected" : "") + ">" + esc(c) + "</option>";
            })).join("") +
          "</select>" +
        "</div>" +
        '<div id="ingPicker" class="ing-picker wrap"></div>' +
        '<ul id="selectedList" class="selected-list"></ul>' +

        '<h3 class="form-title">做法步骤 <span class="mute-text">（一行一步）</span></h3>' +
        '<textarea class="input" name="steps" rows="5" placeholder="高球杯加满冰&#10;倒入金酒 30ml&#10;苏打水补满，轻搅"></textarea>' +

        '<h3 class="form-title">口味标签 <span class="mute-text">（至少选 1 个，最多 8 个，也可以自己写）</span></h3>' +
        '<div id="draftTagPicker">' + tagPickerHTML("draft", draftTags) + "</div>" +

        '<h3 class="form-title">教学视频（选填，也欢迎给已有配方推荐视频）</h3>' +
        '<div class="row">' +
          '<label class="field"><span>视频链接</span><input class="input" name="video" placeholder="https://..."></label>' +
          '<label class="field"><span>视频标题</span><input class="input" name="videoName" placeholder="例如：B 站 · 3 分钟学会"></label>' +
        "</div>" +
        '<div class="form-foot"><button class="btn" type="submit">发布配方</button>' +
        '<span class="mute-text">' + (Store.getSettings().needReview && me.role !== "admin" ? "提交后需管理员审核通过才公开" : "提交后立即公开") +
        "。普通用户可以发布配方和推荐视频，材料库由管理员维护。</span></div>" +
      "</form>";

    renderIngredientPicker();
    renderSelectedList();
  }

  function renderIngredientPicker() {
    var wrap = document.getElementById("ingPicker");
    if (!wrap) return;
    var selected = {};
    draft.ingredients.forEach(function (x) { selected[x.id] = true; });
    var list = Store.searchIngredients(draft.search, draft.cat);
    if (!list.length) { wrap.innerHTML = '<div class="empty sm">没有匹配的材料，管理员可以在后台添加。</div>'; return; }
    wrap.innerHTML = list.map(function (i) {
      return '<button type="button" class="ing-chip ' + (selected[i.id] ? "on" : "") + '" data-action="draft-toggle-ing" data-id="' + i.id + '">' +
        '<span class="e">' + esc(i.emoji || "🍹") + "</span>" + esc(i.name) + "</button>";
    }).join("");
  }

  function renderSelectedList() {
    var ul = document.getElementById("selectedList");
    if (!ul) return;
    if (!draft.ingredients.length) {
      ul.innerHTML = '<li class="empty sm">还没有选择材料</li>';
      return;
    }
    ul.innerHTML = draft.ingredients.map(function (x, idx) {
      return "<li>" +
        '<span class="e">' + esc((Store.getIngredient(x.id) || {}).emoji || "🍹") + "</span>" +
        '<span class="name">' + esc(Store.ingredientName(x.id)) + "</span>" +
        '<input class="input sm" data-amount="' + idx + '" value="' + esc(x.amount == null ? "" : x.amount) + '" placeholder="用量，如 45 ml">' +
        '<label class="check"><input type="checkbox" data-optional="' + idx + '"' + (x.optional ? " checked" : "") + "> 可选/装饰</label>" +
        '<button type="button" class="btn ghost sm" data-action="draft-remove-ing" data-idx="' + idx + '">移除</button>' +
        "</li>";
    }).join("");
  }

  function syncSelectedInputs() {
    var ul = document.getElementById("selectedList");
    if (!ul) return;
    ul.querySelectorAll("[data-amount]").forEach(function (input) {
      var i = Number(input.getAttribute("data-amount"));
      if (draft.ingredients[i]) draft.ingredients[i].amount = input.value;
    });
    ul.querySelectorAll("[data-optional]").forEach(function (cb) {
      var i = Number(cb.getAttribute("data-optional"));
      if (draft.ingredients[i]) draft.ingredients[i].optional = cb.checked;
    });
  }

  function submitRecipe(form) {
    syncSelectedInputs();
    var fd = new FormData(form);
    var steps = String(fd.get("steps") || "").split("\n").map(function (s) { return s.trim(); }).filter(Boolean);
    var image = String(fd.get("image") || "").trim();
    if (!draft.ingredients.length) { toast("至少要加一种材料"); return; }
    if (!steps.length) { toast("请把调酒步骤写一下（一行一步）"); return; }
    if (!draftTags.length) { toast("至少选一个口味标签"); return; }
    if (!image) { toast("请上传一张配方图片，或贴一个图片链接"); return; }
    // emoji 选填：没填就用第一个材料的图标，再不行用默认酒杯
    var emoji = String(fd.get("emoji") || "").trim();
    if (!emoji) {
      var firstIng = Store.getIngredient(draft.ingredients[0] && draft.ingredients[0].id);
      emoji = (firstIng && firstIng.emoji) || "🍹";
    }
    var res = Store.addRecipe({
      name: fd.get("name"), en: fd.get("en"), type: fd.get("type"),
      emoji: emoji, glass: fd.get("glass"), abv: fd.get("abv"),
      desc: fd.get("desc"), ingredients: draft.ingredients.slice(),
      steps: steps, video: fd.get("video"), videoName: fd.get("videoName"),
      image: image, tags: draftTags.slice()
    });
    if (!res.ok) { toast(res.msg); return; }
    toast(res.needReview ? "已提交，等待管理员审核" : "发布成功，谢谢分享！");
    draft = { ingredients: [], search: "", cat: "全部" };
    draftTags = [];
    go("#/recipe/" + res.recipe.id);
  }

  /* ---------------- 视图五：我的 ---------------- */

  function renderMe() {
    var me = Store.currentUser();
    if (!me) {
      view.innerHTML = '<div class="empty">你还没有登录。<br><br><button class="btn" data-action="open-login">登录</button> ' +
        '<button class="btn ghost" data-action="open-register">注册</button></div>';
      return;
    }
    var favs = (me.favorites || []).map(function (id) { return Store.getRecipe(id); }).filter(Boolean);
    var mine = Store.listRecipes().filter(function (r) { return r.authorId === me.id; });
    var mineIngs = Store.getMyIngredients().map(function (id) { return Store.getIngredient(id); }).filter(Boolean);
    var myComments = Store.adminComments({}).filter(function (c) { return c.userId === me.id; });
    var myFavPosts = Store.listPosts({ status: "all", onlyFav: true, sort: "new" });

    view.innerHTML =
      '<section class="page-head"><h1>我的</h1><p>' + esc(me.nickname || me.username) + " · " + Store.roleLabel() +
        (me.email ? " · " + esc(Store.maskEmail(me.email)) : (me.phone ? " · " + esc(Store.maskPhone(me.phone)) : " · 用户名账号")) +
        " · 注册于 " + esc(me.createdAt) + "</p></section>" +

      '<section class="panel"><h3>我的身份与权限 <span class="mute-text">（' + Store.roleLabel() + "）</span></h3>" +
        (me.intro ? '<p class="mute-text">' + esc(me.intro) + "</p>" : "") +
        '<ul class="perm-list">' + Store.permissionList().map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" +
        '<div class="detail-actions">' +
          '<button class="btn ghost sm" data-action="change-pwd">修改密码</button>' +
          (me.role === "admin" ? '<a class="btn ghost sm" href="#/admin">进入管理后台</a>' : "") +
        "</div>" +
        (me.role === "admin" ? "" : '<span class="mute-text">需要更多权限？请联系站点管理员。</span>') +
      "</section>" +

      '<section class="panel"><h3>我选中的材料 <span class="mute-text">（' + mineIngs.length + " 种）</span></h3>" +
        '<div class="tag-cloud">' + (mineIngs.length ? mineIngs.map(function (i) {
          return '<span class="pill">' + esc(i.emoji || "🍹") + " " + esc(i.name) + "</span>";
        }).join("") : '<span class="mute-text">还没选，去 <a href="#/match">我有啥</a> 勾一下吧</span>') + "</div></section>" +

      '<section class="panel"><h3>我的收藏 <span class="mute-text">（' + favs.length + " 款）</span></h3>" +
        (favs.length ? '<div class="grid small">' + favs.map(function (r) { return recipeCard(r); }).join("") + "</div>"
          : '<div class="empty sm">还没有收藏，看到喜欢的点 ☆ 收藏</div>') + "</section>" +

      '<section class="panel"><h3>我发布的配方 <span class="mute-text">（' + mine.length + " 款）</span></h3>" +
        (mine.length ? '<div class="grid small">' + mine.map(function (r) { return recipeCard(r); }).join("") + "</div>"
          : '<div class="empty sm">还没有发布过，去 <a href="#/new">添加配方</a></div>') + "</section>" +

      '<section class="panel"><h3>我的评论 <span class="mute-text">（共 ' + myComments.length + " 条）</span></h3>" +
        (myComments.length ? '<ul class="my-comments">' + myComments.slice(0, 20).map(function (c) {
          return '<li><a href="#/recipe/' + c.recipeId + '">' + esc(c.recipeName) + "</a> " +
            '<span class="mute-text">' + timeAgo(c.createdAt) + "</span><div>" + esc(c.content) + "</div></li>";
        }).join("") + "</ul>" : '<div class="empty sm">还没发过评论</div>') + "</section>" +

      '<section class="panel"><h3>收藏的帖子 <span class="mute-text">（' + myFavPosts.length + " 篇）</span></h3>" +
        (myFavPosts.length
          ? '<div class="post-list">' + myFavPosts.map(postCardHTML).join("") + "</div>"
          : '<div class="empty sm">还没收藏帖子，在交流区看到有用的点 ☆</div>') + "</section>";
  }

  /* ---------------- 视图六：管理后台 ---------------- */

  function renderAdmin() {
    if (!Store.isAdmin()) {
      view.innerHTML = '<div class="empty">只有管理员可以进入后台。<br><br><button class="btn" data-action="open-login">管理员登录</button></div>';
      return;
    }
    var tabs = [
      ["ingredients", "材料管理"], ["recipes", "配方管理"], ["posts", "帖子审核"], ["comments", "评论管理"],
      ["reports", "勘误处理"], ["users", "用户管理"], ["settings", "站点设置"], ["data", "数据备份"]
    ];
    var pendingPosts = Store.postStats().pending;
    var pendingReports = Store.reportStats().pending;
    view.innerHTML =
      '<section class="page-head"><h1>管理后台</h1><p>材料、配方、评论、用户都由你说了算，所有改动即时生效。</p></section>' +
      '<nav class="tabs">' + tabs.map(function (t) {
        var badgeNum = (t[0] === "reports") ? pendingReports : (t[0] === "posts" ? pendingPosts : 0);
        var badge = badgeNum ? ' <em class="tab-badge">' + badgeNum + "</em>" : "";
        return '<button class="tab ' + (adminTab === t[0] ? "on" : "") + '" data-action="admin-tab" data-value="' + t[0] + '">' + t[1] + badge + "</button>";
      }).join("") + "</nav>" +
      '<section id="adminBody" class="panel">' + adminBodyHTML() + "</section>";
  }

  function adminBodyHTML() {
    if (adminTab === "ingredients") return adminIngredientsHTML();
    if (adminTab === "recipes") return adminRecipesHTML();
    if (adminTab === "comments") return adminCommentsHTML();
    if (adminTab === "posts") return adminPostsHTML();
    if (adminTab === "reports") return adminReportsHTML();
    if (adminTab === "users") return adminUsersHTML();
    if (adminTab === "settings") return adminSettingsHTML();
    return adminDataHTML();
  }

  function refreshAdmin() {
    var body = document.getElementById("adminBody");
    if (body) body.innerHTML = adminBodyHTML();
    document.querySelectorAll(".tab").forEach(function (t) {
      t.classList.toggle("on", t.getAttribute("data-value") === adminTab);
    });
  }

  function adminIngredientsHTML() {
    var cats = Store.categories();
    var rows = Store.listIngredients().map(function (i) {
      return "<tr>" +
        '<td><span class="e">' + esc(i.emoji || "🍹") + "</span> " + esc(i.name) + (i.basic ? ' <span class="badge mute">常备</span>' : "") + "</td>" +
        "<td>" + esc(i.cat) + "</td>" +
        '<td class="mute-text">' + esc(i.aka || "") + "</td>" +
        '<td class="ops"><button class="btn ghost sm" data-action="edit-ing" data-id="' + i.id + '">编辑</button>' +
        '<button class="btn ghost sm danger" data-action="del-ing" data-id="' + i.id + '">删除</button></td></tr>';
    }).join("");
    return "<h3>新增材料</h3>" +
      '<form id="addIngForm" class="row tight" autocomplete="off">' +
        '<input class="input" name="name" placeholder="材料名称，如：蓝橙利口酒" required>' +
        '<select class="input" name="cat">' + cats.map(function (c) { return '<option value="' + esc(c) + '">' + esc(c) + "</option>"; }).join("") + "</select>" +
        '<input class="input narrow" name="emoji" placeholder="🍹" maxlength="4">' +
        '<input class="input" name="aka" placeholder="英文/别名（选填，有助于搜索）">' +
        '<label class="check"><input type="checkbox" name="basic"> 常备材料（不计入匹配）</label>' +
        '<button class="btn" type="submit">添加</button>' +
      "</form>" +
      "<h3>材料库 <span class=\"mute-text\">（共 " + Store.listIngredients().length + " 种）</span></h3>" +
      '<div class="table-wrap"><table class="table"><thead><tr><th>名称</th><th>分类</th><th>别名</th><th>操作</th></tr></thead><tbody>' + rows + "</tbody></table></div>";
  }

  function adminRecipesHTML() {
    var list = Store.listRecipes().slice().sort(function (a, b) {
      return String(b.createdAt).localeCompare(String(a.createdAt));
    });
    var rows = list.map(function (r) {
      var status = r.status === "approved" ? '<span class="badge ok">公开</span>'
        : r.status === "pending" ? '<span class="badge warn">待审核</span>' : '<span class="badge no">已下架</span>';
      var thumb = r.imageThumb
        ? '<img class="table-thumb" src="' + esc(r.imageThumb) + '" alt="" loading="lazy" onerror="this.classList.add(\'failed\')">'
        : '<span class="table-thumb none">' + esc(r.emoji || "🍹") + "</span>";
      return "<tr>" +
        "<td>" + thumb + " " + esc(r.name) + " <span class=\"mute-text\">" + esc(r.en || "") + "</span></td>" +
        "<td>" + typeLabel(r.type) + "</td>" +
        "<td>" + esc(r.author || "") + "</td>" +
        "<td>" + status + "</td>" +
        "<td>" + Store.countComments(r.id) + "</td>" +
        '<td class="ops">' +
          '<button class="btn ghost sm" data-action="admin-view" data-id="' + r.id + '">查看</button>' +
          '<button class="btn ghost sm" data-action="set-image" data-id="' + r.id + '">换图</button>' +
          (r.status !== "approved" ? '<button class="btn ghost sm" data-action="approve" data-id="' + r.id + '">通过</button>' : "") +
          (r.status === "approved" ? '<button class="btn ghost sm" data-action="hide" data-id="' + r.id + '">下架</button>' : "") +
          '<button class="btn ghost sm danger" data-action="del-recipe" data-id="' + r.id + '">删除</button>' +
        "</td></tr>";
    }).join("");
    var noImage = list.filter(function (r) { return !r.image; }).length;
    return "<h3>配方管理 <span class=\"mute-text\">（共 " + list.length + " 款，其中 " + noImage + " 款还没配图）</span></h3>" +
      '<div class="table-wrap"><table class="table"><thead><tr><th>配方</th><th>类型</th><th>作者</th><th>状态</th><th>评论</th><th>操作</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="6">暂无配方</td></tr>') + "</tbody></table></div>";
  }

  function adminCommentListHTML() {
    var list = Store.adminComments({ q: adminCommentQuery, onlyHidden: adminCommentOnlyHidden });
    if (!list.length) return '<div class="empty sm">没有符合条件的评论</div>';
    var rows = list.map(function (c) {
      return "<tr>" +
        '<td class="c-cell">' + esc(c.content) +
          (c.replyCount ? ' <span class="mute-text">（' + c.replyCount + " 条回复）</span>" : "") + "</td>" +
        "<td>" + esc(c.nickname || c.username) + (c.isAdmin ? ' <span class="badge role-badge">管理员</span>' : "") + "</td>" +
        '<td><a href="#/recipe/' + c.recipeId + '">' + esc(c.recipeName) + "</a></td>" +
        '<td class="mute-text">' + timeAgo(c.createdAt) + "</td>" +
        "<td>" + c.likeCount + "</td>" +
        "<td>" + (c.hidden ? '<span class="badge no">已隐藏</span>' : '<span class="badge ok">显示中</span>') +
          (c.pinned ? ' <span class="badge warn">置顶</span>' : "") + "</td>" +
        '<td class="ops">' +
          '<button class="btn ghost sm" data-action="comment-pin" data-id="' + c.id + '">' + (c.pinned ? "取消置顶" : "置顶") + "</button>" +
          '<button class="btn ghost sm" data-action="comment-hide" data-id="' + c.id + '">' + (c.hidden ? "恢复" : "隐藏") + "</button>" +
          '<button class="btn ghost sm danger" data-action="comment-delete" data-id="' + c.id + '">删除</button>' +
        "</td></tr>";
    }).join("");
    return '<div class="table-wrap"><table class="table"><thead><tr>' +
      "<th>评论内容</th><th>用户</th><th>所在配方</th><th>时间</th><th>赞</th><th>状态</th><th>操作</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>";
  }

  function adminCommentsHTML() {
    var s = Store.commentStats();
    return "<h3>评论概览</h3>" +
      '<div class="stats-row">' + statBox(s.total, "条评论") + statBox(s.today, "今日新增") +
      statBox(s.hidden, "已隐藏") + statBox(s.pinned, "置顶") + statBox(s.users, "参与用户") + "</div>" +
      '<div class="row tight">' +
        '<input id="cmtQ" class="input search" placeholder="搜索评论内容 / 用户名 / 配方名" value="' + esc(adminCommentQuery) + '">' +
        '<label class="check"><input type="checkbox" id="cmtHidden"' + (adminCommentOnlyHidden ? " checked" : "") + "> 只看已隐藏</label>" +
        '<button class="btn ghost sm" data-action="comment-reset">重置筛选</button>' +
      "</div>" +
      '<div id="adminCommentList">' + adminCommentListHTML() + "</div>";
  }

  function adminPostListHTML() {
    var list = Store.listPosts({ status: postAdminFilter.status === "all" ? "all" : postAdminFilter.status, q: postAdminFilter.q });
    if (!list.length) return '<div class="empty sm">没有符合条件的帖子</div>';
    var rows = list.map(function (p) {
      var status = p.status === "approved" ? '<span class="badge ok">已通过</span>'
        : p.status === "pending" ? '<span class="badge warn">待审核</span>' : '<span class="badge no">未通过</span>';
      var rv = p.review || {};
      var src = rv.source === "ai" ? "AI·" + (rv.model || "模型") : (rv.source === "rule" ? "规则" : "—");
      return "<tr>" +
        '<td><a href="#/post/' + p.id + '">' + esc(p.title) + "</a>" +
          '<div class="mute-text">' + esc(String(p.content).replace(/\s+/g, " ").slice(0, 50)) + "…</div></td>" +
        "<td>" + esc(p.category) + "</td>" +
        "<td>" + esc(p.nickname) + "</td>" +
        '<td class="mute-text">' + timeAgo(p.createdAt) + "</td>" +
        "<td>" + src + (typeof rv.risk === "number" ? " · " + rv.risk + " 分" : "") +
          (rv.reasons && rv.reasons.length ? '<div class="mute-text">' + esc(rv.reasons.join("；")) + "</div>" : "") + "</td>" +
        "<td>" + status + "</td>" +
        '<td class="ops">' +
          (p.status !== "approved" ? '<button class="btn ghost sm" data-action="post-approve" data-id="' + p.id + '">通过</button>' : "") +
          (p.status !== "rejected" ? '<button class="btn ghost sm" data-action="post-reject" data-id="' + p.id + '">拒绝</button>' : "") +
          '<button class="btn ghost sm danger" data-action="post-del-admin" data-id="' + p.id + '">删除</button>' +
        "</td></tr>";
    }).join("");
    return '<div class="table-wrap"><table class="table"><thead><tr>' +
      "<th>帖子</th><th>分类</th><th>作者</th><th>时间</th><th>审核结果</th><th>状态</th><th>操作</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>";
  }

  function adminPostsHTML() {
    var s = Store.postStats();
    var chips = [["pending", "待审核"], ["approved", "已通过"], ["rejected", "未通过"], ["all", "全部"]];
    var ai = Store.getSettings();
    return "<h3>帖子概览</h3>" +
      '<div class="stats-row">' + statBox(s.pending, "待审核") + statBox(s.approved, "已通过") +
      statBox(s.rejected, "未通过") + statBox(s.today, "今日新帖") + statBox(s.comments, "回帖") + "</div>" +
      '<div class="review-note">' +
        "<b>审核方式</b>：规则检查" + (Store.aiReviewEndpoint() ? " + AI 复核（已启用）" : "（AI 复核未启用）") +
        "。<span class=\"mute-text\">规则层现在就能用：广告、联系方式、违规词会被自动拦下或转人工；配上云函数地址后会把不确定的内容再交给 AI 判断。设置入口在「站点设置」。</span>" +
      "</div>" +
      '<div class="row tight">' +
        '<div class="chips">' + chips.map(function (c) {
          return '<button class="chip ' + (postAdminFilter.status === c[0] ? "on" : "") +
            '" data-action="post-filter" data-value="' + c[0] + '">' + c[1] + "</button>";
        }).join("") + "</div>" +
        '<input id="postAdminQ" class="input search" placeholder="搜索标题 / 内容 / 作者" value="' + esc(postAdminFilter.q) + '">' +
      "</div>" +
      '<div id="adminPostList">' + adminPostListHTML() + "</div>";
  }

  function adminReportListHTML() {
    var list = Store.listReports({ status: reportFilter.status, q: reportFilter.q });
    if (!list.length) return '<div class="empty sm">没有符合条件的勘误记录</div>';
    var rows = list.map(function (r) {
      var status = r.status === "pending" ? '<span class="badge warn">待处理</span>'
        : r.status === "done" ? '<span class="badge ok">已处理</span>' : '<span class="badge mute">已忽略</span>';
      var where = r.recipeId
        ? '<a href="#/recipe/' + r.recipeId + '">' + esc(r.recipeName) + "</a>"
        : '<span class="mute-text">材料库</span>';
      return "<tr>" +
        "<td>" + esc(r.type) + "</td>" +
        '<td class="c-cell">' + esc(r.content) +
          (r.suggest ? '<div class="mute-text">建议：' + esc(r.suggest) + "</div>" : "") + "</td>" +
        "<td>" + esc(r.nickname || r.username) + "</td>" +
        "<td>" + where + "</td>" +
        '<td class="mute-text">' + timeAgo(r.createdAt) + "</td>" +
        "<td>" + status + (r.handledBy ? '<div class="mute-text">by ' + esc(r.handledBy) + "</div>" : "") + "</td>" +
        '<td class="ops">' +
          (r.status !== "done" ? '<button class="btn ghost sm" data-action="report-done" data-id="' + r.id + '">标记已处理</button>' : "") +
          (r.status !== "ignored" ? '<button class="btn ghost sm" data-action="report-ignore" data-id="' + r.id + '">忽略</button>' : "") +
          (r.status !== "pending" ? '<button class="btn ghost sm" data-action="report-reopen" data-id="' + r.id + '">重新打开</button>' : "") +
          '<button class="btn ghost sm danger" data-action="report-del" data-id="' + r.id + '">删除</button>' +
        "</td></tr>";
    }).join("");
    return '<div class="table-wrap"><table class="table"><thead><tr>' +
      "<th>类型</th><th>问题说明</th><th>提交人</th><th>位置</th><th>时间</th><th>状态</th><th>操作</th>" +
      "</tr></thead><tbody>" + rows + "</tbody></table></div>";
  }

  function adminReportsHTML() {
    var s = Store.reportStats();
    var chips = [["pending", "待处理"], ["done", "已处理"], ["ignored", "已忽略"], ["all", "全部"]];
    return "<h3>勘误概览</h3>" +
      '<div class="stats-row">' + statBox(s.pending, "待处理") + statBox(s.done, "已处理") +
      statBox(s.ignored, "已忽略") + statBox(s.today, "今日新增") + statBox(s.total, "累计") + "</div>" +
      '<p class="mute-text">用户在配方页点「勘误」提交的问题都会汇总到这里。核对完配方记得改一下，再点「标记已处理」。</p>' +
      '<div class="row tight">' +
        '<div class="chips">' + chips.map(function (c) {
          return '<button class="chip ' + (reportFilter.status === c[0] ? "on" : "") +
            '" data-action="report-filter" data-value="' + c[0] + '">' + c[1] + "</button>";
        }).join("") + "</div>" +
        '<input id="repQ" class="input search" placeholder="搜索说明 / 用户 / 配方名" value="' + esc(reportFilter.q) + '">' +
      "</div>" +
      '<div id="adminReportList">' + adminReportListHTML() + "</div>";
  }

  function adminUsersHTML() {
    var me = Store.currentUser();
    var rows = Store.users().map(function (u) {
      var count = Store.listRecipes().filter(function (r) { return r.authorId === u.id; }).length;
      var cmts = Store.adminComments({}).filter(function (c) { return c.userId === u.id; }).length;
      return "<tr>" +
        "<td>" + avatarHTML(u.nickname || u.username, "sm") + " " + esc(u.nickname || u.username) +
          (u.id === me.id ? ' <span class="badge mute">当前账号</span>' : "") + "</td>" +
        '<td class="mute-text">' + (u.email ? esc(u.email) : (u.phone ? esc(Store.maskPhone(u.phone)) : "—")) + "</td>" +
        "<td>" + (u.role === "admin" ? '<span class="badge role-badge">管理员</span>' : "普通用户") + "</td>" +
        "<td>" + esc(u.createdAt || "") + "</td>" +
        "<td>" + count + " 款</td>" +
        "<td>" + cmts + " 条</td>" +
        '<td class="ops">' +
          '<button class="btn ghost sm" data-action="edit-user" data-id="' + u.id + '">编辑资料</button>' +
          (u.role === "admin"
            ? '<button class="btn ghost sm" data-action="set-role" data-id="' + u.id + '" data-role="user">取消管理员</button>'
            : '<button class="btn ghost sm" data-action="set-role" data-id="' + u.id + '" data-role="admin">设为管理员</button>') +
          '<button class="btn ghost sm danger" data-action="del-user" data-id="' + u.id + '">删除</button>' +
        "</td></tr>";
    }).join("");
    return "<h3>权限说明</h3>" +
      '<div class="perm-grid">' +
        '<div class="perm-card"><b>普通用户</b><ul class="perm-list">' +
          ["浏览全部配方与评论", "发布经典 / 特调配方", "推荐或补充教学视频", "评论、回复、点赞", "收藏配方、勾选自己的材料"]
            .map(function (x) { return "<li>" + x + "</li>"; }).join("") +
        "</ul></div>" +
        '<div class="perm-card admin"><b>管理员</b><ul class="perm-list">' +
          ["普通用户的全部权限", "材料库增删改", "配方审核 / 下架 / 删除", "评论置顶 / 隐藏 / 删除", "用户与管理员权限管理", "站点设置与数据备份"]
            .map(function (x) { return "<li>" + x + "</li>"; }).join("") +
        "</ul></div>" +
      "</div>" +
      "<h3>用户管理 <span class=\"mute-text\">（共 " + Store.users().length + " 人）</span></h3>" +
      '<div class="table-wrap"><table class="table"><thead><tr><th>用户</th><th>登录邮箱</th><th>角色</th><th>注册时间</th><th>配方</th><th>评论</th><th>操作</th></tr></thead><tbody>' +
      rows + "</tbody></table></div>" +
      '<p class="mute-text">提示：原型阶段密码保存在本机浏览器里，正式上线请换成服务器账号系统。</p>';
  }

  function switchRow(name, label, checked) {
    return '<label class="switch-row"><input type="checkbox" name="' + name + '"' + (checked ? " checked" : "") + "><span>" + esc(label) + "</span></label>";
  }

  function adminSettingsHTML() {
    var s = Store.getSettings();
    return "<h3>站点设置</h3>" +
      '<form id="settingsForm" class="form" autocomplete="off">' +
        '<div class="row"><label class="field"><span>站点名称</span><input class="input" name="siteName" value="' + esc(s.siteName) + '"></label>' +
        '<label class="field"><span>标语</span><input class="input" name="slogan" value="' + esc(s.slogan) + '"></label></div>' +
        '<h3 class="form-title">用户权限开关</h3>' +
        '<div class="switch-list">' +
          switchRow("allowUserPublish", "允许普通用户发布配方", s.allowUserPublish) +
          switchRow("needReview", "用户发布的配方需要审核后才公开", s.needReview) +
          switchRow("allowUserPost", "允许普通用户在交流区发帖", s.allowUserPost !== false) +
          switchRow("allowUserVideo", "允许普通用户推荐 / 补充教学视频", s.allowUserVideo) +
          switchRow("allowUserComment", "允许普通用户发表评论", s.allowUserComment) +
          switchRow("allowUserEditOwnRecipe", "允许用户编辑自己发布的配方", s.allowUserEditOwnRecipe) +
          switchRow("allowUserDeleteOwnRecipe", "允许用户删除自己发布的配方", s.allowUserDeleteOwnRecipe) +
          switchRow("allowUserDeleteOwnComment", "允许用户删除自己的评论", s.allowUserDeleteOwnComment) +
          switchRow("allowUserReport", "允许用户提交勘误（报错）", s.allowUserReport !== false) +
        "</div>" +
        '<h3 class="form-title">交流区审核</h3>' +
        '<div class="row">' +
          '<label class="field"><span>审核方式</span><select class="input" name="postReviewMode">' +
            '<option value="all"' + (s.postReviewMode === "all" ? " selected" : "") + ">全部先审（每篇都要你手动过）</option>" +
            '<option value="auto"' + ((s.postReviewMode || "auto") === "auto" ? " selected" : "") + ">智能审核（规则判断，低风险直接发）</option>" +
            '<option value="none"' + (s.postReviewMode === "none" ? " selected" : "") + ">不审核（全部直接发）</option>" +
          "</select></label>" +
        "</div>" +
        '<div class="switch-list">' +
          switchRow("aiReviewEnabled", "启用 AI 复核（需要填下面的云函数地址）", s.aiReviewEnabled) +
        "</div>" +
        '<label class="field"><span>AI 审核云函数地址<em class="opt">选填</em></span>' +
          '<input class="input" name="aiReviewEndpoint" value="' + esc(s.aiReviewEndpoint || "") + '" placeholder="https://xxxx.service.tcloudbase.com/review-post"></label>' +
        '<p class="mute-text">API Key 不能放在网页里（仓库是公开的，会被盗用）。正确做法是：Key 存在云函数的环境变量里，网页只把内容发给云函数。云函数示例代码见项目里的 <code>cloud/review-post/</code>。</p>' +
        '<h3 class="form-title">邮箱验证码</h3>' +
        '<p class="mute-text">注册、重置密码用的验证码走邮箱。当前的默认状态是<b>演示模式</b>：验证码直接显示在注册页上，先跑通流程用。' +
        '要改成真实发邮件：在云函数 <code>api</code> 的「环境变量」里加上 <code>SMTP_USER</code>（发件邮箱）和 <code>SMTP_PASS</code>（该邮箱的<b>授权码</b>，不是登录密码），保存后重新部署云函数即可，网页这边不用改。</p>' +
        '<div class="form-foot"><button class="btn" type="submit">保存设置</button></div>' +
      "</form>";
  }

  function adminDataHTML() {
    var stats = '<div class="stats-row">' +
      statBox(Store.listRecipes().length, "款配方") +
      statBox(Store.listIngredients().length, "种材料") +
      statBox(Store.users().length, "个账号") +
      statBox(Store.adminComments({}).length, "条评论") + "</div>";

    /* 云端模式：数据在云数据库里，免费版没有自动备份 —— 强调手动下载 */
    if (Store.cloudOn()) {
      return "<h3>数据备份</h3>" +
        '<p class="mute-text">所有数据都在腾讯云数据库里。免费版没有「自动备份」，所以建议<b>每隔一两周点一次下面的按钮</b>，把备份文件存到电脑或网盘。' +
        '哪天数据真出了问题，有这份文件就能把内容找回来。</p>' +
        '<div class="row tight">' +
          '<button class="btn" data-action="export-data">下载完整备份（JSON）</button>' +
        "</div>" +
        '<p class="mute-text">备份文件里包含<b>全部账号信息</b>（密码是加密后的，看不到明文），所以别发到群里或公开的地方，自己存好。' +
        '帖子图片是直接存在数据库里的，帖子多、图多的时候文件会比较大，属于正常。</p>' +
        stats +
        "<h3>本机缓存</h3>" +
        '<p class="mute-text">浏览器里另存了一份缓存，只是为了让页面打开快一点，不是真正的数据源。清掉、换电脑都不影响，下次打开会自动从云端重新拉取。</p>';
    }

    var s = JSON.parse(Store.exportJSON());
    return "<h3>数据备份与还原</h3>" +
      '<p class="mute-text">所有数据都保存在这台电脑的浏览器里。换电脑、清缓存前，记得先导出一份 JSON 备份。</p>' +
      '<div class="row tight">' +
        '<button class="btn" data-action="export-data">导出备份（JSON）</button>' +
        '<label class="btn ghost file-btn">导入备份<input id="importFile" type="file" accept="application/json,.json"></label>' +
        '<button class="btn ghost danger" data-action="reset-data">恢复初始数据</button>' +
      "</div>" +
      '<div class="stats-row">' + statBox(s.recipes.length, "款配方") + statBox(s.ingredients.length, "种材料") +
      statBox(s.users.length, "个账号") + statBox((s.comments || []).length, "条评论") + "</div>" +
      "<h3>当前数据预览</h3>" +
      '<textarea class="input code" rows="10" readonly>' + esc(Store.exportJSON().slice(0, 4000)) + "</textarea>";
  }

  /* ---------------- 登录 / 注册弹窗 ---------------- */

  function authModal(mode) {
    var isLogin = mode === "login";
    authMode = isLogin ? "login" : "register";
    clearInterval(smsTimer);
    openModal(
      "<h2>" + (isLogin ? "登录" : "注册邮箱账号") + "</h2>" +
      '<form id="authForm" class="form" autocomplete="off">' +
        (isLogin
          ? '<label class="field"><span>邮箱</span>' +
            '<input class="input" name="account" type="email" placeholder="name@example.com" required></label>'
          : '<label class="field"><span>昵称</span>' +
            '<input class="input" name="nickname" maxlength="12" placeholder="2-12 个字，可以重复" required></label>' +
            '<label class="field"><span>邮箱</span>' +
            '<input class="input" name="email" type="email" placeholder="name@example.com" required></label>' +
            '<label class="field"><span>验证码</span>' +
              '<div class="code-row">' +
                '<input class="input" name="code" inputmode="numeric" maxlength="6" placeholder="6 位验证码" required>' +
                '<button type="button" class="btn ghost" id="smsBtn" data-action="send-email">获取验证码</button>' +
              "</div>" +
              '<span class="field-hint" id="smsHint"></span>' +
            "</label>"
        ) +
        '<label class="field"><span>密码</span><input class="input" name="password" type="password" placeholder="至少 6 位" required></label>' +
        (isLogin ? "" : '<label class="field"><span>确认密码</span><input class="input" name="confirm" type="password" placeholder="再输入一次密码" required></label>') +
        (isLogin
          ? '<p class="mute-text">用注册时的邮箱和密码登录。老账号也可以用手机号或用户名登录。</p>'
          : '<p class="mute-text">昵称可以重复，邮箱不能重复注册。注册后即可发帖、发配方、评论和收藏。</p>') +
        '<div class="form-foot"><button class="btn" type="submit">' + (isLogin ? "登录" : "注册并登录") + "</button>" +
        '<button type="button" class="btn ghost" data-action="close-modal">取消</button></div>' +
      "</form>" +
      (isLogin ? '<p class="mute-text">管理员请用自己的邮箱登录。</p>' : "") +
      '<p class="mute-text">改成 <a href="#" data-action="switch-auth" data-value="' + (isLogin ? "register" : "login") + '">' +
      (isLogin ? "没有账号？去注册" : "已有账号？去登录") + "</a></p>"
    );
  }

  /** 注册时的「获取验证码」：没配邮箱发信时走演示模式，直接把验证码显示在页面上 */
  function sendEmailCode() {
    var form = document.getElementById("authForm");
    if (!form) return;
    var hint = document.getElementById("smsHint");
    var btn = document.getElementById("smsBtn");
    var email = String((form.querySelector('[name="email"]') || {}).value || "").trim();

    var countdown = function () {
      // 60 秒倒计时
      var left = 60;
      if (!btn) return;
      btn.disabled = true;
      btn.textContent = left + "s 后重发";
      clearInterval(smsTimer);
      smsTimer = setInterval(function () {
        left--;
        if (left <= 0) {
          clearInterval(smsTimer);
          btn.disabled = false;
          btn.textContent = "获取验证码";
        } else {
          btn.textContent = left + "s 后重发";
        }
      }, 1000);
    };

    var res = Store.sendEmailCode(email, "register", function (r) {
      if (!r || !r.ok) { toast((r && r.msg) || "验证码发送失败"); return; }
      if (hint) {
        hint.innerHTML = r.mode === "demo"
          ? "演示模式（还没配邮箱发信）：验证码是 <b>" + esc(r.code) + "</b>，请手动填入上方"
          : "验证码已发送到 " + esc(Store.maskEmail(email)) + "，10 分钟内有效";
      }
      toast(r.msg || "验证码已发送");
      countdown();
    });
    if (res && res.ok === false) { toast(res.msg); return; }
  }

  function submitAuth(form, mode) {
    var fd = new FormData(form);
    /* 云端模式下登录/注册是异步的，所以用回调统一处理两种模式 */
    var done = function (res) {
      if (!res || !res.ok) { toast((res && res.msg) || "操作失败"); return; }
      clearInterval(smsTimer);
      closeModal();
      toast(mode === "login" ? "欢迎回来，" + (res.user.nickname || res.user.username) : "注册成功，" + res.user.nickname + "！");
      render();
    };
    if (mode === "login") {
      Store.login(fd.get("account"), fd.get("password"), done);
    } else {
      Store.register({
        nickname: fd.get("nickname"),
        email: fd.get("email"),
        code: fd.get("code"),
        password: fd.get("password"),
        confirm: fd.get("confirm")
      }, done);
    }
  }

  /* ---------------- 图片上传（本地压缩后转 dataURL） ---------------- */

  function downscaleImage(file, maxW, cb) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, maxW / img.width);
        var canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        try { cb(canvas.toDataURL("image/jpeg", 0.82)); }
        catch (e) { cb(null); }
      };
      img.onerror = function () { cb(null); };
      img.src = reader.result;
    };
    reader.onerror = function () { cb(null); };
    reader.readAsDataURL(file);
  }

  /* ---------------- 随机一杯 ---------------- */

  function randomPick() {
    var mine = Store.getMyIngredients();
    var pool = [];
    if (mine.length) pool = Store.matchRecipes(mine, { maxMissing: 3 }).all;
    var r = null;
    if (pool.length) r = pool[Math.floor(Math.random() * pool.length)].recipe;
    if (!r) {
      var all = Store.visibleRecipes().filter(function (x) { return x.status === "approved"; });
      if (!all.length) { toast("还没有配方，先去添加一个吧"); return; }
      r = all[Math.floor(Math.random() * all.length)];
    }
    showRandomModal(r, "");
  }

  /* ---------------- 事件绑定 ---------------- */

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-action]");
    if (!el) return;
    var action = el.getAttribute("data-action");
    var id = el.getAttribute("data-id");
    var value = el.getAttribute("data-value");

    switch (action) {
      case "open-login": authModal("login"); break;
      case "open-register": authModal("register"); break;
      case "change-pwd": {
        if (!Store.currentUser()) { authModal("login"); break; }
        openModal(
          "<h2>修改密码</h2>" +
          '<form id="changePwdForm" class="form">' +
            '<label class="field"><span>当前密码</span><input class="input" name="oldPwd" type="password" placeholder="请输入现在的密码" required></label>' +
            '<label class="field"><span>新密码</span><input class="input" name="newPwd" type="password" placeholder="至少 6 位" required></label>' +
            '<label class="field"><span>确认新密码</span><input class="input" name="confirmPwd" type="password" placeholder="再输入一次" required></label>' +
            '<p class="mute-text">密码只以"随机盐 + 哈希"的形式保存在本机，不会明文存储。</p>' +
            '<div class="form-foot"><button class="btn" type="submit">保存新密码</button>' +
            '<button type="button" class="btn ghost" data-action="close-modal">取消</button></div>' +
          "</form>"
        );
        break;
      }
      case "toggle-menu": toggleMenu(); break;
      case "close-menu": toggleMenu(false); break;
      case "deck-prev": deckGo(-1); break;
      case "deck-next": deckGo(1); break;
      case "deck-dot": deckState.i = Number(value) || 0; deckState.drag = 0; applyDeck(); break;

      /* 交流区 */
      case "new-post": openPostEditor(id || null); break;
      case "post-tag": go("#/posts/recipe/" + value); break;
      case "az-jump": {
        var group = document.querySelector('#ingPickerWrap .letter-group[data-letter="' + value + '"]');
        if (group) {
          group.scrollIntoView({ behavior: "smooth", block: "center" });
          var idx = document.getElementById("azIndex");
          if (idx) {
            idx.querySelectorAll(".on").forEach(function (b) { b.classList.remove("on"); });
            var me2 = idx.querySelector('[data-value="' + value + '"]');
            if (me2) me2.classList.add("on");
          }
        }
        break;
      }
      case "az-top": {
        var body = document.querySelector(".picker-body");
        if (body) body.scrollIntoView({ behavior: "smooth", block: "start" });
        var idx2 = document.getElementById("azIndex");
        if (idx2) idx2.querySelectorAll(".on").forEach(function (b) { b.classList.remove("on"); });
        break;
      }
      case "mat-mode": {
        matMode = value === "abc" ? "abc" : "cat";
        renderMatch();
        break;
      }
      case "post-tag-clear": go("#/posts"); break;
      case "post-fav-filter": postState.onlyFav = !postState.onlyFav; renderPosts(); break;
      case "post-fav": {
        var pf = Store.togglePostFavorite(id);
        if (!pf.ok) { toast(pf.msg); authModal("login"); return; }
        toast(pf.faved ? "已收藏这篇帖子" : "已取消收藏");
        if (currentRoute().name === "post") renderPostDetail(id);
        else refreshPostList();
        break;
      }
      case "post-tag-add": {
        if (postDraftTags.indexOf(value) >= 0) break;
        if (postDraftTags.length >= 3) { toast("最多关联 3 杯酒"); break; }
        postDraftTags.push(value);
        var tInput = document.getElementById("postTagSearch");
        if (tInput) tInput.value = "";
        renderPostTagPicker("");
        break;
      }
      case "post-tag-remove": {
        postDraftTags = postDraftTags.filter(function (x) { return x !== value; });
        renderPostTagPicker("");
        break;
      }
      case "post-img-remove": {
        postDraftImages.splice(Number(el.getAttribute("data-idx")), 1);
        renderPostImagePreview();
        break;
      }
      case "open-post": go("#/post/" + id); break;
      case "post-cat": postState.category = value; renderPosts(); break;
      case "post-like": {
        var pl = Store.togglePostLike(id);
        if (!pl.ok) { toast(pl.msg); authModal("login"); return; }
        renderPostDetail(id);
        break;
      }
      case "post-img-view": {
        var bigSrc = el.getAttribute("data-src");
        openModal('<div class="lightbox"><img src="' + esc(bigSrc) + '" alt=""><button class="btn ghost sm lightbox-close" data-action="close-modal">关闭</button></div>');
        break;
      }
      case "post-del": {
        if (!confirm("确定删除这个帖子吗？")) break;
        var pd = Store.deletePost(id);
        if (!pd.ok) { toast(pd.msg); break; }
        toast("已删除");
        go("#/posts");
        break;
      }
      case "post-comment-del": {
        if (!confirm("确定删除这条回复吗？")) break;
        var pcd = Store.deletePostComment(el.getAttribute("data-post"), id);
        if (!pcd.ok) { toast(pcd.msg); break; }
        toast("已删除");
        renderPostDetail(el.getAttribute("data-post"));
        break;
      }
      case "deck-shuffle": {
        deckState.picks = Store.shuffleDaily(4);
        deckState.i = 0;
        renderHome();
        toast("已换一批，明天自动更新");
        break;
      }
      case "switch-auth": authModal(value); break;
      case "send-email": sendEmailCode(); break;
      case "close-modal": closeModal(); break;
      case "logout": Store.logout(); toast("已退出登录"); render(); break;
      case "open-recipe": go("#/recipe/" + id); break;
      case "random": closeModal(); randomPick(); break;
      case "toggle-fav": {
        var res = Store.toggleFavorite(id);
        if (!res.ok) { toast(res.msg); authModal("login"); return; }
        toast(res.fav ? "已收藏 ★" : "已取消收藏");
        render();
        break;
      }

      /* 配方库筛选 */
      case "lib-type": libFilter.type = value; renderLibrary(); break;

      /* 口味标签 */
      case "open-tag": {
        tagFilter.tags = [value];
        tagFilter.mode = "all";
        go("#/tags");
        if (currentRoute().name === "tags") renderTags();
        break;
      }
      case "toggle-tag": {
        var scope = el.getAttribute("data-scope") || "filter";
        var arr = selectedTagsFor(scope);
        var ti = arr.indexOf(value);
        if (ti >= 0) arr.splice(ti, 1);
        else if (arr.length >= 10) { toast("最多 10 个标签"); break; }
        else arr.push(value);
        if (scope === "filter") { renderTags(); }
        else { refreshTagPicker(scope); }
        break;
      }
      case "add-custom-tag": addCustomTag(el.getAttribute("data-scope") || "draft"); break;
      case "tag-mode": tagFilter.mode = value; renderTags(); break;
      case "tag-clear": tagFilter.tags = []; renderTags(); break;
      case "tag-random": {
        var picked = Store.randomRecipe(tagFilter.tags, tagFilter.mode);
        if (!picked) { toast("没有符合这些标签的酒，换个标签试试"); break; }
        showRandomModal(picked, "就喝这杯");
        break;
      }
      case "lib-fav": libFilter.fav = !libFilter.fav; renderLibrary(); break;
      case "lib-makeable": {
        if (!Store.getMyIngredients().length) { toast("先去「我有啥」勾选材料"); go("#/match"); return; }
        libFilter.onlyMakeable = !libFilter.onlyMakeable;
        el.classList.toggle("on", libFilter.onlyMakeable);
        refreshLibrary();
        break;
      }
      case "lib-reset": {
        libFilter = { q: "", type: "all", base: "all", abv: "all", fav: false, onlyMakeable: false, sort: "hot" };
        renderLibrary();
        break;
      }

      /* 评论区 */
      case "comment-sort": commentState.sort = value; commentState.page = 1; renderCommentComposer(); renderCommentList(); break;
      case "comment-reply": commentState.replyTo = id; renderCommentList(); break;
      case "comment-cancel-reply": commentState.replyTo = null; renderCommentList(); break;
      case "comment-more": commentState.page++; renderCommentList(); break;
      case "comment-like": {
        var lk = Store.toggleCommentLike(id);
        if (!lk.ok) { toast(lk.msg); authModal("login"); return; }
        renderCommentList();
        break;
      }
      case "comment-delete": {
        if (!confirm("确定删除这条评论吗？")) break;
        var dc = Store.deleteComment(id);
        if (!dc.ok) { toast(dc.msg); break; }
        toast("评论已删除");
        if (currentRoute().name === "admin") refreshAdmin(); else { renderCommentComposer(); renderCommentList(); }
        break;
      }
      case "comment-pin": {
        var cur = Store.adminComments({}).filter(function (c) { return c.id === id; })[0];
        Store.setCommentFlags(id, { pinned: !(cur && cur.pinned) });
        toast(cur && cur.pinned ? "已取消置顶" : "已置顶");
        if (currentRoute().name === "admin") refreshAdmin(); else { renderCommentComposer(); renderCommentList(); }
        break;
      }
      case "comment-hide": {
        var cur2 = Store.adminComments({}).filter(function (c) { return c.id === id; })[0];
        Store.setCommentFlags(id, { hidden: !(cur2 && cur2.hidden) });
        toast(cur2 && cur2.hidden ? "已恢复显示" : "已隐藏");
        if (currentRoute().name === "admin") refreshAdmin(); else { renderCommentComposer(); renderCommentList(); }
        break;
      }
      case "comment-reset": adminCommentQuery = ""; adminCommentOnlyHidden = false; refreshAdmin(); break;

      /* 勘误处理（后台） */
      /* 帖子审核（后台） */
      case "post-filter": postAdminFilter.status = value; refreshAdmin(); break;
      case "post-approve": Store.setPostStatus(id, "approved"); toast("已通过并公开"); refreshAdmin(); break;
      case "post-reject": {
        openModal(
          "<h2>拒绝这篇帖子</h2>" +
          '<form id="postRejectForm" class="form" data-id="' + id + '">' +
            '<label class="field"><span>原因（会显示给作者）</span><textarea class="input" name="reason" rows="3" placeholder="例如：疑似广告；内容与调酒无关"></textarea></label>' +
            '<div class="form-foot"><button class="btn" type="submit">确认拒绝</button>' +
            '<button type="button" class="btn ghost" data-action="close-modal">取消</button></div>' +
          "</form>"
        );
        break;
      }
      case "post-del-admin": {
        if (!confirm("确定删除这篇帖子吗？")) break;
        Store.deletePost(id); toast("已删除"); refreshAdmin(); break;
      }

      case "report-filter": reportFilter.status = value; refreshAdmin(); break;
      case "report-done": Store.updateReport(id, { status: "done" }); toast("已标记为处理完成"); refreshAdmin(); break;
      case "report-ignore": Store.updateReport(id, { status: "ignored" }); toast("已忽略"); refreshAdmin(); break;
      case "report-reopen": Store.updateReport(id, { status: "pending" }); toast("已重新打开"); refreshAdmin(); break;
      case "report-del": {
        if (!confirm("确定删除这条勘误记录吗？")) break;
        Store.deleteReport(id); toast("已删除"); refreshAdmin(); break;
      }

      /* 我有啥 */
      case "match-toggle": {
        var ids = Store.getMyIngredients();
        var idx = ids.indexOf(id);
        if (idx >= 0) ids.splice(idx, 1); else ids.push(id);
        Store.setMyIngredients(ids);
        syncMatchChip(id, idx < 0);
        renderSelectedBar();
        updateCatCounts();
        renderMatchResults();
        break;
      }
      case "match-clear": Store.setMyIngredients([]); renderMatch(); break;
      case "match-cat-all":
      case "match-cat-none": {
        var block = el.closest(".cat-block");
        var wantOn = action === "match-cat-all";
        var curList = Store.getMyIngredients();
        block.querySelectorAll(".ing-chip").forEach(function (c) {
          var cid = c.getAttribute("data-id");
          var has = curList.indexOf(cid) >= 0;
          if (wantOn && !has) curList.push(cid);
          if (!wantOn && has) curList.splice(curList.indexOf(cid), 1);
          c.classList.toggle("on", wantOn);
        });
        Store.setMyIngredients(curList);
        renderSelectedBar();
        updateCatCounts();
        renderMatchResults();
        break;
      }
      case "match-common": {
        var common = ["gin", "vodka", "white-rum", "tequila", "bourbon", "lime-juice", "lemon-juice",
          "orange-juice", "simple-syrup", "soda-water", "tonic", "cola", "mint"];
        var have = Store.getMyIngredients();
        common.forEach(function (cid) { if (have.indexOf(cid) < 0) have.push(cid); });
        Store.setMyIngredients(have);
        renderMatch();
        break;
      }

      /* 添加配方 */
      case "draft-toggle-ing": {
        syncSelectedInputs();
        var i = draft.ingredients.map(function (x) { return x.id; }).indexOf(id);
        if (i >= 0) draft.ingredients.splice(i, 1);
        else draft.ingredients.push({ id: id, amount: "", optional: false });
        el.classList.toggle("on");
        renderSelectedList();
        break;
      }
      case "draft-remove-ing": {
        syncSelectedInputs();
        var removed = draft.ingredients.splice(Number(el.getAttribute("data-idx")), 1)[0];
        if (removed) {
          var chipEl = document.querySelector('#ingPicker .ing-chip[data-id="' + removed.id + '"]');
          if (chipEl) chipEl.classList.remove("on");
        }
        renderSelectedList();
        break;
      }

      case "add-video": {
        var rec = Store.getRecipe(id);
        openModal(
          "<h2>推荐 / 修改教学视频</h2>" +
          '<form id="videoForm" class="form" data-id="' + id + '">' +
            '<label class="field"><span>视频链接</span><input class="input" name="video" value="' + esc(rec ? rec.video : "") + '" placeholder="https://..." required></label>' +
            '<label class="field"><span>视频标题</span><input class="input" name="videoName" value="' + esc(rec ? rec.videoName : "") + '" placeholder="例如：B 站 · 手把手教学"></label>' +
            '<p class="mute-text">保存后所有用户都能在这个配方页看到它。</p>' +
            '<div class="form-foot"><button class="btn" type="submit">保存</button><button type="button" class="btn ghost" data-action="close-modal">取消</button></div>' +
          "</form>"
        );
        break;
      }
      case "report": {
        var repRecipe = id ? Store.getRecipe(id) : null;
        var meNow = Store.currentUser();
        if (!meNow) { toast("登录后就能提交勘误"); authModal("login"); break; }
        if (!Store.can("report")) { toast("管理员暂时关闭了勘误提交"); break; }
        openModal(
          "<h2>提交勘误</h2>" +
          '<p class="mute-text">发现' + (repRecipe ? "「" + esc(repRecipe.name) + "」" : "材料库") +
          "有写错的地方？告诉我们，管理员会核对修改。</p>" +
          '<form id="reportForm" class="form" data-id="' + (id || "") + '">' +
            '<label class="field"><span>问题类型</span><select class="input" name="type">' +
              Store.reportTypes().map(function (t) { return '<option value="' + esc(t) + '">' + esc(t) + "</option>"; }).join("") +
            "</select></label>" +
            '<label class="field"><span>问题说明 *</span><textarea class="input" name="content" rows="3" maxlength="300" placeholder="例如：图片不是这杯酒；材料里写的 25ml 应该是 20ml"></textarea></label>' +
            '<label class="field"><span>建议改成（选填）</span><input class="input" name="suggest" maxlength="200" placeholder="把你认为正确的内容写在这里"></label>' +
            '<div class="form-foot"><button class="btn" type="submit">提交勘误</button>' +
            '<button type="button" class="btn ghost" data-action="close-modal">取消</button></div>' +
          "</form>"
        );
        break;
      }
      case "set-image": {
        var ri = Store.getRecipe(id);
        modalTags = (ri && ri.tags ? ri.tags : []).slice();
        openModal(
          "<h2>编辑图片与口味标签</h2>" +
          '<form id="recipeImageForm" class="form" data-id="' + id + '">' +
            '<div class="img-preview" id="imgPreview">' +
              (ri && ri.image ? '<img src="' + esc(ri.image) + '" alt="">' : '<span class="mute-text">暂无图片</span>') +
            "</div>" +
            '<label class="field"><span>图片链接</span><input class="input" name="url" id="imgUrl" value="' + esc(ri && ri.image ? ri.image : "") + '" placeholder="https://..."></label>' +
            '<label class="field"><span>或上传本地图片（自动压缩到 1000px 以内）</span><input class="input" type="file" id="imgFile" accept="image/*"></label>' +
            '<h3 class="form-title">口味标签</h3>' +
            '<div id="modalTagPicker">' + tagPickerHTML("modal", modalTags) + "</div>" +
            '<p class="mute-text">图片目前存在浏览器本地，以后接腾讯云开发会改成传到云存储。</p>' +
            '<div class="form-foot"><button class="btn" type="submit">保存</button>' +
            '<button type="button" class="btn ghost danger" data-action="clear-image" data-id="' + id + '">清除图片</button>' +
            '<button type="button" class="btn ghost" data-action="close-modal">取消</button></div>' +
          "</form>"
        );
        break;
      }
      case "clear-image": {
        if (!confirm("确定清除这张图片吗？会回退成 emoji 卡片。")) break;
        Store.setRecipeImage(id, "");
        closeModal();
        toast("已清除图片");
        if (currentRoute().name === "admin") refreshAdmin(); else render();
        break;
      }
      case "delete-recipe": {
        if (!confirm("确定删除这款配方吗？删除后无法恢复。")) break;
        var d = Store.deleteRecipe(id);
        if (!d.ok) { toast(d.msg); break; }
        toast("已删除");
        go("#/recipes");
        break;
      }

      /* 后台 */
      case "admin-tab": adminTab = value; refreshAdmin(); break;
      case "admin-view": go("#/recipe/" + id); break;
      case "approve": Store.updateRecipe(id, { status: "approved" }); toast("已通过并公开"); refreshAdmin(); break;
      case "hide": Store.updateRecipe(id, { status: "hidden" }); toast("已下架"); refreshAdmin(); break;
      case "del-recipe": {
        if (!confirm("确定删除这款配方吗？相关评论也会一起删除。")) break;
        Store.deleteRecipe(id); toast("已删除"); refreshAdmin(); break;
      }
      case "edit-ing": {
        var ing = Store.getIngredient(id);
        if (!ing) return;
        editingIngredientId = id;
        openModal(
          "<h2>编辑材料</h2>" +
          '<form id="editIngForm" class="form">' +
            '<label class="field"><span>名称</span><input class="input" name="name" value="' + esc(ing.name) + '" required></label>' +
            '<label class="field"><span>分类</span><select class="input" name="cat">' +
              Store.categories().map(function (c) { return '<option value="' + esc(c) + '"' + (c === ing.cat ? " selected" : "") + ">" + esc(c) + "</option>"; }).join("") +
            "</select></label>" +
            '<label class="field"><span>图标</span><input class="input narrow" name="emoji" value="' + esc(ing.emoji || "") + '" maxlength="4"></label>' +
            '<label class="field"><span>别名 / 英文名</span><input class="input" name="aka" value="' + esc(ing.aka || "") + '"></label>' +
            '<label class="check"><input type="checkbox" name="basic"' + (ing.basic ? " checked" : "") + "> 常备材料（不计入匹配）</label>" +
            '<div class="form-foot"><button class="btn" type="submit">保存</button><button type="button" class="btn ghost" data-action="close-modal">取消</button></div>' +
          "</form>"
        );
        break;
      }
      case "del-ing": {
        var target = Store.getIngredient(id);
        if (!target) return;
        if (!confirm("删除材料「" + target.name + "」？用到它的配方会自动去掉这项。")) break;
        var rr = Store.deleteIngredient(id);
        toast("已删除「" + rr.name + "」，影响 " + rr.affected + " 款配方");
        refreshAdmin();
        break;
      }
      case "edit-user": {
        var uu = Store.users().filter(function (x) { return x.id === id; })[0];
        if (!uu) return;
        openModal(
          "<h2>编辑用户资料</h2>" +
          '<form id="editUserForm" class="form" data-id="' + id + '">' +
            '<label class="field"><span>用户名</span><input class="input" value="' + esc(uu.username) + '" disabled></label>' +
            '<label class="field"><span>昵称</span><input class="input" name="nickname" value="' + esc(uu.nickname || uu.username) + '"></label>' +
            '<label class="field"><span>简介</span><textarea class="input" name="intro" rows="2">' + esc(uu.intro || "") + "</textarea></label>" +
            '<label class="field"><span>重置密码（留空表示不修改）</span><input class="input" name="password" placeholder="至少 6 位"></label>' +
            '<div class="form-foot"><button class="btn" type="submit">保存</button><button type="button" class="btn ghost" data-action="close-modal">取消</button></div>' +
          "</form>"
        );
        break;
      }
      case "set-role": Store.updateUser(id, { role: el.getAttribute("data-role") }); toast("已更新角色"); refreshAdmin(); break;
      case "del-user": {
        var u = Store.users().filter(function (x) { return x.id === id; })[0];
        if (!confirm("确定删除用户「" + (u ? u.username : "") + "」？")) break;
        var dr = Store.deleteUser(id);
        if (!dr.ok) { toast(dr.msg); break; }
        toast("已删除"); refreshAdmin(); break;
      }
      case "export-data": {
        var isCloud = Store.cloudOn();
        toast(isCloud ? "正在从云端打包备份，稍等…" : "正在生成备份…");
        Store.exportBackup(function (res) {
          if (!res || !res.ok) { toast((res && res.msg) || "备份失败"); return; }
          var blob = new Blob([res.json], { type: "application/json" });
          var a = document.createElement("a");
          a.href = URL.createObjectURL(blob);
          a.download = res.filename;
          document.body.appendChild(a); a.click(); document.body.removeChild(a);
          var extra = res.counts
            ? "（" + res.counts.recipes + " 款配方 / " + res.counts.users + " 个账号 / " + res.counts.posts + " 篇帖子）"
            : "";
          toast("备份已下载" + extra + "，请存到电脑或网盘");
        });
        break;
      }
      case "reset-data": {
        if (!confirm("恢复初始数据会清空所有配方、材料、评论和账号改动，确定吗？")) break;
        Store.resetAll();
        toast("已恢复初始数据");
        go("#/recipes");
        render();
        break;
      }
    }
    if (el.blur) el.blur();
  });

  /* 表单提交 */
  document.addEventListener("submit", function (e) {
    var form = e.target;
    e.preventDefault();

    if (form.id === "authForm") return submitAuth(form, authMode);
    if (form.id === "recipeForm") return submitRecipe(form);
    if (form.id === "commentForm" || form.getAttribute("data-parent")) return submitComment(form);

    if (form.id === "addIngForm") {
      var fd = new FormData(form);
      var res = Store.addIngredient({
        name: fd.get("name"), cat: fd.get("cat"), emoji: fd.get("emoji"),
        aka: fd.get("aka"), basic: !!fd.get("basic")
      });
      if (!res.ok) { toast(res.msg); return; }
      toast("已添加材料");
      refreshAdmin();
      return;
    }
    if (form.id === "editIngForm") {
      var fd2 = new FormData(form);
      Store.updateIngredient(editingIngredientId, {
        name: fd2.get("name"), cat: fd2.get("cat"), emoji: fd2.get("emoji"),
        aka: fd2.get("aka"), basic: !!fd2.get("basic")
      });
      closeModal();
      toast("已保存");
      refreshAdmin();
      return;
    }
    if (form.id === "editUserForm") {
      var fd3 = new FormData(form);
      var patch = { nickname: fd3.get("nickname"), intro: fd3.get("intro") };
      var pwd = String(fd3.get("password") || "");
      if (pwd) {
        if (pwd.length < 6) { toast("密码至少 6 位"); return; }
        patch.password = pwd;
      }
      Store.updateUser(form.getAttribute("data-id"), patch);
      closeModal();
      toast("已保存");
      refreshAdmin();
      return;
    }
    if (form.id === "videoForm") {
      var fd4 = new FormData(form);
      var rv = Store.setRecipeVideo(form.getAttribute("data-id"), fd4.get("video"), fd4.get("videoName"));
      if (!rv.ok) { toast(rv.msg); return; }
      closeModal();
      toast("视频已保存，所有用户都能看到了");
      render();
      return;
    }
    if (form.id === "recipeImageForm") {
      var url = String(form.querySelector('[name="url"]').value || "").trim();
      var ri2 = Store.setRecipeImage(form.getAttribute("data-id"), url);
      if (!ri2.ok) { toast(ri2.msg); return; }
      Store.updateRecipe(form.getAttribute("data-id"), { tags: modalTags.slice() });
      closeModal();
      toast("图片与标签已保存");
      if (currentRoute().name === "admin") refreshAdmin(); else render();
      return;
    }
    if (form.id === "reportForm") {
      var fdR = new FormData(form);
      var rres = Store.addReport(form.getAttribute("data-id") || null, {
        type: fdR.get("type"), content: fdR.get("content"), suggest: fdR.get("suggest")
      });
      if (!rres.ok) { toast(rres.msg); return; }
      closeModal();
      toast("勘误已提交，谢谢！管理员会尽快核对");
      return;
    }
    if (form.id === "postForm") return submitPost(form);
    if (form.id === "changePwdForm") {
      var me3 = Store.currentUser();
      if (!me3) { toast("请先登录"); return; }
      var fdPwd = new FormData(form);
      var oldPwd = String(fdPwd.get("oldPwd") || "");
      var newPwd = String(fdPwd.get("newPwd") || "");
      if (!Store.checkPassword(me3, oldPwd)) { toast("当前密码不正确"); return; }
      if (newPwd.length < 6) { toast("新密码至少 6 位"); return; }
      if (newPwd !== String(fdPwd.get("confirmPwd") || "")) { toast("两次输入的新密码不一致"); return; }
      Store.setPassword(me3.id, newPwd, oldPwd);
      closeModal();
      toast("密码已更新，请记好新密码");
      return;
    }
    if (form.id === "postCommentForm") {
      var fdPc = new FormData(form);
      var pcRes = Store.addPostComment(form.getAttribute("data-id"), fdPc.get("content"));
      if (!pcRes.ok) { toast(pcRes.msg); return; }
      toast("回复成功");
      renderPostDetail(form.getAttribute("data-id"));
      return;
    }
    if (form.id === "postRejectForm") {
      var fdRj = new FormData(form);
      var rj = Store.setPostStatus(form.getAttribute("data-id"), "rejected", fdRj.get("reason"));
      if (!rj.ok) { toast(rj.msg); return; }
      closeModal();
      toast("已拒绝");
      refreshAdmin();
      return;
    }
    if (form.id === "settingsForm") {
      var fd5 = new FormData(form);
      Store.updateSettings({
        siteName: fd5.get("siteName") || "鸡尾酒法典",
        slogan: fd5.get("slogan") || "",
        allowUserPublish: !!fd5.get("allowUserPublish"),
        needReview: !!fd5.get("needReview"),
        allowUserVideo: !!fd5.get("allowUserVideo"),
        allowUserComment: !!fd5.get("allowUserComment"),
        allowUserEditOwnRecipe: !!fd5.get("allowUserEditOwnRecipe"),
        allowUserDeleteOwnRecipe: !!fd5.get("allowUserDeleteOwnRecipe"),
        allowUserDeleteOwnComment: !!fd5.get("allowUserDeleteOwnComment"),
        allowUserReport: !!fd5.get("allowUserReport"),
        allowUserPost: !!fd5.get("allowUserPost"),
        postReviewMode: fd5.get("postReviewMode") || "auto",
        aiReviewEnabled: !!fd5.get("aiReviewEnabled"),
        aiReviewEndpoint: String(fd5.get("aiReviewEndpoint") || "").trim()
      });
      toast("设置已保存");
      renderHeader();
      return;
    }
  });

  /* 输入类事件 */
  document.addEventListener("input", function (e) {
    var t = e.target;
    if (t.id === "libSearch") {
      libFilter.q = t.value;
      refreshLibrary();
    } else if (t.id === "matchSearch") {
      matchQuery = t.value;
      renderMatchPicker();
    } else if (t.id === "ingSearch") {
      draft.search = t.value;
      renderIngredientPicker();
    } else if (t.id === "draftImgUrl") {
      var pv = document.getElementById("draftImgPreview");
      if (pv) pv.innerHTML = t.value.trim() ? '<img src="' + esc(t.value.trim()) + '" alt="" onerror="this.parentNode.innerHTML=\'<span class=&quot;mute-text&quot;>图片链接打不开</span>\'">' : '<span class="mute-text">还没有图片</span>';
    } else if (t.id === "cmtQ") {
      adminCommentQuery = t.value;
      var box = document.getElementById("adminCommentList");
      if (box) box.innerHTML = adminCommentListHTML();
    } else if (t.id === "repQ") {
      reportFilter.q = t.value;
      var rbox = document.getElementById("adminReportList");
      if (rbox) rbox.innerHTML = adminReportListHTML();
    } else if (t.id === "postSearch") {
      postState.q = t.value;
      refreshPostList();
    } else if (t.id === "postTagSearch") {
      renderPostTagPicker(t.value);
    } else if (t.id === "postAdminQ") {
      postAdminFilter.q = t.value;
      var pbox = document.getElementById("adminPostList");
      if (pbox) pbox.innerHTML = adminPostListHTML();
    }
  });

  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.id === "libSort") { libFilter.sort = t.value; refreshLibrary(); }
    else if (t.id === "libBase") { libFilter.base = t.value; refreshLibrary(); }
    else if (t.id === "libAbv") { libFilter.abv = t.value; refreshLibrary(); }
    else if (t.id === "ingCat") { syncSelectedInputs(); draft.cat = t.value; renderIngredientPicker(); }
    else if (t.id === "cmtHidden") {
      adminCommentOnlyHidden = t.checked;
      var box = document.getElementById("adminCommentList");
      if (box) box.innerHTML = adminCommentListHTML();
    } else if (t.id === "postSort") {
      postState.sort = t.value;
      refreshPostList();
    } else if ((t.id === "postImages" || t.id === "postImagesMore") && t.files && t.files.length) {
      addPostImages(t.files);
    } else if (t.id === "imgFile" && t.files && t.files[0]) {
      var file = t.files[0];
      if (file.size > 6 * 1024 * 1024) { toast("图片太大，请选 6MB 以内的图片"); t.value = ""; return; }
      downscaleImage(file, 1000, function (dataUrl) {
        if (!dataUrl) { toast("图片读取失败，换个格式试试"); return; }
        var urlInput = document.getElementById("imgUrl");
        var preview = document.getElementById("imgPreview");
        if (urlInput) urlInput.value = dataUrl;
        if (preview) preview.innerHTML = '<img src="' + dataUrl + '" alt="">';
        toast("图片已压缩，点保存生效");
      });
    } else if (t.id === "draftImgFile" && t.files && t.files[0]) {
      var dfile = t.files[0];
      if (dfile.size > 6 * 1024 * 1024) { toast("图片太大，请选 6MB 以内的图片"); t.value = ""; return; }
      downscaleImage(dfile, 1000, function (dataUrl) {
        if (!dataUrl) { toast("图片读取失败，换个格式试试"); return; }
        var urlField = document.getElementById("draftImgUrl");
        var dpv = document.getElementById("draftImgPreview");
        if (urlField) urlField.value = dataUrl;
        if (dpv) dpv.innerHTML = '<img src="' + dataUrl + '" alt="">';
        toast("图片已压缩好了");
      });
    } else if (t.id === "importFile" && t.files && t.files[0]) {
      var reader = new FileReader();
      reader.onload = function () {
        var res = Store.importJSON(reader.result);
        toast(res.ok ? "导入成功，请重新登录" : res.msg);
        if (res.ok) { location.hash = "#/recipes"; render(); }
      };
      reader.readAsText(t.files[0]);
    }
  });

  window.addEventListener("hashchange", function () { closeModal(); render(); });

  /* 启动 */
  Store.init();
  if (!location.hash) location.hash = "#/home";
  render();

  /* 云端模式：配了云函数地址就先拉一次数据，拉完重新渲染 */
  var cloudCfg = window.COCKTAIL_CLOUD || {};
  if (cloudCfg.api) {
    Store.initCloud({ api: cloudCfg.api }).then(function (res) {
      if (res && res.ok) {
        render();
        console.log("[cloud] 数据已从云端载入");
      } else {
        console.warn("[cloud] 连接失败，先用本地数据：" + ((res && res.msg) || ""));
        toast("云端连接失败，暂时使用本地数据");
      }
    });
  }

  /* 云端写操作失败时提示用户（比如没登录、被限流） */
  document.addEventListener("cloud-error", function (e) {
    var msg = (e.detail && e.detail.msg) || "操作失败";
    toast(msg);
  });

  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeModal(); toggleMenu(false); }
  });
  document.addEventListener("click", function (e) {
    if (!document.body.classList.contains("menu-open")) return;
    if (e.target.closest(".drawer-panel") || e.target.closest(".menu-btn")) return;
    toggleMenu(false);
  });
})();
