-- ==============================================================================
-- ERUKA PLATFORM — COMPLETE SCHEMA
-- ==============================================================================

drop table if exists public.read_receipts cascade;
drop table if exists public.messages cascade;
drop table if exists public.conversation_members cascade;
drop table if exists public.conversations cascade;
drop table if exists public.room_participants cascade;
drop table if exists public.rooms cascade;
drop table if exists public.bids cascade;
drop table if exists public.jobs cascade;
drop table if exists public.profiles cascade;

-- ==============================================================================
-- PROFILES
-- ==============================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  email text not null unique,
  role text not null check (role in ('freelancer', 'recruiter')),
  avatar_url text,
  is_online boolean not null default false,
  last_seen timestamptz default now(),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'freelancer'),
    coalesce(new.raw_user_meta_data->>'avatar_url', null)
  )
  on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    role = excluded.role,
    avatar_url = coalesce(excluded.avatar_url, profiles.avatar_url);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ==============================================================================
-- JOBS
-- ==============================================================================

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

-- ==============================================================================
-- BIDS
-- ==============================================================================

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

-- ==============================================================================
-- RLS — PROFILES / JOBS / BIDS
-- ==============================================================================

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
    where jobs.id = bids.job_id
      and jobs.recruiter_id = auth.uid()::text
  )
);

-- ==============================================================================
-- BID COUNT TRIGGER
-- ==============================================================================

create or replace function public.refresh_job_bids_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  affected_job_id text;
begin
  if tg_op = 'INSERT' then
    affected_job_id := new.job_id;
  elsif tg_op = 'UPDATE' then
    affected_job_id := new.job_id;

    if old.job_id is distinct from new.job_id then
      update public.jobs
      set bids_count = (
        select count(*) from public.bids where bids.job_id = old.job_id
      )
      where jobs.id = old.job_id;
    end if;
  else
    affected_job_id := old.job_id;
  end if;

  update public.jobs
  set bids_count = (
    select count(*) from public.bids where bids.job_id = affected_job_id
  )
  where jobs.id = affected_job_id;

  return null;
end;
$$;

drop trigger if exists refresh_job_bids_count_insert on public.bids;
create trigger refresh_job_bids_count_insert
after insert on public.bids
for each row execute function public.refresh_job_bids_count();

drop trigger if exists refresh_job_bids_count_update on public.bids;
create trigger refresh_job_bids_count_update
after update of job_id on public.bids
for each row execute function public.refresh_job_bids_count();

drop trigger if exists refresh_job_bids_count_delete on public.bids;
create trigger refresh_job_bids_count_delete
after delete on public.bids
for each row execute function public.refresh_job_bids_count();

-- ==============================================================================
-- CHAT SYSTEM — CONVERSATIONS
-- ==============================================================================

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  type text not null default 'private' check (type in ('global', 'private')),
  job_id text references public.jobs(id) on delete set null,
  bid_id text references public.bids(id) on delete set null,
  client_id uuid references public.profiles(id) on delete set null,
  freelancer_id uuid references public.profiles(id) on delete set null,
  title text,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

alter table public.conversations enable row level security;

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, profile_id)
);

alter table public.conversation_members enable row level security;

-- ==============================================================================
-- RLS — CONVERSATIONS
-- ==============================================================================

-- Users can see global conversations or conversations they are a member of
drop policy if exists "conversations_select" on public.conversations;
create policy "conversations_select"
on public.conversations for select
to authenticated
using (
  type = 'global'
  or exists (
    select 1 from public.conversation_members
    where conversation_members.conversation_id = conversations.id
    and conversation_members.profile_id = auth.uid()
  )
);

-- Only the system function creates conversations (via security definer)
-- Allow authenticated users to insert global type or if they are the client
drop policy if exists "conversations_insert" on public.conversations;
create policy "conversations_insert"
on public.conversations for insert
to authenticated
with check (
  type = 'global'
  or client_id = auth.uid()
  or exists (
    select 1 from public.bids
    join public.jobs on jobs.id = bids.job_id
    where bids.id = conversations.bid_id
      and jobs.recruiter_id = auth.uid()::text
  )
);

