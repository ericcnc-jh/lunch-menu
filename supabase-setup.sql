-- Supabase 대시보드 > SQL Editor 에서 실행하세요.
-- 한 번만 실행하면 됩니다.

-- 공유 데이터 저장 테이블 (한 팀당 한 행)
create table if not exists shared_calendar (
  id text primary key default 'default',
  menus jsonb not null default '{}',
  candidates jsonb not null default '{}',
  updated_at timestamptz not null default now()
);

-- 기존 데이터가 없으면 기본 행 삽입
insert into shared_calendar (id, menus, candidates)
values ('default', '{}', '{}')
on conflict (id) do nothing;

-- 팀 공유용: 링크를 아는 사람은 읽기/쓰기 가능 (anon key 사용)
-- 보안이 중요하면 RLS 정책을 더 좁히세요.
alter table shared_calendar enable row level security;

create policy "Allow read for anon"
  on shared_calendar for select
  using (true);

create policy "Allow insert for anon"
  on shared_calendar for insert
  with check (true);

create policy "Allow update for anon"
  on shared_calendar for update
  using (true);
