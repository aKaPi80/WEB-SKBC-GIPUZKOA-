import { pathToFileURL } from "node:url";

const ILLUSTRATIVE_ATTRIBUTION = "Imagen orientativa generada para SKBC; producto Fujimae consultable en la ficha oficial";
const COST_BASIS = "Approved estimate derived from public club price; no private supplier price stored";
const ALL_SIZES = ["0000", "000", "00", "0", "1", "2", "3", "4", "5", "6", "7"];

const giDefinitions = [
  {
    reference: "10000",
    slug: "fujimae-karate-gi-basic",
    name: "Karate Gi Basic 6.5 oz",
    description: "Complete white gi for beginners and regular light training.",
    level: "Beginner",
    weight: "6.5 oz",
    sizes: ALL_SIZES,
    priceForSize: (size) => (["0000", "000", "00", "0", "1", "2"].includes(size) ? 3000 : 3500),
    sourceUrl: "https://fujimae.com/es/vestimenta-karate/7454-karate-gi-basic.html",
  },
  {
    reference: "10010",
    slug: "fujimae-karate-gi-training",
    name: "Karate Gi Training 9 oz",
    description: "Complete white gi for frequent, medium-intensity training.",
    level: "Training",
    weight: "9 oz",
    sizes: ALL_SIZES,
    priceForSize: (size) => (["0000", "000", "00", "0", "1", "2"].includes(size) ? 4000 : 4500),
    sourceUrl: "https://fujimae.com/es/vestimenta-karate/7468-karate-gi-training.html",
  },
  {
    reference: "10021",
    slug: "fujimae-karate-gi-training-lite-2",
    name: "Karate Gi Training Lite 2",
    description: "Complete lightweight white gi for training and competition preparation.",
    level: "Training",
    weight: "Lightweight",
    sizes: ["000", "00", "0", "1", "2", "3", "4", "5", "7"],
    priceForSize: (size) => (["000", "00", "0", "1", "2"].includes(size) ? 4500 : 6000),
    sourceUrl: "https://fujimae.com/es/vestimenta-karate/8221-karate-gi-training-lite-2.html",
  },
  {
    reference: "10041",
    slug: "fujimae-karate-gi-shinsei",
    name: "Karate Gi Shinsei 11 oz",
    description: "Complete traditional-cut white gi for advanced daily practice.",
    level: "Advanced",
    weight: "11 oz",
    sizes: ["3", "4", "5", "6", "7"],
    priceForSize: () => 6500,
    sourceUrl: "https://fujimae.com/es/vestimenta-karate/7791-karate-gi-shinsei.html",
  },
  {
    reference: "10050",
    slug: "fujimae-karate-gi-legacy-ii",
    name: "Karate Gi Legacy II 14 oz",
    description: "Complete heavyweight white gi with a traditional cut.",
    level: "Advanced",
    weight: "14 oz",
    sizes: ["3", "4", "5", "6", "7"],
    priceForSize: () => 8500,
    sourceUrl: "https://fujimae.com/es/vestimenta-karate/7694-karate-gi-legacy-ii.html",
  },
  {
    reference: "10060",
    slug: "fujimae-karate-gi-kumite-prowear",
    name: "Karate Gi Kumite ProWear",
    description: "Complete white competition gi designed for Kumite.",
    level: "Competition",
    weight: "Lightweight",
    sizes: ["2", "3", "4", "5", "6", "7"],
    priceForSize: () => 9500,
    promotionPriceCents: 8800,
    sourceUrl: "https://fujimae.com/es/vestimenta-karate/7734-karate-gi-kumite-prowear.html",
  },
  {
    reference: "10070",
    slug: "fujimae-karate-gi-kata-budokan",
    name: "Karate Gi Kata Budokan 12 oz",
    description: "Complete white competition gi with a Kata-specific cut.",
    level: "Competition",
    weight: "12 oz",
    sizes: ["2", "3", "4", "5", "6", "7"],
    priceForSize: () => 8000,
    sourceUrl: "https://fujimae.com/es/vestimenta-karate/7735-karate-gi-kata-budokan.html",
  },
  {
    reference: "10080",
    slug: "fujimae-karate-gi-kumite-training-upcycle",
    name: "Karate Gi Kumite Training UpCycle",
    description: "Complete white lightweight gi for Kumite training.",
    level: "Advanced",
    weight: "Lightweight",
    sizes: ["3", "4", "5", "6", "7"],
    priceForSize: () => 9500,
    sourceUrl: "https://fujimae.com/es/vestimenta-karate/8103-karate-gi-kumite-training-upcycle.html",
  },
  {
    reference: "10081",
    slug: "fujimae-karate-gi-kumite-prowear-hyperlite-qs",
    name: "Karate Gi Kumite ProWear Hyperlite QS",
    description: "Complete ultra-light white competition gi for Kumite.",
    level: "Competition",
    weight: "67-84 gsm",
    sizes: ["2", "3", "4", "5", "6", "7"],
    priceForSize: () => 10500,
    sourceUrl: "https://fujimae.com/es/vestimenta-karate/8162-karate-gi-kumite-prowear-hyperlite-qs.html",
  },
];

