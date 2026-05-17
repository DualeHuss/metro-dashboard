-- Run this once in the Supabase SQL editor.

create table searches (
  id bigserial primary key,
  station_code text not null,
  station_name text,
  searched_at timestamptz default now()
);

-- enable RLS and allow anon access since we don't have auth
alter table searches enable row level security;

create policy "anon read" on searches for select to anon using (true);
create policy "anon insert" on searches for insert to anon with check (true);
