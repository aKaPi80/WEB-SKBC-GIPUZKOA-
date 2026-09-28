import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import test from "node:test";

import {
  products,
  variants,
  buildSeedRpcRequest,
  executeSeed,
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
const illustrativeAttribution = "Imagen orientativa generada para SKBC; producto Fujimae consultable en la ficha oficial";

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

test("Fujimae products use the generated illustration and preserve only official product-page sources", () => {
  const imageBuffers = [];

  for (const product of products.filter((item) => item.brand === "Fujimae")) {
    assert.match(product.source_url, /^https:\/\/fujimae\.com\/es\/vestimenta-karate\//);
    assert.equal(product.image_attribution, illustrativeAttribution);
    assert.equal(product.metadata.image_attribution, illustrativeAttribution);
    assert.equal(product.metadata.image_source_type, "codex_generated");
    assert.equal("image_source_url" in product.metadata, false);
    assert.match(product.image_url, /^assets\/products\/fujimae\/[0-9]+\.webp$/);
    assert.equal(existsSync(`${repoRoot}/${product.image_url}`), true, product.image_url);

    const image = readFileSync(`${repoRoot}/${product.image_url}`);
    const header = image.subarray(0, 12);
    assert.equal(header.toString("ascii", 0, 4), "RIFF", product.image_url);
    assert.equal(header.toString("ascii", 8, 12), "WEBP", product.image_url);
    imageBuffers.push(image);
  }

  assert.equal(imageBuffers.slice(1).every((image) => image.equals(imageBuffers[0])), true);
});

test("seed request calls the atomic owner-scoped catalog RPC", () => {
  const first = buildSeedRpcRequest();
  const second = buildSeedRpcRequest();

  assert.deepEqual(first, second);
  assert.equal(first.path, "/rest/v1/rpc/seed_skbc_merch_catalog");
  assert.equal(first.body.p_catalog_owner, "skbc-approved-material-catalog");
  assert.equal(first.body.p_products.length, products.length);
  assert.equal(first.body.p_variants.length, variants.length);
  assert.equal(first.body.p_products.every((product) => product.catalog_owner === first.body.p_catalog_owner), true);
  assert.equal(first.body.p_variants.every((variant) => variant.catalog_owner === first.body.p_catalog_owner), true);
});

test("execution posts one atomic RPC request and returns its counts", async () => {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify({ products_upserted: 10, variants_upserted: 65, products_deactivated: 1, variants_deactivated: 2 }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const result = await executeSeed({
    env: {
      WEB_ORDERS_SUPABASE_URL: "https://website-project.supabase.co/",
      WEB_ORDERS_SUPABASE_SERVICE_ROLE_KEY: "test-service-role-key",
    },
    fetchImpl,
  });

  assert.deepEqual(result, { products: 10, variants: 65, productsDeactivated: 1, variantsDeactivated: 2 });
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://website-project.supabase.co/rest/v1/rpc/seed_skbc_merch_catalog");
  assert.equal(calls[0].options.method, "POST");
  assert.equal(calls[0].options.headers.authorization, "Bearer test-service-role-key");
  assert.deepEqual(JSON.parse(calls[0].options.body), buildSeedRpcRequest().body);
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