export const products = [
  ...giDefinitions.map((definition, index) => ({
    slug: definition.slug,
    name: definition.name,
    description: definition.description,
    brand: "Fujimae",
    supplier_reference: definition.reference,
    category: "gi",
    recommended_level: definition.level,
    weight: definition.weight,
    image_url: `assets/products/fujimae/${definition.reference}.webp`,
    source_url: definition.sourceUrl,
    image_attribution: ILLUSTRATIVE_ATTRIBUTION,
    metadata: {
      color: "White",
      includes: ["jacket", "trousers"],
      image_source_type: "codex_generated",
      image_attribution: ILLUSTRATIVE_ATTRIBUTION,
    },
    sort_order: index + 1,
    is_active: true,
  })),
  {
    slug: "white-belt",
    name: "Obi blanco",
    description: "White martial arts belt.",
    brand: "SKBC",
    supplier_reference: "BELT-WHITE",
    category: "belt",
    recommended_level: "Beginner",
    weight: null,
    image_url: null,
    source_url: null,
    image_attribution: null,
    metadata: { color: "White" },
    sort_order: 10,
    is_active: true,
  },
];

export const variants = [
  ...giDefinitions.flatMap((definition) => definition.sizes.map((size, index) => {
    const priceCents = definition.priceForSize(size);
    const marginCents = 500;
    const promotionPriceCents = definition.promotionPriceCents ?? null;
    return {
      product_slug: definition.slug,
      supplier_reference: definition.reference,
      sku: `${definition.reference}-${size}`,
      name: `Talla ${size}`,
      attributes: { size, color: "White" },
      cost_cents: priceCents - marginCents,
      margin_cents: marginCents,
      price_cents: priceCents,
      unit_price_cents: priceCents,
      cost_basis: COST_BASIS,
      promotion: {
        price_cents: promotionPriceCents,
        starts_at: null,
        ends_at: null,
        is_active: false,
      },
      promotion_price_cents: promotionPriceCents,
      promotion_starts_at: null,
      promotion_ends_at: null,
      promotion_is_active: false,
      sort_order: index + 1,
      is_active: true,
    };
  })),
  {
    product_slug: "white-belt",
    supplier_reference: "BELT-WHITE",
    sku: "BELT-WHITE",
    name: "Blanco",
    attributes: { color: "White", size: "One size" },
    cost_cents: 500,
    margin_cents: 0,
    price_cents: 500,
    unit_price_cents: 500,
    cost_basis: COST_BASIS,
    promotion: { price_cents: null, starts_at: null, ends_at: null, is_active: false },
    promotion_price_cents: null,
    promotion_starts_at: null,
    promotion_ends_at: null,
    promotion_is_active: false,
    sort_order: 1,
    is_active: true,
  },
];

const CATALOG_OWNER = "skbc-approved-material-catalog";

export function buildSeedRpcRequest() {
  return {
    path: "/rest/v1/rpc/seed_skbc_merch_catalog",
    body: {
      p_catalog_owner: CATALOG_OWNER,
      p_products: products.map((product) => ({ ...product, catalog_owner: CATALOG_OWNER })),
      p_variants: variants.map(({ promotion, ...variant }) => ({
        ...variant,
        catalog_owner: CATALOG_OWNER,
        metadata: { promotion },
      })),
    },
  };
}

function requiredEnvironment(env) {
  const url = env.WEB_ORDERS_SUPABASE_URL;
  const serviceRoleKey = env.WEB_ORDERS_SUPABASE_SERVICE_ROLE_KEY;
  const missing = [
    !url && "WEB_ORDERS_SUPABASE_URL",
    !serviceRoleKey && "WEB_ORDERS_SUPABASE_SERVICE_ROLE_KEY",
  ].filter(Boolean);

  if (missing.length) throw new Error(`Missing required environment: ${missing.join(", ")}`);
  return { url: url.replace(/\/+$/, ""), serviceRoleKey };
}

async function callSeedRpc({ url, serviceRoleKey }, request, fetchImpl) {
  const response = await fetchImpl(`${url}${request.path}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(request.body),
  });

  if (!response.ok) throw new Error(`catalog seed RPC failed (${response.status}): ${await response.text()}`);
  return response.json();
}

export async function executeSeed({ env = process.env, fetchImpl = fetch } = {}) {
  const credentials = requiredEnvironment(env);
  const payload = await callSeedRpc(credentials, buildSeedRpcRequest(), fetchImpl);
  const result = Array.isArray(payload) ? payload[0] : payload;
  if (!result) throw new Error("catalog seed RPC returned no result");
  return {
    products: result.products_upserted,
    variants: result.variants_upserted,
    productsDeactivated: result.products_deactivated,
    variantsDeactivated: result.variants_deactivated,
  };
}

async function main() {
  if (!process.argv.includes("--execute")) {
    console.log(`Dry run: ${products.length} products and ${variants.length} variants validated. Use --execute to import.`);
    return;
  }

  const result = await executeSeed();
  console.log(`Imported ${result.products} products and ${result.variants} variants; deactivated ${result.productsDeactivated} products and ${result.variantsDeactivated} variants.`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
