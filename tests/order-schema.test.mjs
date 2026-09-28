import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sqlUrl = new URL('../SUPABASE-PEDIDOS.sql', import.meta.url);
const rawSql = await readFile(sqlUrl, 'utf8');
const sql = rawSql
  .replace(/--.*$/gm, '')
  .replace(/\s+/g, ' ')
  .trim();

const escaped = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (pattern, message) => assert.match(sql, pattern, message);

const run = (command, args, options = {}) => spawnSync(command, args, {
  encoding: 'utf8',
  ...options,
});

test('declares the normalized material-order schema and keeps the legacy header', () => {
  for (const table of [
    'skbc_merch_orders',
    'skbc_merch_products',
    'skbc_merch_variants',
    'skbc_order_campaigns',
    'skbc_merch_order_items',
    'skbc_order_communications',
  ]) {
    has(new RegExp(`create table if not exists public\\.${escaped(table)}\\b`, 'i'), `missing ${table}`);
    has(new RegExp(`alter table public\\.${escaped(table)} enable row level security`, 'i'), `RLS not enabled for ${table}`);
  }

  has(/create (?:or replace )?function public\.submit_skbc_merch_order\s*\(/i, 'missing submit RPC');
});

test('documents that deployment must wait for the Task 4 RPC client switch', () => {
  assert.match(rawSql, /do not deploy[^\r\n]*(?:task 4|rpc client)/i, 'missing prominent Task 4 deployment dependency');
});

test('authenticated access requires explicit admin membership', () => {
  has(/create table if not exists public\.skbc_merch_admins\b/i, 'missing admin membership table');
  has(/user_id uuid primary key[^;]*references auth\.users/i, 'admin membership must be keyed to auth users');
  has(/function public\.is_skbc_merch_admin\s*\(\s*\)/i, 'missing admin authorization helper');
  has(/auth\.uid\s*\(\s*\)/i, 'admin authorization must use auth.uid()');
  has(/using\s*\(\s*public\.is_skbc_merch_admin\s*\(\s*\)\s*\)/i, 'admin RLS policies must call the authorization helper');
  has(/alter table public\.skbc_merch_admins enable row level security/i, 'admin membership must have RLS enabled');
  has(/revoke all privileges on table public\.skbc_merch_admins from authenticated/i, 'authenticated users must have membership privileges revoked');
  has(/grant all privileges on table\s+public\.skbc_merch_admins[^;]+to service_role/i, 'service_role must provision admin membership');
  has(/drop policy if exists "Authenticated can read merch orders"/i, 'legacy permissive read policy must be removed');
  assert.doesNotMatch(sql, /to authenticated\s+using\s*\(\s*true\s*\)/i, 'authenticated users must not receive unconditional RLS access');
  assert.doesNotMatch(sql, /grant select\s*,\s*insert\s*,\s*update\s*,\s*delete on table\s+public\.skbc_merch_orders\s*,\s*public\.skbc_merch_products/i, 'authenticated users must not receive blanket CRUD grants');
  assert.doesNotMatch(sql, /grant [^;]+ on table public\.skbc_merch_admins to authenticated/i, 'authenticated users must not manage admin membership');
});

test('submit RPC exposes the approved signature and return contract', () => {
  has(/function public\.submit_skbc_merch_order\s*\(\s*p_idempotency_key uuid\s*,\s*p_customer_name text\s*,\s*p_customer_email text\s*,\s*p_customer_phone text\s*,\s*p_member_reference text\s*,\s*p_comments text\s*,\s*p_page_lang text\s*,\s*p_items jsonb\s*\)\s*returns table\s*\(\s*order_id uuid\s*,\s*order_number text\s*,\s*total_cents integer\s*\)/i);
  has(/security definer/i, 'RPC must be security definer so anon does not need table writes');
  has(/set search_path\s*=\s*pg_catalog\s*,\s*public\s*,\s*pg_temp/i, 'RPC must pin a system-first search path');
});

test('submit RPC requires a nonblank syntactically plausible customer email', () => {
  has(/nullif\s*\(\s*btrim\s*\(\s*p_customer_email\s*\)\s*,\s*''\s*\)\s+is null/i, 'RPC must reject blank email addresses');
  has(/btrim\s*\(\s*p_customer_email\s*\)\s*!~\*?\s*'[^']*@[^']*\\\.[^']*'/i, 'RPC must require an @ sign and dotted domain');
});

test('idempotency is bound to a canonical request hash', () => {
  has(/add column if not exists request_hash text/i, 'orders must store a request hash');
  has(/v_request_payload jsonb/i, 'RPC must build a canonical request payload');
  has(/sha256\s*\(/i, 'RPC must hash the canonical payload');
  has(/existing\.request_hash/i, 'RPC must load the original request hash');
  has(/idempotency key[^']*(?:different|payload|parameters)/i, 'RPC must clearly reject a mismatched retry');
  has(/idempotency_key[^;]+request_hash/i, 'RPC must persist the key and request hash together');
  assert.ok(
    sql.indexOf('select existing.id') < sql.indexOf("customer name and phone are required"),
    'idempotency lookup must precede business validation',
  );
});

test('campaign periods use Europe/Madrid civil dates', () => {
  has(/function public\.skbc_merch_campaign_period\s*\(\s*p_at timestamptz\s*\)/i, 'missing testable campaign-period helper');
  has(/at time zone\s+'Europe\/Madrid'/i, 'campaign date must use Europe/Madrid');
  has(/skbc_merch_campaign_period\s*\(\s*statement_timestamp\s*\(\s*\)\s*\)/i, 'RPC must derive its campaign through the Madrid helper');
});

test('submit RPC enforces campaign, line, variant, quantity, pricing, and idempotency rules', () => {
  has(/jsonb_array_length\s*\(\s*p_items\s*\)\s*(?:=|<)\s*0|jsonb_array_length\s*\(\s*p_items\s*\)\s+not between\s+1\s+and\s+30/i, 'RPC must reject empty item arrays');
  has(/jsonb_array_length\s*\(\s*p_items\s*\)\s*>\s*30|jsonb_array_length\s*\(\s*p_items\s*\)\s+not between\s+1\s+and\s+30/i, 'RPC must cap item arrays at 30 lines');
  has(/for update/i, 'RPC must lock variants while pricing');
  has(/quantity[^;]{0,250}(?:between\s+1\s+and\s+10|<\s*1|>\s*10)/i, 'RPC must enforce quantities from 1 through 10');
  has(/unit_price_cents/i, 'RPC must derive prices from database variants');
  has(/is_active/i, 'RPC must reject inactive catalog entries');
  has(/idempotency_key/i, 'RPC must implement idempotency');
  has(/campaign_start|period_start/i, 'RPC must calculate the monthly campaign period');
  has(/make_date|date_trunc/i, 'RPC must derive period boundaries in the database');
  has(/insert into public\.skbc_merch_orders/i, 'RPC must insert the order header');
  has(/insert into public\.skbc_merch_order_items/i, 'RPC must insert normalized item rows');
});

test('anonymous privileges are catalog-read and RPC-execute only', () => {
  for (const table of [
    'skbc_merch_orders',
    'skbc_merch_products',
    'skbc_merch_variants',
    'skbc_order_campaigns',
    'skbc_merch_order_items',
    'skbc_order_communications',
  ]) {
    has(new RegExp(`revoke all (?:privileges )?on (?:table )?public\\.${escaped(table)} from anon`, 'i'), `anon privileges not revoked for ${table}`);
  }

  has(/grant select on (?:table )?public\.skbc_merch_products\s*,\s*public\.skbc_merch_variants to anon/i, 'anon catalog read grant missing');
  has(/grant execute on function public\.submit_skbc_merch_order\s*\(\s*uuid\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*jsonb\s*\) to anon/i, 'anon RPC execution grant missing');
  has(/revoke all on function public\.submit_skbc_merch_order[^;]+from public/i, 'RPC must revoke default PUBLIC execution');
});

const integrationEnabled = process.env.RUN_POSTGRES_INTEGRATION === '1';

test('PostgreSQL integration: migration, authorization, idempotency, rollback, and Madrid boundaries', {
  skip: integrationEnabled ? false : 'set RUN_POSTGRES_INTEGRATION=1 to run with Docker',
  timeout: 120_000,
}, (t) => {
  const image = process.env.POSTGRES_TEST_IMAGE || 'postgres:16-alpine';
  const container = `skbc-orders-test-${process.pid}`;
  const dockerInfo = run('docker', ['info', '--format', '{{.ServerVersion}}']);
  assert.equal(dockerInfo.status, 0, `Docker is unavailable: ${dockerInfo.stderr}`);

  const started = run('docker', [
    'run', '--rm', '--detach', '--name', container,
    '--env', 'POSTGRES_PASSWORD=postgres', image,
  ]);
  assert.equal(started.status, 0, `Could not start PostgreSQL: ${started.stderr}`);
  t.after(() => run('docker', ['rm', '--force', container]));

  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const probe = run('docker', ['exec', container, 'pg_isready', '-U', 'postgres']);
    if (probe.status === 0) {
      ready = true;
      break;
    }
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
  }
  assert.ok(ready, 'PostgreSQL did not become ready');

  const psql = (database, input) => {
    const result = run('docker', [
      'exec', '--interactive', container, 'psql',
      '--username', 'postgres', '--dbname', database,
      '--set', 'ON_ERROR_STOP=1', '--no-psqlrc',
    ], { input });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    return result.stdout;
  };

  const clusterBootstrap = `
    create role anon nologin;
    create role authenticated nologin;
    create role service_role nologin bypassrls;
  `;
  const databaseBootstrap = `
    create schema auth;
    create table auth.users (id uuid primary key);
    create or replace function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
    grant usage on schema public, auth to anon, authenticated, service_role;
    grant execute on function auth.uid() to anon, authenticated, service_role;
  `;
  const legacy = `
    create table public.skbc_merch_orders (
      id uuid primary key default gen_random_uuid(), created_at timestamptz not null default now(),
      updated_at timestamptz, status text not null default 'pending', customer_name text not null,
      customer_phone text not null, customer_email text, payment_method text, custom_reference text,
      custom_details text, comments text, items jsonb not null default '[]'::jsonb,
      total_estimated numeric default 0, page_lang text default 'es', source text default 'website'
    );
    insert into public.skbc_merch_orders (id, customer_name, customer_phone)
    values ('00000000-0000-4000-8000-000000000099', 'Legacy Member', '600000000');
  `;

  psql('postgres', clusterBootstrap + 'create database empty_schema; create database legacy_schema;');
  psql('empty_schema', databaseBootstrap + sql + sql);
  psql('legacy_schema', databaseBootstrap + legacy + sql + sql);

  const behavior = `
    do $$ begin
      if not exists (select 1 from public.skbc_merch_orders where id = '00000000-0000-4000-8000-000000000099') then
        raise exception 'legacy order was not preserved';
      end if;
    end $$;

    insert into auth.users (id) values
      ('00000000-0000-4000-8000-000000000001'),
      ('00000000-0000-4000-8000-000000000002');
    insert into public.skbc_merch_admins (user_id)
    values ('00000000-0000-4000-8000-000000000001');
    insert into public.skbc_merch_products (id, slug, name) values
      ('10000000-0000-4000-8000-000000000001', 'gi', 'Gi'),
      ('10000000-0000-4000-8000-000000000002', 'inactive', 'Inactive');
    insert into public.skbc_merch_variants (id, product_id, sku, name, unit_price_cents, is_active) values
      ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'GI-A', 'A', 2500, true),
      ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'GI-B', 'B', 1500, true),
      ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'OFF', 'Off', 100, false);

    set role authenticated;
    select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000002', false);
    do $$ begin
      if (select count(*) from public.skbc_merch_orders) <> 0 then raise exception 'non-admin read PII'; end if;
      if (select count(*) from public.skbc_order_campaigns) <> 0 then raise exception 'non-admin read campaigns'; end if;
      if (select count(*) from public.skbc_merch_products) <> 1 then raise exception 'active catalog visibility failed'; end if;
      begin
        insert into public.skbc_merch_products (slug, name) values ('forbidden', 'Forbidden');
        raise exception 'non-admin changed catalog';
      exception when insufficient_privilege then null; end;
    end $$;
    reset role;

    set role authenticated;
    select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
    do $$ begin
      if (select count(*) from public.skbc_merch_orders) <> 1 then raise exception 'admin cannot read orders'; end if;
    end $$;
    reset role;

    set role anon;
    create temp table first_order as
      select * from public.submit_skbc_merch_order(
        '30000000-0000-4000-8000-000000000001', ' Alice ', 'ALICE@EXAMPLE.COM ', ' 600111222 ',
        ' M-1 ', ' hello ', 'ES',
        '[{"variant_id":"20000000-0000-4000-8000-000000000002","quantity":"2"},{"variant_id":"20000000-0000-4000-8000-000000000001","quantity":1}]'::jsonb
      );
    create temp table retry_order as
      select * from public.submit_skbc_merch_order(
        '30000000-0000-4000-8000-000000000001', 'Alice', 'alice@example.com', '600111222',
        'M-1', 'hello', 'es',
        '[{"quantity":1,"variant_id":"20000000-0000-4000-8000-000000000001"},{"quantity":2,"variant_id":"20000000-0000-4000-8000-000000000002"}]'::jsonb
      );
    do $$ begin
      if (select order_id from first_order) <> (select order_id from retry_order) then
        raise exception 'normalized retry did not return original order';
      end if;
      begin
        perform public.submit_skbc_merch_order(
          '30000000-0000-4000-8000-000000000001', 'Alice', 'alice@example.com', 'DIFFERENT',
          'M-1', 'hello', 'es',
          '[{"variant_id":"20000000-0000-4000-8000-000000000001","quantity":1},{"variant_id":"20000000-0000-4000-8000-000000000002","quantity":2}]'::jsonb
        );
        raise exception 'mismatched retry succeeded';
      exception when unique_violation then
        if sqlerrm not like '%different request%' then raise; end if;
      end;
    end $$;
    reset role;

    do $$ declare before_count integer; begin
      select count(*) into before_count from public.skbc_merch_orders;
      begin
        perform public.submit_skbc_merch_order(
          '30000000-0000-4000-8000-000000000002', 'Bob', 'bob@example.com', '600333444', null, null, 'es',
          '[{"variant_id":"20000000-0000-4000-8000-000000000001","quantity":1},{"variant_id":"20000000-0000-4000-8000-000000000003","quantity":1}]'::jsonb
        );
        raise exception 'inactive variant succeeded';
      exception when invalid_parameter_value then null; end;
      if (select count(*) from public.skbc_merch_orders) <> before_count then raise exception 'failed order did not roll back'; end if;
    end $$;

    do $$ declare s date; e date; begin
      select period_start, period_end into s, e from public.skbc_merch_campaign_period('2026-03-15 22:59:59+00');
      if s <> date '2026-02-16' or e <> date '2026-03-15' then raise exception 'pre-boundary Madrid period failed'; end if;
      select period_start, period_end into s, e from public.skbc_merch_campaign_period('2026-03-15 23:00:00+00');
      if s <> date '2026-03-16' or e <> date '2026-04-15' then raise exception 'Madrid midnight boundary failed'; end if;
      select period_start, period_end into s, e from public.skbc_merch_campaign_period('2026-03-29 01:30:00+00');
      if s <> date '2026-03-16' then raise exception 'spring DST period failed'; end if;
      select period_start, period_end into s, e from public.skbc_merch_campaign_period('2026-10-25 01:30:00+00');
      if s <> date '2026-10-16' then raise exception 'autumn DST period failed'; end if;
    end $$;
  `;
  psql('legacy_schema', behavior);
});
