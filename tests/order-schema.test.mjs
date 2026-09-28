import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
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

test('every foreign key has a supporting leading-column index', () => {
  const indexedForeignKeys = [
    ['skbc_merch_variants', 'product_id'],
    ['skbc_merch_orders', 'campaign_id'],
    ['skbc_merch_order_items', 'order_id'],
    ['skbc_merch_order_items', 'variant_id'],
    ['skbc_order_communications', 'order_id'],
    ['skbc_merch_admins', 'created_by'],
  ];

  for (const [table, column] of indexedForeignKeys) {
    has(
      new RegExp(`create (?:unique )?index if not exists [^ ]+ on public\\.${table} \\(${column}(?:[, )])`, 'i'),
      `missing supporting index for ${table}.${column}`,
    );
  }

  has(/user_id uuid primary key references auth\.users/i, 'admin user_id FK must be indexed by its primary key');
});

test('catalog stores approved product and variant economics', () => {
  for (const field of [
    'brand', 'supplier_reference', 'category', 'recommended_level', 'weight',
    'source_url', 'image_attribution', 'metadata',
  ]) {
    has(new RegExp(`(?:add column if not exists )?${field}\\s+`, 'i'), `missing product field ${field}`);
  }
  has(/supplier_reference text not null unique|unique\s*\(\s*supplier_reference\s*\)/i, 'product supplier reference must be unique and non-null');
  has(/metadata jsonb[^;]+jsonb_typeof\s*\(\s*metadata\s*\)\s*=\s*'object'/i, 'product metadata must be an object');

  for (const field of [
    'supplier_reference', 'cost_cents', 'margin_cents', 'price_cents', 'cost_basis',
    'promotion_price_cents', 'promotion_starts_at', 'promotion_ends_at',
    'promotion_is_active', 'metadata',
  ]) {
    has(new RegExp(`(?:add column if not exists )?${field}\\s+`, 'i'), `missing variant field ${field}`);
  }
  has(/cost_cents\s*>=\s*0/i, 'variant cost must be non-negative');
  has(/price_cents\s*=\s*cost_cents\s*\+\s*margin_cents/i, 'price must equal cost plus margin');
  has(/promotion_ends_at\s+is null[^;]+promotion_starts_at/i, 'promotion dates must be ordered');
  has(/function public\.sync_skbc_merch_variant_price/i, 'legacy unit price synchronization trigger is required');
});

