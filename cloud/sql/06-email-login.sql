-- 06-email-login.sql
-- 作用：把登录方式从「手机号」升级成「邮箱」。
--       1) users 表加 email 字段
--       2) 管理员账号的登录邮箱设为 3246713776@qq.com
--       3) 新建 verify_codes 表（存注册/重置密码用的邮箱验证码）
--
-- 在「云开发控制台 → SQL 型数据库 → SQL 编辑器」里整段粘贴执行。
-- 每条语句都写成可重复执行的形式，跑第二遍也不会报错、不会弄坏数据。

-- 1. 加邮箱字段
alter table users add column if not exists email text;

-- 2. 管理员改成用邮箱登录（密码不用动，还是原来那个）
update users set email = '3246713776@qq.com' where id = 'u-admin';

-- 3. 邮箱不允许重复注册（空值不算重复，老账号没填邮箱也不影响）
create unique index if not exists idx_users_email
  on users (lower(email))
  where email is not null and email <> '';

-- 4. 验证码表
create table if not exists verify_codes (
  id text primary key,
  target text not null,                        -- 收验证码的邮箱
  code text not null,                          -- 6 位数字验证码
  purpose text default 'register',             -- register 注册 / reset 重置密码
  expires_at bigint not null,                  -- 过期时间（毫秒时间戳）
  created_at timestamptz not null default now()
);
create index if not exists idx_verify_target on verify_codes (target);
create index if not exists idx_verify_expires on verify_codes (expires_at);

-- 5. 云函数是以 anon 角色连数据库的，必须给权限，否则会报 permission denied
grant select, insert, update, delete on verify_codes to anon;
grant select, insert, update, delete on users to anon;

-- 6. 看一眼结果：u-admin 那一行的 email 应该是 3246713776@qq.com
select id, email, phone, nickname, role from users order by created_at;
