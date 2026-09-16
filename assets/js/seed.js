/* 初始数据：常见调酒材料 + 经典配方 + 示例特调
   说明：这是"出厂设置"，管理员在后台的增删改会存在浏览器本地，
   点"恢复初始数据"可以随时回到这份内容。 */

window.SEED = {
  /* ---------- 材料分类（顺序即页面展示顺序） ---------- */
  categories: ["基酒", "利口酒", "果汁与饮料", "糖浆与调味", "新鲜水果", "香草与装饰", "其他"],

  /* ---------- 材料库 ---------- */
  ingredients: [
    // 基酒
    { id: "gin",        name: "金酒（琴酒）", cat: "基酒", emoji: "🌿", aka: "Gin" },
    { id: "vodka",      name: "伏特加",       cat: "基酒", emoji: "💧", aka: "Vodka" },
    { id: "white-rum",  name: "白朗姆酒",     cat: "基酒", emoji: "🏝️", aka: "White Rum" },
    { id: "dark-rum",   name: "黑朗姆酒",     cat: "基酒", emoji: "🪵", aka: "Dark Rum" },
    { id: "tequila",    name: "龙舌兰",       cat: "基酒", emoji: "🌵", aka: "Tequila" },
    { id: "mezcal",     name: "梅斯卡尔",     cat: "基酒", emoji: "🔥", aka: "Mezcal" },
    { id: "bourbon",    name: "波本威士忌",   cat: "基酒", emoji: "🥃", aka: "Bourbon" },
    { id: "rye",        name: "黑麦威士忌",   cat: "基酒", emoji: "🌾", aka: "Rye Whiskey" },
    { id: "scotch",     name: "苏格兰威士忌", cat: "基酒", emoji: "🏴", aka: "Scotch" },
    { id: "brandy",     name: "白兰地",       cat: "基酒", emoji: "🍇", aka: "Brandy" },
    { id: "cognac",     name: "干邑",         cat: "基酒", emoji: "🥂", aka: "Cognac" },
    { id: "cachaca",    name: "卡莎萨",       cat: "基酒", emoji: "🇧🇷", aka: "Cachaça" },
    { id: "sparkling",  name: "气泡酒 / 香槟", cat: "基酒", emoji: "🍾", aka: "Sparkling Wine" },
    { id: "sake",       name: "清酒",         cat: "基酒", emoji: "🍶", aka: "Sake" },
    { id: "soju",       name: "烧酒",         cat: "基酒", emoji: "🍶", aka: "Soju" },
    { id: "baijiu",     name: "白酒",         cat: "基酒", emoji: "🏮", aka: "Baijiu" },

    // 利口酒
    { id: "cointreau",  name: "君度橙酒",     cat: "利口酒", emoji: "🍊", aka: "Cointreau" },
    { id: "triple-sec", name: "白橙皮利口酒", cat: "利口酒", emoji: "🍊", aka: "Triple Sec" },
    { id: "campari",    name: "金巴利",       cat: "利口酒", emoji: "❤️", aka: "Campari" },
    { id: "aperol",     name: "阿佩罗",       cat: "利口酒", emoji: "🧡", aka: "Aperol" },
    { id: "sweet-vermouth", name: "甜味美思", cat: "利口酒", emoji: "🍷", aka: "Sweet Vermouth" },
    { id: "dry-vermouth",   name: "干味美思", cat: "利口酒", emoji: "🥂", aka: "Dry Vermouth" },
    { id: "kahlua",     name: "咖啡利口酒",   cat: "利口酒", emoji: "☕", aka: "Kahlúa" },
    { id: "baileys",    name: "百利甜酒",     cat: "利口酒", emoji: "🥛", aka: "Baileys" },
    { id: "amaretto",   name: "杏仁利口酒",   cat: "利口酒", emoji: "🌰", aka: "Amaretto" },
    { id: "blue-curacao", name: "蓝橙利口酒", cat: "利口酒", emoji: "💙", aka: "Blue Curaçao" },
    { id: "peach",      name: "蜜桃利口酒",   cat: "利口酒", emoji: "🍑", aka: "Peach Schnapps" },
    { id: "cacao-white", name: "白可可利口酒", cat: "利口酒", emoji: "🍫", aka: "Crème de Cacao" },
    { id: "st-germain", name: "接骨木花利口酒", cat: "利口酒", emoji: "🌸", aka: "St-Germain" },
    { id: "midori",     name: "蜜多丽蜜瓜酒", cat: "利口酒", emoji: "🍈", aka: "Midori" },
    { id: "malibu",     name: "椰香朗姆酒",   cat: "利口酒", emoji: "🥥", aka: "Malibu" },
    { id: "absinthe",   name: "苦艾酒",       cat: "利口酒", emoji: "🧚", aka: "Absinthe" },

    // 果汁与饮料
    { id: "lime-juice",     name: "青柠汁",   cat: "果汁与饮料", emoji: "🟢", aka: "Lime Juice" },
    { id: "lemon-juice",    name: "柠檬汁",   cat: "果汁与饮料", emoji: "🟡", aka: "Lemon Juice" },
    { id: "orange-juice",   name: "橙汁",     cat: "果汁与饮料", emoji: "🍊", aka: "Orange Juice" },
    { id: "pineapple-juice", name: "菠萝汁",  cat: "果汁与饮料", emoji: "🍍", aka: "Pineapple Juice" },
    { id: "cranberry-juice", name: "蔓越莓汁", cat: "果汁与饮料", emoji: "🍒", aka: "Cranberry Juice" },
    { id: "grapefruit-juice", name: "西柚汁", cat: "果汁与饮料", emoji: "🍊", aka: "Grapefruit Juice" },
    { id: "tomato-juice",   name: "番茄汁",   cat: "果汁与饮料", emoji: "🍅", aka: "Tomato Juice" },
    { id: "coconut-cream",  name: "椰浆",     cat: "果汁与饮料", emoji: "🥥", aka: "Coconut Cream" },
    { id: "tonic",      name: "汤力水",       cat: "果汁与饮料", emoji: "🫧", aka: "Tonic Water" },
    { id: "soda-water", name: "苏打水",       cat: "果汁与饮料", emoji: "💦", aka: "Soda Water" },
    { id: "cola",       name: "可乐",         cat: "果汁与饮料", emoji: "🥤", aka: "Cola" },
    { id: "sprite",     name: "雪碧 / 七喜",  cat: "果汁与饮料", emoji: "🥤", aka: "Sprite" },
    { id: "ginger-beer", name: "姜汁啤酒",    cat: "果汁与饮料", emoji: "🫚", aka: "Ginger Beer" },
    { id: "espresso",   name: "浓缩咖啡",     cat: "果汁与饮料", emoji: "☕", aka: "Espresso" },
    { id: "milk",       name: "牛奶",         cat: "果汁与饮料", emoji: "🥛", aka: "Milk" },
    { id: "cream",      name: "淡奶油",       cat: "果汁与饮料", emoji: "🍦", aka: "Cream" },

    // 糖浆与调味
    { id: "simple-syrup", name: "糖浆",       cat: "糖浆与调味", emoji: "🍯", aka: "Simple Syrup" },
    { id: "grenadine",  name: "红石榴糖浆",   cat: "糖浆与调味", emoji: "🔴", aka: "Grenadine" },
    { id: "orgeat",     name: "杏仁糖浆",     cat: "糖浆与调味", emoji: "🌰", aka: "Orgeat" },
    { id: "honey",      name: "蜂蜜",         cat: "糖浆与调味", emoji: "🐝", aka: "Honey" },
    { id: "agave",      name: "龙舌兰糖浆",   cat: "糖浆与调味", emoji: "🌵", aka: "Agave Syrup" },
    { id: "angostura",  name: "安格仕苦精",   cat: "糖浆与调味", emoji: "🧪", aka: "Angostura Bitters" },
    { id: "salt",       name: "盐",           cat: "糖浆与调味", emoji: "🧂", aka: "Salt" },
    { id: "sugar",      name: "白砂糖",       cat: "糖浆与调味", emoji: "🍬", aka: "Sugar" },
    { id: "pepper",     name: "黑胡椒",       cat: "糖浆与调味", emoji: "⚫", aka: "Pepper" },
    { id: "worcestershire", name: "伍斯特酱", cat: "糖浆与调味", emoji: "🧴", aka: "Worcestershire" },
    { id: "tabasco",    name: "塔巴斯科辣酱", cat: "糖浆与调味", emoji: "🌶️", aka: "Tabasco" },
    { id: "egg-white",  name: "蛋清",         cat: "糖浆与调味", emoji: "🥚", aka: "Egg White" },

    // 新鲜水果
    { id: "lime",       name: "青柠",         cat: "新鲜水果", emoji: "🍋‍🟩", aka: "Lime" },
    { id: "lemon",      name: "柠檬",         cat: "新鲜水果", emoji: "🍋", aka: "Lemon" },
    { id: "orange",     name: "橙子",         cat: "新鲜水果", emoji: "🍊", aka: "Orange" },
    { id: "grapefruit", name: "西柚",         cat: "新鲜水果", emoji: "🍊", aka: "Grapefruit" },
    { id: "strawberry", name: "草莓",         cat: "新鲜水果", emoji: "🍓", aka: "Strawberry" },
    { id: "pineapple",  name: "菠萝",         cat: "新鲜水果", emoji: "🍍", aka: "Pineapple" },
    { id: "cherry",     name: "樱桃",         cat: "新鲜水果", emoji: "🍒", aka: "Cherry" },
    { id: "lychee",     name: "荔枝",         cat: "新鲜水果", emoji: "🫒", aka: "Lychee" },
    { id: "grape",      name: "青提",         cat: "新鲜水果", emoji: "🍇", aka: "Green Grape" },
    { id: "yuzu",       name: "柚子 / 柚子汁", cat: "新鲜水果", emoji: "🍈", aka: "Yuzu" },
    { id: "longan",     name: "桂圆（龙眼）", cat: "新鲜水果", emoji: "🟤", aka: "Longan" },

    // 香草与装饰
    { id: "mint",       name: "薄荷",         cat: "香草与装饰", emoji: "🌿", aka: "Mint" },
    { id: "basil",      name: "罗勒",         cat: "香草与装饰", emoji: "🍃", aka: "Basil" },
    { id: "rosemary",   name: "迷迭香",       cat: "香草与装饰", emoji: "🌲", aka: "Rosemary" },
    { id: "cucumber",   name: "黄瓜",         cat: "香草与装饰", emoji: "🥒", aka: "Cucumber" },
    { id: "ginger",     name: "生姜",         cat: "香草与装饰", emoji: "🫚", aka: "Ginger" },
    { id: "olive",      name: "橄榄",         cat: "香草与装饰", emoji: "🫒", aka: "Olive" },
    { id: "celery",     name: "西芹",         cat: "香草与装饰", emoji: "🥬", aka: "Celery" },
    { id: "osmanthus",  name: "桂花",         cat: "香草与装饰", emoji: "🌼", aka: "Osmanthus" },
    { id: "matcha",     name: "抹茶粉",       cat: "香草与装饰", emoji: "🍵", aka: "Matcha" },
    { id: "coffee-bean", name: "咖啡豆",      cat: "香草与装饰", emoji: "🫘", aka: "Coffee Bean" },

    // 其他
    { id: "ice",        name: "冰块",         cat: "其他", emoji: "🧊", aka: "Ice", basic: true },
    { id: "nutmeg",     name: "肉豆蔻",       cat: "其他", emoji: "🥜", aka: "Nutmeg" }
  ],

  /* ---------- 示例配方 ---------- */
  recipes: [
    {
      id: "gin-tonic", name: "金汤力", en: "Gin & Tonic", type: "classic", emoji: "🍸", color: "#7ec8a9",
      glass: "高球杯", abv: "低", desc: "最容易上手的一杯，金酒的杜松子香配上汤力水的微苦，夏天随便调都好喝。",
      ingredients: [
        { id: "gin", amount: "45 ml" }, { id: "tonic", amount: "120 ml" },
        { id: "lime", amount: "1 角", optional: true }, { id: "ice", amount: "满杯" }
      ],
      steps: ["高球杯中加满冰块", "倒入金酒 45ml", "沿杯壁注入冰镇汤力水", "轻轻搅拌两下，挤入青柠角装饰"],
      video: "https://search.bilibili.com/all?keyword=金汤力 调酒", videoName: "B 站·金汤力教程"
    },
    {
      id: "dry-martini", name: "干马天尼", en: "Dry Martini", type: "classic", emoji: "🍸", color: "#d8d2c0",
      glass: "马天尼杯", abv: "高", desc: "鸡尾酒之王。只有两三种材料，比例就是全部。",
      ingredients: [
        { id: "gin", amount: "60 ml" }, { id: "dry-vermouth", amount: "10 ml" },
        { id: "olive", amount: "1 颗", optional: true }, { id: "lemon", amount: "1 片皮", optional: true }
      ],
      steps: ["冰杯备用", "搅拌杯中加冰，倒入金酒与干味美思", "搅拌 20~30 秒至充分降温", "滤入冰镇马天尼杯，放橄榄或柠檬皮"]
    },
    {
      id: "negroni", name: "尼格罗尼", en: "Negroni", type: "classic", emoji: "🍹", color: "#c0392b",
      glass: "古典杯", abv: "高", desc: "1:1:1，苦甜平衡，餐前喝最舒服。",
      ingredients: [
        { id: "gin", amount: "30 ml" }, { id: "campari", amount: "30 ml" },
        { id: "sweet-vermouth", amount: "30 ml" }, { id: "orange", amount: "1 片皮" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["古典杯中放入大冰块", "依次倒入金酒、金巴利、甜味美思", "搅拌 15 秒", "橙皮在杯口挤压出油后放入杯中"],
      video: "https://search.bilibili.com/all?keyword=尼格罗尼 调酒", videoName: "B 站·尼格罗尼教程"
    },
    {
      id: "mojito", name: "莫吉托", en: "Mojito", type: "classic", emoji: "🌿", color: "#8fd6a1",
      glass: "高球杯", abv: "低", desc: "薄荷 + 青柠 + 朗姆，最清爽的一杯，也是最受欢迎的入门款。",
      ingredients: [
        { id: "white-rum", amount: "45 ml" }, { id: "lime-juice", amount: "20 ml" },
        { id: "simple-syrup", amount: "15 ml" }, { id: "mint", amount: "8~10 片" },
        { id: "soda-water", amount: "补满" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["杯中放薄荷叶与糖浆，轻压出香（不要压碎）", "加入青柠汁与白朗姆", "加满碎冰，搅拌", "苏打水补满，插薄荷枝与青柠片"],
      video: "https://search.bilibili.com/all?keyword=莫吉托 调酒教程", videoName: "B 站·莫吉托教程"
    },
    {
      id: "cosmopolitan", name: "大都会", en: "Cosmopolitan", type: "classic", emoji: "🍸", color: "#e84393",
      glass: "马天尼杯", abv: "中", desc: "《欲望都市》带火的粉红经典，酸甜好入口。",
      ingredients: [
        { id: "vodka", amount: "40 ml" }, { id: "cointreau", amount: "20 ml" },
        { id: "cranberry-juice", amount: "30 ml" }, { id: "lime-juice", amount: "15 ml" }
      ],
      steps: ["雪克杯加满冰", "倒入全部材料", "摇晃 12 秒", "双重过滤入冰镇马天尼杯，橙皮装饰"]
    },
    {
      id: "whiskey-sour", name: "威士忌酸", en: "Whiskey Sour", type: "classic", emoji: "🥃", color: "#d9a441",
      glass: "古典杯", abv: "中", desc: "酸、甜、酒体三者平衡，加蛋清会更顺滑。",
      ingredients: [
        { id: "bourbon", amount: "45 ml" }, { id: "lemon-juice", amount: "25 ml" },
        { id: "simple-syrup", amount: "15 ml" }, { id: "egg-white", amount: "1 个", optional: true },
        { id: "angostura", amount: "2 dash", optional: true }, { id: "cherry", amount: "1 颗", optional: true }
      ],
      steps: ["所有材料入雪克杯，先干摇（无冰）15 秒", "加冰再摇 12 秒", "过滤入放冰块的古典杯", "滴几滴苦精，放樱桃装饰"]
    },
    {
      id: "old-fashioned", name: "古典", en: "Old Fashioned", type: "classic", emoji: "🥃", color: "#b5651d",
      glass: "古典杯", abv: "高", desc: "最古老的鸡尾酒之一，也是最能喝出威士忌本身味道的一杯。",
      ingredients: [
        { id: "bourbon", amount: "60 ml" }, { id: "simple-syrup", amount: "5 ml" },
        { id: "angostura", amount: "2 dash" }, { id: "orange", amount: "1 片皮" },
        { id: "ice", amount: "1 大块" }, { id: "cherry", amount: "1 颗", optional: true }
      ],
      steps: ["杯中放糖浆与苦精，加一点水搅匀", "放入大冰块", "倒入威士忌，搅拌 20 秒", "橙皮挤油后放入杯中"]
    },
    {
      id: "margarita", name: "玛格丽特", en: "Margarita", type: "classic", emoji: "🍸", color: "#a3d977",
      glass: "玛格丽特杯", abv: "中", desc: "龙舌兰的经典搭档，杯口一圈盐是灵魂。",
      ingredients: [
        { id: "tequila", amount: "50 ml" }, { id: "cointreau", amount: "20 ml" },
        { id: "lime-juice", amount: "25 ml" }, { id: "salt", amount: "杯口" }, { id: "lime", amount: "1 片", optional: true }
      ],
      steps: ["用青柠擦湿杯口，蘸一圈盐", "雪克杯加冰，倒入龙舌兰、君度、青柠汁", "摇 12 秒", "滤入杯中，青柠片装饰"]
    },
    {
      id: "daiquiri", name: "代基里", en: "Daiquiri", type: "classic", emoji: "🍸", color: "#e6e2d3",
      glass: "马天尼杯", abv: "中", desc: "海明威最爱的朗姆三件套，简单到极致。",
      ingredients: [
        { id: "white-rum", amount: "50 ml" }, { id: "lime-juice", amount: "25 ml" },
        { id: "simple-syrup", amount: "15 ml" }, { id: "ice", amount: "适量" }
      ],
      steps: ["所有材料入雪克杯加冰", "用力摇晃 12 秒", "双重过滤入冰镇马天尼杯"]
    },
    {
      id: "long-island", name: "长岛冰茶", en: "Long Island Iced Tea", type: "classic", emoji: "🍹", color: "#c98a3c",
      glass: "高球杯", abv: "超高", desc: "五种基酒混在一起，喝起来却像冰红茶——小心它。",
      ingredients: [
        { id: "vodka", amount: "15 ml" }, { id: "gin", amount: "15 ml" }, { id: "white-rum", amount: "15 ml" },
        { id: "tequila", amount: "15 ml" }, { id: "cointreau", amount: "15 ml" },
        { id: "lemon-juice", amount: "25 ml" }, { id: "simple-syrup", amount: "15 ml" },
        { id: "cola", amount: "补满" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["高球杯加满冰", "除可乐外所有材料倒入摇匀", "滤入杯中", "可乐补满，轻搅，柠檬片装饰"]
    },
    {
      id: "bloody-mary", name: "血腥玛丽", en: "Bloody Mary", type: "classic", emoji: "🍅", color: "#c0392b",
      glass: "高球杯", abv: "低", desc: "唯一算得上“咸口”的经典，宿醉早晨的救星。",
      ingredients: [
        { id: "vodka", amount: "45 ml" }, { id: "tomato-juice", amount: "90 ml" },
        { id: "lemon-juice", amount: "15 ml" }, { id: "worcestershire", amount: "2 dash", optional: true },
        { id: "tabasco", amount: "2 dash", optional: true }, { id: "salt", amount: "1 撮" },
        { id: "pepper", amount: "1 撮" }, { id: "celery", amount: "1 根", optional: true }
      ],
      steps: ["杯中加冰", "所有液体材料倒入摇匀（或直接倒杯搅拌）", "撒盐与黑胡椒", "插一根西芹当装饰"]
    },
    {
      id: "white-russian", name: "白色俄罗斯", en: "White Russian", type: "classic", emoji: "🥛", color: "#8d7b68",
      glass: "古典杯", abv: "中", desc: "伏特加 + 咖啡利口酒 + 奶油，像一杯成人的甜点。",
      ingredients: [
        { id: "vodka", amount: "50 ml" }, { id: "kahlua", amount: "20 ml" },
        { id: "cream", amount: "20 ml" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["古典杯加满冰", "倒入伏特加与咖啡利口酒", "沿勺背缓慢倒入淡奶油", "不要搅拌，让它自然分层"]
    },
    {
      id: "manhattan", name: "曼哈顿", en: "Manhattan", type: "classic", emoji: "🍒", color: "#8e3b2f",
      glass: "马天尼杯", abv: "高", desc: "威士忌版马天尼，甜味美思让它更柔和。",
      ingredients: [
        { id: "rye", amount: "50 ml" }, { id: "sweet-vermouth", amount: "20 ml" },
        { id: "angostura", amount: "2 dash" }, { id: "cherry", amount: "1 颗" }
      ],
      steps: ["搅拌杯加冰", "倒入全部材料搅拌 20 秒", "滤入冰镇马天尼杯", "放一颗酒渍樱桃"]
    },
    {
      id: "sidecar", name: "边车", en: "Sidecar", type: "classic", emoji: "🍋", color: "#e2b13c",
      glass: "马天尼杯", abv: "中", desc: "白兰地的酸甜代表作，优雅又有力量。",
      ingredients: [
        { id: "cognac", amount: "50 ml" }, { id: "cointreau", amount: "20 ml" },
        { id: "lemon-juice", amount: "20 ml" }, { id: "sugar", amount: "杯口", optional: true }
      ],
      steps: ["杯口做糖边（可选）", "雪克杯加冰倒入材料", "摇 12 秒", "过滤入杯，柠檬皮装饰"]
    },
    {
      id: "mai-tai", name: "迈泰", en: "Mai Tai", type: "classic", emoji: "🏝️", color: "#f39c12",
      glass: "高球杯", abv: "高", desc: "热带风情天花板，朗姆 + 杏仁 + 青柠。",
      ingredients: [
        { id: "white-rum", amount: "30 ml" }, { id: "dark-rum", amount: "30 ml" },
        { id: "cointreau", amount: "15 ml" }, { id: "orgeat", amount: "15 ml" },
        { id: "lime-juice", amount: "20 ml" }, { id: "ice", amount: "满杯" },
        { id: "mint", amount: "1 枝", optional: true }
      ],
      steps: ["雪克杯加冰，倒入除黑朗姆外的材料摇晃", "连冰倒入高球杯", "顶部漂浮黑朗姆做出层次", "插薄荷枝与菠萝片"]
    },
    {
      id: "tequila-sunrise", name: "龙舌兰日出", en: "Tequila Sunrise", type: "classic", emoji: "🌅", color: "#ff6b35",
      glass: "高球杯", abv: "低", desc: "红石榴糖浆沉底，像一杯日出。颜值最高之一。",
      ingredients: [
        { id: "tequila", amount: "45 ml" }, { id: "orange-juice", amount: "90 ml" },
        { id: "grenadine", amount: "15 ml" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["高球杯加冰", "倒入龙舌兰与橙汁搅匀", "沿杯壁缓慢倒入红石榴糖浆", "不要搅拌，让它沉在杯底"]
    },
    {
      id: "espresso-martini", name: "浓缩咖啡马天尼", en: "Espresso Martini", type: "classic", emoji: "☕", color: "#4b3621",
      glass: "马天尼杯", abv: "中", desc: "喝一口就醒的甜品酒，奶泡是它的标志。",
      ingredients: [
        { id: "vodka", amount: "40 ml" }, { id: "kahlua", amount: "20 ml" },
        { id: "espresso", amount: "30 ml" }, { id: "simple-syrup", amount: "10 ml" },
        { id: "coffee-bean", amount: "3 颗", optional: true }
      ],
      steps: ["现做浓缩咖啡，稍微放凉", "所有材料加冰用力摇 15 秒（决定奶泡）", "双重过滤入冰镇马天尼杯", "放三颗咖啡豆装饰"]
    },
    {
      id: "aperol-spritz", name: "阿佩罗气泡", en: "Aperol Spritz", type: "classic", emoji: "🧡", color: "#f07c3e",
      glass: "大肚酒杯", abv: "低", desc: "三分钟就能做好，聚餐、露营、看球都合适。",
      ingredients: [
        { id: "aperol", amount: "60 ml" }, { id: "sparkling", amount: "90 ml" },
        { id: "soda-water", amount: "30 ml" }, { id: "orange", amount: "1 片" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["大酒杯加满冰", "先倒气泡酒，再倒阿佩罗", "苏打水补一点", "轻搅，橙片装饰"]
    },
    {
      id: "moscow-mule", name: "莫斯科骡子", en: "Moscow Mule", type: "classic", emoji: "🫚", color: "#c9a227",
      glass: "铜杯", abv: "中", desc: "伏特加配姜汁啤酒，辣得爽口，一定要用铜杯冰镇。",
      ingredients: [
        { id: "vodka", amount: "45 ml" }, { id: "ginger-beer", amount: "120 ml" },
        { id: "lime-juice", amount: "15 ml" }, { id: "ice", amount: "满杯" }, { id: "lime", amount: "1 角", optional: true }
      ],
      steps: ["铜杯加满冰", "倒入伏特加与青柠汁", "姜汁啤酒补满", "轻搅，青柠角装饰"]
    },
    {
      id: "pina-colada", name: "椰林飘香", en: "Piña Colada", type: "classic", emoji: "🥥", color: "#f7e7b4",
      glass: "飓风杯", abv: "低", desc: "椰香 + 菠萝，冰沙口感，适合不爱酒精味的人。",
      ingredients: [
        { id: "white-rum", amount: "45 ml" }, { id: "coconut-cream", amount: "30 ml" },
        { id: "pineapple-juice", amount: "60 ml" }, { id: "ice", amount: "一杯" }, { id: "pineapple", amount: "1 片", optional: true }
      ],
      steps: ["所有材料（含冰）倒入搅拌机", "打到绵密无颗粒", "倒入飓风杯", "菠萝片装饰"]
    },
    {
      id: "dark-stormy", name: "黑暗风暴", en: "Dark 'n' Stormy", type: "classic", emoji: "⛈️", color: "#6b4c2f",
      glass: "高球杯", abv: "中", desc: "黑朗姆 + 姜汁啤酒的经典，做法几乎零失败。",
      ingredients: [
        { id: "dark-rum", amount: "60 ml" }, { id: "ginger-beer", amount: "100 ml" },
        { id: "lime-juice", amount: "15 ml" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["高球杯加满冰", "倒入姜汁啤酒与青柠汁", "沿勺背缓慢倒黑朗姆，做出分层", "青柠角装饰"]
    },
    {
      id: "gin-fizz", name: "金菲士", en: "Gin Fizz", type: "classic", emoji: "🫧", color: "#cfe8c9",
      glass: "高球杯", abv: "低", desc: "气泡感十足的酸甜金酒，早餐也能喝。",
      ingredients: [
        { id: "gin", amount: "45 ml" }, { id: "lemon-juice", amount: "25 ml" },
        { id: "simple-syrup", amount: "15 ml" }, { id: "soda-water", amount: "补满" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["除苏打水外材料加冰摇匀", "滤入放冰的高球杯", "苏打水补满", "快速搅一下，柠檬片装饰"]
    },
    {
      id: "tom-collins", name: "汤姆柯林斯", en: "Tom Collins", type: "classic", emoji: "🍋", color: "#e8d98a",
      glass: "高球杯", abv: "低", desc: "加了气泡的金菲士，更清爽、更好喝。",
      ingredients: [
        { id: "gin", amount: "45 ml" }, { id: "lemon-juice", amount: "30 ml" },
        { id: "simple-syrup", amount: "15 ml" }, { id: "soda-water", amount: "补满" },
        { id: "cherry", amount: "1 颗", optional: true }, { id: "ice", amount: "满杯" }
      ],
      steps: ["高球杯加冰", "倒入金酒、柠檬汁、糖浆搅拌", "苏打水补满", "樱桃与柠檬片装饰"]
    },
    {
      id: "paloma", name: "帕洛玛", en: "Paloma", type: "classic", emoji: "🍊", color: "#f2a1a1",
      glass: "高球杯", abv: "低", desc: "墨西哥国民鸡尾酒，西柚 + 龙舌兰，比玛格丽特更日常。",
      ingredients: [
        { id: "tequila", amount: "50 ml" }, { id: "grapefruit-juice", amount: "90 ml" },
        { id: "lime-juice", amount: "10 ml" }, { id: "soda-water", amount: "30 ml", optional: true },
        { id: "salt", amount: "1 撮" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["高球杯口抹盐（可选）", "加冰，倒入龙舌兰与西柚汁", "挤青柠汁，稍加苏打水", "轻搅，西柚片装饰"]
    },
    {
      id: "caipirinha", name: "卡琵利亚", en: "Caipirinha", type: "classic", emoji: "🇧🇷", color: "#9fd47a",
      glass: "古典杯", abv: "中", desc: "巴西国饮，把青柠切块捣一捣就好。",
      ingredients: [
        { id: "cachaca", amount: "60 ml" }, { id: "lime", amount: "1 个切块" },
        { id: "sugar", amount: "2 茶匙" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["青柠切块去白筋，与糖一起放入杯中", "轻轻捣压出汁", "加满碎冰，倒入卡莎萨", "搅拌至杯壁结霜"]
    },
    {
      id: "b52", name: "B-52 轰炸机", en: "B-52", type: "classic", emoji: "💥", color: "#5a3921",
      glass: "子弹杯", abv: "中", desc: "三层分明的shot，考验倒酒手速。",
      ingredients: [
        { id: "kahlua", amount: "1/3 杯" }, { id: "baileys", amount: "1/3 杯" }, { id: "cointreau", amount: "1/3 杯" }
      ],
      steps: ["子弹杯中先倒咖啡利口酒", "沿勺背缓慢倒百利甜", "最上层沿勺背倒君度", "三层分明，一口喝完"]
    },

    /* ---------- 用户创作的特调示例 ---------- */
    {
      id: "custom-lychee-rose", name: "荔枝玫瑰气泡", en: "Lychee Rose Fizz", type: "custom", emoji: "🌸", color: "#f7b6c8",
      glass: "高球杯", abv: "低", desc: "自创特调：荔枝的甜香配玫瑰利口酒，加气泡更轻盈，女生聚会必备。",
      ingredients: [
        { id: "gin", amount: "30 ml" }, { id: "st-germain", amount: "15 ml" },
        { id: "lychee", amount: "3 颗" }, { id: "lime-juice", amount: "10 ml" },
        { id: "soda-water", amount: "补满" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["杯中放两颗荔枝轻轻压一下", "加冰，倒入金酒、接骨木花利口酒、青柠汁", "苏打水补满，轻搅", "放一颗荔枝与薄荷尖装饰"],
      author: "官方示例", video: ""
    },
    {
      id: "custom-grape-tonic", name: "青提气泡特调", en: "Green Grape Tonic", type: "custom", emoji: "🍇", color: "#a8d98a",
      glass: "高球杯", abv: "低", desc: "自创特调：青提捣碎 + 汤力水，几乎无酒精感的夏日饮品。",
      ingredients: [
        { id: "gin", amount: "30 ml" }, { id: "grape", amount: "6 颗" },
        { id: "tonic", amount: "120 ml" }, { id: "lemon-juice", amount: "10 ml" },
        { id: "simple-syrup", amount: "10 ml" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["雪克杯中捣碎青提，加入金酒、柠檬汁、糖浆", "加冰摇匀", "滤入放冰的高球杯", "汤力水补满，青提装饰"],
      author: "官方示例"
    },
    {
      id: "custom-osmanthus-whisky", name: "桂花梅酒威士忌", en: "Osmanthus Whisky", type: "custom", emoji: "🌼", color: "#d9a441",
      glass: "古典杯", abv: "中", desc: "自创特调：中式风味，桂花香 + 威士忌的木质调，秋冬最适合。",
      ingredients: [
        { id: "bourbon", amount: "40 ml" }, { id: "honey", amount: "10 ml" },
        { id: "osmanthus", amount: "1 小勺" }, { id: "lemon-juice", amount: "10 ml" },
        { id: "angostura", amount: "1 dash", optional: true }, { id: "ice", amount: "1 大块" }
      ],
      steps: ["杯中放蜂蜜、桂花与柠檬汁搅匀", "加大冰块，倒入威士忌", "搅拌 15 秒", "表面撒干桂花"]
    },
    {
      id: "custom-matcha-colada", name: "抹茶椰香朗姆", en: "Matcha Colada", type: "custom", emoji: "🍵", color: "#8fbf9f",
      glass: "古典杯", abv: "中", desc: "自创特调：抹茶的微苦压住椰浆的甜，奶盖质感。",
      ingredients: [
        { id: "white-rum", amount: "40 ml" }, { id: "matcha", amount: "1 茶匙" },
        { id: "coconut-cream", amount: "30 ml" }, { id: "milk", amount: "40 ml" },
        { id: "honey", amount: "10 ml" }, { id: "ice", amount: "适量" }
      ],
      steps: ["抹茶粉先用少量温水调开", "所有材料入雪克杯加冰大力摇 15 秒", "过滤入放冰的古典杯", "筛一点抹茶粉做装饰"]
    },
    {
      id: "custom-baijiu-lemon", name: "白酒柠檬高球", en: "Baijiu Lemon Highball", type: "custom", emoji: "🏮", color: "#f0c987",
      glass: "高球杯", abv: "中", desc: "自创特调：用清香型白酒做高球，柠檬与气泡让白酒变得好入口。",
      ingredients: [
        { id: "baijiu", amount: "30 ml" }, { id: "lemon-juice", amount: "15 ml" },
        { id: "honey", amount: "10 ml" }, { id: "soda-water", amount: "120 ml" },
        { id: "ice", amount: "满杯" }, { id: "basil", amount: "2 片", optional: true }
      ],
      steps: ["杯中加满冰", "倒入白酒、柠檬汁、蜂蜜水搅匀", "苏打水补满", "拍一片罗勒放入杯中"]
    }
  ],

  /* ---------- 默认账号与站点设置 ---------- */
  users: [
    { id: "u-admin", username: "admin", password: "admin123", role: "admin", createdAt: "2026-01-01" },
    { id: "u-demo", username: "demo", password: "123456", role: "user", createdAt: "2026-01-01" }
  ],

  settings: {
    siteName: "今晚喝什么",
    slogan: "看看冰箱里有什么，再决定今晚喝什么",
    allowUserPublish: true,   // 允许普通用户发布配方
    needReview: false,        // 用户发布的配方是否需要管理员审核后才公开
    allowUserVideo: true      // 允许用户给配方补充视频链接
  }
};