-- Update conversation (e.g., updated_at)
drop policy if exists "conversations_update" on public.conversations;
create policy "conversations_update"
on public.conversations for update
to authenticated
using (
  type = 'global'
  or exists (
    select 1 from public.conversation_members
    where conversation_members.conversation_id = conversations.id
    and conversation_members.profile_id = auth.uid()
  )
);

-- ==============================================================================
-- RLS — CONVERSATION MEMBERS
-- ==============================================================================

drop policy if exists "conversation_members_select" on public.conversation_members;
create policy "conversation_members_select"
on public.conversation_members for select
to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1 from public.conversation_members as cm
    where cm.conversation_id = conversation_members.conversation_id
    and cm.profile_id = auth.uid()
  )
);

drop policy if exists "conversation_members_insert" on public.conversation_members;
create policy "conversation_members_insert"
on public.conversation_members for insert
to authenticated
with check (
  profile_id = auth.uid()
  or exists (
    select 1 from public.conversations c
    where c.id = conversation_members.conversation_id
    and (
      c.client_id = auth.uid()
      or c.type = 'global'
    )
  )
);

-- ==============================================================================
-- MESSAGES
-- ==============================================================================

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete cascade,
  text text,
  image_url text,
  voice_url text,
  attachment_url text,
  attachment_type text,
  attachment_name text,
  delivery_status text not null default 'sent' check (delivery_status in ('sending', 'sent', 'delivered', 'read')),
  reply_to uuid references public.messages(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.messages enable row level security;

-- Messages: can read if global conversation or member of the conversation
drop policy if exists "messages_select" on public.messages;
create policy "messages_select"
on public.messages for select
to authenticated
using (
  exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
    and (
      c.type = 'global'
      or exists (
        select 1 from public.conversation_members cm
        where cm.conversation_id = c.id
        and cm.profile_id = auth.uid()
      )
    )
  )
);

-- Messages: can insert if sender matches auth and is member/global
drop policy if exists "messages_insert" on public.messages;
create policy "messages_insert"
on public.messages for insert
to authenticated
with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.conversations c
    where c.id = messages.conversation_id
    and (
      c.type = 'global'
      or exists (
        select 1 from public.conversation_members cm
        where cm.conversation_id = c.id
        and cm.profile_id = auth.uid()
      )
    )
  )
);

-- Messages: only sender can update their own messages
drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own"
on public.messages for update
to authenticated
using (sender_id = auth.uid())
with check (sender_id = auth.uid());

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own"
on public.messages for delete
to authenticated
using (sender_id = auth.uid());

-- ==============================================================================
-- READ RECEIPTS
-- ==============================================================================

