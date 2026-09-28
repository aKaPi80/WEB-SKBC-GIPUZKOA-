import { pathToFileURL } from "node:url";

const ILLUSTRATIVE_ATTRIBUTION = "Imagen orientativa generada para SKBC";
const COST_BASIS = "Approved estimate derived from public club price; no private supplier price stored";
const ALL_SIZES = ["0000", "000", "00", "0", "1", "2", "3", "4", "5", "6", "7"];
const BELT_COLORS = ["Blanco", "Amarillo", "Naranja", "Verde", "Azul", "Lila", "Marrón", "Rojo", "Negro"];
const BELT_LENGTHS = ["240 cm", "260 cm", "280 cm", "300 cm", "320 cm"];

const giDefinitions = [
  {
    reference: "10000",
    slug: "fujimae-karate-gi-basic",
    name: "Karate Gi Basic 6.5 oz",
    description: "Dogi blanco ligero y cómodo, pensado para iniciación y entrenamiento habitual. Incluye chaqueta y pantalón.",
    level: "Iniciación",
    weight: "6.5 oz",
    sizes: ALL_SIZES,
    priceForSize: (size) => (["0000", "000", "00", "0", "1", "2"].includes(size) ? 3000 : 3500),
  },
  {
    reference: "10010",
    slug: "fujimae-karate-gi-training",
    name: "Karate Gi Training 9 oz",
    description: "Dogi blanco de gramaje medio para entrenamiento frecuente. Ofrece mayor consistencia sin perder comodidad e incluye chaqueta y pantalón.",
    level: "Entrenamiento",
    weight: "9 oz",
    sizes: ALL_SIZES,
    priceForSize: (size) => (["0000", "000", "00", "0", "1", "2"].includes(size) ? 4000 : 4500),
  },
  {
    reference: "10021",
    slug: "fujimae-karate-gi-training-lite-2",
    name: "Karate Gi Training Lite 2",
    description: "Dogi blanco ligero para entrenamientos dinámicos y preparación de competición. Incluye chaqueta y pantalón.",
    level: "Entrenamiento",
    weight: "Lightweight",
    sizes: ["000", "00", "0", "1", "2", "3", "4", "5", "7"],
    priceForSize: (size) => (["000", "00", "0", "1", "2"].includes(size) ? 4500 : 6000),
  },
  {
    reference: "10041",
    slug: "fujimae-karate-gi-shinsei",
    name: "Karate Gi Shinsei 11 oz",
    description: "Dogi blanco de corte tradicional y tejido consistente para práctica avanzada y entrenamiento diario. Incluye chaqueta y pantalón.",
    level: "Avanzado",
    weight: "11 oz",
    sizes: ["3", "4", "5", "6", "7"],
    priceForSize: () => 6500,
  },
  {
    reference: "10050",
    slug: "fujimae-karate-gi-legacy-ii",
    name: "Karate Gi Legacy II 14 oz",
    description: "Dogi blanco de alto gramaje y corte tradicional, con una presencia firme para practicantes avanzados. Incluye chaqueta y pantalón.",
    level: "Avanzado",
    weight: "14 oz",
    sizes: ["3", "4", "5", "6", "7"],
    priceForSize: () => 8500,
  },
  {
    reference: "10060",
    slug: "fujimae-karate-gi-kumite-prowear",
    name: "Karate Gi Kumite ProWear",
    description: "Dogi blanco ligero diseñado para kumite y competición, pensado para facilitar movimientos rápidos. Incluye chaqueta y pantalón.",
    level: "Competición",
    weight: "Lightweight",
    sizes: ["2", "3", "4", "5", "6", "7"],
    priceForSize: () => 9500,
    promotionPriceCents: 8800,
  },
  {
    reference: "10070",
    slug: "fujimae-karate-gi-kata-budokan",
    name: "Karate Gi Kata Budokan 12 oz",
    description: "Dogi blanco de competición con corte específico para kata y tejido de 12 oz. Incluye chaqueta y pantalón.",
    level: "Competición",
    weight: "12 oz",
    sizes: ["2", "3", "4", "5", "6", "7"],
    priceForSize: () => 8000,
  },
  {
    reference: "10080",
    slug: "fujimae-karate-gi-kumite-training-upcycle",
    name: "Karate Gi Kumite Training UpCycle",
    description: "Dogi blanco ligero para entrenamiento de kumite, orientado a una práctica ágil y avanzada. Incluye chaqueta y pantalón.",
    level: "Avanzado",
    weight: "Lightweight",
    sizes: ["3", "4", "5", "6", "7"],
    priceForSize: () => 9500,
  },
  {
    reference: "10081",
    slug: "fujimae-karate-gi-kumite-prowear-hyperlite-qs",
    name: "Karate Gi Kumite ProWear Hyperlite QS",
    description: "Dogi blanco ultraligero de competición para kumite, diseñado para ofrecer máxima libertad de movimiento. Incluye chaqueta y pantalón.",
    level: "Competición",
    weight: "67-84 gsm",
    sizes: ["2", "3", "4", "5", "6", "7"],
    priceForSize: () => 10500,
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
    source_url: null,
    image_attribution: ILLUSTRATIVE_ATTRIBUTION,
    metadata: {
      color: "Blanco",
      includes: ["chaqueta", "pantalón"],
      image_source_type: "codex_generated",
      image_attribution: ILLUSTRATIVE_ATTRIBUTION,
    },
    sort_order: index + 1,
    is_active: true,
  })),
  {
    slug: "fujimae-martial-arts-belt",
    name: "Obi de artes marciales",
    description: "Obi de algodón disponible en varios colores y longitudes. Como orientación: 240 cm para niños pequeños, 260 cm para niños mayores, 280 cm para adultos delgados, 300 cm para adultos de constitución media y 320 cm para tallas grandes. Si tienes dudas, consulta con el club antes de pedir.",
    brand: "Fujimae",
    supplier_reference: "15010",
    category: "belt",
    recommended_level: "Todos los niveles",
    weight: null,
    image_url: "assets/products/fujimae/15010.png",
    source_url: null,
    image_attribution: ILLUSTRATIVE_ATTRIBUTION,
    metadata: { colors: BELT_COLORS, material: "Algodón", width: "4 cm", image_source_type: "codex_generated", image_attribution: ILLUSTRATIVE_ATTRIBUTION },
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
  ...BELT_COLORS.flatMap((color, colorIndex) => BELT_LENGTHS.map((size, sizeIndex) => ({
    product_slug: "fujimae-martial-arts-belt",
    supplier_reference: "15010",
    sku: `15010-${color.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase()}-${size.replace(" cm", "")}`,
    name: `${color} · ${size}`,
    attributes: { color, size },
    cost_cents: 450,
    margin_cents: 50,
    price_cents: 500,
    unit_price_cents: 500,
    cost_basis: COST_BASIS,
    promotion: { price_cents: null, starts_at: null, ends_at: null, is_active: false },
    promotion_price_cents: null,
    promotion_starts_at: null,
    promotion_ends_at: null,
    promotion_is_active: false,
    sort_order: colorIndex * BELT_LENGTHS.length + sizeIndex + 1,
    is_active: true,
  }))),
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
