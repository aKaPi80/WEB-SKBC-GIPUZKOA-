import { pathToFileURL } from "node:url";

const FUJIMAE_ATTRIBUTION = "Product image source: Fujimae";
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
    imageSourceUrl: "https://fujimae.com/12807-zoom_producto/karate-gi-basic.jpg",
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
    imageSourceUrl: "https://fujimae.com/12806-zoom_producto/karate-gi-training.jpg",
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
    imageSourceUrl: "https://fujimae.com/12808-zoom_producto/karate-gi-training-lite-2.jpg",
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
    imageSourceUrl: "https://fujimae.com/7349-zoom_producto/karate-gi-shinsei.jpg",
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
    imageSourceUrl: "https://fujimae.com/7218-zoom_producto/karate-gi-legacy-ii.jpg",
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
    imageSourceUrl: "https://fujimae.com/12718-zoom_producto/karate-gi-kumite-prowear.jpg",
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
    imageSourceUrl: "https://fujimae.com/12719-zoom_producto/karate-gi-kata-budokan.jpg",
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
    imageSourceUrl: "https://fujimae.com/12727-zoom_producto/karate-gi-kumite-training-upcycle.jpg",
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
    imageSourceUrl: "https://fujimae.com/11645-zoom_producto/karate-gi-kumite-prowear-hyperlite-qs.jpg",
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
    image_attribution: FUJIMAE_ATTRIBUTION,
    metadata: {
      color: "White",
      includes: ["jacket", "trousers"],
      image_source_url: definition.imageSourceUrl,
      image_attribution: FUJIMAE_ATTRIBUTION,
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

const productPayload = () => products.map(({ metadata, ...product }) => ({ ...product, metadata }));
const variantPayload = (productIds = new Map()) => variants.map(({ product_slug: productSlug, promotion, ...variant }) => ({
  ...variant,
  product_id: productIds.get(productSlug) ?? null,
  metadata: { promotion },
}));

export function buildSeedRequests(productIds = new Map()) {
  return [
    {
      table: "skbc_merch_products",
      onConflict: "supplier_reference",
      prefer: "resolution=merge-duplicates,return=representation",
      rows: productPayload(),
    },
    {
      table: "skbc_merch_variants",
      onConflict: "sku",
      prefer: "resolution=merge-duplicates,return=representation",
      rows: variantPayload(productIds),
    },
  ];
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

async function upsert({ url, serviceRoleKey }, request) {
  const response = await fetch(`${url}/rest/v1/${request.table}?on_conflict=${encodeURIComponent(request.onConflict)}`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      prefer: request.prefer,
    },
    body: JSON.stringify(request.rows),
  });

  if (!response.ok) throw new Error(`${request.table} upsert failed (${response.status}): ${await response.text()}`);
  return response.json();
}

export async function executeSeed({ env = process.env } = {}) {
  const credentials = requiredEnvironment(env);
  const [productRequest] = buildSeedRequests();
  const savedProducts = await upsert(credentials, productRequest);
  const productIds = new Map(savedProducts.map((product) => [product.slug, product.id]));
  const [, variantRequest] = buildSeedRequests(productIds);

  if (variantRequest.rows.some((variant) => !variant.product_id)) {
    throw new Error("Product upsert did not return every product id; variants were not written");
  }

  const savedVariants = await upsert(credentials, variantRequest);
  return { products: savedProducts.length, variants: savedVariants.length };
}

async function main() {
  if (!process.argv.includes("--execute")) {
    console.log(`Dry run: ${products.length} products and ${variants.length} variants validated. Use --execute to import.`);
    return;
  }

  const result = await executeSeed();
  console.log(`Imported ${result.products} products and ${result.variants} variants.`);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