test('anonymous catalog access exposes only the restricted public view', () => {
  has(/create (?:or replace )?view public\.skbc_merch_catalog_public/i, 'missing restricted public catalog view');
  has(/effective_price_cents/i, 'public catalog must expose its effective drawer price');
  const publicView = sql.slice(sql.indexOf('create or replace view public.skbc_merch_catalog_public'), sql.indexOf('create or replace view public.skbc_merch_order_items_management'));
  assert.doesNotMatch(publicView, /\bcost_cents\b/i, 'public view must not expose costs');
  assert.doesNotMatch(publicView, /\bmargin_cents\b/i, 'public view must not expose margins');
  assert.doesNotMatch(publicView, /\bcost_basis\b/i, 'public view must not expose cost basis');
  assert.doesNotMatch(publicView, /variant\.attributes\s*(?:,|as)/i, 'public view must not expose legacy private keys from raw attributes');
  assert.match(publicView, /jsonb_build_object\s*\(\s*'size'/i, 'public view must project only approved variant attributes');
  has(/grant select on (?:table )?public\.skbc_merch_catalog_public to anon/i, 'anon safe-view grant missing');
  assert.doesNotMatch(sql, /grant select on (?:table )?public\.skbc_merch_products\s*,\s*public\.skbc_merch_variants to anon/i, 'anon must not read private catalog tables');
});

test('order items persist normalized recipients and expose them only through management access', () => {
  has(/add column if not exists recipient text/i, 'recipient migration missing');
  has(/'recipient'\s*,\s*btrim\s*\(\s*coalesce\s*\(\s*item\s*->>\s*'recipient'/i, 'canonical hash must include normalized recipient');
  has(/recipient[^;]+btrim\s*\(\s*v_item\s*->>\s*'recipient'\s*\)/i, 'priced item snapshot must include normalized recipient');
  has(/insert into public\.skbc_merch_order_items\s*\([^)]*recipient/i, 'normalized rows must persist recipient');
  has(/create (?:or replace )?view public\.skbc_merch_order_items_management/i, 'management query view missing');
  has(/grant select on (?:table )?public\.skbc_merch_order_items_management to service_role/i, 'service role management grant missing');
  has(/revoke all privileges on (?:table )?public\.skbc_merch_order_items_management from anon/i, 'anon management view privileges must be revoked');
});

test('submit RPC securely calculates the effective public price', () => {
  has(/promotion_is_active[^;]+promotion_price_cents[^;]+promotion_starts_at[^;]+promotion_ends_at/i, 'RPC must validate the active promotion window');
  has(/coalesce\s*\([^;]*promotion_price_cents[^;]*price_cents/i, 'RPC must fall back from promotion to authoritative price');
  has(/supplier_reference[^;]+cost_cents[^;]+size/i, 'RPC must snapshot supplier fields on order items');
  assert.doesNotMatch(sql, /v_variant\.unit_price_cents\s*\)/i, 'RPC must not trust legacy unit price as authoritative');
});

test('admin payment and campaign close RPCs are atomic and locked down', () => {
  has(/function public\.assign_skbc_order_payment_method\s*\(\s*p_order_id uuid\s*,\s*p_payment_method text\s*\)/i, 'payment RPC signature must match management');
  has(/function public\.close_skbc_order_campaign\s*\(\s*p_campaign_id uuid\s*,\s*p_expected_order_count integer\s*,\s*p_expected_communication_count integer\s*\)/i, 'close RPC must require management confirmation counts');
  has(/function public\.can_manage_skbc_merch_orders\s*\(\s*\)/i, 'admin/service-role authorization helper is required');
  has(/assign_skbc_order_payment_method[\s\S]+?for update/i, 'payment RPC must lock order and campaign');
  has(/close_skbc_order_campaign[\s\S]+?for update/i, 'close RPC must lock campaign data');
  has(/prepared_communication_count/i, 'close RPC must return prepared communication count');
  has(/v_order_count\s+is distinct from\s+p_expected_order_count[\s\S]+?v_communication_count\s+is distinct from\s+p_expected_communication_count/i, 'close RPC must reject stale confirmation counts under lock');
  has(/at time zone\s+'Europe\/Madrid'[\s\S]+?period_end/i, 'close RPC must enforce the Madrid-local campaign end');
  has(/v_campaign\.status\s*<>\s*'open'/i, 'only open campaigns may close');
  has(/frozen_at/i, 'orders must record when their data was frozen');
  has(/snapshot jsonb/i, 'communications must store a frozen snapshot');
  has(/recipient_email text/i, 'communications must store their recipient');
  has(/status text[^;]+prepared/i, 'communications must support prepared status');
  has(/function public\.protect_skbc_frozen_order/i, 'frozen orders/items need database enforcement');
  has(/revoke all on function public\.assign_skbc_order_payment_method[^;]+from public/i, 'payment RPC must revoke PUBLIC execution');
  has(/revoke all on function public\.close_skbc_order_campaign[^;]+from public/i, 'close RPC must revoke PUBLIC execution');
  assert.doesNotMatch(sql, /grant (?:insert|update|delete)[^;]+skbc_merch_products[^;]+to authenticated/i, 'catalog writes must go through guarded RPCs');
});

test('email delivery uses campaign-bound atomic claims and an append-only attempt ledger', () => {
  has(/create table if not exists public\.skbc_order_communication_attempts\b/i, 'missing immutable delivery-attempt ledger');
  has(/attempt_token uuid not null unique/i, 'attempt tokens must be globally unique');
  has(/function public\.claim_skbc_order_communication\s*\(\s*p_campaign_id uuid\s*,\s*p_communication_id uuid\s*,\s*p_attempt_token uuid\s*,\s*p_force_resend boolean\s*,\s*p_confirmed boolean\s*\)/i, 'claim RPC must bind campaign, communication, token, force mode, and confirmation');
  has(/claim_skbc_order_communication[\s\S]+join public\.skbc_merch_orders[\s\S]+campaign_id\s*=\s*p_campaign_id[\s\S]+for update/i, 'claim RPC must lock the exact communication through its order and campaign');
  has(/v_campaign_status\s*<>\s*'closed'/i, 'claims must require a closed and reviewed campaign');
  has(/p_confirmed\s+is distinct from\s+true/i, 'server must enforce explicit send confirmation');
  has(/status\s*=\s*'sending'[\s\S]+attempt_token\s*=\s*p_attempt_token/i, 'claim must atomically transition and bind the attempt token');
  has(/function public\.complete_skbc_order_communication_attempt/i, 'missing token-bound completion RPC');
  has(/function public\.reconcile_skbc_order_communication/i, 'ambiguous deliveries need explicit manual reconciliation');
  has(/status in \('prepared', 'sending', 'sent', 'failed', 'delivered_unconfirmed'\)/i, 'communication states must distinguish in-flight and ambiguous delivery');
  has(/revoke all on function public\.claim_skbc_order_communication[^;]+from public/i, 'claim RPC must revoke PUBLIC execution');
  assert.doesNotMatch(sql, /grant insert\s*,\s*update on table public\.skbc_order_communications to authenticated/i, 'authenticated callers must not bypass delivery RPCs');
});

test('campaign close groups communications by normalized payer email and excludes cancelled orders', () => {
  has(/count\s*\(\s*distinct\s+lower\s*\(\s*btrim\s*\(\s*merch_order\.customer_email\s*\)\s*\)\s*\)\s*filter/i, 'expected communication count must use normalized distinct email');
  has(/merch_order\.status\s*<>\s*'cancelled'/i, 'cancelled orders must be excluded');
  has(/group by\s+lower\s*\(\s*btrim\s*\(\s*eligible_order\.customer_email\s*\)\s*\)/i, 'prepared communications must group by normalized email');
  has(/jsonb_agg\s*\([^;]+order_number/i, 'family snapshot must retain every order reference');
  has(/jsonb_agg\s*\([^;]+item\.created_at[^;]+item\.id/i, 'family snapshot must retain item rows in stable order');
  has(/sum\s*\(\s*coalesce\s*\(\s*eligible_order\.total_cents\s*,\s*0\s*\)\s*\)/i, 'family snapshot must contain the combined total');
});

test('storefront catalog access is restricted to the safe view', () => {
  assert.doesNotMatch(sql, /create policy "Public can read active merch (?:products|variants)"/i, 'base catalog tables must not have public/authenticated storefront policies');
  has(/grant select on table public\.skbc_merch_products\s*,\s*public\.skbc_merch_variants to authenticated/i, 'explicit admins need table privilege behind admin-only RLS');
  has(/grant select on table public\.skbc_merch_catalog_public to anon\s*,\s*authenticated/i, 'safe storefront view must serve both roles');
  has(/create policy "Admins can manage merch products"[\s\S]+public\.is_skbc_merch_admin/i, 'explicit admins must retain base product access');
});

test('catalog seed RPC atomically upserts owned rows and deactivates stale rows', () => {
  has(/function public\.seed_skbc_merch_catalog\s*\(\s*p_products jsonb\s*,\s*p_variants jsonb\s*,\s*p_catalog_owner text/i, 'seed RPC must accept Task 3 arrays and owner');
  has(/on conflict\s*\(\s*supplier_reference\s*\)\s*do update/i, 'seed RPC must upsert products by supplier reference');
  has(/on conflict\s*\(\s*sku\s*\)\s*do update/i, 'seed RPC must upsert variants by SKU');
  has(/catalog_owner/i, 'seed RPC must mark catalog ownership');
  has(/is_active\s*=\s*false/i, 'seed RPC must deactivate stale owned rows');
  has(/revoke all on function public\.seed_skbc_merch_catalog[^;]+from public/i, 'seed RPC must revoke PUBLIC execution');
  has(/pg_advisory_xact_lock\s*\(\s*hashtextextended\s*\(\s*p_catalog_owner/i, 'seed RPC must serialize writes per owner');
  has(/catalog_owner\s+is null[\s\S]+catalog_owner\s*=\s*p_catalog_owner/i, 'seed RPC must adopt matching unowned legacy rows');
  has(/catalog_owner\s*=\s*p_catalog_owner[\s\S]+belongs to another catalog owner/i, 'seed RPC must not steal rows owned by another catalog owner');
});

test('campaign close explicitly rejects null optimistic-lock counts', () => {
  has(/p_expected_order_count\s+is null\s+or\s+p_expected_communication_count\s+is null/i, 'close RPC must reject null expected counts');
  has(/v_order_count\s+is distinct from\s+p_expected_order_count/i, 'close RPC must compare order count null-safely');
  has(/v_communication_count\s+is distinct from\s+p_expected_communication_count/i, 'close RPC must compare communication count null-safely');
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

test('submit RPC requires at least six phone digits while allowing formatting', () => {
  has(
    /regexp_replace\s*\(\s*coalesce\s*\(\s*p_customer_phone\s*,\s*''\s*\)\s*,\s*'\[\^0-9\]'\s*,\s*''\s*,\s*'g'\s*\)\s*!~\s*'\^\[0-9\]\{6,\}\$'/i,
    'RPC must reject phones with fewer than six numeric digits after removing formatting',
  );
});

test('idempotency is bound to a canonical request hash', () => {
  has(/add column if not exists request_hash text/i, 'orders must store a request hash');
  has(/v_request_payload jsonb/i, 'RPC must build a canonical request payload');
  has(/sha256\s*\(/i, 'RPC must hash the canonical payload');
  has(/existing\.request_hash/i, 'RPC must load the original request hash');
  has(/idempotency key[^']*(?:different|payload|parameters)/i, 'RPC must clearly reject a mismatched retry');
  has(/idempotency_key[^;]+request_hash/i, 'RPC must persist the key and request hash together');
  assert.ok(
    sql.indexOf('select existing.id') < sql.indexOf('if nullif(btrim(p_customer_name)'),
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

  has(/grant select on (?:table )?public\.skbc_merch_catalog_public to anon/i, 'anon safe catalog read grant missing');
  has(/grant execute on function public\.submit_skbc_merch_order\s*\(\s*uuid\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*text\s*,\s*jsonb\s*\) to anon/i, 'anon RPC execution grant missing');
  has(/revoke all on function public\.submit_skbc_merch_order[^;]+from public/i, 'RPC must revoke default PUBLIC execution');
});

const integrationEnabled = process.env.RUN_POSTGRES_INTEGRATION === '1';

test('PostgreSQL integration: migration, authorization, idempotency, rollback, and Madrid boundaries', {
  skip: integrationEnabled ? false : 'set RUN_POSTGRES_INTEGRATION=1 to run with Docker',
  timeout: 120_000,
}, async (t) => {
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
  const psqlAsync = (database, input) => new Promise((resolve) => {
    const child = spawn('docker', [
      'exec', '--interactive', container, 'psql',
      '--username', 'postgres', '--dbname', database,
      '--set', 'ON_ERROR_STOP=1', '--no-psqlrc',
    ]);
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.on('close', (status) => resolve({ status, stdout, stderr }));
    child.stdin.end(input);
  });

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
    insert into public.skbc_merch_products (id, slug, name, supplier_reference, is_active) values
      ('10000000-0000-4000-8000-000000000001', 'gi', 'Gi', 'GI', true),
      ('10000000-0000-4000-8000-000000000002', 'inactive', 'Inactive', 'OFF', false);
    insert into public.skbc_merch_variants (
      id, product_id, sku, name, supplier_reference, cost_cents, margin_cents,
      price_cents, unit_price_cents, cost_basis, promotion_price_cents,
      promotion_starts_at, promotion_ends_at, promotion_is_active, attributes, is_active
    ) values
      ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'GI-A', 'A', 'GI', 2000, 500, 2500, 1, 'test', 2000, now() - interval '1 day', now() + interval '1 day', true, '{"size":"A"}', true),
      ('20000000-0000-4000-8000-000000000002', '10000000-0000-4000-8000-000000000001', 'GI-B', 'B', 'GI', 1000, 500, 1500, 1, 'test', null, null, null, false, '{"size":"B"}', true),
      ('20000000-0000-4000-8000-000000000003', '10000000-0000-4000-8000-000000000002', 'OFF', 'Off', 'OFF', 100, 0, 100, 1, 'test', null, null, null, false, '{"size":"Off"}', false);

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

    insert into public.skbc_order_campaigns (id, period_start, period_end)
    values ('40000000-0000-4000-8000-000000000001', date '2020-01-16', date '2020-02-15');
    insert into public.skbc_merch_orders (
      id, order_number, campaign_id, customer_name, customer_phone, customer_email, payment_method, total_cents, status
    ) values (
      '50000000-0000-4000-8000-000000000001', 'SKBC-HIST-1', '40000000-0000-4000-8000-000000000001',
      'Historical Member', '600000001', ' Family@Example.com ', 'cash', 2500, 'pending'
    ), (
      '50000000-0000-4000-8000-000000000002', 'SKBC-HIST-2', '40000000-0000-4000-8000-000000000001',
      'Historical Member', '600000002', 'family@example.COM', 'bank', 1500, 'paid'
    ), (
      '50000000-0000-4000-8000-000000000003', 'SKBC-CANCELLED', '40000000-0000-4000-8000-000000000001',
      'Cancelled Member', '600000003', 'cancelled@example.com', null, 900, 'cancelled'
    );
    insert into public.skbc_merch_order_items (
      order_id, variant_id, product_name, variant_name, sku, supplier_reference,
      size, recipient, quantity, cost_cents, unit_price_cents
    ) values
      ('50000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 'Gi', 'A', 'GI-A', 'GI', 'A', 'Child One', 1, 2000, 2500),
      ('50000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Gi', 'B', 'GI-B', 'GI', 'B', 'Child Two', 1, 1000, 1500),
      ('50000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000002', 'Gi', 'B', 'GI-B', 'GI', 'B', 'Cancelled Child', 1, 1000, 1500);

    set role authenticated;
    select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
    do $$ begin
      if (select count(*) from public.skbc_merch_orders) <> 4 then raise exception 'admin cannot read orders'; end if;
      perform public.assign_skbc_order_payment_method('50000000-0000-4000-8000-000000000001', 'Transfer');
      begin
        perform public.close_skbc_order_campaign('40000000-0000-4000-8000-000000000001', 4, 1);
        raise exception 'stale close confirmation succeeded';
      exception when serialization_failure then null;
      end;
      perform public.close_skbc_order_campaign('40000000-0000-4000-8000-000000000001', 3, 1);
      if (select count(*) from public.skbc_order_communications where order_id = '50000000-0000-4000-8000-000000000001' and status = 'prepared') <> 1 then
        raise exception 'close did not prepare exactly one grouped communication';
      end if;
      if exists (select 1 from public.skbc_order_communications where recipient_email = 'cancelled@example.com') then
        raise exception 'cancelled order produced a communication';
      end if;
      if (select jsonb_array_length(snapshot -> 'orders') from public.skbc_order_communications limit 1) <> 2
         or (select jsonb_array_length(snapshot -> 'items') from public.skbc_order_communications limit 1) <> 2
         or (select (snapshot ->> 'total_cents')::integer from public.skbc_order_communications limit 1) <> 4000 then
        raise exception 'grouped family snapshot lost orders, item rows, or combined total';
      end if;
      begin
        perform public.claim_skbc_order_communication(
          '40000000-0000-4000-8000-000000000001',
          (select id from public.skbc_order_communications limit 1),
          '60000000-0000-4000-8000-000000000001', false, false
        );
        raise exception 'unconfirmed send claim succeeded';
      exception when invalid_parameter_value then null;
      end;
      perform public.claim_skbc_order_communication(
        '40000000-0000-4000-8000-000000000001',
        (select id from public.skbc_order_communications limit 1),
        '60000000-0000-4000-8000-000000000001', false, true
      );
      begin
        perform public.claim_skbc_order_communication(
          '40000000-0000-4000-8000-000000000001',
          (select id from public.skbc_order_communications limit 1),
          '60000000-0000-4000-8000-000000000002', false, true
        );
        raise exception 'second sender claimed an in-flight communication';
      exception when object_not_in_prerequisite_state then null;
      end;
      if (select count(*) from public.skbc_order_communication_attempts) <> 1 then
        raise exception 'claim ledger did not preserve exactly one winning attempt';
      end if;
      perform public.complete_skbc_order_communication_attempt(
        '40000000-0000-4000-8000-000000000001',
        (select id from public.skbc_order_communications limit 1),
        '60000000-0000-4000-8000-000000000001', 'delivered_unconfirmed', 'persistence unavailable'
      );
      begin
        perform public.claim_skbc_order_communication(
          '40000000-0000-4000-8000-000000000001',
          (select id from public.skbc_order_communications limit 1),
          '60000000-0000-4000-8000-000000000002', false, true
        );
        raise exception 'ambiguous delivery was automatically retried';
      exception when object_not_in_prerequisite_state then null;
      end;
      perform public.reconcile_skbc_order_communication(
        '40000000-0000-4000-8000-000000000001',
        (select id from public.skbc_order_communications limit 1),
        '60000000-0000-4000-8000-000000000001', false, true
      );
      perform public.claim_skbc_order_communication(
        '40000000-0000-4000-8000-000000000001',
        (select id from public.skbc_order_communications limit 1),
        '60000000-0000-4000-8000-000000000003', false, true
      );
      perform public.complete_skbc_order_communication_attempt(
        '40000000-0000-4000-8000-000000000001',
        (select id from public.skbc_order_communications limit 1),
        '60000000-0000-4000-8000-000000000003', 'smtp_failed', 'recipient rejected'
      );
      perform public.claim_skbc_order_communication(
        '40000000-0000-4000-8000-000000000001',
        (select id from public.skbc_order_communications limit 1),
        '60000000-0000-4000-8000-000000000004', false, true
      );
      perform public.complete_skbc_order_communication_attempt(
        '40000000-0000-4000-8000-000000000001',
        (select id from public.skbc_order_communications limit 1),
        '60000000-0000-4000-8000-000000000004', 'delivered', null
      );
      perform public.claim_skbc_order_communication(
        '40000000-0000-4000-8000-000000000001',
        (select id from public.skbc_order_communications limit 1),
        '60000000-0000-4000-8000-000000000005', true, true
      );
      perform public.complete_skbc_order_communication_attempt(
        '40000000-0000-4000-8000-000000000001',
        (select id from public.skbc_order_communications limit 1),
        '60000000-0000-4000-8000-000000000005', 'smtp_failed', 'forced resend rejected'
      );
      if (select status from public.skbc_order_communications limit 1) <> 'sent'
         or not (select forced from public.skbc_order_communication_attempts where attempt_token = '60000000-0000-4000-8000-000000000005') then
        raise exception 'failed forced resend lost the original confirmed delivery audit';
      end if;
      begin
        perform public.assign_skbc_order_payment_method('50000000-0000-4000-8000-000000000001', 'Cash');
        raise exception 'frozen payment update succeeded';
      exception when object_not_in_prerequisite_state then null;
      end;
    end $$;
    reset role;

    do $$ begin
      begin
        update public.skbc_merch_orders set customer_name = 'Changed'
        where id = '50000000-0000-4000-8000-000000000001';
        raise exception 'frozen order trigger allowed an update';
      exception when object_not_in_prerequisite_state then null;
      end;
    end $$;

    set role anon;
    do $$ begin
      if (select count(*) from public.skbc_merch_catalog_public) <> 2 then raise exception 'safe public catalog visibility failed'; end if;
      begin
        perform count(*) from public.skbc_merch_variants;
        raise exception 'anon read private variant economics';
      exception when insufficient_privilege then null; end;
    end $$;
    create temp table first_order as
      select * from public.submit_skbc_merch_order(
        '30000000-0000-4000-8000-000000000001', ' Alice ', 'ALICE@EXAMPLE.COM ', ' +34 (600) 111-222 ',
        ' M-1 ', ' hello ', 'ES',
        '[{"variant_id":"20000000-0000-4000-8000-000000000002","recipient":" Bob ","quantity":"2"},{"variant_id":"20000000-0000-4000-8000-000000000001","recipient":"Alice","quantity":1}]'::jsonb
      );
    create temp table retry_order as
      select * from public.submit_skbc_merch_order(
        '30000000-0000-4000-8000-000000000001', 'Alice', 'alice@example.com', '+34 (600) 111-222',
        'M-1', 'hello', 'es',
        '[{"quantity":1,"recipient":"Alice","variant_id":"20000000-0000-4000-8000-000000000001"},{"quantity":2,"recipient":"Bob","variant_id":"20000000-0000-4000-8000-000000000002"}]'::jsonb
      );
    do $$ begin
      if (select order_id from first_order) <> (select order_id from retry_order) then
        raise exception 'normalized retry did not return original order';
      end if;
      if (select total_cents from first_order) <> 5000 then
        raise exception 'effective promotion price was not applied';
      end if;
      begin
        perform public.submit_skbc_merch_order(
          '30000000-0000-4000-8000-000000000003', 'Phone Test', 'phone@example.com', '+()- .',
          null, null, 'es',
          '[{"variant_id":"20000000-0000-4000-8000-000000000001","recipient":"Phone Test","quantity":1}]'::jsonb
        );
        raise exception 'punctuation-only phone succeeded';
      exception when invalid_parameter_value then null;
      end;
      begin
        perform public.submit_skbc_merch_order(
          '30000000-0000-4000-8000-000000000001', 'Alice', 'alice@example.com', 'DIFFERENT',
          'M-1', 'hello', 'es',
          '[{"variant_id":"20000000-0000-4000-8000-000000000001","recipient":"Alice","quantity":1},{"variant_id":"20000000-0000-4000-8000-000000000002","recipient":"Bob","quantity":2}]'::jsonb
        );
        raise exception 'mismatched retry succeeded';
      exception when unique_violation then
        if sqlerrm not like '%different request%' then raise; end if;
      end;
    end $$;
    reset role;

    do $$ begin
      if (select count(*) from public.skbc_merch_order_items where recipient in ('Alice', 'Bob')) <> 2 then
        raise exception 'normalized recipients were not persisted';
      end if;
    end $$;

    set role authenticated;
    select set_config('request.jwt.claim.sub', '00000000-0000-4000-8000-000000000001', false);
    do $$ declare current_campaign uuid; begin
      select campaign_id into current_campaign
      from public.skbc_merch_orders
      where id = (select order_id from first_order);
      begin
        perform public.close_skbc_order_campaign(current_campaign, 1, 1);
        raise exception 'campaign closed before its Madrid-local period ended';
      exception when object_not_in_prerequisite_state then null;
      end;
    end $$;
    reset role;

    do $$ declare before_count integer; begin
      select count(*) into before_count from public.skbc_merch_orders;
      begin
        perform public.submit_skbc_merch_order(
          '30000000-0000-4000-8000-000000000002', 'Bob', 'bob@example.com', '600333444', null, null, 'es',
          '[{"variant_id":"20000000-0000-4000-8000-000000000001","recipient":"Bob","quantity":1},{"variant_id":"20000000-0000-4000-8000-000000000003","recipient":"Bob","quantity":1}]'::jsonb
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

    insert into public.skbc_merch_products (slug, name, supplier_reference, catalog_owner, is_active)
    values ('seeded', 'Legacy Seeded', 'SEED', null, true);
    insert into public.skbc_merch_variants (
      product_id, sku, name, supplier_reference, cost_cents, margin_cents,
      price_cents, unit_price_cents, cost_basis, catalog_owner, is_active
    ) select id, 'SEED-1', 'Legacy One', 'SEED', 90, 10, 100, 100, 'legacy', null, true
      from public.skbc_merch_products where supplier_reference = 'SEED';

    select set_config('request.jwt.claim.role', 'service_role', false);
    do $$ declare seeded record; begin
      select * into seeded from public.seed_skbc_merch_catalog(
        '[{"slug":"seeded","name":"Seeded","supplier_reference":"SEED","catalog_owner":"integration-owner","is_active":true}]'::jsonb,
        '[{"product_slug":"seeded","sku":"SEED-1","name":"One","supplier_reference":"SEED","cost_cents":100,"margin_cents":50,"price_cents":150,"cost_basis":"test","catalog_owner":"integration-owner","is_active":true}]'::jsonb,
        'integration-owner'
      );
      if seeded.products_upserted <> 1 or seeded.variants_upserted <> 1 then
        raise exception 'atomic seed counts were wrong';
      end if;
      if exists (select 1 from public.skbc_merch_products where supplier_reference = 'SEED' and catalog_owner is distinct from 'integration-owner')
         or exists (select 1 from public.skbc_merch_variants where sku = 'SEED-1' and catalog_owner is distinct from 'integration-owner') then
        raise exception 'matching unowned legacy rows were not adopted';
      end if;
      select * into seeded from public.seed_skbc_merch_catalog(
        '[]'::jsonb, '[]'::jsonb, 'integration-owner'
      );
      if seeded.products_deactivated <> 1 or seeded.variants_deactivated <> 1 then
        raise exception 'stale owned rows were not deactivated';
      end if;
    end $$;
    select set_config('request.jwt.claim.role', '', false);
  `;
  psql('legacy_schema', behavior);

  psql('legacy_schema', `
    insert into public.skbc_order_communications (
      id, order_id, channel, direction, status, recipient_email, snapshot, prepared_at
    ) values (
      '70000000-0000-4000-8000-000000000001',
      '50000000-0000-4000-8000-000000000001',
      'email', 'outbound', 'prepared', 'race@example.com', '{}'::jsonb, now()
    );
  `);
  const firstClaim = psqlAsync('legacy_schema', `
    begin;
    select set_config('request.jwt.claim.role', 'service_role', false);
    select * from public.claim_skbc_order_communication(
      '40000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000001',
      '80000000-0000-4000-8000-000000000001', false, true
    );
    select pg_sleep(1);
    commit;
  `);
  await new Promise((resolve) => setTimeout(resolve, 150));
  const secondClaim = psqlAsync('legacy_schema', `
    begin;
    select set_config('request.jwt.claim.role', 'service_role', false);
    select * from public.claim_skbc_order_communication(
      '40000000-0000-4000-8000-000000000001',
      '70000000-0000-4000-8000-000000000001',
      '80000000-0000-4000-8000-000000000002', false, true
    );
    commit;
  `);
  const [firstResult, secondResult] = await Promise.all([firstClaim, secondClaim]);
  assert.equal(firstResult.status, 0, `first concurrent claim failed: ${firstResult.stderr}`);
  assert.notEqual(secondResult.status, 0, 'second concurrent sender also claimed the communication');
  assert.match(secondResult.stderr, /not retryable|object_not_in_prerequisite_state|55000/i);
  psql('legacy_schema', `
    do $$ begin
      if (select count(*) from public.skbc_order_communication_attempts where communication_id = '70000000-0000-4000-8000-000000000001') <> 1 then
        raise exception 'concurrent claims created more than one attempt';
      end if;
    end $$;
  `);
});
