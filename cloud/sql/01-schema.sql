-- 鸡尾酒法典 · 建表脚本（在云开发「SQL 编辑器」里整段执行）
-- 说明：数组和对象统一用 jsonb 存，读写简单、和前端的数据结构一致

-- 用户
create table if not exists users (
  id text primary key,
  phone text unique,
  username text,
  nickname text,
  salt text,
  hash text,
  role text not null default 'user',
  intro text not null default '',
  favorites jsonb not null default '[]'::jsonb,
  post_favorites jsonb not null default '[]'::jsonb,
  my_ingredients jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- 登录会话
create table if not exists sessions (
  token text primary key,
  user_id text not null,
  expires_at bigint not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_sessions_user on sessions(user_id);

-- 材料库
create table if not exists ingredients (
  id text primary key,
  name text not null,
  cat text not null,
  emoji text not null default '',
  aka text not null default '',
  alias text not null default '',
  is_basic boolean not null default false,
  py text not null default '',
  initial text not null default '#',
  created_at timestamptz not null default now()
);
create index if not exists idx_ingredients_cat on ingredients(cat);
create index if not exists idx_ingredients_initial on ingredients(initial);

-- 配方
create table if not exists recipes (
  id text primary key,
  name text not null,
  en text not null default '',
  alias text not null default '',
  type text not null default 'custom',
  emoji text not null default '🍹',
  color text not null default '',
  glass text not null default '',
  abv text not null default '',
  "desc" text not null default '',
  image text not null default '',
  video text not null default '',
  video_name text not null default '',
  tags jsonb not null default '[]'::jsonb,
  items jsonb not null default '[]'::jsonb,
  steps jsonb not null default '[]'::jsonb,
  py text not null default '',
  initial text not null default '#',
  author_id text not null default 'u-admin',
  author text not null default '官方',
  status text not null default 'approved',
  views integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_recipes_type on recipes(type);
create index if not exists idx_recipes_status on recipes(status);

-- 配方评论（target_type 固定 recipe，为以后扩展保留）
create table if not exists comments (
  id text primary key,
  target_type text not null default 'recipe',
  target_id text not null,
  user_id text not null,
  username text not null default '',
  nickname text not null default '',
  content text not null,
  parent_id text,
  likes jsonb not null default '[]'::jsonb,
  pinned boolean not null default false,
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_comments_target on comments(target_id);

-- 交流区帖子
create table if not exists posts (
  id text primary key,
  title text not null,
  content text not null,
  images jsonb not null default '[]'::jsonb,
  category text not null default '闲聊',
  recipe_tags jsonb not null default '[]'::jsonb,
  author_id text not null,
  username text not null default '',
  nickname text not null default '',
  status text not null default 'approved',
  review jsonb not null default '{}'::jsonb,
  reject_reason text not null default '',
  likes jsonb not null default '[]'::jsonb,
  views integer not null default 0,
  comments jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists idx_posts_status on posts(status);
create index if not exists idx_posts_created on posts(created_at desc);

-- 勘误
create table if not exists reports (
  id text primary key,
  recipe_id text,
  recipe_name text not null default '',
  type text not null default '其他问题',
  content text not null,
  suggest text not null default '',
  user_id text not null,
  username text not null default '',
  nickname text not null default '',
  status text not null default 'pending',
  created_at timestamptz not null default now()
);

-- 站点设置（只有一行，id 固定为 site）
create table if not exists settings (
  id text primary key,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);
