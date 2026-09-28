import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  products,
  variants,
  buildSeedRequests,
} from "../scripts/seed-material-catalog.mjs";

const repoRoot = fileURLToPath(new URL("..", import.meta.url));
const expectedReferences = [
  "10000",
  "10010",
  "10021",
  "10041",
  "10050",
  "10060",
  "10070",
  "10080",
  "10081",
];

test("approved catalog contains only the nine Fujimae gis and white belt", () => {
  const fujimae = products.filter((item) => item.brand === "Fujimae");

  assert.deepEqual(fujimae.map((item) => item.supplier_reference).sort(), expectedReferences);
  assert.equal(products.length, 10);
  assert.equal(products.find((item) => item.slug === "white-belt").name, "Obi blanco");
});

test("approved catalog has stable public prices", () => {
  assert.equal(variants.find((item) => item.sku === "10000-2").price_cents, 3000);
  assert.equal(variants.find((item) => item.sku === "10000-3").price_cents, 3500);
  assert.equal(variants.find((item) => item.sku === "10010-2").price_cents, 4000);
  assert.equal(variants.find((item) => item.sku === "10010-3").price_cents, 4500);
  assert.equal(variants.find((item) => item.sku === "10021-2").price_cents, 4500);
  assert.equal(variants.find((item) => item.sku === "10021-3").price_cents, 6000);
  assert.equal(variants.find((item) => item.sku === "10041-3").price_cents, 6500);
  assert.equal(variants.find((item) => item.sku === "10050-3").price_cents, 8500);
  assert.equal(variants.find((item) => item.sku === "10060-2").price_cents, 9500);
  assert.equal(variants.find((item) => item.sku === "10070-7").price_cents, 8000);
  assert.equal(variants.find((item) => item.sku === "10080-3").price_cents, 9500);
  assert.equal(variants.find((item) => item.sku === "10081-2").price_cents, 10500);
  assert.equal(variants.find((item) => item.sku === "BELT-WHITE").price_cents, 500);
});

test("variants cover only approved sizes and separate cost margin and final price", () => {
  const sizesFor = (reference) => variants
    .filter((item) => item.supplier_reference === reference)
    .map((item) => item.attributes.size);

  assert.deepEqual(sizesFor("10000"), ["0000", "000", "00", "0", "1", "2", "3", "4", "5", "6", "7"]);
  assert.deepEqual(sizesFor("10021"), ["000", "00", "0", "1", "2", "3", "4", "5", "7"]);
  assert.deepEqual(sizesFor("10041"), ["3", "4", "5", "6", "7"]);
  assert.deepEqual(sizesFor("10060"), ["2", "3", "4", "5", "6", "7"]);

  for (const variant of variants) {
    assert.equal(Number.isInteger(variant.cost_cents), true, variant.sku);
    assert.equal(Number.isInteger(variant.margin_cents), true, variant.sku);
    assert.equal(variant.cost_cents + variant.margin_cents, variant.price_cents, variant.sku);
  }
});

test("ProWear keeps its stable price and inactive temporary promotion", () => {
  const proWearVariants = variants.filter((item) => item.supplier_reference === "10060");

  assert.equal(proWearVariants.length, 6);
  for (const variant of proWearVariants) {
    assert.equal(variant.price_cents, 9500);
    assert.equal(variant.promotion.is_active, false);
    assert.equal(Number.isInteger(variant.promotion.price_cents), true);
  }
});

test("Fujimae products record legitimate source attribution and local WebP images", () => {
  for (const product of products.filter((item) => item.brand === "Fujimae")) {
    assert.match(product.source_url, /^https:\/\/(?:www\.)?fujimae\.com\//);
    assert.equal(product.image_attribution, "Product image source: Fujimae");
    assert.match(product.metadata.image_source_url, /^https:\/\/fujimae\.com\/[0-9]+-zoom_producto\//);
    assert.match(product.image_url, /^assets\/products\/fujimae\/[0-9]+\.webp$/);
    assert.equal(existsSync(`${repoRoot}/${product.image_url}`), true, product.image_url);

    const header = readFileSync(`${repoRoot}/${product.image_url}`).subarray(0, 12);
    assert.equal(header.toString("ascii", 0, 4), "RIFF", product.image_url);
    assert.equal(header.toString("ascii", 8, 12), "WEBP", product.image_url);
  }
});

test("seed requests are deterministic idempotent upserts", () => {
  const first = buildSeedRequests();
  const second = buildSeedRequests();

  assert.deepEqual(first, second);
  assert.deepEqual(first.map((request) => request.onConflict), ["supplier_reference", "sku"]);
  assert.equal(first.every((request) => request.prefer.includes("resolution=merge-duplicates")), true);
});

test("dry-run succeeds without Supabase admin environment", () => {
  const result = spawnSync(process.execPath, ["scripts/seed-material-catalog.mjs"], {
    cwd: repoRoot,
    env: {},
    encoding: "utf8",
  });

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /dry run/i);
  assert.match(result.stdout, /10 products/i);
});

test("execution requires dedicated website Supabase admin environment", () => {
  const result = spawnSync(process.execPath, ["scripts/seed-material-catalog.mjs", "--execute"], {
    cwd: repoRoot,
    env: {},
    encoding: "utf8",
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /WEB_ORDERS_SUPABASE_URL/);
  assert.match(result.stderr, /WEB_ORDERS_SUPABASE_SERVICE_ROLE_KEY/);
});
