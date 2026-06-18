-- 2026 생활문화플랫폼·민간공간 평가 온라인시스템 DB 스키마
-- Supabase (PostgreSQL)

-- ─────────────────────────────────────────────
-- 1. 사용자·역할
-- ─────────────────────────────────────────────

create type user_role as enum ('admin', 'evaluator');

create table profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  role        user_role not null default 'evaluator',
  name        text not null,
  email       text not null,
  created_at  timestamptz not null default now()
);

-- 신규 auth 사용자 생성 시 profiles 자동 생성
create or replace function handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into profiles (id, role, name, email)
  values (
    new.id,
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'evaluator'),
    coalesce(new.raw_user_meta_data->>'name', ''),
    new.email
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure handle_new_user();

-- ─────────────────────────────────────────────
-- 2. 평가 대상
-- ─────────────────────────────────────────────

create type instrument_type as enum (
  'platform_foundation',  -- 플랫폼 기초재단
  'platform_org',         -- 플랫폼 유관기관·단체
  'private_space_foundation' -- 민간공간 기초재단
);

create type operation_stage as enum ('진입', '성장');
create type target_model as enum ('개방-일반형', '특정-공동체형', '혼합형');
create type fiscal_year_type as enum ('신규', '연속');

create table subjects (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  instrument      instrument_type not null,
  stage           operation_stage,          -- 플랫폼용(진입/성장), 민간공간은 null
  fiscal_year     fiscal_year_type,         -- 민간공간용(신규/연속), 플랫폼은 null
  target_model    target_model,             -- 다양성·개방성 위원 지침 분기용
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 3. 위원 배정
-- ─────────────────────────────────────────────

create table assignments (
  id           uuid primary key default gen_random_uuid(),
  subject_id   uuid not null references subjects(id) on delete cascade,
  evaluator_id uuid not null references profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  unique (subject_id, evaluator_id)
);

-- ─────────────────────────────────────────────
-- 4. 개인 평가
-- ─────────────────────────────────────────────

create type evaluation_status as enum ('draft', 'submitted');

create table evaluations (
  id              uuid primary key default gen_random_uuid(),
  assignment_id   uuid not null references assignments(id) on delete cascade,
  status          evaluation_status not null default 'draft',
  submitted_at    timestamptz,
  -- 채점 결과(제출 시 스냅샷)
  area_scores     jsonb,   -- { "A": 8.3, "B": 12.1, ... }
  total_score     numeric(5,2),
  grade           char(1),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (assignment_id)   -- 배정당 평가 1건
);

-- 제출 후 수정 방지 트리거
create or replace function prevent_submitted_edit()
returns trigger language plpgsql as $$
begin
  if old.status = 'submitted' then
    raise exception '제출된 평가는 수정할 수 없습니다.';
  end if;
  return new;
end;
$$;

create trigger evaluations_immutable
  before update on evaluations
  for each row execute procedure prevent_submitted_edit();

-- ─────────────────────────────────────────────
-- 5. 문항별 응답
-- ─────────────────────────────────────────────

create table responses (
  id              uuid primary key default gen_random_uuid(),
  evaluation_id   uuid not null references evaluations(id) on delete cascade,
  item_code       text not null,   -- "A1", "B3", ...
  score           smallint check (score between 1 and 7),  -- 리커트 7점
  qualitative     text,            -- 정성 텍스트
  updated_at      timestamptz not null default now(),
  unique (evaluation_id, item_code)
);

-- 제출된 평가의 응답 수정 방지
create or replace function prevent_response_edit_if_submitted()
returns trigger language plpgsql as $$
declare
  ev_status evaluation_status;
begin
  select status into ev_status
  from evaluations
  where id = coalesce(new.evaluation_id, old.evaluation_id);

  if ev_status = 'submitted' then
    raise exception '제출된 평가의 응답은 수정할 수 없습니다.';
  end if;
  return new;
end;
$$;

create trigger responses_immutable
  before update or delete on responses
  for each row execute procedure prevent_response_edit_if_submitted();

-- ─────────────────────────────────────────────
-- 6. 보정(합의) 기록
-- ─────────────────────────────────────────────

create table reconciliations (
  id              uuid primary key default gen_random_uuid(),
  subject_id      uuid not null references subjects(id) on delete cascade,
  author_id       uuid not null references profiles(id),  -- 관리자
  area_scores     jsonb not null,   -- 합의 영역 점수
  total_score     numeric(5,2) not null,
  grade           char(1) not null,
  reason          text,
  created_at      timestamptz not null default now()
  -- 불변: update 트리거 없음, 새 기록 추가 방식
);

-- ─────────────────────────────────────────────
-- 7. 민간공간 — 재단 자가진단
-- ─────────────────────────────────────────────

create table foundation_self_assessments (
  id              uuid primary key default gen_random_uuid(),
  subject_id      uuid not null references subjects(id) on delete cascade,
  responses       jsonb not null,   -- { "Q1": "51~75%", "Q2": "26~50%", ... }
  submitted_at    timestamptz not null default now(),
  unique (subject_id)
);

-- ─────────────────────────────────────────────
-- 8. 민간공간 — 운영자 자가진단 (토큰 링크)
-- ─────────────────────────────────────────────

create table operator_tokens (
  id              uuid primary key default gen_random_uuid(),
  subject_id      uuid not null references subjects(id) on delete cascade,
  token           text not null unique default encode(gen_random_bytes(24), 'base64url'),
  space_name      text not null,
  expires_at      timestamptz,
  used_at         timestamptz,
  created_at      timestamptz not null default now()
);

create table operator_self_assessments (
  id              uuid primary key default gen_random_uuid(),
  token_id        uuid not null references operator_tokens(id) on delete cascade,
  subject_id      uuid not null references subjects(id),
  responses       jsonb not null,   -- { "Q1": "그렇다", "Q2": "매우그렇다", ... }
  submitted_at    timestamptz not null default now(),
  unique (token_id)
);

-- ─────────────────────────────────────────────
-- 9. 배점 변경 이력
-- ─────────────────────────────────────────────

create table weight_change_logs (
  id              uuid primary key default gen_random_uuid(),
  instrument      instrument_type not null,
  stage           text,            -- 성장/진입/all
  changed_by      uuid references profiles(id),
  previous_weights jsonb not null,
  new_weights     jsonb not null,
  affected_count  int,             -- 영향받는 평가 수
  created_at      timestamptz not null default now()
);

-- ─────────────────────────────────────────────
-- 10. Row Level Security
-- ─────────────────────────────────────────────

alter table profiles enable row level security;
alter table subjects enable row level security;
alter table assignments enable row level security;
alter table evaluations enable row level security;
alter table responses enable row level security;
alter table reconciliations enable row level security;
alter table foundation_self_assessments enable row level security;
alter table operator_tokens enable row level security;
alter table operator_self_assessments enable row level security;
alter table weight_change_logs enable row level security;

-- profiles: 본인만 조회, 관리자는 전체
create policy "본인 프로필 조회" on profiles for select
  using (auth.uid() = id);
create policy "관리자 전체 조회" on profiles for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- subjects: 로그인 사용자 조회, 관리자만 수정
create policy "로그인 사용자 대상 조회" on subjects for select
  using (auth.uid() is not null);
create policy "관리자 대상 관리" on subjects for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- assignments: 위원은 본인 배정, 관리자 전체
create policy "위원 본인 배정 조회" on assignments for select
  using (evaluator_id = auth.uid());
create policy "관리자 배정 관리" on assignments for all
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- evaluations: 위원은 본인 평가, 관리자 전체
create policy "위원 본인 평가" on evaluations for all
  using (
    exists (
      select 1 from assignments
      where assignments.id = evaluations.assignment_id
      and assignments.evaluator_id = auth.uid()
    )
  );
create policy "관리자 평가 조회" on evaluations for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- responses: 위원은 본인 평가의 응답
create policy "위원 응답 관리" on responses for all
  using (
    exists (
      select 1 from evaluations e
      join assignments a on a.id = e.assignment_id
      where e.id = responses.evaluation_id
      and a.evaluator_id = auth.uid()
    )
  );
create policy "관리자 응답 조회" on responses for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- operator_self_assessments: 토큰 기반 (anon 접근 허용)
create policy "운영자 자가진단 삽입" on operator_self_assessments for insert
  with check (
    exists (select 1 from operator_tokens where id = token_id and used_at is null)
  );
create policy "관리자 운영자 자가진단 조회" on operator_self_assessments for select
  using (exists (select 1 from profiles where id = auth.uid() and role = 'admin'));

-- ─────────────────────────────────────────────
-- 11. 인덱스
-- ─────────────────────────────────────────────

create index on assignments (subject_id);
create index on assignments (evaluator_id);
create index on evaluations (assignment_id);
create index on responses (evaluation_id);
create index on operator_tokens (token);
create index on operator_tokens (subject_id);
