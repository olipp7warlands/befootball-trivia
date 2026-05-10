-- Bot support: columns on profiles + bot_personas pool
alter table profiles add column if not exists is_bot boolean default false;
alter table profiles add column if not exists bot_skill numeric(3,2);
alter table profiles add column if not exists bot_response_speed text;
alter table profiles add column if not exists last_active_at timestamptz default now();

-- Fast look-ups for matchmaking
create index if not exists profiles_elo_division
  on profiles(division, elo)
  where is_bot = false or is_bot is null;

create index if not exists profiles_bot_pool
  on profiles(division, elo)
  where is_bot = true;

-- Pool of human-sounding personas for bot generation
create table if not exists bot_personas (
  id           uuid primary key default gen_random_uuid(),
  first_name   text not null,
  username_pattern text not null,
  country_code text not null,
  weight       int  default 1,
  used_count   int  default 0
);
