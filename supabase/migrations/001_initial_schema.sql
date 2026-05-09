-- profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  email text not null,
  country_code text not null,
  created_at timestamptz default now(),
  elo int default 1000,
  division text default 'bronze',
  matches_played int default 0,
  matches_won int default 0,
  total_correct int default 0,
  total_questions int default 0,
  current_streak int default 0,
  best_streak int default 0,
  card_seed int default 0
);

-- leads
create table leads (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  country_code text,
  source text default 'trivia',
  created_at timestamptz default now(),
  synced_at timestamptz
);

-- questions
create table questions (
  id text primary key,
  cat text not null,
  wc int,
  decade text,
  diff int not null check (diff between 1 and 3),
  q text not null,
  options jsonb not null,
  correct int not null check (correct between 0 and 3),
  explanation text
);
create index questions_cat_diff on questions(cat, diff);
create index questions_decade on questions(decade);

-- matches
create table matches (
  id uuid primary key default gen_random_uuid(),
  player_a uuid references profiles(id),
  player_b uuid references profiles(id),
  status text not null default 'waiting',
  current_round int default 1,
  selected_categories jsonb,
  questions_used jsonb default '[]',
  started_at timestamptz default now(),
  finished_at timestamptz,
  winner uuid references profiles(id)
);

-- match_rounds
create table match_rounds (
  id uuid primary key default gen_random_uuid(),
  match_id uuid references matches(id) on delete cascade,
  round_num int not null,
  player uuid references profiles(id),
  category text not null,
  questions jsonb not null,
  answers jsonb,
  correct_count int,
  time_taken_ms int,
  played_at timestamptz
);

-- achievements
create table achievements (
  id text primary key,
  name text not null,
  description text not null,
  icon text not null,
  rarity text not null,
  condition jsonb not null
);

-- user_achievements
create table user_achievements (
  user_id uuid references profiles(id) on delete cascade,
  achievement_id text references achievements(id),
  unlocked_at timestamptz default now(),
  primary key (user_id, achievement_id)
);

-- rankings_weekly
create table rankings_weekly (
  user_id uuid primary key references profiles(id),
  week_start date not null,
  points int default 0,
  matches int default 0,
  rank_global int,
  rank_country int,
  updated_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table profiles enable row level security;
alter table leads enable row level security;
alter table questions enable row level security;
alter table matches enable row level security;
alter table match_rounds enable row level security;
alter table achievements enable row level security;
alter table user_achievements enable row level security;
alter table rankings_weekly enable row level security;

-- profiles policies
create policy "profiles_select_all"
  on profiles for select
  using (true);

create policy "profiles_update_own"
  on profiles for update
  using (auth.uid() = id);

create policy "profiles_delete_own"
  on profiles for delete
  using (auth.uid() = id);

-- leads policies
create policy "leads_insert_anon"
  on leads for insert
  with check (true);

create policy "leads_select_service_role"
  on leads for select
  using (auth.role() = 'service_role');

create policy "leads_update_service_role"
  on leads for update
  using (auth.role() = 'service_role');

-- questions policies
create policy "questions_select_all"
  on questions for select
  using (true);

-- matches policies
create policy "matches_select_participants"
  on matches for select
  using (auth.uid() = player_a or auth.uid() = player_b);

create policy "matches_insert_authenticated"
  on matches for insert
  with check (auth.role() = 'authenticated');

create policy "matches_update_participants"
  on matches for update
  using (auth.uid() = player_a or auth.uid() = player_b);

-- match_rounds policies
create policy "match_rounds_select_participants"
  on match_rounds for select
  using (
    exists (
      select 1 from matches m
      where m.id = match_id
        and (m.player_a = auth.uid() or m.player_b = auth.uid())
    )
  );

create policy "match_rounds_insert_player"
  on match_rounds for insert
  with check (auth.uid() = player);

create policy "match_rounds_update_player"
  on match_rounds for update
  using (auth.uid() = player);

-- achievements policies
create policy "achievements_select_all"
  on achievements for select
  using (true);

-- user_achievements policies
create policy "user_achievements_select_own"
  on user_achievements for select
  using (auth.uid() = user_id);

create policy "user_achievements_insert_service_role"
  on user_achievements for insert
  with check (auth.role() = 'service_role');

-- rankings_weekly policies
create policy "rankings_weekly_select_all"
  on rankings_weekly for select
  using (true);
