-- 09-recipe-variants.sql
-- 作用：给每杯酒增加「其他做法」字段（同一杯酒的多个配方版本）。
--       经典配方本身仍然是 recipes 表里那一行，其他人的做法以 JSON 数组存在 variants 里。
--
-- 在「云开发控制台 → SQL 型数据库 → SQL 编辑器」里执行，可重复执行。

alter table recipes
  add column if not exists variants jsonb not null default '[]'::jsonb;

-- 看一眼结果：做法数应该都是 0（刚加的字段）
select id, name, jsonb_array_length(variants) as 做法数
from recipes
order by created_at desc
limit 5;
