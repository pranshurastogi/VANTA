-- ============================================
-- VANTA Database Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- Project: ygbtyrlkcnezzfcojaou
-- ============================================

-- Users table
create table public.users (
  id uuid primary key default gen_random_uuid(),
  address text unique not null,
  ens_name text,
  email text,
  confirmation_method text default 'passkey' check (confirmation_method in ('passkey', 'worldid', 'ledger', 'manual')),
  tier3_escalation text,
  world_id_verified boolean default false,
  world_id_nullifier text,
  dynamic_wallet_id text,
  protection_level text default 'balanced' check (protection_level in ('conservative', 'balanced', 'power')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- World ID verification records (one proof per human/action)
create table public.world_id_nullifiers (
  id uuid primary key default gen_random_uuid(),
  nullifier numeric(78,0) not null,
  action text not null,
  address text not null,
  credential_type text default 'orb',
  protocol_version text default '4.0',
  verified_at timestamptz default now(),
  unique (nullifier, action)
);

-- Agents
create table public.agents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  ens_subname text,
  mcp_url text,
  permissions text[] default '{"read"}',
  active boolean default true,
  tx_count integer default 0,
  total_volume_usd numeric(18,2) default 0,
  created_at timestamptz default now()
);

-- Policy rules
create table public.rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  type text not null check (type in (
    'daily_limit', 'per_tx_limit', 'whitelist', 'blacklist',
    'contract_whitelist', 'block_unlimited_approval',
    'strip_calldata', 'quiet_hours'
  )),
  enabled boolean default true,
  config jsonb not null default '{}',
  sort_order integer default 0,
  created_at timestamptz default now()
);

-- Transactions
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  from_address text not null,
  to_address text not null,
  value text not null,
  value_usd numeric(18,2),
  calldata text,
  chain_id integer default 1,
  agent_id uuid references public.agents(id),
  tier integer not null check (tier in (1, 2, 3)),
  status text not null default 'pending' check (status in (
    'pending', 'approved', 'confirmed', 'blocked', 'rejected'
  )),
  matched_rules uuid[] default '{}',
  policy_reason text,
  risk_score integer check (risk_score between 0 and 100),
  scan_checks jsonb default '[]',
  scan_recommendation text check (scan_recommendation in ('approve', 'flag', 'block')),
  scan_reasoning text,
  tx_hash text,
  confirmed_at timestamptz,
  confirmed_method text check (confirmed_method in ('passkey', 'world_id', 'ledger', 'manual')),
  created_at timestamptz default now()
);

-- Daily spend tracker
create table public.daily_spend (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.users(id) on delete cascade not null,
  date date not null default current_date,
  total_usd numeric(18,2) default 0,
  unique(user_id, date)
);

-- Known flagged addresses
create table public.flagged_addresses (
  address text primary key,
  reason text,
  source text,
  flagged_at timestamptz default now()
);

-- AI Scanner history
create table public.scan_history (
  id uuid primary key default gen_random_uuid(),
  user_address text,
  from_address text not null,
  to_address text not null,
  value text not null,
  value_usd numeric(18,2),
  calldata text,
  chain_id integer default 1,
  agent_id text,
  risk_score integer check (risk_score between 0 and 100),
  recommendation text check (recommendation in ('approve', 'flag', 'block')),
  reasoning text,
  checks jsonb default '[]',
  model text default 'gemini-3-flash',
  scan_source text default 'manual' check (scan_source in ('manual', 'auto', 'api')),
  ip_address text,
  created_at timestamptz default now()
);

-- ============================================
-- Indexes
-- ============================================
create index idx_transactions_user on public.transactions(user_id);
create index idx_transactions_status on public.transactions(status);
create index idx_transactions_created on public.transactions(created_at desc);
create index idx_rules_user on public.rules(user_id);
create index idx_agents_user on public.agents(user_id);
create index idx_daily_spend_user_date on public.daily_spend(user_id, date);
create index idx_scan_history_user on public.scan_history(user_address);
create index idx_scan_history_created on public.scan_history(created_at desc);
create index idx_world_id_nullifiers_address on public.world_id_nullifiers(address);
create index idx_world_id_nullifiers_action on public.world_id_nullifiers(action);

-- ============================================
-- Row Level Security (open for hackathon)
-- ============================================
alter table public.users enable row level security;
alter table public.rules enable row level security;
alter table public.transactions enable row level security;
alter table public.agents enable row level security;
alter table public.daily_spend enable row level security;
alter table public.scan_history enable row level security;
alter table public.world_id_nullifiers enable row level security;

create policy "open" on public.users for all using (true) with check (true);
create policy "open" on public.rules for all using (true) with check (true);
create policy "open" on public.transactions for all using (true) with check (true);
create policy "open" on public.agents for all using (true) with check (true);
create policy "open" on public.daily_spend for all using (true) with check (true);
create policy "open" on public.scan_history for all using (true) with check (true);
create policy "open" on public.world_id_nullifiers for all using (true) with check (true);

-- ============================================
-- Realtime
-- ============================================
alter publication supabase_realtime add table public.transactions;

-- ============================================
-- Default rules on user creation
-- ============================================
create or replace function create_default_rules(p_user_id uuid, p_level text)
returns void as $$
begin
  insert into public.rules (user_id, type, config, sort_order) values
    (p_user_id, 'daily_limit', jsonb_build_object('amount',
      case p_level when 'conservative' then 100 when 'power' then 2000 else 500 end), 1),
    (p_user_id, 'per_tx_limit', jsonb_build_object('amount',
      case p_level when 'conservative' then 50 when 'power' then 1000 else 200 end), 2),
    (p_user_id, 'block_unlimited_approval', '{}', 3),
    (p_user_id, 'strip_calldata', '{}', 4),
    (p_user_id, 'whitelist', '{"addresses": []}', 5);

  if p_level in ('balanced', 'power') then
    insert into public.rules (user_id, type, config, sort_order) values
      (p_user_id, 'contract_whitelist', jsonb_build_object('contracts', array[
        '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45',
        '0xE592427A0AEce92De3Edee1F18E0157C05861564',
        '0x87870Bca3F3fD6335C3F4ce8392D69350B4fA4E2',
        '0x1111111254EEB25477B68fb85Ed929f73A960582'
      ]), 6);
  end if;
end;
$$ language plpgsql;