create table if not exists public.read_receipts (
  id uuid primary key default gen_random_uuid(),
  message_id uuid not null references public.messages(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  read_at timestamptz not null default now(),
  unique(message_id, profile_id)
);

alter table public.read_receipts enable row level security;

drop policy if exists "read_receipts_select" on public.read_receipts;
create policy "read_receipts_select"
on public.read_receipts for select
to authenticated
using (
  profile_id = auth.uid()
  or exists (
    select 1 from public.messages m
    where m.id = read_receipts.message_id
    and m.sender_id = auth.uid()
  )
);

drop policy if exists "read_receipts_insert" on public.read_receipts;
create policy "read_receipts_insert"
on public.read_receipts for insert
to authenticated
with check (profile_id = auth.uid());

-- ==============================================================================
-- ACCEPT BID & CREATE CONVERSATION (replaces accept_bid_and_create_room)
-- ==============================================================================

create or replace function public.accept_bid_and_create_conversation(p_bid_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bid public.bids%rowtype;
  v_job public.jobs%rowtype;
  v_conversation_id uuid;
  v_freelancer_profile_id uuid;
  v_uuid_pattern constant text := '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$';
begin
  -- Lock the bid row
  select * into v_bid
  from public.bids
  where id = p_bid_id
  for update;

  if not found then
    raise exception 'Bid % was not found', p_bid_id using errcode = 'P0002';
  end if;

  -- Lock the job row
  select * into v_job
  from public.jobs
  where id = v_bid.job_id
  for update;

  if not found then
    raise exception 'Job % was not found', v_bid.job_id using errcode = 'P0002';
  end if;

  -- Verify caller is the job owner
  if v_job.recruiter_id <> auth.uid()::text
    and not exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and (
          lower(profiles.email) = lower(v_job.recruiter_id)
          or lower(profiles.name) = lower(v_job.recruiter_name)
        )
    )
  then
    raise exception 'Only the job owner can accept this bid' using errcode = '42501';
  end if;

  -- Accept this bid
  update public.bids
  set status = 'accepted'
  where id = p_bid_id
  returning * into v_bid;

  -- Reject all other pending bids for this job
  update public.bids
  set status = 'rejected'
  where job_id = v_job.id
    and id <> p_bid_id
    and status = 'pending';

  -- Mark job as in-progress
  update public.jobs
  set status = 'in-progress',
      assigned_freelancer_id = v_bid.freelancer_id
  where id = v_job.id;

  -- Check if conversation already exists for this bid
  select id into v_conversation_id
  from public.conversations
  where bid_id = p_bid_id
  limit 1;

  -- Resolve the freelancer's profile UUID
  if v_bid.freelancer_id ~* v_uuid_pattern then
    select id into v_freelancer_profile_id
    from public.profiles
    where id = v_bid.freelancer_id::uuid
    limit 1;
  end if;

  if v_freelancer_profile_id is null then
    select id into v_freelancer_profile_id
    from public.profiles
    where lower(email) = lower(v_bid.freelancer_id)
       or lower(name) = lower(v_bid.freelancer_name)
    order by created_at desc
    limit 1;
  end if;

  if v_freelancer_profile_id is null then
    raise exception 'Freelancer profile for bid % could not be resolved', p_bid_id using errcode = 'P0002';
  end if;

  -- Create conversation if it doesn't exist
  if v_conversation_id is null then
    insert into public.conversations (type, job_id, bid_id, client_id, freelancer_id, title)
    values ('private', v_job.id, p_bid_id, auth.uid(), v_freelancer_profile_id, v_job.title)
    returning id into v_conversation_id;
  end if;

  -- Add both participants
  insert into public.conversation_members (conversation_id, profile_id)
  values (v_conversation_id, auth.uid())
  on conflict do nothing;

  insert into public.conversation_members (conversation_id, profile_id)
  values (v_conversation_id, v_freelancer_profile_id)
  on conflict do nothing;

  -- Update conversation timestamp
  update public.conversations
  set updated_at = now()
  where id = v_conversation_id;

  return v_conversation_id;
end;
$$;

grant execute on function public.accept_bid_and_create_conversation(text) to authenticated;

-- Keep backward compatibility: alias for old function name
create or replace function public.accept_bid_and_create_room(p_bid_id text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  return public.accept_bid_and_create_conversation(p_bid_id);
end;
$$;

grant execute on function public.accept_bid_and_create_room(text) to authenticated;

-- ==============================================================================
-- HELPER: Update conversation.updated_at when a new message is inserted
-- ==============================================================================

create or replace function public.update_conversation_timestamp()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.conversations
  set updated_at = now()
  where id = new.conversation_id;
  return new;
end;
$$;

drop trigger if exists update_conversation_on_message on public.messages;
create trigger update_conversation_on_message
after insert on public.messages
for each row execute function public.update_conversation_timestamp();

-- ==============================================================================
-- HELPER: Ensure a global conversation singleton exists
-- ==============================================================================

create or replace function public.get_or_create_global_conversation()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  select id into v_id
  from public.conversations
  where type = 'global'
  limit 1;

  if v_id is null then
    insert into public.conversations (type, title)
    values ('global', 'Global Chat')
    returning id into v_id;
  end if;

  return v_id;
end;
$$;

grant execute on function public.get_or_create_global_conversation() to authenticated;

-- ==============================================================================
-- HELPER: Update user online status
-- ==============================================================================

create or replace function public.update_user_presence(p_is_online boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set is_online = p_is_online,
      last_seen = now()
  where id = auth.uid();
end;
$$;

grant execute on function public.update_user_presence(boolean) to authenticated;

-- ==============================================================================
-- REALTIME
-- ==============================================================================

begin;
  drop publication if exists supabase_realtime;
  create publication supabase_realtime;
commit;
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.profiles;

-- ==============================================================================
-- STORAGE BUCKETS
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
