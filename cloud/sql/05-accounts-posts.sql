-- 管理员 + 演示账号（密码只存哈希，没有明文）
insert into users (id, phone, username, nickname, salt, hash, role, intro, favorites, post_favorites, my_ingredients) values
('u-admin', '17345930612', '17345930612', '站长', '21060ae7f7a9b359f10718ef1a9ca20d', '2a1d8acc0a1b67d4fb690de33381b8b7cb630f6d7b11e82677a2062f2e5bebaccd975cd64ff5a062b8b7eab9fc9748474c17f076388ef68a7947b5d152ac01aa', 'admin', '站点管理员：负责材料库、配方审核、评论管理与用户权限。', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb),
('u-demo', '', 'demo', '爱喝莫吉托的人', '6f8e437d5303f45f46d85be724af8183', '4ae5386398f1cf480dcf22834bb1ea55dd41428d2f630799e6a35ee963c05ba928202380be5df1bbdfa72bc6b0d82880a2e6ef5be3538aa44756548b04b26ea7', 'user', '演示用普通账号：可以发布配方、推荐视频、评论和收藏。', '[]'::jsonb, '[]'::jsonb, '[]'::jsonb)
on conflict (id) do nothing;

-- 示例评论
insert into comments (id, target_type, target_id, user_id, username, nickname, content, parent_id, likes, pinned, hidden, created_at) values
('c-seed-1', 'recipe', 'gin-tonic', 'u-demo', 'demo', '爱喝莫吉托的人', '按这个比例做了，汤力水一定要冰镇，差别很大！', null, '["u-admin"]'::jsonb, true, false, '2026-09-16T05:02:28.544Z'),
('c-seed-6', 'recipe', 'mojito', 'u-admin', '17345930612', '站长', '薄荷千万别捣太狠，会发苦，轻压两下就够了。', null, '["u-demo"]'::jsonb, false, false, '2026-09-17T03:02:28.544Z')
on conflict (id) do nothing;

-- 示例帖
insert into posts (id, title, content, images, category, recipe_tags, author_id, username, nickname, status, review, reject_reason, likes, views, comments, created_at) values
('seed-post-1', '新手想入坑，第一瓶金酒买哪个？', '预算 200 以内，主要想调金汤力和干马天尼。网上看花眼了，有人说必富达有人说添加利，还有人推荐国产的。

有实际喝过的朋友说说吗？', '[]'::jsonb, '求助', '[]'::jsonb, 'u-demo', 'demo', '爱喝莫吉托的人', 'approved', '{"source":"rule","risk":0,"reasons":[]}'::jsonb, '', '["u-admin"]'::jsonb, 0, '[{"id":"seed-pc-1-1","userId":"u-admin","username":"admin","nickname":"站长","content":"先买一瓶标准的伦敦干金（比如必富达）就够用了，等你喝出偏好再换。","likes":[],"createdAt":"2026-09-17T06:02:28.544Z"}]'::jsonb, '2026-09-17T05:02:28.544Z'),
('seed-post-2', '莫吉托的薄荷老是捣苦，求正确手法', '每次按教程压薄荷，做出来总有一股苦涩味。

是不是我压太狠了？大家一般压几下、用多少薄荷？', '[]'::jsonb, '求助', '["mojito"]'::jsonb, 'u-demo', 'demo', '爱喝莫吉托的人', 'approved', '{"source":"rule","risk":0,"reasons":[]}'::jsonb, '', '["u-admin"]'::jsonb, 0, '[{"id":"seed-pc-2-1","userId":"u-admin","username":"admin","nickname":"站长","content":"轻压两下出香就够了，压碎叶子就会发苦。另外薄荷最后再加一把会更清爽。","likes":[],"createdAt":"2026-09-17T09:02:28.544Z"}]'::jsonb, '2026-09-17T08:02:28.544Z')
on conflict (id) do nothing;

-- 站点设置
insert into settings (id, data) values
('site', '{"siteName":"鸡尾酒法典","slogan":"看看冰箱里有什么，再决定今晚喝什么","allowUserPublish":true,"needReview":false,"allowUserVideo":true,"allowUserEditOwnRecipe":true,"allowUserDeleteOwnRecipe":true,"allowUserComment":true,"allowUserDeleteOwnComment":true,"allowUserReport":true,"allowUserPost":true,"postReviewMode":"auto","aiReviewEnabled":false,"aiReviewEndpoint":"","smsEndpoint":"","commentPageSize":10}'::jsonb)
on conflict (id) do nothing;
