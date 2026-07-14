create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('freelancer', 'recruiter')),
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id text primary key,
  title text not null,
  description text not null,
  budget_min integer not null,
  budget_max integer not null,
  skills text[] not null default '{}',
  deadline date not null,
  status text not null default 'open' check (status in ('open', 'in-progress', 'completed')),
  recruiter_id text not null,
  recruiter_name text not null,
  assigned_freelancer_id text,
  bids_count integer not null default 0,
  category text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.bids (
  id text primary key,
  job_id text not null references public.jobs(id) on delete cascade,
  freelancer_id text not null,
  freelancer_name text not null,
  freelancer_rating numeric not null default 0,
  freelancer_avatar text not null default '',
  amount integer not null,
  proposal text not null,
  delivery_time integer not null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'freelancer')
  )
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    role = excluded.role;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.bids enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles for select
to authenticated
using (true);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "jobs_select_public" on public.jobs;
create policy "jobs_select_public"
on public.jobs for select
to anon, authenticated
using (true);

drop policy if exists "jobs_insert_authenticated" on public.jobs;
create policy "jobs_insert_authenticated"
on public.jobs for insert
to authenticated
with check (auth.uid()::text = recruiter_id);

drop policy if exists "jobs_update_own" on public.jobs;
create policy "jobs_update_own"
on public.jobs for update
to authenticated
using (auth.uid()::text = recruiter_id)
with check (auth.uid()::text = recruiter_id);

drop policy if exists "bids_select_public" on public.bids;
create policy "bids_select_public"
on public.bids for select
to anon, authenticated
using (true);

drop policy if exists "bids_insert_authenticated" on public.bids;
create policy "bids_insert_authenticated"
on public.bids for insert
to authenticated
with check (auth.uid()::text = freelancer_id);

drop policy if exists "bids_update_participants" on public.bids;
create policy "bids_update_participants"
on public.bids for update
to authenticated
using (
  auth.uid()::text = freelancer_id
  or exists (
    select 1
    from public.jobs
    where jobs.id = bids.job_id
      and jobs.recruiter_id = auth.uid()::text
  )
)
with check (
  auth.uid()::text = freelancer_id
  or exists (
    select 1
    from public.jobs
);

-- ==============================================================================
-- CHAT SYSTEM SCHEMA
-- ==============================================================================

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  associated_bid_id text references public.bids(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.rooms enable row level security;

drop policy if exists "rooms_select_participants" on public.rooms;
create policy "rooms_select_participants"
on public.rooms for select
to authenticated
using (
  exists (
    select 1 from public.room_participants
    where room_participants.room_id = rooms.id
    and room_participants.profile_id = auth.uid()::text
  )
);

create table if not exists public.room_participants (
  room_id uuid references public.rooms(id) on delete cascade,
  profile_id text references public.profiles(id) on delete cascade,
  primary key (room_id, profile_id),
  created_at timestamptz not null default now()
);

alter table public.room_participants enable row level security;

drop policy if exists "room_participants_select" on public.room_participants;
create policy "room_participants_select"
on public.room_participants for select
to authenticated
using (
  profile_id = auth.uid()::text
  or exists (
    select 1 from public.room_participants as rp
    where rp.room_id = room_participants.room_id
    and rp.profile_id = auth.uid()::text
  )
);

drop policy if exists "room_participants_insert" on public.room_participants;
create policy "room_participants_insert"
on public.room_participants for insert
to authenticated
with check (profile_id = auth.uid()::text);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id text not null references public.profiles(id) on delete cascade,
  room_id uuid references public.rooms(id) on delete cascade, -- null for global chat
  text text,
  image_url text,
  voice_url text,
  created_at timestamptz not null default now()
);

alter table public.messages alter column sender_id type text using sender_id::text;

alter table public.messages enable row level security;

-- Messages read policy: Can read if it's a global message (room_id is null) 
-- OR if they are a participant of the room.
drop policy if exists "messages_select_public_and_participants" on public.messages;
create policy "messages_select_public_and_participants"
on public.messages for select
to authenticated
using (
  room_id is null
  or exists (
    select 1 from public.room_participants
    where room_participants.room_id = messages.room_id
    and room_participants.profile_id = auth.uid()::text
  )
);

-- Messages insert policy: Can insert if they are the sender and either room is null or they are a participant
drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own"
on public.messages for insert
to authenticated
with check (
  sender_id = auth.uid()::text
  and (
    room_id is null
    or exists (
      select 1 from public.room_participants
      where room_participants.room_id = messages.room_id
      and room_participants.profile_id = auth.uid()::text
    )
  )
);

-- Messages update policy: Only sender can update/delete their own message
drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own"
on public.messages for update
to authenticated
using (sender_id = auth.uid()::text)
with check (sender_id = auth.uid()::text);

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own"
on public.messages for delete
to authenticated
using (sender_id = auth.uid()::text);

-- Enable Realtime for messages table
begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table public.messages;

-- ==============================================================================
-- STORAGE BUCKETS (Note: Run this in SQL Editor as well)
-- ==============================================================================
insert into storage.buckets (id, name, public)
values ('chat_media', 'chat_media', true)
on conflict (id) do update set public = true;

drop policy if exists "Chat Media Public Access" on storage.objects;
create policy "Chat Media Public Access"
on storage.objects for select
using (bucket_id = 'chat_media');

drop policy if exists "Chat Media Upload" on storage.objects;
create policy "Chat Media Upload"
on storage.objects for insert
to authenticated
with check (bucket_id = 'chat_media');

drop policy if exists "Chat Media Update" on storage.objects;
create policy "Chat Media Update"
on storage.objects for update
to authenticated
using (bucket_id = 'chat_media');

drop policy if exists "Chat Media Delete" on storage.objects;
create policy "Chat Media Delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'chat_media');
