(() => {
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  async function load(config, request = fetch) {
    if (!config.supabaseUrl || !config.anonKey) throw new Error('Falta la conexión de la tienda.');
    const fields = 'product_id,product_name,description,product_supplier_reference,category,image_url,product_sort_order,variant_id,variant_name,sku,attributes,effective_price_cents,variant_sort_order';
    const response = await request(`${config.supabaseUrl}/rest/v1/skbc_merch_catalog_public?select=${fields}&order=product_sort_order.asc,variant_sort_order.asc`, {headers:{apikey:config.anonKey,Authorization:`Bearer ${config.anonKey}`}});
    if (!response.ok) throw new Error('No se pudo cargar el catálogo. Pulsa Actualizar catálogo para reintentar.');
    const rows = await response.json();
    if (!Array.isArray(rows)) throw new Error('El catálogo no tiene el formato esperado.');
    const products = new Map();
    for (const row of rows) {
      if (!products.has(row.product_id)) products.set(row.product_id, {...row, variants:[]});
      products.get(row.product_id).variants.push(row);
    }
    return [...products.values()];
  }
  function html(products) {
    const categories = [['gi','Dogis'],['belt','Obis'],['club','Ropa del club'],['other','Otros artículos']];
    if (!products.length) return '<p class="empty-note">El catálogo público no tiene artículos activos.</p>';
    return `<p class="simple-session">${products.length} artículos en el catálogo de la web. Se actualiza al abrir este apartado.</p>${categories.map(([key,label])=>{
      const items=products.filter(product=>(['gi','belt','club'].includes(product.category)?product.category:'other')===key);
      if (!items.length) return '';
      return `<section class="admin-catalog-category"><h3>${label} <span>(${items.length})</span></h3>${items.map(product=>{
        const image=/^(https:\/\/|assets\/)/.test(product.image_url || '')?product.image_url:'assets/logo-skbc-full.png';
        return `<details class="admin-catalog-product"><summary><img src="${escape(image)}" alt="" loading="lazy"><span><strong>${escape(product.product_name)}</strong><small>Ref. ${escape(product.product_supplier_reference || '—')} · ${product.variants.length} variantes</small></span><span aria-hidden="true">＋</span></summary><div class="admin-catalog-body"><p>${escape(product.description || '')}</p><ul>${product.variants.map(variant=>`<li><strong>${escape(variant.variant_name || variant.sku || 'Variante')}</strong><span>${escape(variant.sku || '')}${Number.isInteger(variant.effective_price_cents)?` · ${(variant.effective_price_cents/100).toLocaleString('es-ES',{style:'currency',currency:'EUR'})}`:''}</span></li>`).join('')}</ul></div></details>`;
      }).join('')}</section>`;
    }).join('')}`;
  }
  window.SKBC_ADMIN_CATALOG = {load,html};
})();
