-- 07-fix-phone-unique.sql
-- 修一个坑：users 表建表时写的是 phone text unique，
-- 意思是「手机号不能重复」。但改成邮箱注册以后，注册时手机号是空的，
-- 于是第二个人注册时就会报：
--     duplicate key value violates unique constraint "users_phone_key"
--     （翻译：空手机号重复了）
--
-- 处理办法：把「手机号唯一」改成「填了手机号才要求唯一」，空的不管。
-- 在「云开发控制台 → SQL 型数据库 → SQL 编辑器」里整段执行。

-- 1. 先干掉原来那个把空值也算进去的唯一约束
alter table users drop constraint if exists users_phone_key;

-- 2. 换成"只在真的填了手机号时才唯一"（保证老账号的手机号依然不重复）
create unique index if not exists idx_users_phone
  on users (phone)
  where phone is not null and phone <> '';

-- 3. 历史上那些空字符串统一改成 NULL（干净一点，也避免以后再撞）
update users set phone = null where phone = '';

-- 4. 看看结果：phone 空的账号应该显示成 NULL，不再互相冲突
select id, email, phone, nickname, role, created_at from users order by created_at;
