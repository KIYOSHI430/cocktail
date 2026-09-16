/* 界面层：路由、渲染、交互 */

(function () {
  "use strict";

  var view = document.getElementById("view");
  var toastEl = document.getElementById("toast");

  /* 页面级临时状态 */
  var libFilter = { q: "", type: "all", sort: "hot", fav: false };
  var adminTab = "ingredients";
  var draft = { ingredients: [], search: "", cat: "全部" };
  var matchQuery = "";
  var editingIngredientId = null;
  var authMode = "login";

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
        '<span class="who">' + esc(me.username) + (me.role === "admin" ? ' <b class="role">管理员</b>' : "") + "</span>" +
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

  /* ---------------- 视图一：配方库 ---------------- */

  function filteredRecipes() {
    var list = Store.visibleRecipes().filter(function (r) { return r.status !== "pending"; });
    var q = libFilter.q.trim().toLowerCase();
    if (q) {
      list = list.filter(function (r) {
        var hay = [r.name, r.en, r.desc, r.author].join(" ").toLowerCase();
        var ing = r.ingredients.map(function (x) { return Store.ingredientName(x.id); }).join(" ");
        return hay.indexOf(q) >= 0 || ing.toLowerCase().indexOf(q) >= 0;
      });
    }
    if (libFilter.type !== "all") list = list.filter(function (r) { return r.type === libFilter.type; });
    if (libFilter.fav) list = list.filter(function (r) { return Store.isFavorite(r.id); });
    var sort = libFilter.sort;
    list.sort(function (a, b) {
      if (sort === "new") return String(b.createdAt).localeCompare(String(a.createdAt));
      if (sort === "name") return a.name.localeCompare(b.name, "zh");
      return (b.views || 0) - (a.views || 0);
    });
    return list;
  }

  function recipeCard(item) {
    var r = item.recipe || item;
    var missing = item.missing ? item.missing.length : null;
    var badge = "";
    if (missing === 0) badge = '<span class="badge ok">✅ 现在就能调</span>';
    else if (missing === 1) badge = '<span class="badge warn">差 1 种</span>';
    else if (missing === 2) badge = '<span class="badge warn">差 2 种</span>';
    else if (missing >= 3) badge = '<span class="badge mute">差 ' + missing + " 种</span>";

    var missingLine = "";
    if (item.missing && item.missing.length) {
      missingLine = '<div class="miss-line">还差：' + item.missing.map(function (x) { return esc(Store.ingredientName(x.id)); }).join("、") + "</div>";
    }

    var fav = Store.isFavorite(r.id);
    return '<article class="card" data-id="' + r.id + '">' +
      '<div class="card-art" style="' + grad(r.color) + '" data-action="open-recipe" data-id="' + r.id + '">' +
        '<span class="emoji">' + esc(r.emoji || "🍹") + "</span>" +
        '<span class="pill ' + (r.type === "classic" ? "cls" : "ctm") + '">' + typeLabel(r.type) + "</span>" +
        '<button class="fav ' + (fav ? "on" : "") + '" data-action="toggle-fav" data-id="' + r.id + '" title="收藏">' + (fav ? "★" : "☆") + "</button>" +
      "</div>" +
      '<div class="card-body" data-action="open-recipe" data-id="' + r.id + '">' +
        '<h3>' + esc(r.name) + (r.en ? ' <em>' + esc(r.en) + "</em>" : "") + "</h3>" +
        '<p class="desc">' + esc(r.desc || "") + "</p>" +
        '<div class="meta">' + (badge || ('<span class="badge mute">' + r.ingredients.length + " 种材料</span>")) +
          (r.glass ? '<span class="mute-text">' + esc(r.glass) + "</span>" : "") +
          '<span class="mute-text">' + esc(r.author || "官方") + "</span>" +
        "</div>" + missingLine +
      "</div></article>";
  }

  function renderLibrary() {
    var list = filteredRecipes();
    view.innerHTML =
      '<section class="hero">' +
        '<div class="hero-text"><h1>今晚喝什么？</h1><p>' + esc(Store.getSettings().slogan || "") + "</p>" +
        '<div class="hero-actions"><button class="btn" data-action="random">🎲 随便来一杯</button>' +
        '<a class="btn ghost" href="#/match">🧊 按我的材料找酒</a></div></div>' +
        '<div class="hero-stats">' +
          statBox(Store.visibleRecipes().filter(function (r) { return r.status === "approved"; }).length, "款配方") +
          statBox(Store.listIngredients().length, "种常见材料") +
          statBox(Store.visibleRecipes().filter(function (r) { return r.type === "classic"; }).length, "款经典") +
        "</div>" +
      "</section>" +

      '<section class="toolbar">' +
        '<input id="libSearch" class="input search" type="search" placeholder="搜索酒名 / 材料，例如：金酒、莫吉托" value="' + esc(libFilter.q) + '">' +
        '<div class="chips">' +
          chip("all", "全部") + chip("classic", "经典鸡尾酒") + chip("custom", "特调") +
          '<button class="chip ' + (libFilter.fav ? "on" : "") + '" data-action="lib-fav">★ 我的收藏</button>' +
        "</div>" +
        '<select id="libSort" class="input select">' +
          option("hot", "最热门", libFilter.sort) + option("new", "最新发布", libFilter.sort) + option("name", "按名称", libFilter.sort) +
        "</select>" +
      "</section>" +

      '<section id="recipeGrid" class="grid">' + gridHTML(list) + "</section>";
  }

  function gridHTML(list) {
    if (!list.length) return '<div class="empty">还没有符合条件的配方，换个关键词试试，或者去 <a href="#/new">添加一个</a>。</div>';
    return list.map(function (r) { return recipeCard(r); }).join("");
  }

  function statBox(n, label) {
    return '<div class="stat"><b>' + n + "</b><span>" + label + "</span></div>";
  }

  function chip(value, label) {
    return '<button class="chip ' + (libFilter.type === value ? "on" : "") + '" data-action="lib-type" data-value="' + value + '">' + label + "</button>";
  }

  function option(value, label, current) {
    return '<option value="' + value + '"' + (value === current ? " selected" : "") + ">" + label + "</option>";
  }

  /* ---------------- 视图二：配方详情 ---------------- */

  function renderRecipeDetail(id) {
    var r = Store.getRecipe(id);
    if (!r) { view.innerHTML = '<div class="empty">找不到这款配方。<a href="#/recipes">返回配方库</a></div>'; return; }
    var me = Store.currentUser();
    var canEdit = me && (me.role === "admin" || r.authorId === me.id);
    Store.addView(id);   // 先计数，页面上显示的就是包含本次浏览的数字
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

    var allowVideo = me && (Store.getSettings().allowUserVideo || me.role === "admin");

    view.innerHTML =
      '<a class="back" href="#/recipes">← 返回配方库</a>' +
      '<section class="detail">' +
        '<div class="detail-hero" style="' + grad(r.color) + '"><span>' + esc(r.emoji || "🍹") + "</span></div>" +
        "<div class=\"detail-main\">" +
          "<h1>" + esc(r.name) + (r.en ? ' <em>' + esc(r.en) + "</em>" : "") + "</h1>" +
          '<div class="tags">' +
            '<span class="pill ' + (r.type === "classic" ? "cls" : "ctm") + '">' + typeLabel(r.type) + "</span>" +
            (r.glass ? '<span class="pill">杯型：' + esc(r.glass) + "</span>" : "") +
            (r.abv ? '<span class="pill">酒感：' + esc(r.abv) + "</span>" : "") +
            '<span class="pill">' + esc(r.author || "官方") + " 发布</span>" +
            '<span class="pill">' + (r.views || 0) + " 次查看</span>" +
            (r.status !== "approved" ? '<span class="pill warn-pill">' + (r.status === "pending" ? "待审核" : "已下架") + "</span>" : "") +
          "</div>" +
          '<p class="lead">' + esc(r.desc || "") + "</p>" +
          '<div class="detail-actions">' +
            '<button class="btn ' + (Store.isFavorite(r.id) ? "" : "ghost") + '" data-action="toggle-fav" data-id="' + r.id + '">' + (Store.isFavorite(r.id) ? "★ 已收藏" : "☆ 收藏") + "</button>" +
            (allowVideo ? '<button class="btn ghost" data-action="add-video" data-id="' + r.id + '">🎬 补充 / 修改视频</button>' : "") +
            (canEdit ? '<button class="btn ghost" data-action="delete-recipe" data-id="' + r.id + '">删除</button>' : "") +
          "</div>" +
          '<h2>需要的材料</h2><ul class="ing-list">' + ingHTML + "</ul>" +
          '<div class="tip">勾选状态来自你「我有啥」里选择的材料，去那里更新一下再回来看看。</div>' +
          "<h2>做法</h2><ol class=\"steps\">" + (stepsHTML || "<li>暂无步骤</li>") + "</ol>" +
          "<h2>教学视频</h2><p>" + videoHTML + "</p>" +
        "</div>" +
      "</section>";
  }

  /* ---------------- 视图三：我有啥（材料匹配） ---------------- */

  function selectedSet() {
    var s = {};
    Store.getMyIngredients().forEach(function (id) { s[id] = true; });
    return s;
  }

  function renderMatch() {
    var selected = selectedSet();
    var cats = Store.categories();
    var ingredients = Store.listIngredients().filter(function (i) { return !i.basic; });

    var catsHTML = cats.map(function (cat) {
      var items = ingredients.filter(function (i) { return i.cat === cat; });
      if (!items.length) return "";
      return '<div class="cat-block" data-cat="' + esc(cat) + '">' +
        '<h3>' + esc(cat) + ' <span class="mute-text">' + items.length + "</span></h3>" +
        '<div class="ing-picker">' + items.map(function (i) {
          return '<button class="ing-chip ' + (selected[i.id] ? "on" : "") + '" data-action="match-toggle" data-id="' + i.id + '">' +
            '<span class="e">' + esc(i.emoji || "🍹") + "</span>" + esc(i.name) + "</button>";
        }).join("") + "</div></div>";
    }).join("");

    view.innerHTML =
      '<section class="page-head"><h1>我有啥</h1><p>勾选你手头有的材料（不用勾冰块这类常备品），下面会按「现在就能调 / 差 1 种 / 差 2 种 / 差 3 种」帮你排好。</p></section>' +
      '<div class="match-layout">' +
        '<section class="panel">' +
          '<div class="panel-head">' +
            '<input id="matchSearch" class="input search" type="search" placeholder="搜索材料，例如：金酒 / 青柠" value="' + esc(matchQuery) + '">' +
            '<div class="chips"><button class="chip" data-action="match-clear">清空</button>' +
            '<button class="chip" data-action="match-common">常见基酒一键勾选</button></div>' +
          "</div>" +
          '<div id="ingPickerWrap">' + catsHTML + "</div>" +
        "</section>" +
        '<section class="panel results-panel">' +
          '<div class="panel-head"><h2>能调的酒</h2><span id="matchCount" class="mute-text"></span></div>' +
          '<div id="matchResults"></div>' +
        "</section>" +
      "</div>";

    applyMatchSearch();
    renderMatchResults();
  }

  function applyMatchSearch() {
    var q = matchQuery.trim().toLowerCase();
    document.querySelectorAll("#ingPickerWrap .cat-block").forEach(function (block) {
      var visible = 0;
      block.querySelectorAll(".ing-chip").forEach(function (chip) {
        var ok = !q || chip.textContent.toLowerCase().indexOf(q) >= 0;
        chip.classList.toggle("hide", !ok);
        if (ok) visible++;
      });
      block.classList.toggle("hide", visible === 0);
    });
  }

  function renderMatchResults() {
    var selected = Object.keys(selectedSet());
    var wrap = document.getElementById("matchResults");
    if (!wrap) return;
    if (!selected.length) {
      wrap.innerHTML = '<div class="empty">先在左边勾几种你有的材料吧 👈<br><span class="mute-text">勾选后这里会自动列出能调的酒</span></div>';
      var c0 = document.getElementById("matchCount");
      if (c0) c0.textContent = "已选 0 种材料";
      return;
    }
    var b = Store.matchRecipes(selected, { maxMissing: 3 });
    var c = document.getElementById("matchCount");
    if (c) c.textContent = "已选 " + selected.length + " 种材料";

    function block(title, items, hint) {
      if (!items.length) return "";
      return '<div class="result-block"><h3>' + title + ' <span class="count">' + items.length + "</span></h3>" +
        (hint ? '<p class="hint">' + hint + "</p>" : "") +
        '<div class="grid small">' + items.map(function (it) { return recipeCard(it); }).join("") + "</div></div>";
    }

    var html =
      block("✅ 现在就能调", b.ready, "材料齐了，直接开做！") +
      block("🍋 差 1 种材料", b.miss1, "有这些的话可以直接去补货") +
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
    if (!Store.getSettings().allowUserPublish && me.role !== "admin") {
      view.innerHTML = '<div class="empty">管理员暂时关闭了用户自助发布配方。</div>';
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

        '<h3 class="form-title">选择材料 <span class="mute-text">（点击加入下方清单，可填用量、勾选"装饰用/可选"）</span></h3>' +
        '<div class="picker-tools">' +
          '<input id="ingSearch" class="input search" type="search" placeholder="搜索材料…" value="' + esc(draft.search) + '">' +
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

        '<h3 class="form-title">教学视频（选填）</h3>' +
        '<div class="row">' +
          '<label class="field"><span>视频链接</span><input class="input" name="video" placeholder="https://..."></label>' +
          '<label class="field"><span>视频标题</span><input class="input" name="videoName" placeholder="例如：B 站 · 3 分钟学会"></label>' +
        "</div>" +
        '<div class="form-foot"><button class="btn" type="submit">发布配方</button>' +
        '<span class="mute-text">' + (Store.getSettings().needReview && me.role !== "admin" ? "提交后需管理员审核通过才公开" : "提交后立即公开") + "</span></div>" +
      "</form>";

    renderIngredientPicker();
    renderSelectedList();
  }

  function renderIngredientPicker() {
    var wrap = document.getElementById("ingPicker");
    if (!wrap) return;
    var selected = {};
    draft.ingredients.forEach(function (x) { selected[x.id] = true; });
    var list = Store.listIngredients().filter(function (i) {
      if (draft.cat !== "全部" && i.cat !== draft.cat) return false;
      var q = draft.search.trim().toLowerCase();
      if (!q) return true;
      return (i.name + " " + (i.aka || "")).toLowerCase().indexOf(q) >= 0;
    });
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

    view.innerHTML =
      '<section class="page-head"><h1>我的</h1><p>' + esc(me.username) + (me.role === "admin" ? "（管理员）" : "") + " · 注册于 " + esc(me.createdAt) + "</p></section>" +
      '<section class="panel"><h3>我选中的材料 <span class="mute-text">（' + mineIngs.length + ' 种）</span></h3>' +
        '<div class="tag-cloud">' + (mineIngs.length ? mineIngs.map(function (i) {
          return '<span class="pill">' + esc(i.emoji || "🍹") + " " + esc(i.name) + "</span>";
        }).join("") : '<span class="mute-text">还没选，去 <a href="#/match">我有啥</a> 勾一下吧</span>') + "</div></section>" +

      '<section class="panel"><h3>我的收藏 <span class="mute-text">（' + favs.length + ' 款）</span></h3>' +
        (favs.length ? '<div class="grid small">' + favs.map(function (r) { return recipeCard(r); }).join("") + "</div>"
          : '<div class="empty sm">还没有收藏，看到喜欢的点 ☆ 收藏</div>') + "</section>" +

      '<section class="panel"><h3>我发布的配方 <span class="mute-text">（' + mine.length + ' 款）</span></h3>' +
        (mine.length ? '<div class="grid small">' + mine.map(function (r) { return recipeCard(r); }).join("") + "</div>"
          : '<div class="empty sm">还没有发布过，去 <a href="#/new">添加配方</a></div>') + "</section>";
  }

  /* ---------------- 视图六：管理后台 ---------------- */

  function renderAdmin() {
    if (!Store.isAdmin()) {
      view.innerHTML = '<div class="empty">只有管理员可以进入后台。<br><br><button class="btn" data-action="open-login">管理员登录</button></div>';
      return;
    }
    var tabs = [
      ["ingredients", "材料管理"], ["recipes", "配方管理"], ["users", "用户管理"],
      ["settings", "站点设置"], ["data", "数据备份"]
    ];
    view.innerHTML =
      '<section class="page-head"><h1>管理后台</h1><p>材料、配方、用户都由你说了算。所有改动即时生效。</p></section>' +
      '<nav class="tabs">' + tabs.map(function (t) {
        return '<button class="tab ' + (adminTab === t[0] ? "on" : "") + '" data-action="admin-tab" data-value="' + t[0] + '">' + t[1] + "</button>";
      }).join("") + "</nav>" +
      '<section id="adminBody" class="panel">' + adminBodyHTML() + "</section>";
  }

  function adminBodyHTML() {
    if (adminTab === "ingredients") return adminIngredientsHTML();
    if (adminTab === "recipes") return adminRecipesHTML();
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
        '<input class="input" name="aka" placeholder="英文/别名（选填）">' +
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
        '<td class="ops">' +
          '<button class="btn ghost sm" data-action="admin-view" data-id="' + r.id + '">查看</button>' +
          (r.status !== "approved" ? '<button class="btn ghost sm" data-action="approve" data-id="' + r.id + '">通过</button>' : "") +
          (r.status === "approved" ? '<button class="btn ghost sm" data-action="hide" data-id="' + r.id + '">下架</button>' : "") +
          '<button class="btn ghost sm danger" data-action="del-recipe" data-id="' + r.id + '">删除</button>' +
        "</td></tr>";
    }).join("");
    return "<h3>配方管理 <span class=\"mute-text\">（共 " + list.length + " 款）</span></h3>" +
      '<div class="table-wrap"><table class="table"><thead><tr><th>配方</th><th>类型</th><th>作者</th><th>状态</th><th>操作</th></tr></thead><tbody>' +
      (rows || '<tr><td colspan="5">暂无配方</td></tr>') + "</tbody></table></div>";
  }

  function adminUsersHTML() {
    var me = Store.currentUser();
    var rows = Store.users().map(function (u) {
      var count = Store.listRecipes().filter(function (r) { return r.authorId === u.id; }).length;
      return "<tr>" +
        "<td>" + esc(u.username) + (u.id === me.id ? ' <span class="badge mute">当前账号</span>' : "") + "</td>" +
        "<td>" + (u.role === "admin" ? '<span class="badge ok">管理员</span>' : "普通用户") + "</td>" +
        "<td>" + esc(u.createdAt || "") + "</td>" +
        "<td>" + count + " 款</td>" +
        '<td class="ops">' +
          (u.role === "admin"
            ? '<button class="btn ghost sm" data-action="set-role" data-id="' + u.id + '" data-role="user">取消管理员</button>'
            : '<button class="btn ghost sm" data-action="set-role" data-id="' + u.id + '" data-role="admin">设为管理员</button>') +
          '<button class="btn ghost sm danger" data-action="del-user" data-id="' + u.id + '">删除</button>' +
        "</td></tr>";
    }).join("");
    return "<h3>用户管理 <span class=\"mute-text\">（共 " + Store.users().length + " 人）</span></h3>" +
      '<div class="table-wrap"><table class="table"><thead><tr><th>用户名</th><th>角色</th><th>注册时间</th><th>发布配方</th><th>操作</th></tr></thead><tbody>' +
      rows + "</tbody></table></div>" +
      '<p class="mute-text">提示：原型阶段密码保存在本机浏览器里，正式上线请换成服务器账号系统。</p>';
  }

  function adminSettingsHTML() {
    var s = Store.getSettings();
    return "<h3>站点设置</h3>" +
      '<form id="settingsForm" class="form" autocomplete="off">' +
        '<div class="row"><label class="field"><span>站点名称</span><input class="input" name="siteName" value="' + esc(s.siteName) + '"></label>' +
        '<label class="field"><span>标语</span><input class="input" name="slogan" value="' + esc(s.slogan) + '"></label></div>' +
        '<div class="switch-list">' +
          switchRow("allowUserPublish", "允许用户自助发布配方", s.allowUserPublish) +
          switchRow("needReview", "用户发布的配方需要审核后才公开", s.needReview) +
          switchRow("allowUserVideo", "允许用户为配方补充视频链接", s.allowUserVideo) +
        "</div>" +
        '<div class="form-foot"><button class="btn" type="submit">保存设置</button></div>' +
      "</form>";
  }

  function switchRow(name, label, checked) {
    return '<label class="switch-row"><input type="checkbox" name="' + name + '"' + (checked ? " checked" : "") + "><span>" + esc(label) + "</span></label>";
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
      '<div class="stats-row">' + statBox(s.recipes.length, "款配方") + statBox(s.ingredients.length, "种材料") + statBox(s.users.length, "个账号") + "</div>" +
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
        (isLogin ? "" : '<p class="mute-text">密码至少 6 位。注册后即可添加配方、收藏、勾选自己的材料。</p>') +
        '<div class="form-foot"><button class="btn" type="submit">' + (isLogin ? "登录" : "注册并登录") + "</button>" +
        '<button type="button" class="btn ghost" data-action="close-modal">取消</button></div>' +
      "</form>" +
      (isLogin ? '<p class="mute-text">管理员演示账号：admin / admin123　　普通用户：demo / 123456</p>' : "") +
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
    toast(mode === "login" ? "欢迎回来，" + res.user.username : "注册成功，欢迎！");
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
      "<h3 class=\"center\">" + esc(r.name) + (r.en ? " <em>" + esc(r.en) + "</em>" : "") + "</h3>" +
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
      case "lib-type": libFilter.type = value; renderLibrary(); break;
      case "lib-fav": libFilter.fav = !libFilter.fav; renderLibrary(); break;
      case "match-toggle": {
        var ids = Store.getMyIngredients();
        var idx = ids.indexOf(id);
        if (idx >= 0) ids.splice(idx, 1); else ids.push(id);
        Store.setMyIngredients(ids);
        el.classList.toggle("on");
        renderMatchResults();
        break;
      }
      case "match-clear": Store.setMyIngredients([]); renderMatch(); break;
      case "match-common": {
        var common = ["gin", "vodka", "white-rum", "tequila", "bourbon", "lime-juice", "lemon-juice", "orange-juice", "simple-syrup", "soda-water", "tonic", "cola", "mint"];
        var have = Store.getMyIngredients();
        common.forEach(function (cid) { if (have.indexOf(cid) < 0) have.push(cid); });
        Store.setMyIngredients(have);
        renderMatch();
        break;
      }
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
        draft.ingredients.splice(Number(el.getAttribute("data-idx")), 1);
        renderIngredientPicker();
        renderSelectedList();
        break;
      }
      case "add-video": {
        var rec = Store.getRecipe(id);
        openModal(
          "<h2>补充教学视频</h2>" +
          '<form id="videoForm" class="form" data-id="' + id + '">' +
            '<label class="field"><span>视频链接</span><input class="input" name="video" value="' + esc(rec ? rec.video : "") + '" placeholder="https://..." required></label>' +
            '<label class="field"><span>视频标题</span><input class="input" name="videoName" value="' + esc(rec ? rec.videoName : "") + '" placeholder="例如：B 站 · 手把手教学"></label>' +
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
      case "admin-tab": adminTab = value; refreshAdmin(); break;
      case "admin-view": go("#/recipe/" + id); break;
      case "approve": Store.updateRecipe(id, { status: "approved" }); toast("已通过并公开"); refreshAdmin(); break;
      case "hide": Store.updateRecipe(id, { status: "hidden" }); toast("已下架"); refreshAdmin(); break;
      case "del-recipe": {
        if (!confirm("确定删除这款配方吗？")) break;
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
            '<label class="field"><span>别名</span><input class="input" name="aka" value="' + esc(ing.aka || "") + '"></label>' +
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
        var r = Store.deleteIngredient(id);
        toast("已删除「" + r.name + "」，影响 " + r.affected + " 款配方");
        refreshAdmin();
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
        if (!confirm("恢复初始数据会清空所有配方、材料和账号改动，确定吗？")) break;
        Store.resetAll();
        toast("已恢复初始数据");
        go("#/recipes");
        render();
        break;
      }
    }
  });

  /* 表单提交 */
  document.addEventListener("submit", function (e) {
    var form = e.target;
    if (form.id === "authForm") {
      e.preventDefault();
      submitAuth(form, authMode);
      return;
    }
    e.preventDefault();
    if (form.id === "recipeForm") return submitRecipe(form);
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
    if (form.id === "videoForm") {
      var fd3 = new FormData(form);
      var rv = Store.setRecipeVideo(form.getAttribute("data-id"), fd3.get("video"), fd3.get("videoName"));
      if (!rv.ok) { toast(rv.msg); return; }
      closeModal();
      toast("视频已保存");
      render();
      return;
    }
    if (form.id === "settingsForm") {
      var fd4 = new FormData(form);
      Store.updateSettings({
        siteName: fd4.get("siteName") || "今晚喝什么",
        slogan: fd4.get("slogan") || "",
        allowUserPublish: !!fd4.get("allowUserPublish"),
        needReview: !!fd4.get("needReview"),
        allowUserVideo: !!fd4.get("allowUserVideo")
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
      var grid = document.getElementById("recipeGrid");
      if (grid) grid.innerHTML = gridHTML(filteredRecipes());
    } else if (t.id === "matchSearch") {
      matchQuery = t.value;
      applyMatchSearch();
    } else if (t.id === "ingSearch") {
      draft.search = t.value;
      renderIngredientPicker();
    }
  });

  document.addEventListener("change", function (e) {
    var t = e.target;
    if (t.id === "libSort") { libFilter.sort = t.value; renderLibrary(); }
    else if (t.id === "ingCat") { syncSelectedInputs(); draft.cat = t.value; renderIngredientPicker(); }
    else if (t.id === "importFile" && t.files && t.files[0]) {
      var reader = new FileReader();
      reader.onload = function () {
        var res = Store.importJSON(reader.result);
        toast(res.ok ? "导入成功，请重新登录" : res.msg);
        if (res.ok) { closeModal(); headerRefreshOnly(); render(); }
      };
      reader.readAsText(t.files[0]);
    }
  });

  function headerRefreshOnly() { renderHeader(); }

  window.addEventListener("hashchange", function () { closeModal(); render(); });

  /* 启动 */
  Store.init();
  if (!location.hash) location.hash = "#/recipes";
  render();
  window.addEventListener("keydown", function (e) { if (e.key === "Escape") closeModal(); });
})();
