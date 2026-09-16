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
  var draft = { ingredients: [], search: "", cat: "全部" };
  var matchQuery = "";
  var editingIngredientId = null;
  var authMode = "login";
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
    switch (r.name) {
      case "recipe": renderRecipeDetail(r.params[0]); break;
      case "match": renderMatch(); break;
      case "new": renderNew(); break;
      case "me": renderMe(); break;
      case "admin": renderAdmin(); break;
      default: renderLibrary();
    }
    renderHeader();
  }

  /* ---------------- 顶栏 ---------------- */

  function renderHeader() {
    var me = Store.currentUser();
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
    var name = Store.getSettings().siteName || "今晚喝什么";
    var brandText = document.querySelector(".brand-text");
    if (brandText) brandText.innerHTML = esc(name) + "<em>" + esc(Store.getSettings().slogan || "调酒灵感") + "</em>";
    document.title = name + " · 调酒灵感";

    var route = currentRoute().name;
    document.querySelectorAll("#mainNav a").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-nav") === route);
    });
  }

  /* ---------------- 卡片 ---------------- */

  function badgesFor(r, missing) {
    if (!missing) return "";
    if (missing.length === 0) return '<span class="badge ok">✅ 现在就能调</span>';
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
    return '<article class="card" data-id="' + r.id + '">' +
      '<div class="card-art" style="' + grad(r.color) + '" data-action="open-recipe" data-id="' + r.id + '">' +
        '<span class="emoji">' + esc(r.emoji || "🍹") + "</span>" +
        '<span class="pill ' + (r.type === "classic" ? "cls" : "ctm") + '">' + typeLabel(r.type) + "</span>" +
        '<button class="fav ' + (fav ? "on" : "") + '" data-action="toggle-fav" data-id="' + r.id + '" title="收藏">' + (fav ? "★" : "☆") + "</button>" +
      "</div>" +
      '<div class="card-body" data-action="open-recipe" data-id="' + r.id + '">' +
        "<h3>" + highlight(r.name, hl) + (r.en ? ' <em>' + highlight(r.en, hl) + "</em>" : "") + "</h3>" +
        '<p class="desc">' + highlight(r.desc || "", hl) + "</p>" +
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
        '<div class="hero-actions"><button class="btn" data-action="random">🎲 随便来一杯</button>' +
        '<a class="btn ghost" href="#/match">🧊 按我的材料找酒</a></div></div>' +
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
          '<button class="chip ' + (libFilter.onlyMakeable ? "on" : "") + '" data-action="lib-makeable">🧊 只用我有的材料</button>' +
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
        '<div class="detail-hero" style="' + grad(r.color) + '"><span>' + esc(r.emoji || "🍹") + "</span></div>" +
        '<div class="detail-main">' +
          "<h1>" + esc(r.name) + (r.en ? ' <em>' + esc(r.en) + "</em>" : "") + "</h1>" +
          '<div class="tags">' +
            '<span class="pill ' + (r.type === "classic" ? "cls" : "ctm") + '">' + typeLabel(r.type) + "</span>" +
            (r.glass ? '<span class="pill">杯型：' + esc(r.glass) + "</span>" : "") +
            (r.abv ? '<span class="pill">酒感：' + esc(r.abv) + "</span>" : "") +
            '<span class="pill">' + esc(r.author || "官方") + " 发布</span>" +
            '<span class="pill">' + (r.views || 0) + " 次查看</span>" +
            '<span class="pill">💬 ' + Store.countComments(r.id) + " 条评论</span>" +
            (r.status !== "approved" ? '<span class="pill warn-pill">' + (r.status === "pending" ? "待审核" : "已下架") + "</span>" : "") +
          "</div>" +
          '<p class="lead">' + esc(r.desc || "") + "</p>" +
          '<div class="detail-actions">' +
            '<button class="btn ' + (Store.isFavorite(r.id) ? "" : "ghost") + '" data-action="toggle-fav" data-id="' + r.id + '">' + (Store.isFavorite(r.id) ? "★ 已收藏" : "☆ 收藏") + "</button>" +
            (Store.can("suggestVideo") ? '<button class="btn ghost" data-action="add-video" data-id="' + r.id + '">🎬 推荐 / 修改视频</button>' : "") +
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
      "</section>";

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
      '<button class="c-op' + (c.liked ? " on" : "") + '" data-action="comment-like" data-id="' + c.id + '">👍 ' + c.likeCount + "</button>" +
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
      host.innerHTML = '<div class="empty sm">还没有人评论，来说说你的感受吧 🍸</div>';
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
            '<div class="chips"><button class="chip" data-action="match-common">常见基酒一键勾选</button>' +
            '<button class="chip" data-action="match-clear">全部清空</button></div>' +
          "</div>" +
          '<div class="selected-bar" id="selectedBar"></div>' +
          '<div id="ingPickerWrap"></div>' +
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
    var html = Store.categories().map(function (cat) {
      var items = list.filter(function (i) { return i.cat === cat; });
      if (!items.length) return "";
      var chosen = items.filter(function (i) { return selected[i.id]; }).length;
      return '<div class="cat-block" data-cat="' + esc(cat) + '">' +
        '<h3><span>' + esc(cat) + '</span> <span class="mute-text">' + chosen + "/" + items.length + "</span>" +
        '<button class="mini-btn" data-action="match-cat-all">全选</button>' +
        '<button class="mini-btn" data-action="match-cat-none">取消</button></h3>' +
        '<div class="ing-picker">' + items.map(function (i) {
          return '<button class="ing-chip ' + (selected[i.id] ? "on" : "") + '" data-action="match-toggle" data-id="' + i.id + '" title="' + esc(i.aka || "") + '">' +
            '<span class="e">' + esc(i.emoji || "🍹") + "</span>" + esc(i.name) + "</button>";
        }).join("") + "</div></div>";
    }).join("");
    wrap.innerHTML = html || '<div class="empty sm">没有找到匹配的材料，换个关键词试试。</div>';
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
      wrap.innerHTML = '<div class="empty">先在左边勾几种你有的材料吧 👈<br><span class="mute-text">勾选后这里会自动列出能调的酒</span></div>';
      if (count) count.textContent = "已选 0 种材料";
      if (restock) restock.innerHTML = "";
      return;
    }
    var b = Store.matchRecipes(selected, { maxMissing: 3 });
    if (count) count.textContent = "已选 " + selected.length + " 种材料 · 能调 " + b.ready.length + " 款";

    if (restock) {
      var sug = Store.suggestRestock(selected, 5);
      restock.innerHTML = sug.length
        ? '<div class="restock"><h3>🛒 补这些最划算</h3><p class="hint">按「补上之后能多调几款酒」排序：</p>' +
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
      block("✅ 现在就能调", b.ready, "材料齐了，直接开做！") +
      block("🍋 差 1 种材料", b.miss1, "差一点点，看看上面的补货推荐") +
      block("🍊 差 2 种材料", b.miss2) +
      block("🧺 差 3 种材料", b.miss3);

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
          '<label class="field"><span>图标 emoji</span><input class="input" name="emoji" placeholder="🍹" maxlength="4"></label>' +
          '<label class="field"><span>杯型</span><input class="input" name="glass" placeholder="高球杯 / 马天尼杯"></label>' +
          '<label class="field"><span>酒感</span><input class="input" name="abv" placeholder="低 / 中 / 高"></label>' +
        "</div>" +
        '<label class="field"><span>一句话介绍</span><textarea class="input" name="desc" rows="2" placeholder="这杯酒什么味道？适合什么场合？"></textarea></label>' +

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
    var res = Store.addRecipe({
      name: fd.get("name"), en: fd.get("en"), type: fd.get("type"),
      emoji: fd.get("emoji") || "🍹", glass: fd.get("glass"), abv: fd.get("abv"),
      desc: fd.get("desc"), ingredients: draft.ingredients.slice(),
      steps: steps, video: fd.get("video"), videoName: fd.get("videoName")
    });
    if (!res.ok) { toast(res.msg); return; }
    toast(res.needReview ? "已提交，等待管理员审核" : "发布成功，谢谢分享！");
    draft = { ingredients: [], search: "", cat: "全部" };
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

    view.innerHTML =
      '<section class="page-head"><h1>我的</h1><p>' + esc(me.nickname || me.username) + " · " + Store.roleLabel() + " · 注册于 " + esc(me.createdAt) + "</p></section>" +

      '<section class="panel"><h3>我的身份与权限 <span class="mute-text">（' + Store.roleLabel() + "）</span></h3>" +
        (me.intro ? '<p class="mute-text">' + esc(me.intro) + "</p>" : "") +
        '<ul class="perm-list">' + Store.permissionList().map(function (p) { return "<li>" + esc(p) + "</li>"; }).join("") + "</ul>" +
        (me.role === "admin" ? '<a class="btn ghost sm" href="#/admin">进入管理后台</a>' : '<span class="mute-text">需要更多权限？请联系站点管理员。</span>') +
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
        }).join("") + "</ul>" : '<div class="empty sm">还没发过评论</div>') + "</section>";
  }

  /* ---------------- 视图六：管理后台 ---------------- */

  function renderAdmin() {
    if (!Store.isAdmin()) {
      view.innerHTML = '<div class="empty">只有管理员可以进入后台。<br><br><button class="btn" data-action="open-login">管理员登录</button></div>';
      return;
    }
    var tabs = [
      ["ingredients", "材料管理"], ["recipes", "配方管理"], ["comments", "评论管理"],
      ["users", "用户管理"], ["settings", "站点设置"], ["data", "数据备份"]
    ];
    view.innerHTML =
      '<section class="page-head"><h1>管理后台</h1><p>材料、配方、评论、用户都由你说了算，所有改动即时生效。</p></section>' +
      '<nav class="tabs">' + tabs.map(function (t) {
        return '<button class="tab ' + (adminTab === t[0] ? "on" : "") + '" data-action="admin-tab" data-value="' + t[0] + '">' + t[1] + "</button>";
      }).join("") + "</nav>" +
      '<section id="adminBody" class="panel">' + adminBodyHTML() + "</section>";
  }

  function adminBodyHTML() {
    if (adminTab === "ingredients") return adminIngredientsHTML();
    if (adminTab === "recipes") return adminRecipesHTML();
    if (adminTab === "comments") return adminCommentsHTML();
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
      return "<tr>" +
        '<td><span class="e">' + esc(r.emoji || "🍹") + "</span> " + esc(r.name) + " <span class=\"mute-text\">" + esc(r.en || "") + "</span></td>" +
        "<td>" + typeLabel(r.type) + "</td>" +
        "<td>" + esc(r.author || "") + "</td>" +
        "<td>" + status + "</td>" +
        "<td>" + Store.countComments(r.id) + "</td>" +
        '<td class="ops">' +
          '<button class="btn ghost sm" data-action="admin-view" data-id="' + r.id + '">查看</button>' +
          (r.status !== "approved" ? '<button class="btn ghost sm" data-action="approve" data-id="' + r.id + '">通过</button>' : "") +
          (r.status === "approved" ? '<button class="btn ghost sm" data-action="hide" data-id="' + r.id + '">下架</button>' : "") +
          '<button class="btn ghost sm danger" data-action="del-recipe" data-id="' + r.id + '">删除</button>' +
        "</td></tr>";
    }).join("");
    return "<h3>配方管理 <span class=\"mute-text\">（共 " + list.length + " 款）</span></h3>" +
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

  function adminUsersHTML() {
    var me = Store.currentUser();
    var rows = Store.users().map(function (u) {
      var count = Store.listRecipes().filter(function (r) { return r.authorId === u.id; }).length;
      var cmts = Store.adminComments({}).filter(function (c) { return c.userId === u.id; }).length;
      return "<tr>" +
        "<td>" + avatarHTML(u.nickname || u.username, "sm") + " " + esc(u.username) +
          (u.id === me.id ? ' <span class="badge mute">当前账号</span>' : "") + "</td>" +
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
      '<div class="table-wrap"><table class="table"><thead><tr><th>用户</th><th>角色</th><th>注册时间</th><th>配方</th><th>评论</th><th>操作</th></tr></thead><tbody>' +
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
          switchRow("allowUserVideo", "允许普通用户推荐 / 补充教学视频", s.allowUserVideo) +
          switchRow("allowUserComment", "允许普通用户发表评论", s.allowUserComment) +
          switchRow("allowUserEditOwnRecipe", "允许用户编辑自己发布的配方", s.allowUserEditOwnRecipe) +
          switchRow("allowUserDeleteOwnRecipe", "允许用户删除自己发布的配方", s.allowUserDeleteOwnRecipe) +
          switchRow("allowUserDeleteOwnComment", "允许用户删除自己的评论", s.allowUserDeleteOwnComment) +
        "</div>" +
        '<div class="form-foot"><button class="btn" type="submit">保存设置</button></div>' +
      "</form>";
  }

  function adminDataHTML() {
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
    openModal(
      "<h2>" + (isLogin ? "登录" : "注册新账号") + "</h2>" +
      '<form id="authForm" class="form" autocomplete="off">' +
        '<label class="field"><span>用户名</span><input class="input" name="username" required autofocus></label>' +
        '<label class="field"><span>密码</span><input class="input" name="password" type="password" required></label>' +
        (isLogin ? "" : '<p class="mute-text">密码至少 6 位。注册后即可发布配方、推荐视频、评论与收藏。</p>') +
        '<div class="form-foot"><button class="btn" type="submit">' + (isLogin ? "登录" : "注册并登录") + "</button>" +
        '<button type="button" class="btn ghost" data-action="close-modal">取消</button></div>' +
      "</form>" +
      (isLogin ? '<p class="mute-text">演示账号：管理员 admin / Cocktail@2026　　普通用户 demo / 123456</p>' : "") +
      '<p class="mute-text">改成 <a href="#" data-action="switch-auth" data-value="' + (isLogin ? "register" : "login") + '">' +
      (isLogin ? "没有账号？去注册" : "已有账号？去登录") + "</a></p>"
    );
  }

  function submitAuth(form, mode) {
    var fd = new FormData(form);
    var res = mode === "login"
      ? Store.login(fd.get("username"), fd.get("password"))
      : Store.register(fd.get("username"), fd.get("password"));
    if (!res.ok) { toast(res.msg); return; }
    closeModal();
    toast(mode === "login" ? "欢迎回来，" + (res.user.nickname || res.user.username) : "注册成功，欢迎！");
    render();
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
    openModal(
      "<h2>今晚就喝它 👇</h2>" +
      '<div class="detail-hero small" style="' + grad(r.color) + '"><span>' + esc(r.emoji || "🍹") + "</span></div>" +
      '<h3 class="center">' + esc(r.name) + (r.en ? " <em>" + esc(r.en) + "</em>" : "") + "</h3>" +
      '<p class="center">' + esc(r.desc || "") + "</p>" +
      '<div class="form-foot center"><a class="btn" href="#/recipe/' + r.id + '" data-action="close-modal">看看怎么做</a>' +
      '<button class="btn ghost" data-action="random">换一杯</button></div>'
    );
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
      case "switch-auth": authModal(value); break;
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
        var blob = new Blob([Store.exportJSON()], { type: "application/json" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = "cocktail-backup-" + Store.nowISO() + ".json";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        toast("已导出备份文件");
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
    if (form.id === "settingsForm") {
      var fd5 = new FormData(form);
      Store.updateSettings({
        siteName: fd5.get("siteName") || "今晚喝什么",
        slogan: fd5.get("slogan") || "",
        allowUserPublish: !!fd5.get("allowUserPublish"),
        needReview: !!fd5.get("needReview"),
        allowUserVideo: !!fd5.get("allowUserVideo"),
        allowUserComment: !!fd5.get("allowUserComment"),
        allowUserEditOwnRecipe: !!fd5.get("allowUserEditOwnRecipe"),
        allowUserDeleteOwnRecipe: !!fd5.get("allowUserDeleteOwnRecipe"),
        allowUserDeleteOwnComment: !!fd5.get("allowUserDeleteOwnComment")
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
    } else if (t.id === "cmtQ") {
      adminCommentQuery = t.value;
      var box = document.getElementById("adminCommentList");
      if (box) box.innerHTML = adminCommentListHTML();
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
  if (!location.hash) location.hash = "#/recipes";
  render();
  window.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
})();
