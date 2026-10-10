-- Netzroller: Weltrangliste und Online-Highscore
-- Im Supabase-Dashboard unter «SQL Editor» → «New query» einfügen und mit «Run» ausführen.
-- Das Skript kann gefahrlos mehrmals ausgeführt werden.
--
-- Sicherheitskonzept:
--   * Lesen dürfen alle (die Rangliste ist öffentlich), aber nur Name, Land und Spielwerte.
--   * Schreiben geht nur über die drei Funktionen unten. Jede prüft den geheimen Schlüssel des Profils:
--     Gespeichert wird nur dessen SHA-256-Prüfsumme, nie der Schlüssel selbst.
--   * Einfache Plausibilitätsprüfungen und höchstens ein Eintrag pro Minute und Spieler.

create extension if not exists pgcrypto with schema extensions;

-- ---------- Tabellen ----------
create table if not exists public.players (
  id          uuid primary key,
  key_hash    text not null,
  name        text not null check (char_length(name) between 1 and 14),
  land        text not null check (land ~ '^[A-Z]{2}$'),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table if not exists public.scores (
  id          bigint generated always as identity primary key,
  player_id   uuid not null references public.players (id) on delete cascade,
  mode        text not null default 'machine' check (mode in ('machine')),
  points      integer not null check (points between 0 and 1000000),
  speed       integer not null check (speed between 0 and 5000),
  created_at  timestamptz not null default now()
);
create index if not exists scores_best on public.scores (mode, points desc);
create index if not exists scores_player on public.scores (player_id, created_at desc);

create table if not exists public.career (
  player_id       uuid primary key references public.players (id) on delete cascade,
  ranking_points  integer not null check (ranking_points between 0 and 100000),
  titles          integer not null check (titles between 0 and 10000),
  best_rank       integer not null check (best_rank between 1 and 64),
  updated_at      timestamptz not null default now()
);

-- ---------- Zugriffsregeln ----------
alter table public.players enable row level security;
alter table public.scores  enable row level security;
alter table public.career  enable row level security;

drop policy if exists "alle lesen" on public.players;
drop policy if exists "alle lesen" on public.scores;
drop policy if exists "alle lesen" on public.career;
create policy "alle lesen" on public.players for select using (true);
create policy "alle lesen" on public.scores  for select using (true);
create policy "alle lesen" on public.career  for select using (true);

-- Direkt schreiben darf niemand; die Prüfsumme des Schlüssels ist nicht lesbar.
revoke insert, update, delete on public.players, public.scores, public.career from anon, authenticated;
revoke select on public.players from anon, authenticated;
grant select (id, name, land, created_at, updated_at) on public.players to anon, authenticated;
grant select on public.scores, public.career to anon, authenticated;

-- ---------- Funktionen zum Schreiben ----------
create or replace function public.nr_hash(p_key text) returns text
language sql immutable as $$ select encode(extensions.digest(p_key, 'sha256'), 'hex') $$;

/** Spieler anlegen oder Name/Land ändern. Beim ersten Aufruf wird der Schlüssel festgelegt. */
create or replace function public.nr_register(p_id uuid, p_key text, p_name text, p_land text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_key is null or char_length(p_key) < 20 then raise exception 'Schlüssel zu kurz'; end if;
  if exists (select 1 from players where id = p_id and key_hash <> nr_hash(p_key)) then
    raise exception 'Schlüssel passt nicht';
  end if;
  insert into players (id, key_hash, name, land) values (p_id, nr_hash(p_key), p_name, p_land)
  on conflict (id) do update set name = excluded.name, land = excluded.land, updated_at = now();
end $$;

/** Ergebnis der Ballmaschine eintragen. */
create or replace function public.nr_submit_score(p_id uuid, p_key text, p_points integer, p_speed integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from players where id = p_id and key_hash = nr_hash(p_key)) then
    raise exception 'Schlüssel passt nicht';
  end if;
  if p_points < 0 or p_points > 1000000 or p_speed < 0 or p_speed > 5000 then raise exception 'unplausibel'; end if;
  if exists (select 1 from scores where player_id = p_id and created_at > now() - interval '1 minute') then
    raise exception 'höchstens ein Eintrag pro Minute';
  end if;
  insert into scores (player_id, points, speed) values (p_id, p_points, p_speed);
end $$;

/** Stand der Karriere eintragen (ersetzt den alten). */
create or replace function public.nr_submit_career(p_id uuid, p_key text, p_points integer, p_titles integer, p_best integer)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not exists (select 1 from players where id = p_id and key_hash = nr_hash(p_key)) then
    raise exception 'Schlüssel passt nicht';
  end if;
  if p_points < 0 or p_points > 100000 or p_titles < 0 or p_titles > 10000 or p_best < 1 or p_best > 64 then
    raise exception 'unplausibel';
  end if;
  if exists (select 1 from career where player_id = p_id and updated_at > now() - interval '1 minute') then
    raise exception 'höchstens ein Eintrag pro Minute';
  end if;
  insert into career (player_id, ranking_points, titles, best_rank) values (p_id, p_points, p_titles, p_best)
  on conflict (player_id) do update
    set ranking_points = excluded.ranking_points, titles = excluded.titles, best_rank = excluded.best_rank, updated_at = now();
end $$;

revoke all on function public.nr_hash(text) from public, anon, authenticated;
grant execute on function public.nr_register(uuid, text, text, text) to anon, authenticated;
grant execute on function public.nr_submit_score(uuid, text, integer, integer) to anon, authenticated;
grant execute on function public.nr_submit_career(uuid, text, integer, integer, integer) to anon, authenticated;

-- ---------- Ansicht für die Weltrangliste ----------
create or replace view public.world_ranking with (security_invoker = on) as
select
  p.id, p.name, p.land,
  coalesce(c.ranking_points, 0) as ranking_points,
  coalesce(c.titles, 0)         as titles,
  c.best_rank,
  (select max(s.points) from scores s where s.player_id = p.id) as machine_best,
  (select max(s.speed)  from scores s where s.player_id = p.id) as machine_speed,
  greatest(p.updated_at, c.updated_at) as updated_at
from players p
left join career c on c.player_id = p.id;

grant select on public.world_ranking to anon, authenticated;
