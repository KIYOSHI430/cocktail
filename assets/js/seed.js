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
    { id: "golden-rum", name: "金朗姆酒",     cat: "基酒", emoji: "🥇", aka: "Golden Rum" },
    { id: "aged-rum",   name: "陈年朗姆酒",   cat: "基酒", emoji: "🛢️", aka: "Aged Rum" },
    { id: "overproof-rum", name: "高度朗姆 151", cat: "基酒", emoji: "🔥", aka: "Overproof Rum" },
    { id: "pisco",      name: "皮斯科",       cat: "基酒", emoji: "🍇", aka: "Pisco" },
    { id: "armagnac",   name: "雅文邑",       cat: "基酒", emoji: "🍇", aka: "Armagnac" },
    { id: "canadian-whisky", name: "加拿大威士忌", cat: "基酒", emoji: "🍁", aka: "Canadian Whisky" },
    { id: "japanese-whisky", name: "日本威士忌",   cat: "基酒", emoji: "🗾", aka: "Japanese Whisky" },
    { id: "irish-whiskey",   name: "爱尔兰威士忌", cat: "基酒", emoji: "🍀", aka: "Irish Whiskey" },
    { id: "sherry",     name: "雪莉酒",       cat: "基酒", emoji: "🍷", aka: "Sherry" },
    { id: "port",       name: "波特酒",       cat: "基酒", emoji: "🍷", aka: "Port" },
    { id: "red-wine",   name: "红葡萄酒",     cat: "基酒", emoji: "🍷", aka: "Red Wine" },
    { id: "white-wine", name: "白葡萄酒",     cat: "基酒", emoji: "🥂", aka: "White Wine" },
    { id: "plum-wine",  name: "梅酒",         cat: "基酒", emoji: "🫐", aka: "Umeshu" },
    { id: "rice-wine",  name: "黄酒 / 米酒",  cat: "基酒", emoji: "🍚", aka: "Rice Wine" },

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
    { id: "grand-marnier", name: "柑曼怡",    cat: "利口酒", emoji: "🍊", aka: "Grand Marnier" },
    { id: "maraschino", name: "黑樱桃利口酒", cat: "利口酒", emoji: "🍒", aka: "Maraschino" },
    { id: "chambord",   name: "香波黑莓利口酒", cat: "利口酒", emoji: "🫐", aka: "Chambord" },
    { id: "chartreuse", name: "荨麻酒（绿）", cat: "利口酒", emoji: "🌿", aka: "Chartreuse" },
    { id: "benedictine", name: "廊酒",        cat: "利口酒", emoji: "🏛️", aka: "Bénédictine" },
    { id: "drambuie",   name: "杜林标",       cat: "利口酒", emoji: "🥃", aka: "Drambuie" },
    { id: "frangelico", name: "榛子利口酒",   cat: "利口酒", emoji: "🌰", aka: "Frangelico" },
    { id: "banana-liqueur", name: "香蕉利口酒", cat: "利口酒", emoji: "🍌", aka: "Crème de Banane" },
    { id: "vanilla-liqueur", name: "香草利口酒", cat: "利口酒", emoji: "🍦", aka: "Vanilla Liqueur" },
    { id: "galliano",   name: "加利安奴",     cat: "利口酒", emoji: "🍮", aka: "Galliano" },
    { id: "creme-de-menthe", name: "薄荷利口酒", cat: "利口酒", emoji: "🌱", aka: "Crème de Menthe" },
    { id: "creme-de-cacao-dark", name: "深色可可利口酒", cat: "利口酒", emoji: "🍫", aka: "Dark Crème de Cacao" },
    { id: "creme-de-violette", name: "紫罗兰利口酒", cat: "利口酒", emoji: "💜", aka: "Crème de Violette" },
    { id: "pimms",      name: "皮姆酒",       cat: "利口酒", emoji: "🍓", aka: "Pimm's" },
    { id: "limoncello", name: "柠檬切罗",     cat: "利口酒", emoji: "🍋", aka: "Limoncello" },
    { id: "lillet",     name: "利莱白",       cat: "利口酒", emoji: "🍾", aka: "Lillet Blanc" },
    { id: "amaro",      name: "阿玛罗苦酒",   cat: "利口酒", emoji: "🥀", aka: "Amaro" },

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
    { id: "condensed-milk", name: "炼乳",     cat: "果汁与饮料", emoji: "🥛", aka: "Condensed Milk" },
    { id: "coconut-water",  name: "椰子水",   cat: "果汁与饮料", emoji: "🥥", aka: "Coconut Water" },
    { id: "passionfruit-juice", name: "百香果汁", cat: "果汁与饮料", emoji: "🟠", aka: "Passion Fruit Juice" },
    { id: "mango-juice",   name: "芒果汁",    cat: "果汁与饮料", emoji: "🥭", aka: "Mango Juice" },
    { id: "watermelon-juice", name: "西瓜汁", cat: "果汁与饮料", emoji: "🍉", aka: "Watermelon Juice" },
    { id: "apple-juice",   name: "苹果汁",    cat: "果汁与饮料", emoji: "🍎", aka: "Apple Juice" },
    { id: "grape-juice",   name: "葡萄汁",    cat: "果汁与饮料", emoji: "🍇", aka: "Grape Juice" },
    { id: "peach-juice",   name: "桃子汁",    cat: "果汁与饮料", emoji: "🍑", aka: "Peach Juice" },
    { id: "ginger-ale",    name: "干姜水",    cat: "果汁与饮料", emoji: "🫚", aka: "Ginger Ale" },
    { id: "bitter-lemon",  name: "苦柠水",    cat: "果汁与饮料", emoji: "🍋", aka: "Bitter Lemon" },
    { id: "sparkling-water", name: "气泡水",  cat: "果汁与饮料", emoji: "🫧", aka: "Sparkling Water" },
    { id: "beer",          name: "啤酒",      cat: "果汁与饮料", emoji: "🍺", aka: "Beer" },

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
    { id: "egg-yolk",   name: "蛋黄",         cat: "糖浆与调味", emoji: "🍳", aka: "Egg Yolk" },
    { id: "vanilla-syrup",  name: "香草糖浆", cat: "糖浆与调味", emoji: "🍦", aka: "Vanilla Syrup" },
    { id: "ginger-syrup",   name: "姜糖浆",   cat: "糖浆与调味", emoji: "🫚", aka: "Ginger Syrup" },
    { id: "cinnamon-syrup", name: "肉桂糖浆", cat: "糖浆与调味", emoji: "🪵", aka: "Cinnamon Syrup" },
    { id: "caramel-syrup",  name: "焦糖糖浆", cat: "糖浆与调味", emoji: "🍯", aka: "Caramel Syrup" },
    { id: "rose-syrup",     name: "玫瑰糖浆", cat: "糖浆与调味", emoji: "🌹", aka: "Rose Syrup" },
    { id: "elderflower-syrup", name: "接骨木花糖浆", cat: "糖浆与调味", emoji: "🌸", aka: "Elderflower Syrup" },
    { id: "passionfruit-syrup", name: "百香果糖浆", cat: "糖浆与调味", emoji: "🟠", aka: "Passion Fruit Syrup" },
    { id: "lychee-syrup",   name: "荔枝糖浆", cat: "糖浆与调味", emoji: "🫒", aka: "Lychee Syrup" },
    { id: "coconut-syrup",  name: "椰子糖浆", cat: "糖浆与调味", emoji: "🥥", aka: "Coconut Syrup" },
    { id: "raspberry-syrup", name: "覆盆子糖浆", cat: "糖浆与调味", emoji: "🫐", aka: "Raspberry Syrup" },
    { id: "orange-bitters", name: "橙味苦精", cat: "糖浆与调味", emoji: "🍊", aka: "Orange Bitters" },
    { id: "celery-bitters", name: "芹菜苦精", cat: "糖浆与调味", emoji: "🥬", aka: "Celery Bitters" },
    { id: "cinnamon-powder", name: "肉桂粉",  cat: "糖浆与调味", emoji: "🪵", aka: "Cinnamon" },
    { id: "cocoa-powder",   name: "可可粉",   cat: "糖浆与调味", emoji: "🍫", aka: "Cocoa Powder" },
    { id: "vanilla-extract", name: "香草精",  cat: "糖浆与调味", emoji: "🌼", aka: "Vanilla Extract" },
    { id: "clove",      name: "丁香",         cat: "糖浆与调味", emoji: "🟤", aka: "Clove" },
    { id: "chili",      name: "辣椒",         cat: "糖浆与调味", emoji: "🌶️", aka: "Chili" },

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
    { id: "passionfruit", name: "百香果",     cat: "新鲜水果", emoji: "🟠", aka: "Passion Fruit" },
    { id: "mango",      name: "芒果",         cat: "新鲜水果", emoji: "🥭", aka: "Mango" },
    { id: "watermelon", name: "西瓜",         cat: "新鲜水果", emoji: "🍉", aka: "Watermelon" },
    { id: "apple",      name: "苹果",         cat: "新鲜水果", emoji: "🍎", aka: "Apple" },
    { id: "peach-fruit", name: "桃子",        cat: "新鲜水果", emoji: "🍑", aka: "Peach" },
    { id: "pear",       name: "梨",           cat: "新鲜水果", emoji: "🍐", aka: "Pear" },
    { id: "blueberry",  name: "蓝莓",         cat: "新鲜水果", emoji: "🫐", aka: "Blueberry" },
    { id: "raspberry",  name: "覆盆子",       cat: "新鲜水果", emoji: "🍓", aka: "Raspberry" },
    { id: "blackberry", name: "黑莓",         cat: "新鲜水果", emoji: "🫐", aka: "Blackberry" },
    { id: "fig",        name: "无花果",       cat: "新鲜水果", emoji: "🍈", aka: "Fig" },
    { id: "guava",      name: "番石榴",       cat: "新鲜水果", emoji: "🍐", aka: "Guava" },
    { id: "kiwi",       name: "猕猴桃",       cat: "新鲜水果", emoji: "🥝", aka: "Kiwi" },
    { id: "hawthorn",   name: "山楂",         cat: "新鲜水果", emoji: "🔴", aka: "Hawthorn" },
    { id: "goji",       name: "枸杞",         cat: "新鲜水果", emoji: "🔴", aka: "Goji Berry" },
    { id: "plum",       name: "青梅 / 话梅",  cat: "新鲜水果", emoji: "🟢", aka: "Green Plum" },

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
    { id: "lemon-grass", name: "柠檬草",      cat: "香草与装饰", emoji: "🌾", aka: "Lemongrass" },
    { id: "shiso",      name: "紫苏叶",       cat: "香草与装饰", emoji: "🍃", aka: "Shiso" },
    { id: "thyme",      name: "百里香",       cat: "香草与装饰", emoji: "🌿", aka: "Thyme" },
    { id: "sage",       name: "鼠尾草",       cat: "香草与装饰", emoji: "🌿", aka: "Sage" },
    { id: "cilantro",   name: "香菜",         cat: "香草与装饰", emoji: "🌿", aka: "Cilantro" },
    { id: "star-anise", name: "八角",         cat: "香草与装饰", emoji: "⭐", aka: "Star Anise" },
    { id: "cinnamon-stick", name: "肉桂棒",   cat: "香草与装饰", emoji: "🪵", aka: "Cinnamon Stick" },
    { id: "edible-flower", name: "食用花瓣",  cat: "香草与装饰", emoji: "🌺", aka: "Edible Flower" },

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

    /* ---------- 更多经典鸡尾酒（扩展库） ---------- */
    {
      id: "whisky-highball", name: "威士忌高球", en: "Whisky Highball", type: "classic", emoji: "🥃", color: "#d9b26a",
      glass: "高球杯", abv: "低", desc: "日本居酒屋的招牌喝法，气泡把威士忌的香气拉得又长又清爽。",
      ingredients: [
        { id: "bourbon", amount: "45 ml" }, { id: "soda-water", amount: "135 ml" },
        { id: "lemon", amount: "1 片皮", optional: true }, { id: "ice", amount: "满杯" }
      ],
      steps: ["高球杯加满冰，搅拌冰杯后倒掉融水", "倒入威士忌", "沿吧勺缓慢注入冰镇苏打水", "只搅一下，保留气泡"]
    },
    {
      id: "mint-julep", name: "薄荷朱莉普", en: "Mint Julep", type: "classic", emoji: "🌿", color: "#9ed4a5",
      glass: "银杯", abv: "高", desc: "肯塔基赛马会的官方饮品，碎冰 + 薄荷 + 波本。",
      ingredients: [
        { id: "bourbon", amount: "60 ml" }, { id: "mint", amount: "8 片" },
        { id: "sugar", amount: "2 茶匙" }, { id: "ice", amount: "碎冰满杯" }
      ],
      steps: ["杯中放薄荷与糖，轻压出香", "加碎冰至半杯，倒入一半威士忌搅拌", "再加碎冰与剩下的威士忌", "插一大束薄荷，做成小花园"]
    },
    {
      id: "sazerac", name: "萨泽拉克", en: "Sazerac", type: "classic", emoji: "🥃", color: "#b8763f",
      glass: "古典杯", abv: "高", desc: "新奥尔良的招牌，苦艾酒只是洗杯，香气却全在。",
      ingredients: [
        { id: "rye", amount: "50 ml" }, { id: "sugar", amount: "1 块" },
        { id: "angostura", amount: "3 dash" }, { id: "absinthe", amount: "洗杯用" }, { id: "lemon", amount: "1 片皮" }
      ],
      steps: ["冰镇古典杯，倒入苦艾酒转一圈后倒掉", "搅拌杯中加冰、糖、苦精与威士忌", "搅拌 20 秒后滤入冰杯", "挤柠檬皮油，丢弃柠檬皮"]
    },
    {
      id: "americano", name: "美国佬", en: "Americano", type: "classic", emoji: "❤️", color: "#d3553d",
      glass: "古典杯", abv: "低", desc: "尼格罗尼的前身，没有金酒，更清爽易饮。",
      ingredients: [
        { id: "campari", amount: "30 ml" }, { id: "sweet-vermouth", amount: "30 ml" },
        { id: "soda-water", amount: "补满" }, { id: "orange", amount: "1 片" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["古典杯加冰", "倒入金巴利与甜味美思", "苏打水补满", "橙片装饰，轻搅"]
    },
    {
      id: "boulevardier", name: "花花公子", en: "Boulevardier", type: "classic", emoji: "🧡", color: "#c1613a",
      glass: "古典杯", abv: "高", desc: "把尼格罗尼的金酒换成波本，更暖更甜。",
      ingredients: [
        { id: "bourbon", amount: "45 ml" }, { id: "campari", amount: "30 ml" },
        { id: "sweet-vermouth", amount: "30 ml" }, { id: "orange", amount: "1 片皮" }, { id: "ice", amount: "1 大块" }
      ],
      steps: ["搅拌杯加冰", "倒入三种酒搅拌 20 秒", "滤入放大冰块的古典杯", "橙皮挤油装饰"]
    },
    {
      id: "gimlet", name: "吉姆雷特", en: "Gimlet", type: "classic", emoji: "🍸", color: "#cfe0a0",
      glass: "马天尼杯", abv: "中", desc: "金酒 + 青柠的极简组合，海军军医的配方。",
      ingredients: [
        { id: "gin", amount: "60 ml" }, { id: "lime-juice", amount: "20 ml" },
        { id: "simple-syrup", amount: "20 ml" }, { id: "ice", amount: "适量" }
      ],
      steps: ["所有材料加冰入雪克杯", "摇 12 秒", "双重过滤入冰镇马天尼杯", "青柠角装饰"]
    },
    {
      id: "bees-knees", name: "蜂之膝", en: "Bee's Knees", type: "classic", emoji: "🐝", color: "#ecc94b",
      glass: "马天尼杯", abv: "中", desc: "禁酒令时期的经典：蜂蜜代替糖，柔化了金酒的锐利。",
      ingredients: [
        { id: "gin", amount: "50 ml" }, { id: "lemon-juice", amount: "25 ml" },
        { id: "honey", amount: "20 ml" }, { id: "ice", amount: "适量" }
      ],
      steps: ["蜂蜜先用等量温水化开", "所有材料加冰摇匀", "滤入冰镇马天尼杯", "可撒一点柠檬皮屑"]
    },
    {
      id: "french-75", name: "法兰西 75", en: "French 75", type: "classic", emoji: "🍾", color: "#e8d98a",
      glass: "笛形香槟杯", abv: "中", desc: "据说威力像 75 毫米野战炮，入口却像气泡柠檬水。",
      ingredients: [
        { id: "gin", amount: "30 ml" }, { id: "lemon-juice", amount: "15 ml" },
        { id: "simple-syrup", amount: "15 ml" }, { id: "sparkling", amount: "60 ml" },
        { id: "lemon", amount: "1 片皮", optional: true }, { id: "ice", amount: "适量" }
      ],
      steps: ["金酒、柠檬汁、糖浆加冰摇匀", "滤入冰镇香槟杯", "缓慢补入冰镇气泡酒", "柠檬皮装饰"]
    },
    {
      id: "white-lady", name: "白色佳人", en: "White Lady", type: "classic", emoji: "🤍", color: "#efe6d2",
      glass: "马天尼杯", abv: "中", desc: "边车的金酒版，加蛋清后像丝绸一样顺滑。",
      ingredients: [
        { id: "gin", amount: "40 ml" }, { id: "cointreau", amount: "30 ml" },
        { id: "lemon-juice", amount: "20 ml" }, { id: "egg-white", amount: "1 个", optional: true }
      ],
      steps: ["所有材料入雪克杯先干摇", "加冰再摇 12 秒", "双重过滤入冰镇马天尼杯", "柠檬皮装饰"]
    },
    {
      id: "aviation", name: "飞行", en: "Aviation", type: "classic", emoji: "💜", color: "#b39ddb",
      glass: "马天尼杯", abv: "中", desc: "紫罗兰利口酒带来的淡紫色，像黄昏的天空。",
      ingredients: [
        { id: "gin", amount: "45 ml" }, { id: "maraschino", amount: "15 ml" },
        { id: "creme-de-violette", amount: "5 ml" }, { id: "lemon-juice", amount: "15 ml" }
      ],
      steps: ["所有材料加冰摇匀", "滤入冰镇马天尼杯", "放一颗酒渍樱桃"]
    },
    {
      id: "last-word", name: "临别一语", en: "Last Word", type: "classic", emoji: "🗝️", color: "#a3c98a",
      glass: "马天尼杯", abv: "高", desc: "四等份的经典，酸甜草本平衡得刚刚好。",
      ingredients: [
        { id: "gin", amount: "20 ml" }, { id: "chartreuse", amount: "20 ml" },
        { id: "maraschino", amount: "20 ml" }, { id: "lime-juice", amount: "20 ml" }
      ],
      steps: ["四样材料各 20ml 入雪克杯加冰", "摇 12 秒", "滤入冰镇马天尼杯", "青柠皮装饰"]
    },
    {
      id: "clover-club", name: "三叶草俱乐部", en: "Clover Club", type: "classic", emoji: "🍓", color: "#e79ab0",
      glass: "马天尼杯", abv: "中", desc: "覆盆子带来的粉红色，蛋清带来天鹅绒般的泡沫。",
      ingredients: [
        { id: "gin", amount: "45 ml" }, { id: "lemon-juice", amount: "20 ml" },
        { id: "raspberry-syrup", amount: "20 ml" }, { id: "egg-white", amount: "1 个" }
      ],
      steps: ["所有材料入雪克杯干摇 15 秒", "加冰再摇 12 秒", "双重过滤入冰镇马天尼杯", "放三颗覆盆子"]
    },
    {
      id: "bramble", name: "荆棘", en: "Bramble", type: "classic", emoji: "🫐", color: "#8e7cc3",
      glass: "古典杯", abv: "中", desc: "伦敦调酒师的 80 年代作品，黑莓糖浆顺着碎冰往下坠。",
      ingredients: [
        { id: "gin", amount: "50 ml" }, { id: "lemon-juice", amount: "25 ml" },
        { id: "simple-syrup", amount: "12 ml" }, { id: "blackberry", amount: "6 颗" }, { id: "ice", amount: "碎冰" }
      ],
      steps: ["前三种材料加冰摇匀，滤入碎冰杯", "黑莓压成泥（或用黑莓糖浆）", "缓慢淋在表面形成沉降效果", "黑莓与柠檬片装饰"]
    },
    {
      id: "penicillin", name: "盘尼西林", en: "Penicillin", type: "classic", emoji: "🫚", color: "#d8a24a",
      glass: "古典杯", abv: "中", desc: "当代经典，姜与蜂蜜的组合喝一口就暖。",
      ingredients: [
        { id: "scotch", amount: "60 ml" }, { id: "lemon-juice", amount: "20 ml" },
        { id: "honey", amount: "20 ml" }, { id: "ginger", amount: "3 片" }, { id: "ice", amount: "1 大块" }
      ],
      steps: ["姜切片与蜂蜜捣出味", "加入威士忌与柠檬汁，加冰摇匀", "双重过滤入放大冰块的古典杯", "姜片装饰"]
    },
    {
      id: "pisco-sour", name: "皮斯科酸", en: "Pisco Sour", type: "classic", emoji: "🥚", color: "#e9e0c0",
      glass: "古典杯", abv: "中", desc: "秘鲁国饮，蛋清泡沫上滴几滴苦精是它的签名。",
      ingredients: [
        { id: "pisco", amount: "50 ml" }, { id: "lemon-juice", amount: "25 ml" },
        { id: "simple-syrup", amount: "20 ml" }, { id: "egg-white", amount: "1 个" },
        { id: "angostura", amount: "3 dash" }, { id: "ice", amount: "适量" }
      ],
      steps: ["材料入雪克杯干摇 15 秒", "加冰再摇 12 秒", "滤入杯中", "在泡沫上滴苦精画几笔"]
    },
    {
      id: "amaretto-sour", name: "杏仁酸", en: "Amaretto Sour", type: "classic", emoji: "🌰", color: "#c99a5b",
      glass: "古典杯", abv: "低", desc: "杏仁甜香 + 柠檬酸，最适合不常喝酒的人。",
      ingredients: [
        { id: "amaretto", amount: "45 ml" }, { id: "bourbon", amount: "15 ml" },
        { id: "lemon-juice", amount: "25 ml" }, { id: "egg-white", amount: "1 个", optional: true },
        { id: "cherry", amount: "1 颗", optional: true }, { id: "ice", amount: "满杯" }
      ],
      steps: ["材料加冰摇匀（有蛋清先干摇）", "滤入放冰的古典杯", "樱桃装饰"]
    },
    {
      id: "gold-rush", name: "淘金热", en: "Gold Rush", type: "classic", emoji: "🥇", color: "#e0b64a",
      glass: "古典杯", abv: "中", desc: "只有三样材料，却是波本蜂蜜的黄金比例。",
      ingredients: [
        { id: "bourbon", amount: "50 ml" }, { id: "honey", amount: "20 ml" },
        { id: "lemon-juice", amount: "20 ml" }, { id: "ice", amount: "适量" }
      ],
      steps: ["蜂蜜用温水调开", "全部加冰摇 12 秒", "滤入放冰的古典杯"]
    },
    {
      id: "corpse-reviver", name: "还魂尸 2 号", en: "Corpse Reviver #2", type: "classic", emoji: "👻", color: "#dfe6c0",
      glass: "马天尼杯", abv: "高", desc: "名字吓人，喝起来却像带草本香的柠檬水。",
      ingredients: [
        { id: "gin", amount: "25 ml" }, { id: "cointreau", amount: "25 ml" },
        { id: "lillet", amount: "25 ml" }, { id: "lemon-juice", amount: "25 ml" },
        { id: "absinthe", amount: "1 dash" }
      ],
      steps: ["等比例混合四种材料，加一滴苦艾酒", "加冰摇 12 秒", "滤入冰镇马天尼杯", "橙皮装饰"]
    },
    {
      id: "martinez", name: "马丁内斯", en: "Martinez", type: "classic", emoji: "🍒", color: "#c98a5b",
      glass: "马天尼杯", abv: "中", desc: "马天尼的前身，比它甜、比它柔。",
      ingredients: [
        { id: "gin", amount: "45 ml" }, { id: "sweet-vermouth", amount: "20 ml" },
        { id: "maraschino", amount: "5 ml" }, { id: "angostura", amount: "2 dash" },
        { id: "lemon", amount: "1 片皮" }, { id: "ice", amount: "适量" }
      ],
      steps: ["搅拌杯加冰", "倒入全部材料搅拌 20 秒", "滤入冰镇马天尼杯", "柠檬皮装饰"]
    },
    {
      id: "hanky-panky", name: "手帕游戏", en: "Hanky Panky", type: "classic", emoji: "🎩", color: "#9b5b4a",
      glass: "马天尼杯", abv: "高", desc: "甜味美思 + 一点苦酒，是懂酒人的隐藏菜单。",
      ingredients: [
        { id: "gin", amount: "45 ml" }, { id: "sweet-vermouth", amount: "45 ml" },
        { id: "amaro", amount: "1 dash" }, { id: "orange", amount: "1 片皮" }
      ],
      steps: ["材料加冰搅拌 20 秒", "滤入冰镇马天尼杯", "橙皮挤油装饰"]
    },
    {
      id: "toronto", name: "多伦多", en: "Toronto", type: "classic", emoji: "🍁", color: "#a4523f",
      glass: "古典杯", abv: "高", desc: "黑麦威士忌与苦酒的组合，适合冬天的夜晚。",
      ingredients: [
        { id: "rye", amount: "50 ml" }, { id: "amaro", amount: "10 ml" },
        { id: "angostura", amount: "2 dash" }, { id: "orange", amount: "1 片皮" }, { id: "ice", amount: "1 大块" }
      ],
      steps: ["材料加冰搅拌 20 秒", "滤入放大冰块的古典杯", "橙皮挤油装饰"]
    },
    {
      id: "singapore-sling", name: "新加坡司令", en: "Singapore Sling", type: "classic", emoji: "🍹", color: "#e4637a",
      glass: "高球杯", abv: "中", desc: "莱佛士酒店的招牌，材料虽多但层次华丽。",
      ingredients: [
        { id: "gin", amount: "30 ml" }, { id: "maraschino", amount: "15 ml" }, { id: "cointreau", amount: "7 ml" },
        { id: "benedictine", amount: "7 ml" }, { id: "pineapple-juice", amount: "120 ml" }, { id: "lime-juice", amount: "15 ml" },
        { id: "grenadine", amount: "10 ml" }, { id: "angostura", amount: "1 dash" }, { id: "cherry", amount: "1 颗" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["所有材料加冰摇匀", "滤入加冰的高球杯", "补一点苏打水（可选）", "樱桃与菠萝片装饰"],
      video: "https://search.bilibili.com/all?keyword=新加坡司令 调酒", videoName: "B 站·新加坡司令教程"
    },
    {
      id: "jungle-bird", name: "丛林鸟", en: "Jungle Bird", type: "classic", emoji: "🐦", color: "#c0442f",
      glass: "古典杯", abv: "中", desc: "黑朗姆配金巴利与菠萝，苦甜热带的代表作。",
      ingredients: [
        { id: "dark-rum", amount: "45 ml" }, { id: "campari", amount: "22 ml" },
        { id: "pineapple-juice", amount: "45 ml" }, { id: "lime-juice", amount: "15 ml" },
        { id: "simple-syrup", amount: "15 ml" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["所有材料加冰摇匀", "滤入放冰的古典杯", "菠萝片装饰"]
    },
    {
      id: "zombie", name: "僵尸", en: "Zombie", type: "classic", emoji: "🧟", color: "#e06b3c",
      glass: "飓风杯", abv: "超高", desc: "三种朗姆叠加，喝起来却完全不像烈酒——所以叫僵尸。",
      ingredients: [
        { id: "white-rum", amount: "30 ml" }, { id: "dark-rum", amount: "30 ml" }, { id: "overproof-rum", amount: "15 ml" },
        { id: "lime-juice", amount: "20 ml" }, { id: "grapefruit-juice", amount: "20 ml" }, { id: "passionfruit-juice", amount: "15 ml" },
        { id: "grenadine", amount: "10 ml" }, { id: "cinnamon-syrup", amount: "5 ml" }, { id: "mint", amount: "1 枝", optional: true }, { id: "ice", amount: "满杯" }
      ],
      steps: ["所有材料加冰大力摇匀", "连冰倒入飓风杯", "表面淋一点朗姆", "薄荷枝装饰"]
    },
    {
      id: "hurricane", name: "飓风", en: "Hurricane", type: "classic", emoji: "🌀", color: "#e8873c",
      glass: "飓风杯", abv: "中", desc: "新奥尔良的经典，百香果与朗姆的热带风暴。",
      ingredients: [
        { id: "white-rum", amount: "30 ml" }, { id: "dark-rum", amount: "30 ml" },
        { id: "passionfruit-juice", amount: "60 ml" }, { id: "orange-juice", amount: "30 ml" },
        { id: "lime-juice", amount: "15 ml" }, { id: "grenadine", amount: "10 ml" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["所有材料加冰摇匀", "连冰倒入飓风杯", "橙片与樱桃装饰"]
    },
    {
      id: "painkiller", name: "止痛药", en: "Painkiller", type: "classic", emoji: "🥥", color: "#f0d79a",
      glass: "飓风杯", abv: "中", desc: "英属维尔京群岛的度假标配，椰香浓郁。",
      ingredients: [
        { id: "dark-rum", amount: "60 ml" }, { id: "pineapple-juice", amount: "120 ml" },
        { id: "orange-juice", amount: "30 ml" }, { id: "coconut-cream", amount: "30 ml" },
        { id: "nutmeg", amount: "少许", optional: true }, { id: "ice", amount: "满杯" }
      ],
      steps: ["所有材料加冰摇匀", "倒入放冰的杯子", "表面刨一点肉豆蔻"]
    },
    {
      id: "blue-hawaii", name: "蓝色夏威夷", en: "Blue Hawaii", type: "classic", emoji: "🏝️", color: "#4fc3f7",
      glass: "高球杯", abv: "低", desc: "1957 年诞生于夏威夷，蓝橙让整杯像海水。",
      ingredients: [
        { id: "white-rum", amount: "30 ml" }, { id: "blue-curacao", amount: "30 ml" },
        { id: "pineapple-juice", amount: "60 ml" }, { id: "coconut-cream", amount: "30 ml" },
        { id: "cherry", amount: "1 颗", optional: true }, { id: "ice", amount: "满杯" }
      ],
      steps: ["所有材料加冰摇匀", "滤入加冰的高球杯", "樱桃与菠萝片装饰"]
    },
    {
      id: "cuba-libre", name: "自由古巴", en: "Cuba Libre", type: "classic", emoji: "🥤", color: "#b5651d",
      glass: "高球杯", abv: "低", desc: "朗姆 + 可乐 + 青柠，几乎不可能失败。",
      ingredients: [
        { id: "white-rum", amount: "45 ml" }, { id: "cola", amount: "120 ml" },
        { id: "lime", amount: "1 角" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["高球杯加冰", "倒入朗姆酒", "可乐补满，挤入青柠汁并放入青柠角", "轻搅"]
    },
    {
      id: "greyhound", name: "灰狗", en: "Greyhound", type: "classic", emoji: "🐕", color: "#f2b5b5",
      glass: "高球杯", abv: "低", desc: "金酒 + 西柚汁，两样材料，零难度。",
      ingredients: [
        { id: "gin", amount: "45 ml" }, { id: "grapefruit-juice", amount: "120 ml" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["高球杯加冰", "倒入金酒与西柚汁", "搅拌，西柚片装饰"]
    },
    {
      id: "sea-breeze", name: "海风", en: "Sea Breeze", type: "classic", emoji: "🌊", color: "#e46b7f",
      glass: "高球杯", abv: "低", desc: "蔓越莓 + 西柚，颜色最讨喜的一杯。",
      ingredients: [
        { id: "vodka", amount: "45 ml" }, { id: "cranberry-juice", amount: "90 ml" },
        { id: "grapefruit-juice", amount: "45 ml" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["高球杯加冰", "倒入伏特加与两种果汁", "搅拌，青柠角装饰"]
    },
    {
      id: "bellini", name: "贝利尼", en: "Bellini", type: "classic", emoji: "🍑", color: "#f3b7a0",
      glass: "笛形香槟杯", abv: "低", desc: "威尼斯哈里酒吧的发明，白桃与气泡的经典早午餐酒。",
      ingredients: [
        { id: "sparkling", amount: "100 ml" }, { id: "peach-fruit", amount: "1 个打成泥" }
      ],
      steps: ["桃子去皮打成泥（或用桃子汁）", "杯中先放 1/3 桃泥", "缓慢倒入冰镇气泡酒", "轻搅一下即可"]
    },
    {
      id: "mimosa", name: "含羞草", en: "Mimosa", type: "classic", emoji: "🥂", color: "#f7c948",
      glass: "笛形香槟杯", abv: "低", desc: "气泡酒 + 橙汁，1:1，早餐和派对都合适。",
      ingredients: [
        { id: "sparkling", amount: "100 ml" }, { id: "orange-juice", amount: "100 ml" }
      ],
      steps: ["冰镇香槟杯", "先倒橙汁", "再缓慢倒入气泡酒", "轻搅，橙片装饰"]
    },
    {
      id: "grasshopper", name: "蚱蜢", en: "Grasshopper", type: "classic", emoji: "🦗", color: "#8fd18f",
      glass: "马天尼杯", abv: "低", desc: "薄荷 + 可可 + 奶油，像一杯融化的薄荷巧克力。",
      ingredients: [
        { id: "creme-de-menthe", amount: "20 ml" }, { id: "cacao-white", amount: "20 ml" },
        { id: "cream", amount: "20 ml" }, { id: "ice", amount: "适量" }
      ],
      steps: ["三种材料加冰摇匀", "滤入冰镇马天尼杯", "表面撒可可粉"]
    },
    {
      id: "mudslide", name: "泥石流", en: "Mudslide", type: "classic", emoji: "🍫", color: "#7b5b3a",
      glass: "古典杯", abv: "中", desc: "伏特加 + 咖啡 + 百利甜，甜点即正义。",
      ingredients: [
        { id: "vodka", amount: "30 ml" }, { id: "kahlua", amount: "20 ml" },
        { id: "baileys", amount: "20 ml" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["古典杯加冰", "依次倒入三种酒", "轻搅", "可加奶油漂浮"]
    },
    {
      id: "alexander", name: "亚历山大", en: "Alexander", type: "classic", emoji: "🌰", color: "#c8a17a",
      glass: "马天尼杯", abv: "中", desc: "干邑 + 可可 + 奶油，老派的优雅。",
      ingredients: [
        { id: "cognac", amount: "30 ml" }, { id: "cacao-white", amount: "30 ml" },
        { id: "cream", amount: "30 ml" }, { id: "nutmeg", amount: "少许", optional: true }
      ],
      steps: ["材料加冰摇匀", "滤入冰镇马天尼杯", "表面撒肉豆蔻粉"]
    },
    {
      id: "godfather", name: "教父", en: "Godfather", type: "classic", emoji: "🎬", color: "#a97b3c",
      glass: "古典杯", abv: "高", desc: "苏格兰威士忌 + 杏仁利口酒，两样材料的电影感。",
      ingredients: [
        { id: "scotch", amount: "45 ml" }, { id: "amaretto", amount: "20 ml" }, { id: "ice", amount: "1 大块" }
      ],
      steps: ["古典杯放一块大冰", "倒入威士忌与杏仁利口酒", "搅拌 15 秒", "橙皮装饰"]
    },
    {
      id: "irish-coffee", name: "爱尔兰咖啡", en: "Irish Coffee", type: "classic", emoji: "☕", color: "#6f4e37",
      glass: "爱尔兰咖啡杯", abv: "低", desc: "咖啡、威士忌、奶油，冬天的救命饮品。",
      ingredients: [
        { id: "irish-whiskey", amount: "40 ml" }, { id: "espresso", amount: "60 ml" },
        { id: "sugar", amount: "1 茶匙" }, { id: "cream", amount: "30 ml" }
      ],
      steps: ["杯中放糖，倒入热咖啡搅化", "加入爱尔兰威士忌", "淡奶油轻打发后沿勺背浮在表面", "不要搅拌，透过奶油喝"]
    },
    {
      id: "kentucky-mule", name: "肯塔基骡子", en: "Kentucky Mule", type: "classic", emoji: "🐎", color: "#c98a3c",
      glass: "铜杯", abv: "中", desc: "把莫斯科骡子的伏特加换成波本，更有谷物香。",
      ingredients: [
        { id: "bourbon", amount: "45 ml" }, { id: "ginger-beer", amount: "120 ml" },
        { id: "lime-juice", amount: "15 ml" }, { id: "mint", amount: "1 枝", optional: true }, { id: "ice", amount: "满杯" }
      ],
      steps: ["铜杯加满冰", "倒入波本与青柠汁", "姜汁啤酒补满", "薄荷枝装饰"]
    },
    {
      id: "gin-basil-smash", name: "金酒罗勒", en: "Gin Basil Smash", type: "classic", emoji: "🌿", color: "#79c47a",
      glass: "古典杯", abv: "中", desc: "2008 年诞生的新经典，罗勒香比薄荷更有个性。",
      ingredients: [
        { id: "gin", amount: "60 ml" }, { id: "basil", amount: "6 片" },
        { id: "lemon-juice", amount: "25 ml" }, { id: "simple-syrup", amount: "20 ml" }, { id: "ice", amount: "适量" }
      ],
      steps: ["罗勒叶与糖浆轻压出香", "加入其余材料，加冰大力摇匀", "双重过滤入放冰的古典杯", "罗勒叶装饰"]
    },
    {
      id: "negroni-sbagliato", name: "尼格罗尼气泡", en: "Negroni Sbagliato", type: "classic", emoji: "🫧", color: "#d96a4a",
      glass: "古典杯", abv: "低", desc: "“做错了”的尼格罗尼：金酒换成气泡酒，意外地好喝。",
      ingredients: [
        { id: "campari", amount: "30 ml" }, { id: "sweet-vermouth", amount: "30 ml" },
        { id: "sparkling", amount: "60 ml" }, { id: "orange", amount: "1 片" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["古典杯加冰", "倒入金巴利与甜味美思", "补入冰镇气泡酒", "橙片装饰"]
    },
    {
      id: "garibaldi", name: "加里波第", en: "Garibaldi", type: "classic", emoji: "🍊", color: "#f08a3c",
      glass: "高球杯", abv: "低", desc: "金巴利 + 打发的橙汁，像喝一朵橙子云。",
      ingredients: [
        { id: "campari", amount: "45 ml" }, { id: "orange-juice", amount: "90 ml" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["橙汁用打泡器打出绵密泡沫", "高球杯加冰，倒入金巴利", "缓慢注入橙汁泡沫", "橙片装饰"]
    },
    {
      id: "michelada", name: "米切拉达", en: "Michelada", type: "classic", emoji: "🍺", color: "#d4552f",
      glass: "大杯", abv: "低", desc: "啤酒 + 番茄 + 辣酱，夏天的咸口啤酒。",
      ingredients: [
        { id: "beer", amount: "300 ml" }, { id: "lime-juice", amount: "20 ml" }, { id: "tomato-juice", amount: "60 ml" },
        { id: "worcestershire", amount: "3 dash" }, { id: "tabasco", amount: "2 dash" }, { id: "salt", amount: "杯口" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["杯口抹盐", "加冰，倒入番茄汁、青柠汁与调料", "缓慢倒入冰啤酒", "轻搅，青柠角装饰"]
    },
    {
      id: "john-collins", name: "约翰柯林斯", en: "John Collins", type: "classic", emoji: "🍋", color: "#e8d98a",
      glass: "高球杯", abv: "低", desc: "汤姆柯林斯的波本版本，更香更暖。",
      ingredients: [
        { id: "bourbon", amount: "45 ml" }, { id: "lemon-juice", amount: "30 ml" },
        { id: "simple-syrup", amount: "15 ml" }, { id: "soda-water", amount: "补满" },
        { id: "cherry", amount: "1 颗", optional: true }, { id: "ice", amount: "满杯" }
      ],
      steps: ["高球杯加冰", "倒入波本、柠檬汁与糖浆搅匀", "苏打水补满", "樱桃装饰"]
    },
    {
      id: "harvey-wallbanger", name: "哈维撞墙", en: "Harvey Wallbanger", type: "classic", emoji: "🍊", color: "#f2c14e",
      glass: "高球杯", abv: "低", desc: "螺丝起子加一层加利安奴，香草味浮在顶部。",
      ingredients: [
        { id: "vodka", amount: "45 ml" }, { id: "orange-juice", amount: "120 ml" },
        { id: "galliano", amount: "15 ml" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["高球杯加冰", "倒入伏特加与橙汁搅匀", "沿勺背浮一层加利安奴", "橙片装饰"]
    },
    {
      id: "lemon-drop", name: "柠檬滴", en: "Lemon Drop", type: "classic", emoji: "🍋", color: "#f7e07a",
      glass: "马天尼杯", abv: "中", desc: "像在喝一颗糖渍柠檬，酸甜到忍不住眯眼。",
      ingredients: [
        { id: "vodka", amount: "40 ml" }, { id: "lemon-juice", amount: "20 ml" },
        { id: "simple-syrup", amount: "15 ml" }, { id: "sugar", amount: "杯口", optional: true }, { id: "ice", amount: "适量" }
      ],
      steps: ["杯口做糖边", "材料加冰摇匀", "滤入冰镇马天尼杯", "柠檬片装饰"]
    },
    {
      id: "kamikaze", name: "神风", en: "Kamikaze", type: "classic", emoji: "💥", color: "#cfe0a0",
      glass: "马天尼杯", abv: "高", desc: "伏特加 + 君度 + 青柠，1:1:1，简单直接。",
      ingredients: [
        { id: "vodka", amount: "30 ml" }, { id: "cointreau", amount: "30 ml" },
        { id: "lime-juice", amount: "30 ml" }, { id: "ice", amount: "适量" }
      ],
      steps: ["材料加冰摇 12 秒", "滤入冰镇马天尼杯", "青柠片装饰"]
    },
    {
      id: "sex-on-the-beach", name: "性感沙滩", en: "Sex on the Beach", type: "classic", emoji: "🏖️", color: "#f06b6b",
      glass: "高球杯", abv: "低", desc: "桃子和蔓越莓的甜香，聚会里最受欢迎的一杯。",
      ingredients: [
        { id: "vodka", amount: "40 ml" }, { id: "peach", amount: "20 ml" },
        { id: "orange-juice", amount: "40 ml" }, { id: "cranberry-juice", amount: "40 ml" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["所有材料加冰摇匀", "连冰倒入高球杯", "橙片装饰"]
    },
    {
      id: "espresso-tonic", name: "浓缩汤力", en: "Espresso Tonic", type: "classic", emoji: "⚡", color: "#8a6b4a",
      glass: "高球杯", abv: "无", desc: "不含酒精的咖啡馆新宠，气泡与咖啡油脂的碰撞。",
      ingredients: [
        { id: "espresso", amount: "30 ml" }, { id: "tonic", amount: "120 ml" },
        { id: "orange", amount: "1 片皮", optional: true }, { id: "ice", amount: "满杯" }
      ],
      steps: ["高球杯加满冰", "倒入冰镇汤力水", "缓慢淋入浓缩咖啡", "橙皮挤油，不要搅拌"]
    },
    {
      id: "black-russian", name: "黑色俄罗斯", en: "Black Russian", type: "classic", emoji: "🖤", color: "#4a3527",
      glass: "古典杯", abv: "中", desc: "伏特加 + 咖啡利口酒，白色俄罗斯的原始版本。",
      ingredients: [
        { id: "vodka", amount: "50 ml" }, { id: "kahlua", amount: "20 ml" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["古典杯加冰", "倒入伏特加与咖啡利口酒", "搅拌 10 秒"]
    },
    {
      id: "screwdriver", name: "螺丝起子", en: "Screwdriver", type: "classic", emoji: "🪛", color: "#f6a623",
      glass: "高球杯", abv: "低", desc: "伏特加 + 橙汁，全世界最简单的鸡尾酒。",
      ingredients: [
        { id: "vodka", amount: "45 ml" }, { id: "orange-juice", amount: "120 ml" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["高球杯加冰", "倒入伏特加", "橙汁补满，搅拌"]
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
    },
    {
      id: "custom-plum-soda", name: "青梅气泡特调", en: "Green Plum Soda", type: "custom", emoji: "🟢", color: "#a8d98a",
      glass: "高球杯", abv: "低", desc: "自创特调：梅酒打底，青梅与气泡水让酸甜更清爽，配火锅一流。",
      ingredients: [
        { id: "plum-wine", amount: "60 ml" }, { id: "soda-water", amount: "120 ml" },
        { id: "plum", amount: "1 颗" }, { id: "honey", amount: "10 ml" },
        { id: "mint", amount: "1 枝", optional: true }, { id: "ice", amount: "满杯" }
      ],
      steps: ["高球杯加冰，放入青梅轻压", "倒入梅酒与蜂蜜搅匀", "苏打水补满", "插薄荷枝"]
    },
    {
      id: "custom-hawthorn-gin", name: "山楂金酒酸", en: "Hawthorn Gin Sour", type: "custom", emoji: "🔴", color: "#e0705a",
      glass: "古典杯", abv: "中", desc: "自创特调：山楂的果酸中和金酒，蜂蜜收尾，酸甜开胃。",
      ingredients: [
        { id: "gin", amount: "45 ml" }, { id: "hawthorn", amount: "5 颗" },
        { id: "lemon-juice", amount: "20 ml" }, { id: "honey", amount: "15 ml" },
        { id: "soda-water", amount: "60 ml" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["山楂去核压碎，与蜂蜜、柠檬汁拌匀", "加入金酒与冰摇匀", "滤入放冰的古典杯", "苏打水补至八分满"]
    },
    {
      id: "custom-goji-whisky", name: "枸杞桂圆威士忌", en: "Goji Longan Whisky", type: "custom", emoji: "🟤", color: "#b5763a",
      glass: "古典杯", abv: "中", desc: "自创特调：中式养生风，桂圆枸杞的甘甜配波本，冬天暖身。",
      ingredients: [
        { id: "bourbon", amount: "45 ml" }, { id: "goji", amount: "1 小把" },
        { id: "longan", amount: "3 颗" }, { id: "honey", amount: "10 ml" },
        { id: "lemon-juice", amount: "10 ml" }, { id: "ice", amount: "1 大块" }
      ],
      steps: ["桂圆与枸杞用少量温水泡 5 分钟", "杯中放蜂蜜、柠檬汁与泡好的材料", "加入大冰块与波本", "搅拌 15 秒，桂圆装饰"]
    },
    {
      id: "custom-passionfruit-mojito", name: "百香果莫吉托", en: "Passion Fruit Mojito", type: "custom", emoji: "🟠", color: "#f2a03d",
      glass: "高球杯", abv: "低", desc: "自创特调：在莫吉托里加一颗百香果，酸香更立体。",
      ingredients: [
        { id: "white-rum", amount: "45 ml" }, { id: "passionfruit", amount: "1 个" },
        { id: "lime-juice", amount: "15 ml" }, { id: "simple-syrup", amount: "15 ml" },
        { id: "mint", amount: "8 片" }, { id: "soda-water", amount: "补满" }, { id: "ice", amount: "满杯" }
      ],
      steps: ["薄荷与糖浆轻压出香", "加入百香果果肉、青柠汁与白朗姆", "加满碎冰搅拌", "苏打水补满，放半颗百香果装饰"]
    }
  ],

  /* ---------- 配方成品图 ----------
     演示图片来自公开鸡尾酒数据库（thecocktaildb.com），先用它们把版面填满。
     正式上线前建议换成自己拍的照片：管理后台 → 配方管理 → 换图。
     没有配图的配方会自动回退成 emoji + 渐变卡片，不会出现破图。 */
  images: {
    "gin-tonic": "https://www.thecocktaildb.com/images/media/drink/k0508k1668422436.jpg",
    "dry-martini": "https://www.thecocktaildb.com/images/media/drink/6ck9yi1589574317.jpg",
    "negroni": "https://www.thecocktaildb.com/images/media/drink/qgdu971561574065.jpg",
    "mojito": "https://www.thecocktaildb.com/images/media/drink/metwgh1606770327.jpg",
    "cosmopolitan": "https://www.thecocktaildb.com/images/media/drink/kpsajh1504368362.jpg",
    "whiskey-sour": "https://www.thecocktaildb.com/images/media/drink/hbkfsh1589574990.jpg",
    "old-fashioned": "https://www.thecocktaildb.com/images/media/drink/vrwquq1478252802.jpg",
    "margarita": "https://www.thecocktaildb.com/images/media/drink/5noda61589575158.jpg",
    "daiquiri": "https://www.thecocktaildb.com/images/media/drink/mrz9091589574515.jpg",
    "long-island": "https://www.thecocktaildb.com/images/media/drink/wx7hsg1504370510.jpg",
    "bloody-mary": "https://www.thecocktaildb.com/images/media/drink/t6caa21582485702.jpg",
    "white-russian": "https://www.thecocktaildb.com/images/media/drink/vsrupw1472405732.jpg",
    "manhattan": "https://www.thecocktaildb.com/images/media/drink/yk70e31606771240.jpg",
    "sidecar": "https://www.thecocktaildb.com/images/media/drink/x72sik1606854964.jpg",
    "mai-tai": "https://www.thecocktaildb.com/images/media/drink/twyrrp1439907470.jpg",
    "tequila-sunrise": "https://www.thecocktaildb.com/images/media/drink/quqyqp1480879103.jpg",
    "espresso-martini": "https://www.thecocktaildb.com/images/media/drink/n0sx531504372951.jpg",
    "aperol-spritz": "https://www.thecocktaildb.com/images/media/drink/iloasq1587661955.jpg",
    "moscow-mule": "https://www.thecocktaildb.com/images/media/drink/3pylqc1504370988.jpg",
    "pina-colada": "https://www.thecocktaildb.com/images/media/drink/upgsue1668419912.jpg",
    "dark-stormy": "https://www.thecocktaildb.com/images/media/drink/t1tn0s1504374905.jpg",
    "gin-fizz": "https://www.thecocktaildb.com/images/media/drink/drtihp1606768397.jpg",
    "tom-collins": "https://www.thecocktaildb.com/images/media/drink/7cll921606854636.jpg",
    "paloma": "https://www.thecocktaildb.com/images/media/drink/samm5j1513706393.jpg",
    "caipirinha": "https://www.thecocktaildb.com/images/media/drink/jgvn7p1582484435.jpg",
    "b52": "https://www.thecocktaildb.com/images/media/drink/5a3vg61504372070.jpg",
    "mint-julep": "https://www.thecocktaildb.com/images/media/drink/squyyq1439907312.jpg",
    "sazerac": "https://www.thecocktaildb.com/images/media/drink/vvpxwy1439907208.jpg",
    "americano": "https://www.thecocktaildb.com/images/media/drink/709s6m1613655124.jpg",
    "boulevardier": "https://www.thecocktaildb.com/images/media/drink/km84qi1513705868.jpg",
    "gimlet": "https://www.thecocktaildb.com/images/media/drink/3xgldt1513707271.jpg",
    "french-75": "https://www.thecocktaildb.com/images/media/drink/hrxfbl1606773109.jpg",
    "white-lady": "https://www.thecocktaildb.com/images/media/drink/jofsaz1504352991.jpg",
    "aviation": "https://www.thecocktaildb.com/images/media/drink/trbplb1606855233.jpg",
    "last-word": "https://www.thecocktaildb.com/images/media/drink/91oule1513702624.jpg",
    "clover-club": "https://www.thecocktaildb.com/images/media/drink/t0aja61504348715.jpg",
    "bramble": "https://www.thecocktaildb.com/images/media/drink/twtbh51630406392.jpg",
    "penicillin": "https://www.thecocktaildb.com/images/media/drink/hc9b1a1521853096.jpg",
    "pisco-sour": "https://www.thecocktaildb.com/images/media/drink/tsssur1439907622.jpg",
    "amaretto-sour": "https://www.thecocktaildb.com/images/media/drink/xnzc541493070211.jpg",
    "corpse-reviver": "https://www.thecocktaildb.com/images/media/drink/gifgao1513704334.jpg",
    "martinez": "https://www.thecocktaildb.com/images/media/drink/fs6kiq1513708455.jpg",
    "singapore-sling": "https://www.thecocktaildb.com/images/media/drink/7dozeg1582578095.jpg",
    "zombie": "https://www.thecocktaildb.com/images/media/drink/2en3jk1509557725.jpg",
    "cuba-libre": "https://www.thecocktaildb.com/images/media/drink/wmkbfj1606853905.jpg",
    "greyhound": "https://www.thecocktaildb.com/images/media/drink/g5upn41513706732.jpg",
    "sea-breeze": "https://www.thecocktaildb.com/images/media/drink/7rfuks1504371562.jpg",
    "bellini": "https://www.thecocktaildb.com/images/media/drink/eaag491504367543.jpg",
    "mimosa": "https://www.thecocktaildb.com/images/media/drink/juhcuu1504370685.jpg",
    "grasshopper": "https://www.thecocktaildb.com/images/media/drink/aqm9el1504369613.jpg",
    "mudslide": "https://www.thecocktaildb.com/images/media/drink/tpwwut1468925017.jpg",
    "alexander": "https://www.thecocktaildb.com/images/media/drink/0clus51606772388.jpg",
    "godfather": "https://www.thecocktaildb.com/images/media/drink/e5zgao1582582378.jpg",
    "irish-coffee": "https://www.thecocktaildb.com/images/media/drink/sywsqw1439906999.jpg",
    "gin-basil-smash": "https://www.thecocktaildb.com/images/media/drink/jqh2141572807327.jpg",
    "michelada": "https://www.thecocktaildb.com/images/media/drink/u736bd1605907086.jpg",
    "john-collins": "https://www.thecocktaildb.com/images/media/drink/0t4bv71606854479.jpg",
    "harvey-wallbanger": "https://www.thecocktaildb.com/images/media/drink/7os4gs1606854357.jpg",
    "lemon-drop": "https://www.thecocktaildb.com/images/media/drink/mtpxgk1504373297.jpg",
    "kamikaze": "https://www.thecocktaildb.com/images/media/drink/d7ff7u1606855412.jpg",
    "sex-on-the-beach": "https://www.thecocktaildb.com/images/media/drink/fi67641668420787.jpg",
    "black-russian": "https://www.thecocktaildb.com/images/media/drink/8oxlqf1606772765.jpg",
    "screwdriver": "https://www.thecocktaildb.com/images/media/drink/8xnyke1504352207.jpg",
  },

  /* ---------- 口味标签体系 ----------
     用户上传配方时可以自由勾选，也可以自己敲一个新标签。
     这个列表同时用作「想喝啥」页面的筛选面板。 */
  tagGroups: [
    { name: "口味", en: "TASTE", tags: ["甜", "酸", "苦", "涩", "咸", "辣", "果香", "奶香", "咖啡", "草本", "烟熏", "清爽"] },
    { name: "口感", en: "TEXTURE", tags: ["气泡", "浓郁", "绵密", "冰沙"] },
    { name: "长度", en: "LENGTH", tags: ["长饮", "短饮"] },
    { name: "酒感", en: "STRENGTH", tags: ["无酒精", "微醺", "中等", "烈"] },
    { name: "场合", en: "OCCASION", tags: ["餐前", "餐后", "派对", "独饮", "夏日", "冬日"] }
  ],

  /* ---------- 每款酒的标签 ---------- */
  tags: {
    "gin-tonic": ["苦", "清爽", "气泡", "长饮", "微醺", "夏日", "餐前"],
    "dry-martini": ["苦", "草本", "短饮", "烈", "餐前"],
    "negroni": ["苦", "草本", "短饮", "烈", "餐前"],
    "mojito": ["甜", "酸", "草本", "清爽", "气泡", "长饮", "微醺", "夏日", "派对"],
    "cosmopolitan": ["甜", "酸", "果香", "短饮", "中等", "派对"],
    "whiskey-sour": ["酸", "甜", "浓郁", "短饮", "中等", "餐后"],
    "old-fashioned": ["甜", "苦", "浓郁", "短饮", "烈", "餐后", "冬日"],
    "margarita": ["酸", "咸", "果香", "短饮", "中等", "派对"],
    "daiquiri": ["酸", "甜", "清爽", "短饮", "中等", "夏日"],
    "long-island": ["甜", "酸", "气泡", "长饮", "烈", "派对"],
    "bloody-mary": ["咸", "辣", "酸", "长饮", "微醺", "餐前"],
    "white-russian": ["甜", "奶香", "咖啡", "浓郁", "短饮", "中等", "餐后"],
    "manhattan": ["甜", "苦", "浓郁", "短饮", "烈", "餐后"],
    "sidecar": ["酸", "甜", "果香", "短饮", "中等", "餐后"],
    "mai-tai": ["甜", "酸", "果香", "长饮", "中等", "派对", "夏日"],
    "tequila-sunrise": ["甜", "酸", "果香", "长饮", "微醺", "夏日", "派对"],
    "espresso-martini": ["甜", "苦", "咖啡", "绵密", "短饮", "中等", "餐后"],
    "aperol-spritz": ["苦", "甜", "气泡", "长饮", "微醺", "夏日", "餐前", "派对"],
    "moscow-mule": ["酸", "辣", "气泡", "长饮", "微醺", "夏日"],
    "pina-colada": ["甜", "奶香", "果香", "冰沙", "长饮", "微醺", "夏日", "派对"],
    "dark-stormy": ["甜", "辣", "气泡", "长饮", "中等", "冬日"],
    "gin-fizz": ["酸", "甜", "气泡", "长饮", "微醺", "夏日", "餐前"],
    "tom-collins": ["酸", "甜", "气泡", "清爽", "长饮", "微醺", "夏日", "餐前"],
    "paloma": ["酸", "苦", "咸", "气泡", "长饮", "微醺", "夏日"],
    "caipirinha": ["酸", "甜", "清爽", "短饮", "中等", "夏日"],
    "b52": ["甜", "奶香", "咖啡", "绵密", "短饮", "中等", "餐后", "派对"],
    "whisky-highball": ["清爽", "气泡", "长饮", "微醺", "餐前"],
    "mint-julep": ["甜", "草本", "清爽", "长饮", "烈", "夏日"],
    "sazerac": ["苦", "草本", "浓郁", "短饮", "烈", "餐后", "冬日"],
    "americano": ["苦", "甜", "气泡", "长饮", "微醺", "餐前"],
    "boulevardier": ["苦", "甜", "浓郁", "短饮", "烈", "餐前", "冬日"],
    "gimlet": ["酸", "清爽", "短饮", "中等", "餐前"],
    "bees-knees": ["甜", "酸", "清爽", "短饮", "中等", "餐前"],
    "french-75": ["酸", "甜", "气泡", "长饮", "中等", "派对", "餐前"],
    "white-lady": ["酸", "果香", "绵密", "短饮", "中等", "餐前"],
    "aviation": ["酸", "果香", "草本", "短饮", "中等", "餐前"],
    "last-word": ["酸", "苦", "草本", "短饮", "烈", "餐后"],
    "clover-club": ["酸", "甜", "果香", "绵密", "短饮", "中等", "餐前"],
    "bramble": ["酸", "甜", "果香", "短饮", "中等", "夏日"],
    "penicillin": ["酸", "甜", "辣", "草本", "短饮", "中等", "冬日"],
    "pisco-sour": ["酸", "绵密", "短饮", "中等", "餐前"],
    "amaretto-sour": ["甜", "酸", "果香", "绵密", "短饮", "微醺", "餐后"],
    "gold-rush": ["酸", "甜", "浓郁", "短饮", "中等", "餐后"],
    "corpse-reviver": ["酸", "草本", "清爽", "短饮", "烈", "餐前"],
    "martinez": ["甜", "苦", "草本", "短饮", "中等", "餐前"],
    "hanky-panky": ["苦", "草本", "浓郁", "短饮", "烈", "餐后"],
    "toronto": ["苦", "草本", "浓郁", "短饮", "烈", "冬日", "餐后"],
    "singapore-sling": ["甜", "酸", "果香", "长饮", "中等", "夏日", "派对"],
    "jungle-bird": ["苦", "甜", "果香", "长饮", "中等", "夏日"],
    "zombie": ["甜", "酸", "果香", "长饮", "烈", "派对"],
    "hurricane": ["甜", "酸", "果香", "长饮", "中等", "夏日", "派对"],
    "painkiller": ["甜", "奶香", "果香", "长饮", "中等", "夏日", "派对"],
    "blue-hawaii": ["甜", "果香", "奶香", "长饮", "微醺", "夏日", "派对"],
    "cuba-libre": ["甜", "气泡", "长饮", "微醺", "派对", "夏日"],
    "greyhound": ["酸", "苦", "清爽", "长饮", "微醺", "夏日", "餐前"],
    "sea-breeze": ["酸", "果香", "清爽", "长饮", "微醺", "夏日"],
    "bellini": ["甜", "果香", "气泡", "长饮", "微醺", "餐前", "夏日"],
    "mimosa": ["酸", "甜", "果香", "气泡", "长饮", "微醺", "餐前", "派对"],
    "grasshopper": ["甜", "奶香", "绵密", "短饮", "微醺", "餐后"],
    "mudslide": ["甜", "奶香", "咖啡", "浓郁", "短饮", "中等", "餐后"],
    "alexander": ["甜", "奶香", "绵密", "短饮", "中等", "餐后"],
    "godfather": ["甜", "烟熏", "浓郁", "短饮", "烈", "餐后", "冬日"],
    "irish-coffee": ["甜", "苦", "咖啡", "绵密", "长饮", "微醺", "冬日", "餐后"],
    "kentucky-mule": ["酸", "辣", "气泡", "长饮", "微醺", "冬日"],
    "gin-basil-smash": ["酸", "草本", "清爽", "短饮", "中等", "夏日"],
    "negroni-sbagliato": ["苦", "甜", "气泡", "长饮", "微醺", "餐前"],
    "garibaldi": ["苦", "甜", "果香", "绵密", "长饮", "微醺", "餐前"],
    "michelada": ["咸", "辣", "酸", "气泡", "长饮", "微醺", "夏日"],
    "john-collins": ["酸", "甜", "气泡", "清爽", "长饮", "微醺", "夏日", "餐前"],
    "harvey-wallbanger": ["甜", "果香", "长饮", "微醺", "夏日", "派对"],
    "lemon-drop": ["酸", "甜", "果香", "短饮", "中等", "派对", "餐前"],
    "kamikaze": ["酸", "清爽", "短饮", "中等", "派对"],
    "sex-on-the-beach": ["甜", "果香", "长饮", "微醺", "夏日", "派对"],
    "espresso-tonic": ["苦", "气泡", "咖啡", "清爽", "长饮", "无酒精", "夏日", "餐后"],
    "black-russian": ["甜", "咖啡", "浓郁", "短饮", "中等", "餐后"],
    "screwdriver": ["甜", "酸", "果香", "长饮", "微醺", "夏日"],
    "custom-lychee-rose": ["甜", "果香", "气泡", "清爽", "长饮", "微醺", "夏日", "派对"],
    "custom-grape-tonic": ["甜", "果香", "气泡", "清爽", "长饮", "微醺", "夏日"],
    "custom-osmanthus-whisky": ["甜", "果香", "草本", "浓郁", "短饮", "中等", "冬日", "餐后"],
    "custom-matcha-colada": ["甜", "奶香", "苦", "草本", "绵密", "长饮", "微醺", "夏日"],
    "custom-baijiu-lemon": ["酸", "甜", "气泡", "清爽", "长饮", "中等", "餐前"],
    "custom-plum-soda": ["甜", "酸", "果香", "气泡", "清爽", "长饮", "微醺", "夏日"],
    "custom-hawthorn-gin": ["酸", "甜", "果香", "清爽", "短饮", "中等", "餐前"],
    "custom-goji-whisky": ["甜", "果香", "草本", "浓郁", "短饮", "中等", "冬日", "餐后"],
    "custom-passionfruit-mojito": ["酸", "甜", "果香", "草本", "气泡", "长饮", "微醺", "夏日", "派对"]
  },


  /* ---------- 拼音索引（用于首字母排序与拼音搜索，由脚本生成） ---------- */
  pinyin: {
    ingredients: {
      "gin": "jinjiuqinjiu|J",
      "vodka": "futejia|F",
      "white-rum": "bailangmujiu|B",
      "dark-rum": "heilangmujiu|H",
      "tequila": "longshelan|L",
      "mezcal": "meisikaer|M",
      "bourbon": "bobenweishiji|B",
      "rye": "heimaiweishiji|H",
      "scotch": "sugelanweishiji|S",
      "brandy": "bailandi|B",
      "cognac": "ganyi|G",
      "cachaca": "kashasa|K",
      "sparkling": "qipaojiuxiangbin|Q",
      "sake": "qingjiu|Q",
      "soju": "shaojiu|S",
      "baijiu": "baijiu|B",
      "golden-rum": "jinlangmujiu|J",
      "aged-rum": "chennianlangmujiu|C",
      "overproof-rum": "gaodulangmu151|G",
      "pisco": "pisike|P",
      "armagnac": "yawenyi|Y",
      "canadian-whisky": "jianadaweishiji|J",
      "japanese-whisky": "ribenweishiji|R",
      "irish-whiskey": "aierlanweishiji|A",
      "sherry": "xuelijiu|X",
      "port": "botejiu|B",
      "red-wine": "hongputaojiu|H",
      "white-wine": "baiputaojiu|B",
      "plum-wine": "meijiu|M",
      "rice-wine": "huangjiumijiu|H",
      "cointreau": "junduchengjiu|J",
      "triple-sec": "baichengpilikoujiu|B",
      "campari": "jinbali|J",
      "aperol": "apeiluo|A",
      "sweet-vermouth": "tianweimeisi|T",
      "dry-vermouth": "ganweimeisi|G",
      "kahlua": "kafeilikoujiu|K",
      "baileys": "bailitianjiu|B",
      "amaretto": "xingrenlikoujiu|X",
      "blue-curacao": "lanchenglikoujiu|L",
      "peach": "mitaolikoujiu|M",
      "cacao-white": "baikekelikoujiu|B",
      "st-germain": "jiegumuhualikoujiu|J",
      "midori": "miduolimiguajiu|M",
      "malibu": "yexianglangmujiu|Y",
      "absinthe": "kuaijiu|K",
      "grand-marnier": "ganmanyi|G",
      "maraschino": "heiyingtaolikoujiu|H",
      "chambord": "xiangboheimeilikoujiu|X",
      "chartreuse": "qianmajiul|Q",
      "benedictine": "langjiu|L",
      "drambuie": "dulinbiao|D",
      "frangelico": "zhenzilikoujiu|Z",
      "banana-liqueur": "xiangjiaolikoujiu|X",
      "vanilla-liqueur": "xiangcaolikoujiu|X",
      "galliano": "jialiannu|J",
      "creme-de-menthe": "bohelikoujiu|B",
      "creme-de-cacao-dark": "shensekekelikoujiu|S",
      "creme-de-violette": "ziluolanlikoujiu|Z",
      "pimms": "pimujiu|P",
      "limoncello": "ningmengqieluo|N",
      "lillet": "lilaibai|L",
      "amaro": "amaluokujiu|A",
      "lime-juice": "qingningzhi|Q",
      "lemon-juice": "ningmengzhi|N",
      "orange-juice": "chengzhi|C",
      "pineapple-juice": "boluozhi|B",
      "cranberry-juice": "manyuemeizhi|M",
      "grapefruit-juice": "xiyouzhi|X",
      "tomato-juice": "fanqiezhi|F",
      "coconut-cream": "yejiang|Y",
      "tonic": "tanglishui|T",
      "soda-water": "sudashui|S",
      "cola": "kele|K",
      "sprite": "xuebiqixi|X",
      "ginger-beer": "jiangzhipijiu|J",
      "espresso": "nongsuokafei|N",
      "milk": "niunai|N",
      "cream": "dannaiyou|D",
      "condensed-milk": "lianru|L",
      "coconut-water": "yezishui|Y",
      "passionfruit-juice": "baixiangguozhi|B",
      "mango-juice": "mangguozhi|M",
      "watermelon-juice": "xiguazhi|X",
      "apple-juice": "pingguozhi|P",
      "grape-juice": "putaozhi|P",
      "peach-juice": "taozizhi|T",
      "ginger-ale": "ganjiangshui|G",
      "bitter-lemon": "kuningshui|K",
      "sparkling-water": "qipaoshui|Q",
      "beer": "pijiu|P",
      "simple-syrup": "tangjiang|T",
      "grenadine": "hongshiliutangjiang|H",
      "orgeat": "xingrentangjiang|X",
      "honey": "fengmi|F",
      "agave": "longshelantangjiang|L",
      "angostura": "angeshikujing|A",
      "salt": "yan|Y",
      "sugar": "baishatang|B",
      "pepper": "heihujiao|H",
      "worcestershire": "wusitejiang|W",
      "tabasco": "tabasikelajiang|T",
      "egg-white": "danqing|D",
      "egg-yolk": "danhuang|D",
      "vanilla-syrup": "xiangcaotangjiang|X",
      "ginger-syrup": "jiangtangjiang|J",
      "cinnamon-syrup": "rouguitangjiang|R",
      "caramel-syrup": "jiaotangtangjiang|J",
      "rose-syrup": "meiguitangjiang|M",
      "elderflower-syrup": "jiegumuhuatangjiang|J",
      "passionfruit-syrup": "baixiangguotangjiang|B",
      "lychee-syrup": "lizhitangjiang|L",
      "coconut-syrup": "yezitangjiang|Y",
      "raspberry-syrup": "fupenzitangjiang|F",
      "orange-bitters": "chengweikujing|C",
      "celery-bitters": "qincaikujing|Q",
      "cinnamon-powder": "rouguifen|R",
      "cocoa-powder": "kekefen|K",
      "vanilla-extract": "xiangcaojing|X",
      "clove": "dingxiang|D",
      "chili": "lajiao|L",
      "lime": "qingning|Q",
      "lemon": "ningmeng|N",
      "orange": "chengzi|C",
      "grapefruit": "xiyou|X",
      "strawberry": "caomei|C",
      "pineapple": "boluo|B",
      "cherry": "yingtao|Y",
      "lychee": "lizhi|L",
      "grape": "qingti|Q",
      "yuzu": "youziyouzizhi|Y",
      "longan": "guiyuanlongyan|G",
      "passionfruit": "baixiangguo|B",
      "mango": "mangguo|M",
      "watermelon": "xigua|X",
      "apple": "pingguo|P",
      "peach-fruit": "taozi|T",
      "pear": "li|L",
      "blueberry": "lanmei|L",
      "raspberry": "fupenzi|F",
      "blackberry": "heimei|H",
      "fig": "wuhuaguo|W",
      "guava": "fanshiliu|F",
      "kiwi": "mihoutao|M",
      "hawthorn": "shanzha|S",
      "goji": "gouqi|G",
      "plum": "qingmeihuamei|Q",
      "mint": "bohe|B",
      "basil": "luole|L",
      "rosemary": "midiexiang|M",
      "cucumber": "huanggua|H",
      "ginger": "shengjiang|S",
      "olive": "ganlan|G",
      "celery": "xiqin|X",
      "osmanthus": "guihua|G",
      "matcha": "mochafen|M",
      "coffee-bean": "kafeidou|K",
      "lemon-grass": "ningmengcao|N",
      "shiso": "zisuye|Z",
      "thyme": "bailixiang|B",
      "sage": "shuweicao|S",
      "cilantro": "xiangcai|X",
      "star-anise": "bajiao|B",
      "cinnamon-stick": "rouguibang|R",
      "edible-flower": "shiyonghuaban|S",
      "ice": "bingkuai|B",
      "nutmeg": "roudoukou|R",
    },
    recipes: {
      "gin-tonic": "jintangli|J",
      "dry-martini": "ganmatianni|G",
      "negroni": "nigeluoni|N",
      "mojito": "mojituo|M",
      "cosmopolitan": "dadouhui|D",
      "whiskey-sour": "weishijisuan|W",
      "old-fashioned": "gudian|G",
      "margarita": "magelite|M",
      "daiquiri": "daijili|D",
      "long-island": "changdaobingcha|C",
      "bloody-mary": "xuexingmali|X",
      "white-russian": "baiseeluosi|B",
      "manhattan": "manhadun|M",
      "sidecar": "bianche|B",
      "mai-tai": "maitai|M",
      "tequila-sunrise": "longshelanrichu|L",
      "espresso-martini": "nongsuokafeimatianni|N",
      "aperol-spritz": "apeiluoqipao|A",
      "moscow-mule": "mosikeluozi|M",
      "pina-colada": "yelinpiaoxiang|Y",
      "dark-stormy": "heianfengbao|H",
      "gin-fizz": "jinfeishi|J",
      "tom-collins": "tangmukelinsi|T",
      "paloma": "paluoma|P",
      "caipirinha": "kapiliya|K",
      "b52": "b52hongzhaji|B",
      "whisky-highball": "weishijigaoqiu|W",
      "mint-julep": "bohezhulipu|B",
      "sazerac": "sazelake|S",
      "americano": "meiguolao|M",
      "boulevardier": "huahuagongzi|H",
      "gimlet": "jimuleite|J",
      "bees-knees": "fengzhixi|F",
      "french-75": "falanxi75|F",
      "white-lady": "baisejiaren|B",
      "aviation": "feixing|F",
      "last-word": "linbieyiyu|L",
      "clover-club": "sanyecaojulebu|S",
      "bramble": "jingji|J",
      "penicillin": "pannixilin|P",
      "pisco-sour": "pisikesuan|P",
      "amaretto-sour": "xingrensuan|X",
      "gold-rush": "taojinre|T",
      "corpse-reviver": "huanhunshi2hao|H",
      "martinez": "madingneisi|M",
      "hanky-panky": "shoupayouxi|S",
      "toronto": "duolunduo|D",
      "singapore-sling": "xinjiaposiling|X",
      "jungle-bird": "conglinniao|C",
      "zombie": "jiangshi|J",
      "hurricane": "jufeng|J",
      "painkiller": "zhitongyao|Z",
      "blue-hawaii": "lansexiaweiyi|L",
      "cuba-libre": "ziyouguba|Z",
      "greyhound": "huigou|H",
      "sea-breeze": "haifeng|H",
      "bellini": "beilini|B",
      "mimosa": "hanxiucao|H",
      "grasshopper": "zhameng|Z",
      "mudslide": "nishiliu|N",
      "alexander": "yalishanda|Y",
      "godfather": "jiaofu|J",
      "irish-coffee": "aierlankafei|A",
      "kentucky-mule": "kentajiluozi|K",
      "gin-basil-smash": "jinjiuluole|J",
      "negroni-sbagliato": "nigeluoniqipao|N",
      "garibaldi": "jialibodi|J",
      "michelada": "miqielada|M",
      "john-collins": "yuehankelinsi|Y",
      "harvey-wallbanger": "haweizhuangqiang|H",
      "lemon-drop": "ningmengdi|N",
      "kamikaze": "shenfeng|S",
      "sex-on-the-beach": "xingganshatan|X",
      "espresso-tonic": "nongsuotangli|N",
      "black-russian": "heiseeluosi|H",
      "screwdriver": "luosiqizi|L",
      "custom-lychee-rose": "lizhimeiguiqipao|L",
      "custom-grape-tonic": "qingtiqipaotetiao|Q",
      "custom-osmanthus-whisky": "guihuameijiuweishiji|G",
      "custom-matcha-colada": "mochayexianglangmu|M",
      "custom-baijiu-lemon": "baijiuningmenggaoqiu|B",
      "custom-plum-soda": "qingmeiqipaotetiao|Q",
      "custom-hawthorn-gin": "shanzhajinjiusuan|S",
      "custom-goji-whisky": "gouqiguiyuanweishiji|G",
      "custom-passionfruit-mojito": "baixiangguomojituo|B",
    }
  },

  /* ---------- 默认账号与站点设置 ---------- */
  users: [
    {
      id: "u-admin", username: "admin", password: "Cocktail@2026", role: "admin",
      nickname: "站长", createdAt: "2026-01-01",
      intro: "站点管理员：负责材料库、配方审核、评论管理与用户权限。"
    },
    {
      id: "u-demo", username: "demo", password: "123456", role: "user",
      nickname: "爱喝莫吉托的人", createdAt: "2026-01-01",
      intro: "普通用户：可以发布配方、推荐视频、评论和收藏。"
    }
  ],

  settings: {
    siteName: "鸡尾酒法典",
    slogan: "看看冰箱里有什么，再决定今晚喝什么",
    allowUserPublish: true,        // 允许普通用户发布配方
    needReview: false,             // 用户发布的配方是否需要管理员审核后才公开
    allowUserVideo: true,          // 允许用户给配方补充视频链接
    allowUserEditOwnRecipe: true,  // 允许用户编辑自己发布的配方
    allowUserDeleteOwnRecipe: true, // 允许用户删除自己发布的配方
    allowUserComment: true,        // 允许用户发表评论
    allowUserDeleteOwnComment: true, // 允许用户删除自己的评论
    allowUserReport: true,         // 允许用户提交勘误（报错）
    allowUserPost: true,           // 允许用户在交流区发帖
    postReviewMode: "auto",        // 帖子审核：all 全部先审 / auto 规则+AI 自动判断 / none 不审
    aiReviewEnabled: false,        // 是否启用 AI 复核（需要在下面填云函数地址）
    aiReviewEndpoint: "",          // 例如 https://xxx.service.tcloudbase.com/review-post
    commentPageSize: 10            // 评论区每次加载条数
  },

  /* ---------- 示例评论（hoursAgo 会在首次载入时换算成真实时间） ---------- */
  comments: [
    { id: "c-seed-1", recipeId: "gin-tonic", userId: "u-demo", username: "demo", nickname: "爱喝莫吉托的人",
      content: "按这个比例做了，汤力水一定要冰镇，差别很大！", hoursAgo: 30, likes: ["u-admin"], pinned: true },
    { id: "c-seed-2", recipeId: "gin-tonic", userId: "u-admin", username: "admin", nickname: "站长",
      content: "补一个小技巧：青柠角先在杯口擦一圈再放进去，香气会更明显。", hoursAgo: 20, likes: ["u-demo"] },
    { id: "c-seed-3", recipeId: "mojito", userId: "u-demo", username: "demo", nickname: "爱喝莫吉托的人",
      content: "薄荷千万别捣太狠，会发苦，轻压两下就够了。", hoursAgo: 8, likes: ["u-admin"] },
    { id: "c-seed-4", recipeId: "negroni", userId: "u-demo", username: "demo", nickname: "爱喝莫吉托的人",
      content: "第一次喝有点苦，第二次就上瘾了，建议冰块放足一点。", hoursAgo: 3, likes: [] },
    { id: "c-seed-5", recipeId: "espresso-martini", userId: "u-demo", username: "demo", nickname: "爱喝莫吉托的人",
      content: "咖啡一定要现萃的，摇的时候用力一点才有那层奶泡。", hoursAgo: 1, likes: ["u-admin"] }
  ],

  /* ---------- 交流区示例帖（hoursAgo 同样会在首次载入时换算成真实时间） ---------- */
  posts: [
    {
      title: "新手想入坑，第一瓶金酒买哪个？",
      content: "预算 200 以内，主要想调金汤力和干马天尼。网上看花眼了，有人说必富达有人说添加利，还有人推荐国产的。\n\n有实际喝过的朋友说说吗？",
      category: "求助", authorKey: "demo", hoursAgo: 6, likes: ["u-admin"], comments: [
        { authorKey: "admin", content: "先买一瓶标准的伦敦干金（比如必富达）就够用了，等你喝出偏好再换。", hoursAgo: 5 }
      ]
    },
    {
      title: "分享一个在家做透明大冰块的方法",
      content: "之前用冰箱自带的冰格，冰块又小又不透明，化得特别快。\n\n后来换了个办法：用保温箱冻一大块，冻 24 小时以上，中间的水连续搅两次，出来的冰块又透又耐化，切开来一块能顶一晚上。",
      category: "分享", authorKey: "admin", hoursAgo: 20, likes: []
    },
    {
      title: "喝了二十来款经典之后，按难度排个序",
      content: "按新手友好程度排的，个人感受：\n1. 金汤力 / 自由古巴 —— 基本不会失败\n2. 威士忌高球 / 莫斯科骡子 —— 注意比例就行\n3. 莫吉托 / 龙舌兰日出 —— 多两步但很快\n4. 酸类（威士忌酸、代基里、玛格丽特）—— 摇匀是关键\n5. 搅拌类（马天尼、尼格罗尼）—— 冰和水比最难把握\n\n大家觉得呢？",
      category: "心得", authorKey: "demo", hoursAgo: 30, likes: ["u-admin", "u-demo"]
    },
    {
      title: "莫吉托的薄荷老是捣苦，求正确手法",
      content: "每次按教程压薄荷，做出来总有一股苦涩味。\n\n是不是我压太狠了？大家一般压几下、用多少薄荷？",
      category: "求助", authorKey: "demo", hoursAgo: 3, likes: ["u-admin"],
      recipeTags: ["mojito"],
      comments: [
        { authorKey: "admin", content: "轻压两下出香就够了，压碎叶子就会发苦。另外薄荷最后再加一把会更清爽。", hoursAgo: 2 }
      ]
    },
    {
      title: "尼格罗尼试了三种比例，说说感受",
      content: "1:1:1 是标准版，苦味比较冲；\n1:1:0.5（少放味美思）更硬朗适合老手；\n1:0.75:1 甜一点，新手会更容易接受。\n\n大家平时用哪种？",
      category: "心得", authorKey: "admin", hoursAgo: 12, likes: ["u-demo"], recipeTags: ["negroni"]
    }
  ]
};
