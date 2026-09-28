import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sqlUrl = new URL('../SUPABASE-PEDIDOS.sql', import.meta.url);
const sql = (await readFile(sqlUrl, 'utf8'))
  .replace(/--.*$/gm, '')
  .replace(/\s+/g, ' ')
  .trim();

const escaped = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const has = (pattern, message) => assert.match(sql, pattern, message);

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

test('submit RPC exposes the approved signature and return contract', () => {
  has(/function public\.submit_skbc_merch_order\s*\(\s*p_idempotency_key uuid\s*,\s*p_customer_name text\s*,\s*p_customer_email text\s*,\s*p_customer_phone text\s*,\s*p_member_reference text\s*,\s*p_comments text\s*,\s*p_page_lang text\s*,\s*p_items jsonb\s*\)\s*returns table\s*\(\s*order_id uuid\s*,\s*order_number text\s*,\s*total_cents integer\s*\)/i);
  has(/security definer/i, 'RPC must be security definer so anon does not need table writes');
  has(/set search_path\s*=\s*public\s*,\s*pg_temp/i, 'RPC must pin its search path');
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
