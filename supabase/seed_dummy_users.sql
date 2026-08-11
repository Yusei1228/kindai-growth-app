-- ============================================================
-- 検証用ダミーユーザー生成（任意）
-- ランキングの見た目を確認したい / 参加者が少ない初期に母集団を用意したい場合に実行。
-- 49人のダミー profiles + user_stats を作成し、total_score をランダムに割り当てる。
-- 本番参加者と混ざるのが嫌な場合は検証後に削除できるよう nickname に 'DUMMY_' を付与。
-- ============================================================
do $$
declare
  i int;
  uid uuid;
  nm text;
  score int;
  lv int;
begin
  for i in 1..49 loop
    uid := gen_random_uuid();
    nm  := 'DUMMY_' || to_char(i, 'FM00') || 'さん';
    score := (random() * 2000)::int;      -- 0〜2000
    lv := greatest(1, (score / 150)::int); -- スコアからざっくりレベル
    insert into public.profiles (id, nickname) values (uid, nm);
    insert into public.user_stats (user_id, level, exp, total_score, intelligence, strength, vitality, charm)
    values (
      uid, lv, 0, score,
      20 + (random()*60)::int,
      20 + (random()*60)::int,
      20 + (random()*60)::int,
      20 + (random()*60)::int
    );
  end loop;
end $$;

-- ダミーを消したいとき:
-- delete from public.profiles where nickname like 'DUMMY_%';
