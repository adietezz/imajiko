-- Create tokens table
create table if not exists tokens (
  token        text primary key,
  template_id  text not null,
  email        text not null,
  used         boolean default false,
  created_at   timestamptz default now(),
  expires_at   timestamptz not null
);

-- Enable Row Level Security (RLS) for tokens
alter table tokens enable row level security;

-- Policy: No public access (since operations are performed by Edge Functions using service_role)
-- Note: If policy already exists, this can be skipped or dropped.
drop policy if exists "no public access" on tokens;
create policy "no public access" on tokens for all using (false);

-- Create orders table
create table if not exists orders (
  id             uuid primary key default gen_random_uuid(),
  token          text references tokens(token),
  template_id    text not null,
  nama_pengirim  text,
  nama_penerima  text not null,
  pesan          text not null,
  foto_url       text,
  musik_url      text,
  email          text not null,
  custom_fields  jsonb default '{}'::jsonb,
  status         text default 'done',
  created_at     timestamptz default now()
);

-- Enable Row Level Security (RLS) for orders
alter table orders enable row level security;

-- Policies for orders
-- Public can select individual orders if they have the ID
drop policy if exists "public read only" on orders;
create policy "public read only" on orders for select using (true);

-- Public cannot insert/update/delete directly (handled by Edge Functions with service_role)
drop policy if exists "no public insert" on orders;
create policy "no public insert" on orders for insert with check (false);

drop policy if exists "no public update" on orders;
create policy "no public update" on orders for update using (false);

drop policy if exists "no public delete" on orders;
create policy "no public delete" on orders for delete using (false);
