const STORAGE_KEY = "skbc_content_v2";
const GITHUB_TOKEN_KEY = "skbc_github_token";
const SUPABASE_SESSION_KEY = "skbc_supabase_session";
const GITHUB_OWNER = "aKaPi80";
const GITHUB_REPO = "WEB-SKBC-GIPUZKOA-";
const GITHUB_BRANCH = "main";
const MEDIA_REPLACEMENTS = {
  "assets/uploads/1780601440879-manji.heic": "assets/uploads/1780604041486-manji.jpg",
  "assets/uploads/1780600913705-grupo-ninos.heic": "assets/uploads/1780604072168-grupo-ninos.jpg",
  "assets/uploads/1780601631346-adultos.heic": "assets/uploads/1780604082854-adultos.jpg"
};

let data = load();
let publishedContentSignature = contentSignature(cloneDefault());
let currentPanel = "dashboard";
let currentEventIndex = null;
let currentNewsIndex = null;
let dirty = false;

const panelTitles = {
  dashboard: "Panel de control",
  settings: "Ajustes generales",
  system: "SEO y sistema",
  es: "Textos en espaÃ±ol",
  eu: "Textos en euskera",
  en: "Textos en inglÃ©s",
  custom: "Ãreas nuevas",
  advanced: "Todo el contenido"
};

const labels = {
  dashboard: "Panel",
  es: "EspaÃ±ol",
  system: "SEO/Sistema",
  eu: "Euskera",
  en: "InglÃ©s",
  people: "Personas",
  custom: "Secciones",
  advanced: "Avanzado"
};

panelTitles.events = "Calendario de eventos";
labels.events = "Calendario";
panelTitles.news = "Próximas noticias";
labels.news = "Noticias";
panelTitles.leads = "Captación y seguimiento";
labels.leads = "Contactos";
panelTitles.people = "Personas del equipo y directiva";
labels.people = "Personas";
panelTitles.testimonials = "Testimonios";
labels.testimonials = "Testimonios";
panelTitles.merch = "Tienda merchandising";
labels.merch = "Tienda";
panelTitles.orders = "Pedidos de tienda";
labels.orders = "Pedidos";

const settingsGroups = [
  {
    title: "Contacto y redes oficiales",
    help: "Facebook se mantiene como enlace oficial. Las publicaciones visibles deben venir solo desde Instagram para evitar duplicados.",
    fields: [
      ["WhatsApp", ["settings", "whatsapp"], "input"],
      ["Instagram", ["settings", "instagram"], "input"],
      ["Facebook", ["settings", "facebook"], "input"],
      ["YouTube", ["settings", "youtube"], "input"],
      ["Web de IKA", ["settings", "ikaUrl"], "input"],
      ["Google Maps", ["settings", "maps"], "input"]
    ]
  },
  {
    title: "Publicaciones visibles en la web",
    help: "Añade o quita enlaces visibles. En galerías usa una línea por enlace con formato Nombre | URL.",
    fields: [
      ["Galerías de fotos", ["settings", "galleryLinks"], "linkList"],
      ["Posts/Reels de Instagram", ["settings", "socialFeeds", "instagramUrls"], "textarea"],
      ["VÃ­deos de YouTube", ["settings", "socialFeeds", "youtubeUrls"], "textarea"]
    ]
  },
  {
    title: "Buzón de testimonios con Supabase",
    help: "Opcional. Si lo configuras, los testimonios se guardarán en Supabase y podrás aprobarlos desde la pestaña Testimonios.",
    fields: [
      ["Buzón activo", ["settings", "testimonialInbox", "enabled"], "booleanText"],
      ["Supabase URL", ["settings", "testimonialInbox", "supabaseUrl"], "input"],
      ["Supabase anon key", ["settings", "testimonialInbox", "anonKey"], "textarea"],
      ["Tabla", ["settings", "testimonialInbox", "table"], "input"]
    ]
  },
  {
    title: "Contactos y prueba gratis con Supabase",
    help: "Guarda automáticamente los formularios de contacto de la web para poder hacer seguimiento desde la pestaña Contactos.",
    fields: [
      ["Contactos activos", ["settings", "leadInbox", "enabled"], "booleanText"],
      ["Supabase URL", ["settings", "leadInbox", "supabaseUrl"], "input"],
      ["Supabase anon key", ["settings", "leadInbox", "anonKey"], "textarea"],
      ["Tabla contactos", ["settings", "leadInbox", "table"], "input"]
    ]
  },
  {
    title: "Pedidos de tienda con Supabase",
    help: "Los pedidos se guardan en Supabase. El aviso por email puede activarse pegando una URL de webhook o Edge Function cuando la tengas.",
    fields: [
      ["Pedidos activos", ["settings", "orderInbox", "enabled"], "booleanText"],
      ["Supabase URL", ["settings", "orderInbox", "supabaseUrl"], "input"],
      ["Supabase anon key", ["settings", "orderInbox", "anonKey"], "textarea"],
      ["Tabla pedidos", ["settings", "orderInbox", "table"], "input"],
      ["Webhook email", ["settings", "orderInbox", "emailWebhookUrl"], "input"]
    ]
  },
  {
    title: "Estilo visual",
    help: "Elige una paleta sugerida, el contraste de la foto principal y efectos especiales temporales como Navidad, otoÃ±o, carnaval, DÃ­a de la Mujer o luto.",
    fields: [
      ["Paleta visual", ["settings", "theme", "palette"], "palette"],
      ["Contraste de la foto principal", ["settings", "theme", "heroOverlay"], "overlay"],
      ["Efecto especial manual", ["settings", "specialVisual", "mode"], "specialVisualMode"],
      ["Intensidad del efecto", ["settings", "specialVisual", "intensity"], "specialVisualIntensity"],
      ["Mensaje especial opcional", ["settings", "specialVisual", "message"], "input"],
      ["Programador de efectos", ["settings", "specialVisual", "schedule"], "specialVisualSchedule"]
    ]
  },
  {
    title: "ImÃ¡genes principales",
    help: "Estas son las fotos de fondo principales de la web. Pega una URL o una ruta local dentro de esta carpeta.",
    fields: [
      ["Foto hero/inicio", ["settings", "images", "hero"], "input"],
      ["Foto niÃ±os", ["settings", "images", "kids"], "input"],
      ["Foto adultos", ["settings", "images", "adults"], "input"],
      ["Foto tÃ©cnica/aprendizaje", ["settings", "images", "learn"], "input"],
      ["Foto equipo tÃ©cnico", ["settings", "images", "people", "technicalTeam"], "input"],
      ["Imágenes de galería", ["settings", "images", "gallery"], "galleryImages"]
    ]
  },
  {
    title: "Fotos de personas",
    help: "Estas miniaturas se usan en equipo tÃ©cnico y directiva. Si no hay foto correcta, deja el campo vacÃ­o.",
    fields: [
      ["Ãlvaro Calvo", ["settings", "images", "people", "alvaro"], "input"],
      ["IÃ±aki Ventureira", ["settings", "images", "people", "inaki"], "input"],
      ["Andoni DomÃ­nguez", ["settings", "images", "people", "andoni"], "input"],
      ["Oskar Mateos", ["settings", "images", "people", "oskar"], "input"],
      ["Asier Azurmendi", ["settings", "images", "people", "asier"], "input"],
      ["Igone Lasa", ["settings", "images", "people", "igone"], "input"],
      ["IÃ±aki Iturrioz", ["settings", "images", "people", "iturrioz"], "input"],
      ["Bharat Martin", ["settings", "images", "people", "bharat"], "input"],
      ["Pablo SÃ¡nchez", ["settings", "images", "people", "pablo"], "input"],
      ["Uxue Garikano", ["settings", "images", "people", "uxue"], "input"],
      ["Jorge Redondo", ["settings", "images", "people", "jorge"], "input"]
    ]
  }
];

const systemGroups = [
  {
    title: "Marca y logos globales",
    help: "Cambia logos y nombre visible de la cabecera. Usa rutas tipo assets/logo-skbc.png o assets/uploads/imagen.jpg.",
    fields: [
      ["Nombre de la web", ["settings", "system", "siteName"], "input"],
      ["Subtítulo cabecera", ["settings", "system", "brandSubtitle"], "input"],
      ["Logo cabecera", ["settings", "system", "brandLogo"], "input"],
      ["Logo grande del hero", ["settings", "system", "heroLogo"], "input"],
      ["Logo sección Club", ["settings", "system", "clubLogo"], "input"],
      ["Favicon/icono navegador", ["settings", "system", "favicon"], "input"],
      ["Imagen social/Google", ["settings", "system", "socialImage"], "input"]
    ]
  },
  {
    title: "Menú principal",
    help: "Edita las etiquetas del menú base. Mantén el orden separado por |. Las áreas nuevas se siguen añadiendo automáticamente.",
    fields: [
      ["Menú ES", ["settings", "system", "navLabels", "es"], "input"],
      ["Menú EU", ["settings", "system", "navLabels", "eu"], "input"],
      ["Menú EN", ["settings", "system", "navLabels", "en"], "input"]
    ]
  },
  {
    title: "SEO técnico local",
    help: "Datos usados para metadatos sociales y schema. No modifica dominio, GitHub Pages ni DNS.",
    fields: [
      ["Nombre alternativo", ["settings", "system", "alternateName"], "input"],
      ["Descripción schema", ["settings", "system", "schemaDescription"], "textarea"],
      ["Dirección", ["settings", "system", "streetAddress"], "input"],
      ["Localidad", ["settings", "system", "addressLocality"], "input"],
      ["Provincia", ["settings", "system", "addressRegion"], "input"],
      ["País", ["settings", "system", "addressCountry"], "input"],
      ["Deporte/actividad", ["settings", "system", "sport"], "input"],
      ["Temas SEO", ["settings", "system", "knowsAbout"], "input"],
      ["Google Analytics ID", ["settings", "system", "googleAnalyticsId"], "input"]
    ]
  },
  {
    title: "Fondo decorativo japonés",
    help: "Opcional. Si está desactivado, la web se ve como ahora. Usa opacidades bajas: 0.04 a 0.12 suele ser suficiente.",
    fields: [
      ["Activar fondo decorativo", ["settings", "system", "decorativeBackground", "enabled"], "booleanText"],
      ["Preset", ["settings", "system", "decorativeBackground", "preset"], "decorativePreset"],
      ["Imagen personalizada", ["settings", "system", "decorativeBackground", "customImage"], "input"],
      ["Opacidad", ["settings", "system", "decorativeBackground", "opacity"], "input"],
      ["Tamaño", ["settings", "system", "decorativeBackground", "size"], "input"],
      ["Posición", ["settings", "system", "decorativeBackground", "position"], "input"],
      ["Aplicar en", ["settings", "system", "decorativeBackground", "scope"], "decorativeScope"]
    ]
  }
];

function languageGroups(lang) {
  const root = ["languages", lang];
  return [
    {
      title: "SEO y navegaciÃ³n",
      help: "TÃ­tulo y descripciÃ³n para Google, menÃº, llamada principal y formularios.",
      fields: [
        ["TÃ­tulo SEO", [...root, "seoTitle"], "input"],
        ["DescripciÃ³n SEO", [...root, "seoDescription"], "textarea"],
        ["MenÃº principal", [...root, "nav"], "array"],
        ["BotÃ³n principal corto", [...root, "ctaShort"], "input"]
      ]
    },
    {
      title: "Inicio",
      help: "Primera pantalla de la web.",
      fields: [
        ["Etiqueta superior", [...root, "hero", "eyebrow"], "input"],
        ["TÃ­tulo principal", [...root, "hero", "title"], "textarea"],
        ["Texto principal", [...root, "hero", "text"], "textarea"],
        ["BotÃ³n principal", [...root, "hero", "primary"], "input"],
        ["BotÃ³n secundario", [...root, "hero", "secondary"], "input"],
        ["Tarjetas del hero", [...root, "hero", "cards"], "matrix"]
      ]
    },
    {
      title: "Bloques de aprendizaje",
      help: "Beneficios, explicaciÃ³n de Shorinji Kempo, niÃ±os y adultos.",
      fields: [
        ["TÃ­tulo beneficios", [...root, "benefits", "title"], "input"],
        ["Texto beneficios", [...root, "benefits", "text"], "textarea"],
        ["Tarjetas beneficios", [...root, "benefits", "items"], "matrix"],
        ["TÃ­tulo Shorinji Kempo", [...root, "shorinji", "title"], "input"],
        ["Texto Shorinji Kempo", [...root, "shorinji", "text"], "textarea"],
        ["Bloques Shorinji Kempo", [...root, "shorinji", "blocks"], "matrix"],
        ["TÃ­tulo niÃ±os", [...root, "kids", "title"], "input"],
        ["Texto niÃ±os", [...root, "kids", "text"], "textarea"],
        ["Lista niÃ±os", [...root, "kids", "items"], "array"],
        ["BotÃ³n niÃ±os", [...root, "kids", "cta"], "input"],
        ["TÃ­tulo adultos", [...root, "adults", "title"], "input"],
        ["Texto adultos", [...root, "adults", "text"], "textarea"],
        ["Tarjetas adultos", [...root, "adults", "items"], "matrix"],
        ["TÃ­tulo quÃ© aprenden", [...root, "learn", "title"], "input"],
        ["Texto quÃ© aprenden", [...root, "learn", "text"], "textarea"],
        ["Tarjetas quÃ© aprenden", [...root, "learn", "items"], "matrix"],
        ["Conceptos quÃ© aprenden", [...root, "learn", "concepts"], "array"],
        ["BotÃ³n quÃ© aprenden", [...root, "learn", "button"], "input"],
        ["URL botÃ³n quÃ© aprenden", [...root, "learn", "url"], "input"]
      ]
    },
    {
      title: "Club, IKA y profesor",
      help: "Identidad del club, representaciÃ³n internacional y responsable tÃ©cnico.",
      fields: [
        ["TÃ­tulo club", [...root, "club", "title"], "input"],
        ["Texto club", [...root, "club", "text"], "textarea"],
        ["Tarjetas club", [...root, "club", "items"], "matrix"],
        ["TÃ­tulo IKA", [...root, "ika", "title"], "input"],
        ["Texto IKA", [...root, "ika", "text"], "textarea"],
        ["Nota IKA", [...root, "ika", "note"], "textarea"],
        ["TÃ­tulo responsable tÃ©cnico", [...root, "instructor", "title"], "input"],
        ["Texto responsable tÃ©cnico", [...root, "instructor", "text"], "textarea"],
        ["Texto adicional responsable", [...root, "instructor", "extra"], "textarea"]
      ]
    },
    {
      title: "Equipo y directiva",
      help: "Puedes aÃ±adir, quitar o cambiar nombres desde estas listas.",
      fields: [
        ["TÃ­tulo equipo tÃ©cnico", [...root, "technicalTeam", "title"], "input"],
        ["Texto equipo tÃ©cnico", [...root, "technicalTeam", "text"], "textarea"],
        ["Responsables tÃ©cnicos", [...root, "technicalTeam", "leads"], "matrix"],
        ["Miembros equipo tÃ©cnico", [...root, "technicalTeam", "members"], "array"],
        ["TÃ­tulo directiva", [...root, "board", "title"], "input"],
        ["Miembros directiva", [...root, "board", "members"], "array"]
      ]
    },
    {
      title: "Horarios, galerÃ­as, redes, merchandising y contacto",
      help: "Zona final de la web, enlaces y formulario.",
      fields: [
        ["TÃ­tulo horarios", [...root, "schedule", "title"], "input"],
        ["Texto horarios", [...root, "schedule", "text"], "textarea"],
        ["Horario niÃ±os", [...root, "schedule", "kids"], "input"],
        ["Horario adultos", [...root, "schedule", "adults"], "input"],
        ["Lugar", [...root, "schedule", "place"], "input"],
        ["TÃ­tulo galerÃ­a", [...root, "media", "title"], "input"],
        ["Texto galerÃ­a", [...root, "media", "text"], "textarea"],
        ["TÃ­tulo redes", [...root, "social", "title"], "input"],
        ["Texto redes", [...root, "social", "text"], "textarea"],
        ["Texto Instagram", [...root, "social", "instagram"], "input"],
        ["Texto Facebook", [...root, "social", "facebook"], "input"],
        ["Texto YouTube", [...root, "social", "youtube"], "input"],
        ["Etiqueta noticias", [...root, "news", "eyebrow"], "input"],
        ["Título noticias", [...root, "news", "title"], "input"],
        ["Texto noticias", [...root, "news", "text"], "textarea"],
        ["Texto sin noticias", [...root, "news", "empty"], "input"],
        ["Título testimonios", [...root, "testimonials", "title"], "input"],
        ["Texto testimonios", [...root, "testimonials", "text"], "textarea"],
        ["Texto sin testimonios", [...root, "testimonials", "empty"], "input"],
        ["Testimonios aprobados", [...root, "testimonials", "items"], "matrix"],
        ["Título formulario testimonio", [...root, "testimonials", "formTitle"], "input"],
        ["Campo nombre testimonio", [...root, "testimonials", "name"], "input"],
        ["Campo perfil testimonio", [...root, "testimonials", "role"], "input"],
        ["Perfiles testimonio", [...root, "testimonials", "roles"], "array"],
        ["Campo mensaje testimonio", [...root, "testimonials", "message"], "input"],
        ["Texto consentimiento testimonio", [...root, "testimonials", "consent"], "textarea"],
        ["Botón enviar testimonio", [...root, "testimonials", "submit"], "input"],
        ["Mensaje gracias testimonio", [...root, "testimonials", "thanks"], "input"],
        ["Título preguntas frecuentes", [...root, "faq", "title"], "input"],
        ["Texto preguntas frecuentes", [...root, "faq", "text"], "textarea"],
        ["Preguntas frecuentes", [...root, "faq", "items"], "matrix"],
        ["TÃ­tulo merchandising", [...root, "merch", "title"], "input"],
        ["Texto merchandising", [...root, "merch", "text"], "textarea"],
        ["Botón catálogo JHK", [...root, "merch", "catalog"], "input"],
        ["Título pedido", [...root, "merch", "orderTitle"], "input"],
        ["Título datos comprador", [...root, "merch", "buyerTitle"], "input"],
        ["Texto otra prenda JHK", [...root, "merch", "customText"], "textarea"],
        ["Botón enviar pedido", [...root, "merch", "send"], "input"],
        ["TÃ­tulo contacto", [...root, "contact", "title"], "input"],
        ["Texto contacto", [...root, "contact", "text"], "textarea"],
        ["Campo teléfono contacto", [...root, "contact", "phone"], "input"],
        ["Campo email contacto", [...root, "contact", "email"], "input"],
        ["Opciones formulario", [...root, "contact", "options"], "array"],
        ["BotÃ³n formulario", [...root, "contact", "submit"], "input"]
      ]
    }
  ];
}

function load() {
  try {
    const base = cloneDefault();
    localStorage.removeItem(STORAGE_KEY);
    return replaceLegacyCanvaMedia(base, base);
  } catch {
    return cloneDefault();
  }
}

function cloneDefault() {
  return structuredClone(window.SKBC_CONTENT);
}

function contentSignature(contentData) {
  return JSON.stringify(contentData);
}

function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) return override ?? base;
  if (!base || typeof base !== "object" || !override || typeof override !== "object") return override ?? base;
  return Object.keys({ ...base, ...override }).reduce((merged, key) => {
    merged[key] = deepMerge(base[key], override[key]);
    return merged;
  }, {});
}

function replaceLegacyCanvaMedia(value, fallback) {
  if (typeof value === "string") {
    if (MEDIA_REPLACEMENTS[value]) return MEDIA_REPLACEMENTS[value];
    if (!value.includes("/_assets/media/")) return value;
    return typeof fallback === "string" && !fallback.includes("/_assets/media/") ? fallback : "";
  }
  if (Array.isArray(value)) {
    const fallbackArray = Array.isArray(fallback) ? fallback : [];
    return value.map((item, index) => replaceLegacyCanvaMedia(item, fallbackArray[index]));
  }
  if (!value || typeof value !== "object") return value;
  return Object.keys(value).reduce((cleaned, key) => {
    cleaned[key] = replaceLegacyCanvaMedia(value[key], fallback?.[key]);
    return cleaned;
  }, {});
}

function getByPath(root, path) {
  return path.reduce((acc, key) => (acc ? acc[key] : ""), root);
}

function setByPath(root, path, value) {
  const last = path[path.length - 1];
  const parent = path.slice(0, -1).reduce((acc, key) => {
    if (!acc[key] || typeof acc[key] !== "object") acc[key] = {};
    return acc[key];
  }, root);
  parent[last] = value;
}

function parseFieldValue(value, type) {
  if (type === "booleanText") return value === "true";
  if (type === "array") return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (type === "linkList") {
    return value.split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [label, ...urlParts] = line.split("|").map((part) => part.trim());
        return { label, url: urlParts.join("|").trim() };
      })
      .filter((item) => item.label && item.url);
  }
  if (type === "colorList") {
    return value.split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [code, name, hex] = line.split("|").map((part) => part.trim());
        return { code, name, hex: hex || "#d9dee7" };
      })
      .filter((item) => item.code || item.name);
  }
  if (type === "specialVisualSchedule") {
    return value.split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [enabled, mode, intensity, start, end, ...messageParts] = line.split("|").map((part) => part.trim());
        return {
          enabled: enabled !== "false" && enabled !== "no" && enabled !== "0",
          mode: mode || "none",
          intensity: intensity || "medium",
          start: start || "",
          end: end || "",
          message: messageParts.join("|").trim()
        };
      })
      .filter((item) => item.mode && item.start && item.end);
  }
  if (type === "matrix") {
    return value.split(/\r?\n/).map((line) => line.split("|").map((part) => part.trim()).filter(Boolean)).filter((row) => row.length);
  }
  return value;
}

function formatFieldValue(value, type) {
  if (type === "booleanText") return value === false ? "false" : "true";
  if (type === "array") return Array.isArray(value) ? value.join("\n") : "";
  if (type === "linkList") return Array.isArray(value) ? value.map((item) => `${item.label || ""} | ${item.url || ""}`).join("\n") : "";
  if (type === "colorList") return Array.isArray(value) ? value.map((item) => `${item.code || ""} | ${item.name || ""} | ${item.hex || "#d9dee7"}`).join("\n") : "";
  if (type === "specialVisualSchedule") {
    return Array.isArray(value)
      ? value.map((item) => `${item.enabled === false ? "false" : "true"} | ${item.mode || "none"} | ${item.intensity || "medium"} | ${item.start || ""} | ${item.end || ""} | ${item.message || ""}`).join("\n")
      : "";
  }
  if (type === "matrix") return Array.isArray(value) ? value.map((row) => Array.isArray(row) ? row.join(" | ") : row).join("\n") : "";
  return value ?? "";
}

function setStatus(text, mode = "neutral") {
  const status = document.querySelector("#status");
  status.textContent = text;
  status.dataset.mode = mode;
}

function markDirty() {
  dirty = true;
  setStatus("Cambios pendientes de guardar", "warning");
}

function render() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.panel === currentPanel);
  });

  if (currentPanel === "custom") return renderCustom();
  if (currentPanel === "dashboard") return renderDashboard();
  if (currentPanel === "system") return renderSystem();
  if (currentPanel === "people") return renderPeople();
  if (currentPanel === "events") return renderEvents();
  if (currentPanel === "news") return renderNews();
  if (currentPanel === "leads") return renderLeads();
  if (currentPanel === "testimonials") return renderTestimonialsInbox();
  if (currentPanel === "merch") return renderMerch();
  if (currentPanel === "orders") return renderOrders();
  if (currentPanel === "advanced") return renderAdvanced();
  renderGroups(currentPanel === "settings" ? settingsGroups : languageGroups(currentPanel));
}

function renderIntro(extra = "") {
  return `
    <div class="editor-intro">
      <p>${currentPanel === "settings" ? "ConfiguraciÃ³n" : labels[currentPanel]}</p>
      <h2>${panelTitles[currentPanel]}</h2>
      <span>Cuando termines, pulsa Guardar cambios y abre la web para comprobarlo.</span>
      ${extra}
    </div>
  `;
}

function renderGroups(groups) {
  const editor = document.querySelector("#editor");
  editor.innerHTML = `${renderIntro()}${groups.map(groupTemplate).join("")}`;
  bindFields(editor);
  bindSectionTranslations(editor);
}

function renderDashboard() {
  const editor = document.querySelector("#editor");
  const events = data.settings.events || [];
  const news = data.settings.news || [];
  const today = new Date().toISOString().slice(0, 10);
  const upcomingEvents = events.flatMap((event) => generatedEventDates(event).map((date) => ({ event, date })))
    .filter((item) => item.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);
  const activeNews = news.filter((item) => item.enabled !== false).length;
  const publishedTestimonials = data.languages?.es?.testimonials?.items?.length || 0;
  const seoIssues = seoChecklistItems().filter((item) => !item.ok);
  editor.innerHTML = `
    ${renderIntro(`<div class="intro-actions"><button id="refresh-dashboard" class="primary" type="button">Actualizar datos privados</button><a class="button-like" href="index.html" target="_blank" rel="noreferrer">Ver web</a></div>`)}
    <div class="dashboard-grid">
      ${dashboardMetric("Eventos próximos", upcomingEvents.length, "Según el calendario publicado")}
      ${dashboardMetric("Noticias activas", activeNews, "Visibles en la web")}
      ${dashboardMetric("Testimonios publicados", publishedTestimonials, "Aprobados y visibles")}
      ${dashboardMetric("SEO pendiente", seoIssues.length, seoIssues.length ? "Revisar SEO/Sistema" : "Base correcta")}
    </div>
    ${systemHealthTemplate()}
    <div class="dashboard-layout">
      <article class="editor-group">
        <header><div><h3>Próximos eventos</h3><p>Primeros eventos visibles desde hoy.</p></div></header>
        <div class="dashboard-list">
          ${upcomingEvents.length ? upcomingEvents.map(({ event, date }) => `<div><strong>${escapeHtml(event.languages?.es?.title || "Evento")}</strong><span>${escapeHtml(date)}</span></div>`).join("") : `<p class="empty-note">No hay próximos eventos publicados.</p>`}
        </div>
      </article>
      <article class="editor-group">
        <header><div><h3>Bandejas privadas</h3><p>Conecta con Supabase para ver pendientes sin salir del admin.</p></div></header>
        ${dashboardSupabaseLoginTemplate()}
        <div id="dashboard-private" class="dashboard-private">
          <p class="empty-note">Pulsa Actualizar datos privados.</p>
        </div>
      </article>
      <article class="editor-group">
        <header><div><h3>Acciones recomendadas</h3><p>Lo más útil para captación y posicionamiento.</p></div></header>
        <div class="dashboard-actions">
          <button type="button" data-open-panel="leads">Gestionar contactos</button>
          <button type="button" data-open-panel="news">Publicar noticia</button>
          <button type="button" data-open-panel="system">Revisar SEO</button>
          <button type="button" data-open-panel="events">Actualizar calendario</button>
        </div>
      </article>
      <article class="editor-group">
        <header><div><h3>Estadísticas web</h3><p>Accesos rápidos para ver visitas, búsquedas y comportamiento de usuarios.</p></div></header>
        <div class="dashboard-actions">
          <a class="button-like" href="https://analytics.google.com/" target="_blank" rel="noreferrer">Google Analytics</a>
          <a class="button-like" href="https://analytics.google.com/analytics/web/" target="_blank" rel="noreferrer">Tiempo real</a>
          <a class="button-like" href="https://analytics.google.com/analytics/web/" target="_blank" rel="noreferrer">Eventos</a>
          <a class="button-like" href="https://analytics.google.com/analytics/web/" target="_blank" rel="noreferrer">Adquisición</a>
          <a class="button-like" href="https://search.google.com/search-console" target="_blank" rel="noreferrer">Search Console</a>
          <a class="button-like" href="sitemap.xml" target="_blank" rel="noreferrer">Sitemap</a>
        </div>
      </article>
    </div>
  `;
  editor.querySelector("#dashboard-login-supabase")?.addEventListener("click", loginDashboardSupabase);
  editor.querySelector("#dashboard-logout-supabase")?.addEventListener("click", () => {
    localStorage.removeItem(SUPABASE_SESSION_KEY);
    setStatus("Sesión de Supabase cerrada.", "ok");
    renderDashboard();
  });
  editor.querySelector("#refresh-dashboard")?.addEventListener("click", refreshDashboardPrivateData);
  editor.querySelectorAll("[data-open-panel]").forEach((button) => {
    button.addEventListener("click", () => {
      currentPanel = button.dataset.openPanel;
      render();
    });
  });
}

function dashboardMetric(label, value, note) {
  return `<article class="dashboard-metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong><p>${escapeHtml(note)}</p></article>`;
}

function dashboardSupabaseLoginTemplate() {
  const session = supabaseSession();
  return `
    <div class="dashboard-supabase">
      <div>
        <strong>${session?.access_token ? "Supabase conectado" : "Reconexión rápida Supabase"}</strong>
        <span>${session?.access_token ? `Sesión activa: ${escapeHtml(session?.user?.email || "usuario conectado")}` : "Inicia sesión aquí para consultar contactos, testimonios y pedidos."}</span>
      </div>
      <div class="dashboard-supabase-fields">
        <input id="dashboard-supabase-email" type="email" placeholder="Email Supabase" value="${escapeHtml(session?.user?.email || "")}" />
        <input id="dashboard-supabase-password" type="password" placeholder="Contraseña Supabase" />
        <button id="dashboard-login-supabase" class="primary" type="button">${session?.access_token ? "Renovar" : "Conectar"}</button>
        <button id="dashboard-logout-supabase" type="button">Cerrar</button>
      </div>
    </div>
  `;
}

async function loginDashboardSupabase() {
  const config = testimonialInboxConfig();
  const email = document.querySelector("#dashboard-supabase-email")?.value.trim();
  const password = document.querySelector("#dashboard-supabase-password")?.value;
  if (!config.supabaseUrl || !config.anonKey || !email || !password) {
    setStatus("Escribe email y contraseña de Supabase para conectar.", "danger");
    return;
  }
  const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });
  const result = await response.json();
  if (!response.ok) {
    setStatus(`No se pudo iniciar sesión: ${result.error_description || result.msg || "error"}`, "danger");
    return;
  }
  localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify(result));
  setStatus("Sesión de Supabase iniciada desde el Panel.", "ok");
  renderDashboard();
  refreshDashboardPrivateData();
}

function systemHealthItems() {
  const settings = data.settings || {};
  const system = settings.system || {};
  const images = settings.images || {};
  const futureEvents = (settings.events || []).some((event) => generatedEventDates(event).some((date) => date >= new Date().toISOString().slice(0, 10)));
  const languageSeoOk = ["es", "eu", "en"].every((lang) => data.languages?.[lang]?.seoTitle && data.languages?.[lang]?.seoDescription);
  const contactCopyOk = ["es", "eu", "en"].every((lang) => data.languages?.[lang]?.contact?.phone && data.languages?.[lang]?.contact?.email);
  return [
    { level: system.googleAnalyticsId ? "ok" : "warn", label: "Google Analytics", note: system.googleAnalyticsId ? system.googleAnalyticsId : "Falta pegar el ID G-..." },
    { level: settings.leadInbox?.enabled ? "ok" : "warn", label: "Contactos Supabase", note: settings.leadInbox?.table || "No activo" },
    { level: settings.orderInbox?.enabled ? "ok" : "warn", label: "Pedidos Supabase", note: settings.orderInbox?.table || "No activo" },
    { level: settings.testimonialInbox?.enabled ? "ok" : "warn", label: "Testimonios Supabase", note: settings.testimonialInbox?.table || "No activo" },
    { level: futureEvents ? "ok" : "warn", label: "Eventos futuros", note: futureEvents ? "Hay eventos próximos" : "Revisar calendario" },
    { level: (settings.news || []).some((item) => item.enabled !== false) ? "ok" : "warn", label: "Noticias", note: "Noticias activas en web" },
    { level: images.hero && images.kids && images.adults ? "ok" : "warn", label: "Imágenes principales", note: "Hero, niños y adultos" },
    { level: languageSeoOk ? "ok" : "warn", label: "SEO multidioma", note: languageSeoOk ? "ES/EU/EN completo" : "Faltan títulos o descripciones" },
    { level: contactCopyOk ? "ok" : "warn", label: "Formulario contacto", note: contactCopyOk ? "Teléfono/email en 3 idiomas" : "Revisar textos" },
    { level: "ok", label: "Sitemap/robots", note: "Publicados" }
  ];
}

function systemHealthTemplate() {
  const items = systemHealthItems();
  const warnings = items.filter((item) => item.level !== "ok").length;
  return `
    <article class="editor-group system-health">
      <header>
        <div>
          <h3>Centro de salud del sistema</h3>
          <p>${warnings ? `${warnings} punto(s) a revisar. Nada crítico, pero conviene mirarlo.` : "Todo lo esencial está en verde."}</p>
        </div>
      </header>
      <div class="health-grid">
        ${items.map((item) => `<div class="health-item ${item.level}"><strong>${item.level === "ok" ? "Verde" : "Revisar"}</strong><span>${escapeHtml(item.label)}</span><small>${escapeHtml(item.note)}</small></div>`).join("")}
      </div>
    </article>
  `;
}

async function refreshDashboardPrivateData() {
  const target = document.querySelector("#dashboard-private");
  if (!target) return;
  target.innerHTML = `<p class="empty-note">Consultando Supabase...</p>`;
  const results = await Promise.allSettled([
    supabaseCount(leadInboxConfig(), "status=in.(new,contacted,trial_scheduled)"),
    supabaseCount(testimonialInboxConfig(), "status=eq.pending"),
    supabaseCount(orderInboxConfig(), "status=in.(pending,seen,contacted,payment_pending)")
  ]);
  const [leads, testimonials, orders] = results.map((result) => result.status === "fulfilled" ? result.value : null);
  target.innerHTML = `
    ${dashboardPrivateRow("Contactos abiertos", leads)}
    ${dashboardPrivateRow("Testimonios pendientes", testimonials)}
    ${dashboardPrivateRow("Pedidos abiertos", orders)}
  `;
}

function dashboardPrivateRow(label, value) {
  return `<div><strong>${escapeHtml(label)}</strong><span>${value === null ? "No disponible" : escapeHtml(value)}</span></div>`;
}

async function supabaseCount(config, filter = "") {
  if (!config.enabled || !config.supabaseUrl || !config.anonKey || !supabaseSession()?.access_token) return null;
  const query = filter ? `?${filter}&select=id` : "?select=id";
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${config.table}${query}`, {
    method: "HEAD",
    headers: { ...supabaseHeaders(undefined, config), Prefer: "count=exact" }
  });
  if (!response.ok) return null;
  return Number(response.headers.get("content-range")?.split("/")?.[1] || 0);
}

function renderSystem() {
  const editor = document.querySelector("#editor");
  editor.innerHTML = `${renderIntro(`<p class="advanced-warning">La previsualización del fondo decorativo aparece al final de esta pantalla. Puedes probarlo aquí antes de guardar/publicar.</p>`)}${seoControlTemplate()}${systemGroups.map(groupTemplate).join("")}${decorativePreviewTemplate()}`;
  bindFields(editor);
  bindDecorativePreview(editor);
}

function seoChecklistItems() {
  const system = data.settings?.system || {};
  return [
    { label: "Título SEO en español", ok: Boolean(data.languages?.es?.seoTitle), note: data.languages?.es?.seoTitle || "Falta" },
    { label: "Descripción SEO en español", ok: Boolean(data.languages?.es?.seoDescription), note: data.languages?.es?.seoDescription || "Falta" },
    { label: "Títulos SEO multidioma", ok: ["es", "eu", "en"].every((lang) => data.languages?.[lang]?.seoTitle), note: "ES / EU / EN" },
    { label: "Descripciones SEO multidioma", ok: ["es", "eu", "en"].every((lang) => data.languages?.[lang]?.seoDescription), note: "ES / EU / EN" },
    { label: "Schema local", ok: Boolean(system.schemaDescription && system.streetAddress && system.addressLocality), note: system.addressLocality || "Revisar dirección" },
    { label: "Imagen social", ok: Boolean(system.socialImage), note: system.socialImage || "Falta imagen" },
    { label: "Redes enlazadas", ok: Boolean(data.settings?.instagram && data.settings?.youtube), note: "Instagram / YouTube" },
    { label: "Sitemap y robots", ok: true, note: "sitemap.xml y robots.txt publicados" }
  ];
}

function seoControlTemplate() {
  const items = seoChecklistItems();
  const missing = items.filter((item) => !item.ok).length;
  return `
    <article class="editor-group seo-control">
      <header>
        <div>
          <h3>Control SEO rápido</h3>
          <p>${missing ? `${missing} punto(s) por revisar.` : "Base SEO correcta. Mantén noticias y eventos actualizados."}</p>
        </div>
        <div class="seo-links">
          <a class="button-like" href="sitemap.xml" target="_blank" rel="noreferrer">Sitemap</a>
          <a class="button-like" href="robots.txt" target="_blank" rel="noreferrer">Robots</a>
        </div>
      </header>
      <div class="seo-checklist">
        ${items.map((item) => `<div class="${item.ok ? "ok" : "warn"}"><strong>${item.ok ? "OK" : "REVISAR"}</strong><span>${escapeHtml(item.label)}</span><small>${escapeHtml(item.note)}</small></div>`).join("")}
      </div>
    </article>
  `;
}

function decorativeBackgroundConfig() {
  const config = data.settings?.system?.decorativeBackground || {};
  return {
    enabled: config.enabled === true || config.enabled === "true",
    preset: ["paper", "kanji", "waves", "dojo", "custom"].includes(config.preset) ? config.preset : "paper",
    customImage: String(config.customImage || "").trim(),
    opacity: String(config.opacity || "0.08").trim(),
    size: String(config.size || "520px").trim(),
    position: String(config.position || "center top").trim(),
    scope: ["light", "all", "soft"].includes(config.scope) ? config.scope : "light"
  };
}

function decorativePreviewTemplate() {
  const config = decorativeBackgroundConfig();
  const heroImage = data.settings?.images?.hero || "assets/uploads/1780604041486-manji.jpg";
  return `
    <article class="editor-group decorative-preview-card">
      <header>
        <div>
          <h3>Previsualización del fondo decorativo</h3>
          <p>Vista aproximada de cómo se verá en una sección clara de la web. No publica nada hasta que pulses Guardar cambios.</p>
        </div>
      </header>
      <div class="decorative-preview"
        data-preview-enabled="${config.enabled ? "true" : "false"}"
        data-preview-preset="${escapeHtml(config.preset)}"
        style="--preview-opacity:${escapeHtml(config.opacity)}; --preview-size:${escapeHtml(config.size)}; --preview-position:${escapeHtml(config.position)}; --preview-image:${config.preset === "custom" && config.customImage ? `url('${escapeHtml(config.customImage)}')` : "none"}; --preview-hero-image:url('${escapeHtml(heroImage)}');">
        <div class="decorative-preview__hero">
          <span>SKBC GIPUZKOA</span>
          <strong>Shorinji Kempo en Tolosa</strong>
        </div>
        <div class="decorative-preview__section">
          <p>Sección clara con contenido real</p>
          <h4>Confianza, disciplina y defensa personal</h4>
          <div class="decorative-preview__tiles">
            <span>Niños</span>
            <span>Adultos</span>
            <span>Club</span>
          </div>
        </div>
      </div>
    </article>
  `;
}

function bindDecorativePreview(editor) {
  const preview = editor.querySelector(".decorative-preview");
  if (!preview) return;
  const refresh = () => {
    const config = decorativeBackgroundConfig();
    const heroImage = data.settings?.images?.hero || "assets/uploads/1780604041486-manji.jpg";
    preview.dataset.previewEnabled = config.enabled ? "true" : "false";
    preview.dataset.previewPreset = config.preset;
    preview.style.setProperty("--preview-opacity", config.opacity);
    preview.style.setProperty("--preview-size", config.size);
    preview.style.setProperty("--preview-position", config.position);
    preview.style.setProperty("--preview-image", config.preset === "custom" && config.customImage ? `url("${config.customImage}")` : "none");
    preview.style.setProperty("--preview-hero-image", `url("${heroImage}")`);
  };
  editor.addEventListener("input", refresh);
  editor.addEventListener("change", refresh);
  refresh();
}

function parseEditorPerson(person) {
  if (Array.isArray(person)) {
    return { name: person[0] || "", role: person[1] || "", text: person[2] || "", image: person[3] || "" };
  }
  const [name, role] = String(person || "").split(" Â· ");
  return { name: name || "", role: role || "", text: "", image: "" };
}

function peopleRows(kind, key) {
  const lists = ["es", "eu", "en"].map((lang) => data.languages?.[lang]?.[key.group]?.[key.list] || []);
  const count = Math.max(...lists.map((list) => list.length), 0);
  return Array.from({ length: count }, (_, index) => {
    const es = parseEditorPerson(lists[0][index]);
    const eu = parseEditorPerson(lists[1][index]);
    const en = parseEditorPerson(lists[2][index]);
    return {
      kind,
      name: es.name || eu.name || en.name,
      image: es.image || eu.image || en.image || "",
      esRole: es.role,
      euRole: eu.role,
      enRole: en.role,
      esText: es.text,
      euText: eu.text,
      enText: en.text
    };
  });
}

function renderPeople() {
  const editor = document.querySelector("#editor");
  const leads = peopleRows("lead", { group: "technicalTeam", list: "leads" });
  const members = peopleRows("member", { group: "technicalTeam", list: "members" });
  const board = peopleRows("board", { group: "board", list: "members" });
  editor.innerHTML = `
    ${renderIntro(`<p class="advanced-warning">Edita nombres, cargos y fotos desde aquí. El nombre se aplica a ES/EU/EN; cargos y descripciones pueden ser distintos por idioma.</p>`)}
    ${instructorEditorTemplate()}
    ${peopleSectionTemplate("Responsables técnicos destacados", "lead", leads, true)}
    ${peopleSectionTemplate("Equipo técnico", "member", members, false)}
    ${peopleSectionTemplate("Directiva", "board", board, false)}
  `;
  bindPeopleEditor(editor);
}

function instructorEditorTemplate() {
  const image = data.settings?.images?.people?.alvaro || "";
  return `
    <article class="editor-group people-editor">
      <header>
        <div>
          <h3>Responsable técnico general</h3>
          <p>Este bloque controla la ficha principal del profesor que aparece antes del equipo técnico.</p>
        </div>
      </header>
      <div class="people-rows">
        <div class="person-editor-row person-editor-row--instructor">
          <label>Nombre<input data-instructor-field="title" data-lang="all" value="${escapeHtml(data.languages.es.instructor.title || "")}" /></label>
          <label>Foto principal<input data-instructor-field="image" value="${escapeHtml(image)}" placeholder="assets/uploads/foto.jpg" /></label>
          <label>Etiqueta ES<input data-instructor-field="eyebrow" data-lang="es" value="${escapeHtml(data.languages.es.instructor.eyebrow || "")}" /></label>
          <label>Etiqueta EU<input data-instructor-field="eyebrow" data-lang="eu" value="${escapeHtml(data.languages.eu.instructor.eyebrow || "")}" /></label>
          <label>Etiqueta EN<input data-instructor-field="eyebrow" data-lang="en" value="${escapeHtml(data.languages.en.instructor.eyebrow || "")}" /></label>
          <label>Texto ES<textarea data-instructor-field="text" data-lang="es" rows="4">${escapeHtml(data.languages.es.instructor.text || "")}</textarea></label>
          <label>Texto EU<textarea data-instructor-field="text" data-lang="eu" rows="4">${escapeHtml(data.languages.eu.instructor.text || "")}</textarea></label>
          <label>Texto EN<textarea data-instructor-field="text" data-lang="en" rows="4">${escapeHtml(data.languages.en.instructor.text || "")}</textarea></label>
          <label>Texto adicional ES<textarea data-instructor-field="extra" data-lang="es" rows="4">${escapeHtml(data.languages.es.instructor.extra || "")}</textarea></label>
          <label>Texto adicional EU<textarea data-instructor-field="extra" data-lang="eu" rows="4">${escapeHtml(data.languages.eu.instructor.extra || "")}</textarea></label>
          <label>Texto adicional EN<textarea data-instructor-field="extra" data-lang="en" rows="4">${escapeHtml(data.languages.en.instructor.extra || "")}</textarea></label>
        </div>
      </div>
    </article>
  `;
}

function peopleSectionTemplate(title, kind, people, hasText) {
  return `
    <article class="editor-group people-editor" data-people-section="${kind}">
      <header>
        <div>
          <h3>${title}</h3>
          <p>Añade, elimina o cambia personas. Foto opcional: pega una ruta tipo assets/uploads/foto.jpg.</p>
        </div>
        <button class="primary add-person" type="button" data-add-person="${kind}">Añadir persona</button>
      </header>
      <div class="people-rows">
        ${people.map((person) => personRowTemplate(kind, person, hasText)).join("")}
      </div>
    </article>
  `;
}

function personRowTemplate(kind, person = {}, hasText = false) {
  return `
    <div class="person-editor-row" data-person-kind="${kind}">
      <label>Nombre<input data-person-field="name" value="${escapeHtml(person.name || "")}" /></label>
      <label>Foto opcional<input data-person-field="image" value="${escapeHtml(person.image || "")}" placeholder="assets/uploads/foto.jpg" /></label>
      <label>Cargo ES<input data-person-field="esRole" value="${escapeHtml(person.esRole || "")}" /></label>
      <label>Cargo EU<input data-person-field="euRole" value="${escapeHtml(person.euRole || "")}" /></label>
      <label>Cargo EN<input data-person-field="enRole" value="${escapeHtml(person.enRole || "")}" /></label>
      ${hasText ? `
        <label>Descripción ES<textarea data-person-field="esText" rows="3">${escapeHtml(person.esText || "")}</textarea></label>
        <label>Descripción EU<textarea data-person-field="euText" rows="3">${escapeHtml(person.euText || "")}</textarea></label>
        <label>Descripción EN<textarea data-person-field="enText" rows="3">${escapeHtml(person.enText || "")}</textarea></label>
      ` : ""}
      <button class="danger remove-person" type="button">Eliminar persona</button>
    </div>
  `;
}

function bindPeopleEditor(editor) {
  const syncInstructor = () => {
    editor.querySelectorAll("[data-instructor-field]").forEach((field) => {
      const key = field.dataset.instructorField;
      const lang = field.dataset.lang;
      const value = field.value.trim();
      if (key === "image") {
        if (!data.settings.images.people) data.settings.images.people = {};
        data.settings.images.people.alvaro = value;
        return;
      }
      if (lang === "all" && key === "title") {
        ["es", "eu", "en"].forEach((language) => {
          data.languages[language].instructor.title = value;
        });
        return;
      }
      if (lang && data.languages[lang]?.instructor) {
        data.languages[lang].instructor[key] = value;
      }
    });
    markDirty();
  };
  const sync = () => {
    const rowsFor = (kind) => Array.from(editor.querySelectorAll(`[data-person-kind="${kind}"]`)).map((row) => {
      const value = (field) => row.querySelector(`[data-person-field="${field}"]`)?.value?.trim() || "";
      return {
        name: value("name"),
        image: value("image"),
        esRole: value("esRole"),
        euRole: value("euRole"),
        enRole: value("enRole"),
        esText: value("esText"),
        euText: value("euText"),
        enText: value("enText")
      };
    }).filter((person) => person.name);
    const write = (lang, group, list, rows, roleKey, textKey = null) => {
      data.languages[lang][group][list] = rows.map((person) => {
        const role = person[roleKey] || person.esRole || "";
        const text = textKey ? person[textKey] || person.esText || "" : "";
        return [person.name, role, text, person.image || ""];
      });
    };
    const leads = rowsFor("lead");
    const members = rowsFor("member");
    const board = rowsFor("board");
    write("es", "technicalTeam", "leads", leads, "esRole", "esText");
    write("eu", "technicalTeam", "leads", leads, "euRole", "euText");
    write("en", "technicalTeam", "leads", leads, "enRole", "enText");
    write("es", "technicalTeam", "members", members, "esRole");
    write("eu", "technicalTeam", "members", members, "euRole");
    write("en", "technicalTeam", "members", members, "enRole");
    write("es", "board", "members", board, "esRole");
    write("eu", "board", "members", board, "euRole");
    write("en", "board", "members", board, "enRole");
    markDirty();
  };
  editor.addEventListener("input", (event) => {
    if (event.target.matches("[data-instructor-field]")) {
      syncInstructor();
      return;
    }
    if (event.target.matches("[data-person-field]")) sync();
  });
  editor.addEventListener("click", (event) => {
    const add = event.target.closest("[data-add-person]");
    if (add) {
      const section = editor.querySelector(`[data-people-section="${add.dataset.addPerson}"] .people-rows`);
      section.insertAdjacentHTML("beforeend", personRowTemplate(add.dataset.addPerson, {}, add.dataset.addPerson === "lead"));
      sync();
      return;
    }
    const remove = event.target.closest(".remove-person");
    if (remove) {
      remove.closest(".person-editor-row")?.remove();
      sync();
    }
  });
}

function groupTemplate(group) {
  const translate = currentPanel === "es" ? `<button class="translate-section" type="button" data-translate-section="${encodeURIComponent(JSON.stringify(group.fields))}">Traducir esta sección a EU/EN</button>` : "";
  return `
    <article class="editor-group">
      <header>
        <div>
          <h3>${group.title}</h3>
          <p>${group.help}</p>
        </div>
        ${translate}
      </header>
      <div class="field-grid">
        ${group.fields.map(fieldTemplate).join("")}
      </div>
    </article>
  `;
}

function fieldTemplate([label, path, type]) {
  const value = formatFieldValue(getByPath(data, path), type);
  const id = `field-${path.join("-")}`;
  const encodedPath = encodeURIComponent(JSON.stringify(path));
  const upload = isImageField(label, path) ? `<button class="upload-image" data-upload-path="${encodedPath}" type="button">Subir imagen</button>` : "";
  const control = `${controlTemplate(id, encodedPath, value, type)}${upload}`;
  return `<label class="field" for="${id}"><span>${label}</span>${control}</label>`;
}

function isImageField(label, path) {
  const text = `${label} ${path.join(" ")}`.toLowerCase();
  return text.includes("foto") || text.includes("imagen") || text.includes("image") || text.includes("logo");
}

function controlTemplate(id, encodedPath, value, type) {
  if (type === "specialVisualSchedule") {
    return specialVisualScheduleTemplate(id, encodedPath, value);
  }
  if (type === "galleryImages") {
    return galleryImagesTemplate(id, encodedPath, parseFieldValue(value, "array"));
  }
  if (type === "textarea" || type === "array" || type === "matrix" || type === "linkList" || type === "colorList") {
    const rows = type === "matrix" ? 6 : 4;
    const hint = type === "matrix" || type === "linkList" || type === "colorList" ? `<small>Una línea por elemento. Usa | para separar datos.</small>` : "";
    return `${hint}<textarea id="${id}" data-type="${type}" data-path="${encodedPath}" rows="${rows}">${escapeHtml(value)}</textarea>`;
  }
  if (type === "date") {
    return `<input id="${id}" type="date" data-type="${type}" data-path="${encodedPath}" value="${escapeHtml(value)}" />`;
  }
  if (type === "color") {
    return `<input id="${id}" type="color" data-type="${type}" data-path="${encodedPath}" value="${escapeHtml(value || "#1f6fa9")}" />`;
  }
  if (type === "palette") {
    return selectTemplate(id, encodedPath, value, [["skbc", "SKBC original"], ["azul", "Azul deportivo"], ["dojo", "Dojo cÃ¡lido"], ["clara", "Clara familiar"]]);
  }
  if (type === "overlay") {
    return selectTemplate(id, encodedPath, value, [["classic", "Contraste normal"], ["soft", "MÃ¡s luminoso"], ["strong", "MÃ¡s oscuro"]]);
  }
  if (type === "specialVisualMode") {
    return selectTemplate(id, encodedPath, value || "none", [
      ["none", "Normal, sin efecto"],
      ["christmas", "Navidad: nieve"],
      ["autumn", "OtoÃ±o: hojas"],
      ["carnival", "Carnaval: confeti"],
      ["womensDay", "DÃ­a de la Mujer: morado"],
      ["mourning", "Luto: lazo negro"]
    ], type);
  }
  if (type === "specialVisualIntensity") {
    return selectTemplate(id, encodedPath, value || "medium", [["low", "Suave"], ["medium", "Media"], ["high", "Alta"]], type);
  }
  if (type === "booleanText") {
    return selectTemplate(id, encodedPath, value, [["true", "Activa"], ["false", "Oculta"]], type);
  }
  if (type === "sectionStyle") {
    return selectTemplate(id, encodedPath, value, [["normal", "Normal"], ["soft", "Fondo claro"], ["dark", "Fondo oscuro"]], type);
  }
  if (type === "decorativePreset") {
    return selectTemplate(id, encodedPath, value || "paper", [["paper", "Textura washi suave"], ["kanji", "Marca SKBC tenue"], ["waves", "Ondas tradicionales"], ["dojo", "Tatami sobrio"], ["custom", "Imagen personalizada"]], type);
  }
  if (type === "decorativeScope") {
    return selectTemplate(id, encodedPath, value || "light", [["light", "Solo secciones claras"], ["all", "Toda la web"], ["soft", "Solo fondos suaves"]], type);
  }
  return `<input id="${id}" data-type="${type}" data-path="${encodedPath}" value="${escapeHtml(value)}" />`;
}

function specialVisualScheduleTemplate(id, encodedPath, value) {
  const items = parseFieldValue(value, "specialVisualSchedule");
  const rows = items.length ? items : [{ enabled: true, mode: "christmas", intensity: "medium", start: "", end: "", message: "" }];
  return `
    <div class="special-schedule-builder" data-hidden-id="${id}">
      <small>Programa efectos por fechas sin tocar la web pública. Si hoy entra dentro de una programación activa, se aplicará automáticamente.</small>
      <textarea id="${id}" class="special-schedule-raw" data-type="specialVisualSchedule" data-path="${encodedPath}" hidden>${escapeHtml(value)}</textarea>
      <div class="special-schedule-rows">
        ${rows.map((item) => specialVisualScheduleRow(item)).join("")}
      </div>
      <button class="secondary add-special-schedule" type="button">Añadir programación</button>
    </div>
  `;
}

function specialVisualScheduleRow(item = {}) {
  const enabled = item.enabled === false ? "false" : "true";
  const mode = item.mode || "christmas";
  const intensity = item.intensity || "medium";
  return `
    <div class="special-schedule-row">
      <label>Estado ${selectPlain("enabled", enabled, [["true", "Activa"], ["false", "Pausada"]])}</label>
      <label>Efecto ${selectPlain("mode", mode, [["christmas", "Navidad: nieve"], ["autumn", "Otoño: hojas"], ["carnival", "Carnaval: confeti"], ["womensDay", "Día de la Mujer"], ["mourning", "Luto"]])}</label>
      <label>Intensidad ${selectPlain("intensity", intensity, [["low", "Suave"], ["medium", "Media"], ["high", "Alta"]])}</label>
      <label>Desde <input data-schedule-field="start" type="date" value="${escapeHtml(item.start || "")}" /></label>
      <label>Hasta <input data-schedule-field="end" type="date" value="${escapeHtml(item.end || "")}" /></label>
      <label class="special-schedule-message">Mensaje <input data-schedule-field="message" value="${escapeHtml(item.message || "")}" placeholder="Opcional" /></label>
      <button class="danger remove-special-schedule" type="button">Eliminar</button>
    </div>
  `;
}

function selectPlain(field, value, options) {
  return `<select data-schedule-field="${field}">${options.map(([optionValue, label]) => `<option value="${optionValue}" ${String(value) === optionValue ? "selected" : ""}>${label}</option>`).join("")}</select>`;
}

function selectTemplate(id, encodedPath, value, options, type = "input") {
  return `<select id="${id}" data-type="${type}" data-path="${encodedPath}">
    ${options.map(([optionValue, label]) => `<option value="${optionValue}" ${String(value) === optionValue ? "selected" : ""}>${label}</option>`).join("")}
  </select>`;
}

function renderCustom() {
  const editor = document.querySelector("#editor");
  const sections = data.settings.customSections || [];
  editor.innerHTML = `
    ${renderIntro(`<div class="intro-actions"><button id="add-section" class="primary" type="button">AÃ±adir Ã¡rea</button></div>`)}
    ${sections.length ? sections.map(customSectionTemplate).join("") : `<article class="editor-group"><header><h3>No hay Ã¡reas nuevas</h3><p>Pulsa AÃ±adir Ã¡rea para crear un bloque nuevo en la web.</p></header></article>`}
  `;
  bindFields(editor);
  document.querySelector("#add-section").addEventListener("click", addCustomSection);
  editor.querySelectorAll("[data-remove-section]").forEach((button) => {
    button.addEventListener("click", () => removeCustomSection(Number(button.dataset.removeSection)));
  });
}

function renderEvents() {
  const editor = document.querySelector("#editor");
  const events = data.settings.events || [];
  if (currentEventIndex !== null && currentEventIndex > events.length - 1) currentEventIndex = null;
  const selected = currentEventIndex === null ? null : events[currentEventIndex];
  editor.innerHTML = `
    ${renderIntro(`<div class="intro-actions event-bulk-actions">
      <button id="add-event" class="primary" type="button">Añadir evento</button>
      <label>Duplicar todo a <input id="copy-events-year" type="number" min="2026" max="2100" value="${new Date().getFullYear() + 1}" /></label>
      <label>Método <select id="copy-events-mode">
        <option value="smart">Inteligente: conservar patrón semanal</option>
        <option value="exact">Fechas exactas: mismo día y mes</option>
        <option value="weekend">Forzar fin de semana</option>
      </select></label>
      <button id="copy-events" type="button">Duplicar calendario</button>
    </div>`)}
    ${events.length ? `
      <div class="events-workspace">
        <div class="events-editor">
          ${selected ? eventTemplate(selected, currentEventIndex) : emptyEventEditor()}
        </div>
        <aside class="events-sidebar">
          <header>
            <h3>Eventos</h3>
            <p>Resumen rápido con colores asignados.</p>
          </header>
          <div class="events-mini-list">
            ${events.map(eventMiniCard).join("")}
          </div>
        </aside>
      </div>
    ` : `<article class="editor-group"><header><h3>No hay eventos</h3><p>Pulsa Añadir evento para crear el calendario del club.</p></header></article>`}
  `;
  bindFields(editor);
  document.querySelector("#add-event").addEventListener("click", addEvent);
  document.querySelector("#copy-events").addEventListener("click", copyEventsToYear);
  editor.querySelectorAll("[data-select-event]").forEach((button) => {
    button.addEventListener("click", () => {
      currentEventIndex = Number(button.dataset.selectEvent);
      renderEvents();
    });
  });
  editor.querySelectorAll("[data-remove-event]").forEach((button) => {
    button.addEventListener("click", () => removeEvent(Number(button.dataset.removeEvent)));
  });
  editor.querySelector("[data-close-event]")?.addEventListener("click", () => {
    currentEventIndex = null;
    renderEvents();
  });
  editor.querySelectorAll("[data-add-event-date]").forEach((button) => {
    button.addEventListener("click", () => addEventDate(Number(button.dataset.addEventDate), button.dataset.date));
  });
  editor.querySelectorAll("[data-remove-event-date]").forEach((button) => {
    button.addEventListener("click", () => removeEventDate(Number(button.dataset.removeEventDate), button.dataset.date));
  });
  editor.querySelectorAll("[data-translate-event]").forEach((button) => {
    button.addEventListener("click", () => translateEvent(Number(button.dataset.translateEvent), button));
  });
  editor.querySelectorAll("[data-exclude-repeat-date]").forEach((button) => {
    button.addEventListener("click", () => excludeRepeatDate(Number(button.dataset.excludeRepeatDate), button.dataset.date));
  });
  editor.querySelectorAll("[data-restore-repeat-date]").forEach((button) => {
    button.addEventListener("click", () => restoreRepeatDate(Number(button.dataset.restoreRepeatDate), button.dataset.date));
  });
}

function emptyEventEditor() {
  return `<article class="editor-group empty-event-editor">
    <header>
      <h3>Selecciona un evento</h3>
      <p>Elige un evento en el resumen de la derecha para editarlo, o pulsa Añadir evento para crear uno nuevo.</p>
    </header>
  </article>`;
}

function eventTemplate(event, index) {
  const base = ["settings", "events", index];
  const dates = Array.isArray(event.dates) ? event.dates.filter(Boolean).sort() : [];
  const repeatDates = generatedRepeatDates(event);
  const excludedDates = Array.isArray(event.excludedDates) ? event.excludedDates.filter(Boolean).sort() : [];
  const groups = [{
    title: `Evento ${index + 1}`,
    help: "Puedes usar rango inicio/fin, días sueltos, o repetición cada X días. Para una clase quincenal usa repetición cada 15 días.",
    fields: [
      ["Activo", [...base, "enabled"], "booleanText"],
      ["Fecha inicio", [...base, "start"], "date"],
      ["Fecha fin", [...base, "end"], "date"],
      ["Repetición activa", [...base, "repeat", "enabled"], "booleanText"],
      ["Repetir desde", [...base, "repeat", "start"], "date"],
      ["Repetir hasta", [...base, "repeat", "until"], "date"],
      ["Cada cuántos días", [...base, "repeat", "everyDays"], "input"],
      ["Color del evento", [...base, "color"], "color"],
      ["Lugar", [...base, "location"], "input"],
      ["ES título", [...base, "languages", "es", "title"], "input"],
      ["ES descripción", [...base, "languages", "es", "description"], "textarea"],
      ["EU título", [...base, "languages", "eu", "title"], "input"],
      ["EU descripción", [...base, "languages", "eu", "description"], "textarea"],
      ["EN título", [...base, "languages", "en", "title"], "input"],
      ["EN descripción", [...base, "languages", "en", "description"], "textarea"]
    ]
  }];
  return `<div class="custom-card">
    ${groups.map(groupTemplate).join("")}
    <button class="quiet event-close-button" data-close-event type="button">Cerrar ficha</button>
    <article class="editor-group event-tools">
      <header>
        <h3>Días concretos</h3>
        <p>Úsalo para añadir días sueltos que no sigan la repetición normal.</p>
      </header>
      <div class="event-date-tool">
        <label for="event-date-${index}">
          <span>Fecha concreta</span>
          <input type="date" id="event-date-${index}" />
        </label>
        <button class="primary" type="button" data-add-event-date="${index}">Asignar día</button>
      </div>
      <div class="event-date-chips">
        ${dates.length ? dates.map((date) => `<span>${date}<button type="button" data-remove-event-date="${index}" data-date="${date}">×</button></span>`).join("") : `<p>No hay días sueltos añadidos.</p>`}
      </div>
    </article>
    <article class="editor-group event-tools">
      <header>
        <h3>Días generados por repetición</h3>
        <p>Si una fecha concreta no se hará, pulsa Excluir. No se borrará el evento, solo ese día.</p>
      </header>
      <div class="repeat-date-list">
        ${repeatDates.length ? repeatDates.map((date) => `<span>${date}<button type="button" data-add-event-date="${index}" data-date="${date}">Añadir como día concreto</button><button type="button" data-exclude-repeat-date="${index}" data-date="${date}">Excluir</button></span>`).join("") : `<p>Activa la repetición y define fecha desde/hasta para ver los días generados.</p>`}
      </div>
      ${excludedDates.length ? `<h4>Días excluidos</h4><div class="repeat-date-list excluded">${excludedDates.map((date) => `<span>${date}<button type="button" data-restore-repeat-date="${index}" data-date="${date}">Restaurar</button></span>`).join("")}</div>` : ""}
    </article>
    <article class="editor-group event-tools">
      <header>
        <h3>Traducción</h3>
        <p>Genera euskera e inglés desde el texto en castellano. Revisa siempre antes de publicar.</p>
      </header>
      <div class="event-date-tool">
        <button class="primary" type="button" data-translate-event="${index}">Traducir EU/EN desde ES</button>
      </div>
    </article>
    <button class="danger" data-remove-event="${index}" type="button">Eliminar este evento</button>
  </div>`;
}

function generatedRepeatDates(event) {
  if (!event.repeat?.enabled) return [];
  const start = event.repeat.start || event.start;
  const until = event.repeat.until || event.end || event.start;
  if (!start || !until) return [];
  const interval = Math.max(1, Number(event.repeat.everyDays || 15));
  const excluded = new Set(event.excludedDates || []);
  const dates = [];
  let current = parseDateInput(start);
  const last = parseDateInput(until);
  while (current <= last && dates.length < 80) {
    const key = formatDateInput(current);
    if (!excluded.has(key)) dates.push(key);
    current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + interval);
  }
  return dates;
}

function galleryImagesTemplate(id, encodedPath, items = []) {
  const images = Array.isArray(items) ? items.filter(Boolean) : [];
  return `
    <div class="gallery-admin" data-gallery-path="${encodedPath}">
      <input id="${id}" data-type="array" data-path="${encodedPath}" value="${escapeHtml(images.join("\n"))}" hidden />
      <small>Estas son las miniaturas visibles en “Actividades, seminarios y vida del club”. Puedes añadir tantas como quieras. Al subir una imagen, el editor la reduce y la convierte a WebP automáticamente cuando compensa.</small>
      <div class="gallery-admin-grid">
        ${images.map((image, index) => galleryImageItemTemplate(image, index)).join("")}
      </div>
      <div class="gallery-admin-actions">
        <button class="primary add-gallery-image" type="button">Añadir imagen</button>
      </div>
    </div>
  `;
}

function galleryImageItemTemplate(image, index) {
  return `
    <article class="gallery-admin-item" data-gallery-index="${index}">
      <div class="gallery-admin-thumb" style="background-image:url('${escapeAttr(image)}')"></div>
      <input value="${escapeHtml(image)}" aria-label="Ruta de imagen ${index + 1}" />
      <div class="gallery-admin-buttons">
        <button type="button" data-gallery-action="upload">Cambiar</button>
        <button type="button" data-gallery-action="up">Subir</button>
        <button type="button" data-gallery-action="down">Bajar</button>
        <button class="danger" type="button" data-gallery-action="remove">Quitar</button>
      </div>
    </article>
  `;
}

function generatedEventDates(event) {
  const dates = new Set(Array.isArray(event.dates) ? event.dates.filter(Boolean) : []);
  if (event.start) dates.add(event.start);
  generatedRepeatDates(event).forEach((date) => dates.add(date));
  return Array.from(dates).sort();
}

function parseDateInput(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1);
}

function formatDateInput(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function eventSummary(event) {
  const title = event.languages?.es?.title || "Evento sin título";
  const dates = Array.isArray(event.dates) && event.dates.length ? event.dates.slice(0, 3).join(", ") : "";
  const extraDates = Array.isArray(event.dates) && event.dates.length > 3 ? ` +${event.dates.length - 3}` : "";
  const range = event.start ? `${event.start}${event.end && event.end !== event.start ? ` / ${event.end}` : ""}` : "Sin fecha";
  const repeat = event.repeat?.enabled ? `Cada ${event.repeat.everyDays || 15} días` : "";
  return {
    title,
    date: dates ? `${dates}${extraDates}` : range,
    repeat,
    location: event.location || "",
    color: event.color || "#1f6fa9",
    enabled: event.enabled !== false
  };
}

function eventMiniCard(event, index) {
  const summary = eventSummary(event);
  return `<article class="event-mini ${index === currentEventIndex ? "active" : ""}" style="--event-color:${summary.color}">
    <button type="button" data-select-event="${index}">
      <i></i>
      <span>
        <strong>${summary.title}</strong>
        <small>${summary.date}${summary.repeat ? ` · ${summary.repeat}` : ""}</small>
        ${summary.location ? `<small>${summary.location}</small>` : ""}
      </span>
    </button>
    <div class="event-mini__actions">
      <span>${summary.enabled ? "Activo" : "Oculto"}</span>
      <button type="button" data-remove-event="${index}">Eliminar</button>
    </div>
  </article>`;
}

function addEvent() {
  if (!data.settings.events) data.settings.events = [];
  const today = new Date();
  const start = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  data.settings.events.push({
    enabled: true,
    start,
    end: start,
    color: "#1f6fa9",
    location: "Tolosa",
    dates: [],
    repeat: {
      enabled: false,
      start,
      until: start,
      everyDays: "15"
    },
    languages: {
      es: { title: "Nuevo evento", description: "Descripción del evento." },
      eu: { title: "Ekitaldi berria", description: "Ekitaldiaren deskribapena." },
      en: { title: "New event", description: "Event description." }
    }
  });
  currentEventIndex = data.settings.events.length - 1;
  markDirty();
  renderEvents();
}

function removeEvent(index) {
  if (!confirm("¿Eliminar este evento?")) return;
  data.settings.events.splice(index, 1);
  currentEventIndex = Math.max(0, Math.min(currentEventIndex, data.settings.events.length - 1));
  markDirty();
  renderEvents();
}

function addEventDate(index, presetDate = "") {
  const input = document.querySelector(`#event-date-${index}`);
  const value = presetDate || input?.value;
  if (!value) {
    setStatus("Elige primero una fecha para añadirla al evento.", "danger");
    return;
  }
  const event = data.settings.events[index];
  if (!event.dates) event.dates = [];
  if (!event.dates.includes(value)) event.dates.push(value);
  event.dates.sort();
  markDirty();
  renderEvents();
}

function removeEventDate(index, date) {
  const event = data.settings.events[index];
  event.dates = (event.dates || []).filter((item) => item !== date);
  markDirty();
  renderEvents();
}

function excludeRepeatDate(index, date) {
  const event = data.settings.events[index];
  if (!event.excludedDates) event.excludedDates = [];
  if (!event.excludedDates.includes(date)) event.excludedDates.push(date);
  event.excludedDates.sort();
  markDirty();
  renderEvents();
}

function restoreRepeatDate(index, date) {
  const event = data.settings.events[index];
  event.excludedDates = (event.excludedDates || []).filter((item) => item !== date);
  markDirty();
  renderEvents();
}

function shiftDateYear(value, targetYear) {
  if (!value) return value;
  const date = parseDateInput(value);
  return formatDateInput(new Date(targetYear, date.getMonth(), date.getDate()));
}

function addDays(date, days) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

function daysBetween(start, end) {
  const oneDay = 24 * 60 * 60 * 1000;
  return Math.round((parseDateInput(end) - parseDateInput(start)) / oneDay);
}

function daysInMonth(year, monthIndex) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function isLastWeekdayOfMonth(date) {
  return date.getDate() + 7 > daysInMonth(date.getFullYear(), date.getMonth());
}

function sameOrdinalWeekdayInYear(date, targetYear) {
  const weekday = date.getDay();
  const month = date.getMonth();
  if (isLastWeekdayOfMonth(date)) {
    for (let day = daysInMonth(targetYear, month); day >= 1; day -= 1) {
      const candidate = new Date(targetYear, month, day);
      if (candidate.getDay() === weekday) return candidate;
    }
  }
  const ordinal = Math.floor((date.getDate() - 1) / 7) + 1;
  let count = 0;
  for (let day = 1; day <= daysInMonth(targetYear, month); day += 1) {
    const candidate = new Date(targetYear, month, day);
    if (candidate.getDay() !== weekday) continue;
    count += 1;
    if (count === ordinal) return candidate;
  }
  return nearestWeekdayToDate(new Date(targetYear, month, Math.min(date.getDate(), daysInMonth(targetYear, month))), weekday);
}

function nearestWeekdayToDate(date, weekday) {
  let best = date;
  let bestDistance = Infinity;
  for (let offset = -7; offset <= 7; offset += 1) {
    const candidate = addDays(date, offset);
    if (candidate.getDay() !== weekday) continue;
    const distance = Math.abs(offset);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }
  return best;
}

function nearestWeekendToDate(date, preferredWeekday) {
  const preferred = preferredWeekday === 0 ? 0 : 6;
  const alternate = preferred === 6 ? 0 : 6;
  const preferredDate = nearestWeekdayToDate(date, preferred);
  const alternateDate = nearestWeekdayToDate(date, alternate);
  return Math.abs(daysBetween(formatDateInput(date), formatDateInput(preferredDate))) <= Math.abs(daysBetween(formatDateInput(date), formatDateInput(alternateDate)))
    ? preferredDate
    : alternateDate;
}

function smartDateToYear(value, targetYear, mode) {
  if (!value) return value;
  if (mode === "exact") return shiftDateYear(value, targetYear);
  const original = parseDateInput(value);
  const exactTarget = parseDateInput(shiftDateYear(value, targetYear));
  if (mode === "weekend") return formatDateInput(nearestWeekendToDate(exactTarget, original.getDay()));
  return formatDateInput(sameOrdinalWeekdayInYear(original, targetYear));
}

function shiftEventToYear(event, targetYear, mode = "smart") {
  const copy = structuredClone(event);
  const duration = copy.start && copy.end ? Math.max(0, daysBetween(copy.start, copy.end)) : 0;
  copy.start = smartDateToYear(copy.start, targetYear, mode);
  copy.end = copy.start ? formatDateInput(addDays(parseDateInput(copy.start), duration)) : smartDateToYear(copy.end, targetYear, mode);
  copy.dates = [...new Set((copy.dates || []).map((date) => smartDateToYear(date, targetYear, mode)))].sort();
  copy.excludedDates = [...new Set((copy.excludedDates || []).map((date) => smartDateToYear(date, targetYear, mode)))].sort();
  if (copy.repeat) {
    copy.repeat.start = smartDateToYear(copy.repeat.start || event.start, targetYear, mode);
    copy.repeat.until = smartDateToYear(copy.repeat.until || event.end || event.start, targetYear, mode);
  }
  return copy;
}

function copyEventsToYear() {
  const targetYear = Number(document.querySelector("#copy-events-year")?.value);
  const mode = document.querySelector("#copy-events-mode")?.value || "smart";
  if (!targetYear) {
    setStatus("Indica el año al que quieres duplicar el calendario.", "danger");
    return;
  }
  const events = data.settings.events || [];
  if (!events.length) return;
  const modeLabel = {
    smart: "conservando patrón semanal",
    exact: "manteniendo día y mes exactos",
    weekend: "forzando fines de semana"
  }[mode] || "conservando patrón semanal";
  if (!confirm(`¿Duplicar los ${events.length} eventos al año ${targetYear} ${modeLabel}? Luego podrás modificar fechas, colores o eliminar lo que no necesites.`)) return;
  const copies = events.map((event) => shiftEventToYear(event, targetYear, mode));
  data.settings.events.push(...copies);
  currentEventIndex = null;
  markDirty();
  setStatus(`Calendario duplicado a ${targetYear} ${modeLabel}. Revisa fechas concretas antes de publicar.`, "warning");
  renderEvents();
}

async function translateEvent(index, button) {
  const event = data.settings.events[index];
  const source = event.languages?.es || {};
  if (!source.title && !source.description) {
    setStatus("Escribe primero el título y descripción en castellano.", "danger");
    return;
  }
  try {
    button.disabled = true;
    button.textContent = "Traduciendo...";
    const [euTitle, euDescription, enTitle, enDescription] = await Promise.all([
      translateText(source.title, "eu"),
      translateText(source.description, "eu"),
      translateText(source.title, "en"),
      translateText(source.description, "en")
    ]);
    event.languages.eu = { title: euTitle || source.title, description: euDescription || source.description };
    event.languages.en = { title: enTitle || source.title, description: enDescription || source.description };
    markDirty();
    setStatus("Traducción generada. Revisa el texto antes de publicar.", "warning");
    renderEvents();
  } catch (error) {
    setStatus(`No se pudo traducir automáticamente: ${error.message}`, "danger");
  } finally {
    button.disabled = false;
    button.textContent = "Traducir EU/EN desde ES";
  }
}

async function translateText(text, target) {
  if (!text) return "";
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=es|${target}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error("servicio de traducción no disponible");
  const result = await response.json();
  return result.responseData?.translatedText || "";
}

function bindSectionTranslations(root) {
  root.querySelectorAll("[data-translate-section]").forEach((button) => {
    button.addEventListener("click", () => translateSection(button));
  });
}

async function translateSection(button) {
  const fields = JSON.parse(decodeURIComponent(button.dataset.translateSection));
  const translatable = fields
    .filter(([, path, type]) => Array.isArray(path) && path[0] === "languages" && path[1] === "es" && ["input", "textarea", "array", "matrix"].includes(type))
    .map(([label, path, type]) => ({ label, path, type }));

  if (!translatable.length) {
    setStatus("Esta sección no tiene textos traducibles.", "danger");
    return;
  }

  try {
    button.disabled = true;
    button.textContent = "Traduciendo...";
    for (const field of translatable) {
      const source = getByPath(data, field.path);
      const euPath = ["languages", "eu", ...field.path.slice(2)];
      const enPath = ["languages", "en", ...field.path.slice(2)];
      const [euValue, enValue] = await Promise.all([
        translateValue(source, "eu", field.type),
        translateValue(source, "en", field.type)
      ]);
      setByPath(data, euPath, euValue || source);
      setByPath(data, enPath, enValue || source);
    }
    markDirty();
    setStatus("Sección traducida a euskera e inglés. Revisa y guarda antes de publicar.", "warning");
    renderGroups(languageGroups("es"));
  } catch (error) {
    setStatus(`No se pudo traducir la sección: ${error.message}`, "danger");
  } finally {
    button.disabled = false;
    button.textContent = "Traducir esta sección a EU/EN";
  }
}

async function translateValue(value, target, type) {
  if (!value) return value;
  if (type === "array" && Array.isArray(value)) {
    return Promise.all(value.map((item) => translateText(String(item), target)));
  }
  if (type === "matrix" && Array.isArray(value)) {
    return Promise.all(value.map(async (row) => {
      if (!Array.isArray(row)) return translateText(String(row), target);
      return Promise.all(row.map((cell) => translateText(String(cell), target)));
    }));
  }
  return translateText(String(value), target);
}

function renderNews() {
  const editor = document.querySelector("#editor");
  const news = data.settings.news || [];
  if (currentNewsIndex !== null && currentNewsIndex > news.length - 1) currentNewsIndex = news.length ? news.length - 1 : null;
  const sectionCopy = ["es", "eu", "en"].map((lang) => groupTemplate({
    title: `Cabecera de noticias (${lang.toUpperCase()})`,
    help: "Estos textos son los que se ven encima de las noticias en la web.",
    fields: [
      ["Etiqueta pequeña", ["languages", lang, "news", "eyebrow"], "input"],
      ["Título visible", ["languages", lang, "news", "title"], "input"],
      ["Texto descriptivo", ["languages", lang, "news", "text"], "textarea"],
      ["Texto si no hay noticias", ["languages", lang, "news", "empty"], "input"]
    ]
  })).join("");
  editor.innerHTML = `
    ${renderIntro(`<div class="intro-actions"><button id="add-news" class="primary" type="button">Añadir noticia</button></div>`)}
    <div class="news-workspace">
      <div class="news-editor">
        <div class="custom-card">${sectionCopy}<button class="translate-section" data-translate-news-copy type="button">Traducir cabecera de noticias</button></div>
        ${news.length && currentNewsIndex !== null ? newsTemplate(news[currentNewsIndex], currentNewsIndex) : emptyNewsEditor(news.length)}
      </div>
      <aside class="news-sidebar">
        <header>
          <h3>Noticias</h3>
          <p>Tenlas siempre a mano. Pulsa una tarjeta para abrirla y editarla.</p>
        </header>
        <div class="news-mini-list">
          ${news.length ? news.map(newsMiniCard).join("") : `<p class="empty-news-list">Todavía no hay noticias creadas.</p>`}
        </div>
      </aside>
    </div>
  `;
  bindFields(editor);
  document.querySelector("#add-news").addEventListener("click", addNews);
  editor.querySelectorAll("[data-select-news]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.selectNews);
      currentNewsIndex = currentNewsIndex === index ? null : index;
      renderNews();
    });
  });
  editor.querySelectorAll("[data-remove-news]").forEach((button) => {
    button.addEventListener("click", () => removeNews(Number(button.dataset.removeNews)));
  });
  editor.querySelector("[data-translate-news-copy]")?.addEventListener("click", (event) => translateNewsCopy(event.currentTarget));
  editor.querySelectorAll("[data-translate-news]").forEach((button) => {
    button.addEventListener("click", () => translateNewsItem(Number(button.dataset.translateNews), button));
  });
}

function emptyNewsEditor(count) {
  return `
    <article class="editor-group empty-news-editor">
      <header>
        <div>
          <h3>${count ? "Selecciona una noticia" : "No hay noticias"}</h3>
          <p>${count ? "Pulsa una tarjeta del lado derecho para abrir su edición aquí." : "Pulsa Añadir noticia para crear avisos visibles en la web."}</p>
        </div>
      </header>
    </article>
  `;
}

function newsMiniCard(item, index) {
  const copy = item.languages?.es || {};
  const title = copy.title || `Noticia ${index + 1}`;
  const text = copy.text || "";
  const date = item.date || "Sin fecha";
  const enabled = item.enabled === false ? "Oculta" : "Activa";
  const image = item.image ? `<img src="${escapeHtml(item.image)}" alt="" loading="lazy" />` : "";
  return `
    <article class="news-mini ${currentNewsIndex === index ? "active" : ""} ${item.image ? "" : "no-image"}" style="--news-color:${escapeHtml(item.color || "#1f6fa9")}">
      <button type="button" data-select-news="${index}">
        ${image}
        <span>
          <strong>${escapeHtml(title)}</strong>
          <small>${escapeHtml(date)} · ${enabled}</small>
          ${text ? `<em>${escapeHtml(text.slice(0, 92))}${text.length > 92 ? "..." : ""}</em>` : ""}
        </span>
      </button>
    </article>
  `;
}

function newsTemplate(item, index) {
  const base = ["settings", "news", index];
  const groups = [{
    title: `Noticia ${index + 1}`,
    help: "Puedes poner fecha, color, enlace opcional y textos en los tres idiomas.",
    fields: [
      ["Activa", [...base, "enabled"], "booleanText"],
      ["Fecha", [...base, "date"], "date"],
      ["Color de fondo/acento", [...base, "color"], "color"],
      ["Imagen de la noticia", [...base, "image"], "input"],
      ["URL opcional", [...base, "url"], "input"],
      ["ES título", [...base, "languages", "es", "title"], "input"],
      ["ES texto", [...base, "languages", "es", "text"], "textarea"],
      ["EU título", [...base, "languages", "eu", "title"], "input"],
      ["EU texto", [...base, "languages", "eu", "text"], "textarea"],
      ["EN título", [...base, "languages", "en", "title"], "input"],
      ["EN texto", [...base, "languages", "en", "text"], "textarea"]
    ]
  }];
  return `<div class="custom-card">${groups.map(groupTemplate).join("")}<button class="translate-section" data-translate-news="${index}" type="button">Traducir esta noticia a EU/EN</button><button class="danger" data-remove-news="${index}" type="button">Eliminar esta noticia</button></div>`;
}

async function translateNewsCopy(button) {
  const source = data.languages?.es?.news || {};
  try {
    button.disabled = true;
    button.textContent = "Traduciendo...";
    for (const key of ["eyebrow", "title", "text", "empty"]) {
      const value = source[key] || "";
      const [eu, en] = await Promise.all([translateText(value, "eu"), translateText(value, "en")]);
      setByPath(data, ["languages", "eu", "news", key], eu || value);
      setByPath(data, ["languages", "en", "news", key], en || value);
    }
    markDirty();
    setStatus("Cabecera de noticias traducida. Revisa y guarda antes de publicar.", "warning");
    renderNews();
  } catch (error) {
    setStatus(`No se pudo traducir la cabecera: ${error.message}`, "danger");
  } finally {
    button.disabled = false;
    button.textContent = "Traducir cabecera de noticias";
  }
}

async function translateNewsItem(index, button) {
  const item = data.settings.news?.[index];
  const source = item?.languages?.es || {};
  if (!source.title && !source.text) {
    setStatus("Escribe primero la noticia en castellano.", "danger");
    return;
  }
  try {
    button.disabled = true;
    button.textContent = "Traduciendo...";
    const [euTitle, euText, enTitle, enText] = await Promise.all([
      translateText(source.title, "eu"),
      translateText(source.text, "eu"),
      translateText(source.title, "en"),
      translateText(source.text, "en")
    ]);
    item.languages.eu = { title: euTitle || source.title, text: euText || source.text };
    item.languages.en = { title: enTitle || source.title, text: enText || source.text };
    markDirty();
    setStatus("Noticia traducida. Revisa y guarda antes de publicar.", "warning");
    renderNews();
  } catch (error) {
    setStatus(`No se pudo traducir la noticia: ${error.message}`, "danger");
  } finally {
    button.disabled = false;
    button.textContent = "Traducir esta noticia a EU/EN";
  }
}

function addNews() {
  if (!data.settings.news) data.settings.news = [];
  const today = new Date();
  const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  data.settings.news.push({
    enabled: true,
    date,
    color: "#1f6fa9",
    image: "",
    url: "",
    languages: {
      es: { title: "Nueva noticia", text: "Texto de la noticia." },
      eu: { title: "Albiste berria", text: "Albistearen testua." },
      en: { title: "New update", text: "News text." }
    }
  });
  currentNewsIndex = data.settings.news.length - 1;
  markDirty();
  renderNews();
}

function removeNews(index) {
  if (!confirm("¿Eliminar esta noticia?")) return;
  data.settings.news.splice(index, 1);
  if (currentNewsIndex === index) currentNewsIndex = null;
  if (currentNewsIndex !== null && currentNewsIndex > index) currentNewsIndex -= 1;
  markDirty();
  renderNews();
}

function testimonialInboxConfig() {
  const config = data.settings.testimonialInbox || {};
  return {
    enabled: config.enabled === true || config.enabled === "true",
    supabaseUrl: String(config.supabaseUrl || "").replace(/\/+$/, ""),
    anonKey: String(config.anonKey || "").trim(),
    table: config.table || "skbc_testimonials"
  };
}

function orderInboxConfig() {
  const testimonialConfig = testimonialInboxConfig();
  const config = data.settings.orderInbox || {};
  return {
    enabled: config.enabled === true || config.enabled === "true",
    supabaseUrl: String(config.supabaseUrl || testimonialConfig.supabaseUrl || "").replace(/\/+$/, ""),
    anonKey: String(config.anonKey || testimonialConfig.anonKey || "").trim(),
    table: config.table || "skbc_merch_orders",
    emailWebhookUrl: String(config.emailWebhookUrl || "").trim()
  };
}

function leadInboxConfig() {
  const testimonialConfig = testimonialInboxConfig();
  const config = data.settings.leadInbox || {};
  return {
    enabled: config.enabled === true || config.enabled === "true",
    supabaseUrl: String(config.supabaseUrl || testimonialConfig.supabaseUrl || "").replace(/\/+$/, ""),
    anonKey: String(config.anonKey || testimonialConfig.anonKey || "").trim(),
    table: config.table || "skbc_leads"
  };
}

function supabaseSession() {
  try {
    return JSON.parse(localStorage.getItem(SUPABASE_SESSION_KEY) || "null");
  } catch {
    return null;
  }
}

function supabaseHeaders(session = supabaseSession(), config = testimonialInboxConfig()) {
  const token = session?.access_token || config.anonKey;
  return {
    apikey: config.anonKey,
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json"
  };
}

function friendlySupabaseError(result, fallback = "No se pudo completar la operación.") {
  const raw = String(result?.message || result?.msg || result?.error_description || result?.error || fallback);
  if (/jwt expired|invalid jwt|jwt/i.test(raw)) {
    localStorage.removeItem(SUPABASE_SESSION_KEY);
    return "La sesión privada de Supabase ha caducado. Vuelve a iniciar sesión y pulsa cargar de nuevo.";
  }
  return raw;
}

function renderTestimonialsInbox() {
  const editor = document.querySelector("#editor");
  const config = testimonialInboxConfig();
  const session = supabaseSession();
  editor.innerHTML = `
    ${renderIntro(`<div class="intro-actions">
      <button id="load-testimonials" class="primary" type="button">Cargar pendientes</button>
      <button id="logout-supabase" type="button">Cerrar sesión Supabase</button>
    </div>`)}
    ${groupTemplate({
      title: "Conexión Supabase",
      help: "Para recibir testimonios sin WhatsApp, crea la tabla indicada en Supabase y pega aquí URL y anon key.",
      fields: [
        ["Buzón activo", ["settings", "testimonialInbox", "enabled"], "booleanText"],
        ["Supabase URL", ["settings", "testimonialInbox", "supabaseUrl"], "input"],
        ["Supabase anon key", ["settings", "testimonialInbox", "anonKey"], "textarea"],
        ["Tabla", ["settings", "testimonialInbox", "table"], "input"]
      ]
    })}
    <article class="editor-group">
      <header>
        <div>
          <h3>Acceso privado a pendientes</h3>
          <p>Usa un usuario creado en Supabase Auth. La web pública solo inserta; el admin lee y modera tras iniciar sesión.</p>
        </div>
      </header>
      <div class="field-grid">
        <label class="field"><span>Email Supabase</span><input id="supabase-email" value="${escapeHtml(session?.user?.email || "")}" /></label>
        <label class="field"><span>Contraseña Supabase</span><input id="supabase-password" type="password" /></label>
        <button id="login-supabase" class="primary" type="button">${session ? "Sesión activa: renovar" : "Iniciar sesión"}</button>
      </div>
    </article>
    <article class="editor-group">
      <header>
        <div>
          <h3>Testimonios pendientes</h3>
          <p id="testimonial-inbox-status">${config.enabled ? "Pulsa Cargar pendientes." : "Activa y configura Supabase primero."}</p>
        </div>
      </header>
      <div id="testimonial-inbox-list" class="testimonial-inbox-list"></div>
    </article>
    <article class="editor-group">
      <header>
        <div>
          <h3>Testimonios publicados en la web</h3>
          <p>Estos son los testimonios ya aprobados y visibles. Puedes retirarlos de la web y después publicar en GitHub.</p>
        </div>
      </header>
      <div id="approved-testimonial-list" class="testimonial-inbox-list">
        ${approvedTestimonialsTemplate()}
      </div>
    </article>
  `;
  bindFields(editor);
  document.querySelector("#login-supabase").addEventListener("click", loginSupabase);
  document.querySelector("#load-testimonials").addEventListener("click", loadPendingTestimonials);
  document.querySelectorAll("[data-remove-approved-testimonial]").forEach((button) => {
    button.addEventListener("click", () => removeApprovedTestimonial(Number(button.dataset.removeApprovedTestimonial)));
  });
  document.querySelector("#logout-supabase").addEventListener("click", () => {
    localStorage.removeItem(SUPABASE_SESSION_KEY);
    setStatus("Sesión de Supabase cerrada.", "ok");
    renderTestimonialsInbox();
  });
}

function approvedTestimonialsTemplate() {
  const items = data.languages?.es?.testimonials?.items || [];
  if (!items.length) return `<p class="empty-note">No hay testimonios publicados.</p>`;
  return items.map((item, index) => approvedTestimonialTemplate(item, index)).join("");
}

function approvedTestimonialTemplate(item, index) {
  const [role, message, name, image, rating] = item;
  const ratingNumber = Number(rating);
  const stars = Number.isFinite(ratingNumber) && ratingNumber > 0 ? `${"★".repeat(Math.min(5, Math.round(ratingNumber)))}${"☆".repeat(5 - Math.min(5, Math.round(ratingNumber)))}` : "";
  return `<article class="pending-testimonial approved-testimonial">
    <span>${escapeHtml(role || "Testimonio publicado")}</span>
    <h3>${escapeHtml(name || "Sin nombre")}</h3>
    ${stars ? `<strong class="pending-testimonial__stars">${stars}</strong>` : ""}
    ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name || "Testimonio")}" />` : ""}
    <p>${escapeHtml(message || "")}</p>
    <div>
      <button class="danger" type="button" data-remove-approved-testimonial="${index}">Quitar de la web</button>
    </div>
  </article>`;
}

function removeApprovedTestimonial(index) {
  if (!Number.isInteger(index)) return;
  if (!confirm("¿Quitar este testimonio aprobado de la web? No se borrará el histórico de Supabase, solo dejará de mostrarse al publicar.")) return;
  ["es", "eu", "en"].forEach((lang) => {
    const items = data.languages?.[lang]?.testimonials?.items;
    if (Array.isArray(items) && index >= 0 && index < items.length) {
      items.splice(index, 1);
    }
  });
  markDirty();
  setStatus("Testimonio retirado del contenido. Pulsa Publicar en GitHub para que desaparezca de la web.", "warning");
  renderTestimonialsInbox();
}

async function loginSupabase() {
  const config = testimonialInboxConfig();
  const email = document.querySelector("#supabase-email")?.value.trim();
  const password = document.querySelector("#supabase-password")?.value;
  if (!config.supabaseUrl || !config.anonKey || !email || !password) {
    setStatus("Configura Supabase URL, anon key, email y contraseña.", "danger");
    return;
  }
  const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });
  const result = await response.json();
  if (!response.ok) {
    setStatus(`No se pudo iniciar sesión: ${result.error_description || result.msg || "error"}`, "danger");
    return;
  }
  localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify(result));
  setStatus("Sesión de Supabase iniciada.", "ok");
  renderTestimonialsInbox();
}

async function loadPendingTestimonials() {
  const config = testimonialInboxConfig();
  const list = document.querySelector("#testimonial-inbox-list");
  const status = document.querySelector("#testimonial-inbox-status");
  if (!config.enabled || !config.supabaseUrl || !config.anonKey) {
    setStatus("Configura y activa Supabase primero.", "danger");
    return;
  }
  if (!supabaseSession()?.access_token) {
    setStatus("Inicia sesión en Supabase para ver pendientes.", "danger");
    return;
  }
  status.textContent = "Cargando pendientes...";
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${config.table}?status=eq.pending&select=*&order=created_at.desc`, {
    headers: supabaseHeaders()
  });
  const items = await response.json();
  if (!response.ok) {
    const message = friendlySupabaseError(items, "No se pudieron cargar testimonios.");
    status.textContent = message;
    setStatus(message, "danger");
    return;
  }
  status.textContent = items.length ? `${items.length} testimonio(s) pendiente(s).` : "No hay testimonios pendientes.";
  list.innerHTML = items.length ? items.map(testimonialPendingTemplate).join("") : `<p class="empty-note">No hay testimonios pendientes.</p>`;
  list.querySelectorAll("[data-approve-testimonial]").forEach((button) => {
    button.addEventListener("click", () => approvePendingTestimonial(JSON.parse(decodeURIComponent(button.dataset.approveTestimonial))));
  });
  list.querySelectorAll("[data-reject-testimonial]").forEach((button) => {
    button.addEventListener("click", () => rejectPendingTestimonial(button.dataset.rejectTestimonial));
  });
}

function testimonialPendingTemplate(item) {
  const rating = Number(item.rating);
  const stars = Number.isFinite(rating) && rating > 0 ? `${"★".repeat(Math.min(5, Math.round(rating)))}${"☆".repeat(5 - Math.min(5, Math.round(rating)))}` : "";
  return `<article class="pending-testimonial">
    <span>${escapeHtml(item.role || "")} · ${escapeHtml(item.page_lang || "es")}</span>
    <h3>${escapeHtml(item.name || "Sin nombre")}</h3>
    ${stars ? `<strong class="pending-testimonial__stars">${stars}</strong>` : ""}
    ${item.photo_url ? `<img src="${escapeHtml(item.photo_url)}" alt="${escapeHtml(item.name || "Testimonio")}" />` : ""}
    <p>${escapeHtml(item.message || "")}</p>
    <div>
      <button class="primary" type="button" data-approve-testimonial="${encodeURIComponent(JSON.stringify(item))}">Aprobar</button>
      <button class="danger" type="button" data-reject-testimonial="${escapeHtml(item.id)}">Descartar</button>
    </div>
  </article>`;
}

async function approvePendingTestimonial(item) {
  const row = [item.role || "Testimonio", item.message || "", item.name || "", item.photo_url || "", item.rating || ""];
  ["es", "eu", "en"].forEach((lang) => {
    if (!data.languages[lang].testimonials.items) data.languages[lang].testimonials.items = [];
    data.languages[lang].testimonials.items.push(row);
  });
  await updatePendingTestimonialStatus(item.id, "approved");
  markDirty();
  setStatus("Testimonio aprobado. Ahora falta Publicar en GitHub para verlo en la web.", "warning");
  loadPendingTestimonials();
}

async function rejectPendingTestimonial(id) {
  if (!confirm("¿Descartar este testimonio?")) return;
  await updatePendingTestimonialStatus(id, "rejected");
  setStatus("Testimonio descartado.", "ok");
  loadPendingTestimonials();
}

async function updatePendingTestimonialStatus(id, status) {
  const config = testimonialInboxConfig();
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${config.table}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...supabaseHeaders(), Prefer: "return=minimal" },
    body: JSON.stringify({ status, reviewed_at: new Date().toISOString() })
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(friendlySupabaseError(result, "No se pudo actualizar el testimonio"));
  }
}

function renderLeads() {
  const editor = document.querySelector("#editor");
  const config = leadInboxConfig();
  const session = supabaseSession();
  editor.innerHTML = `
    ${renderIntro(`<div class="intro-actions">
      <button id="load-leads" class="primary" type="button">Cargar contactos</button>
      <button id="delete-closed-leads" type="button">Limpiar cerrados</button>
      <button id="logout-supabase" type="button">Cerrar sesión Supabase</button>
    </div>`)}
    ${groupTemplate({
      title: "Conexión contactos",
      help: "La web guardará aquí los formularios de contacto/prueba gratis antes de abrir WhatsApp.",
      fields: [
        ["Contactos activos", ["settings", "leadInbox", "enabled"], "booleanText"],
        ["Supabase URL", ["settings", "leadInbox", "supabaseUrl"], "input"],
        ["Supabase anon key", ["settings", "leadInbox", "anonKey"], "textarea"],
        ["Tabla contactos", ["settings", "leadInbox", "table"], "input"]
      ]
    })}
    <article class="editor-group">
      <header>
        <div>
          <h3>Acceso privado</h3>
          <p>Usa tu usuario de Supabase Auth. El admin lee y gestiona; la web pública solo inserta contactos.</p>
        </div>
      </header>
      <div class="field-grid">
        <label class="field"><span>Email Supabase</span><input id="leads-supabase-email" value="${escapeHtml(session?.user?.email || "")}" /></label>
        <label class="field"><span>Contraseña Supabase</span><input id="leads-supabase-password" type="password" /></label>
        <button id="leads-login-supabase" class="primary" type="button">${session ? "Sesión activa: renovar" : "Iniciar sesión"}</button>
      </div>
    </article>
    <article class="editor-group">
      <header>
        <div>
          <h3>Seguimiento de contactos</h3>
          <p id="lead-inbox-status">${config.enabled ? "Pulsa Cargar contactos." : "Activa y configura Supabase primero."}</p>
        </div>
      </header>
      <div id="lead-inbox-list" class="lead-inbox-list"></div>
    </article>
  `;
  bindFields(editor);
  document.querySelector("#leads-login-supabase").addEventListener("click", loginLeadsSupabase);
  document.querySelector("#load-leads").addEventListener("click", loadLeads);
  document.querySelector("#delete-closed-leads").addEventListener("click", deleteClosedLeads);
  document.querySelector("#logout-supabase").addEventListener("click", () => {
    localStorage.removeItem(SUPABASE_SESSION_KEY);
    setStatus("Sesión de Supabase cerrada.", "ok");
    renderLeads();
  });
}

async function loginLeadsSupabase() {
  const config = leadInboxConfig();
  const email = document.querySelector("#leads-supabase-email")?.value.trim();
  const password = document.querySelector("#leads-supabase-password")?.value;
  if (!config.supabaseUrl || !config.anonKey || !email || !password) {
    setStatus("Configura Supabase URL, anon key, email y contraseña.", "danger");
    return;
  }
  const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: { apikey: config.anonKey, "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const result = await response.json();
  if (!response.ok) {
    setStatus(`No se pudo iniciar sesión: ${result.error_description || result.msg || "error"}`, "danger");
    return;
  }
  localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify(result));
  setStatus("Sesión de Supabase iniciada.", "ok");
  renderLeads();
}

async function loadLeads() {
  const config = leadInboxConfig();
  const list = document.querySelector("#lead-inbox-list");
  const status = document.querySelector("#lead-inbox-status");
  if (!config.enabled || !config.supabaseUrl || !config.anonKey) {
    setStatus("Configura y activa Supabase primero.", "danger");
    return;
  }
  if (!supabaseSession()?.access_token) {
    setStatus("Inicia sesión en Supabase para ver contactos.", "danger");
    return;
  }
  status.textContent = "Cargando contactos...";
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${config.table}?select=*&order=created_at.desc&limit=100`, {
    headers: supabaseHeaders(undefined, config)
  });
  const items = await response.json();
  if (!response.ok) {
    const message = friendlySupabaseError(items, "No se pudieron cargar contactos.");
    status.textContent = message;
    setStatus(message, "danger");
    return;
  }
  status.textContent = items.length ? `${items.length} contacto(s).` : "No hay contactos registrados.";
  list.innerHTML = items.length ? items.map(leadTemplate).join("") : `<p class="empty-note">No hay contactos registrados.</p>`;
  list.querySelectorAll("[data-lead-status]").forEach((select) => {
    select.addEventListener("change", () => updateLeadStatus(select.dataset.leadStatus, select.value));
  });
  list.querySelectorAll("[data-delete-lead]").forEach((button) => {
    button.addEventListener("click", () => deleteLead(button.dataset.deleteLead));
  });
}

function leadTemplate(lead) {
  const phone = String(lead.phone || "").replace(/\D/g, "");
  const whatsappUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(`Hola ${lead.name || ""}, soy Álvaro de SKBC GIPUZKOA. Te escribo por tu consulta sobre ${lead.interest || "Shorinji Kempo"}.`)}` : "";
  const emailUrl = lead.email ? `mailto:${lead.email}?subject=${encodeURIComponent("SKBC GIPUZKOA - consulta recibida")}` : "";
  return `<article class="lead-card" data-status="${escapeHtml(lead.status || "new")}">
    <header>
      <div>
        <span>${escapeHtml(lead.created_at ? String(lead.created_at).slice(0, 10) : "Sin fecha")} · ${escapeHtml(lead.page_lang || "es")}</span>
        <h3>${escapeHtml(lead.name || "Sin nombre")}</h3>
      </div>
      <select data-lead-status="${escapeHtml(lead.id)}">
        ${["new", "contacted", "trial_scheduled", "enrolled", "discarded"].map((status) => `<option value="${status}" ${status === lead.status ? "selected" : ""}>${status}</option>`).join("")}
      </select>
    </header>
    <p><strong>${escapeHtml(lead.interest || "Sin interés")}</strong></p>
    <p>${escapeHtml(lead.message || "")}</p>
    <div class="lead-meta">
      ${lead.phone ? `<span>${escapeHtml(lead.phone)}</span>` : ""}
      ${lead.email ? `<span>${escapeHtml(lead.email)}</span>` : ""}
      ${lead.source ? `<span>${escapeHtml(lead.source)}</span>` : ""}
    </div>
    <div class="lead-actions">
      ${whatsappUrl ? `<a class="button-like" href="${whatsappUrl}" target="_blank" rel="noreferrer">WhatsApp</a>` : ""}
      ${emailUrl ? `<a class="button-like" href="${emailUrl}">Email</a>` : ""}
      <button class="danger" type="button" data-delete-lead="${escapeHtml(lead.id)}">Eliminar</button>
    </div>
  </article>`;
}

async function updateLeadStatus(id, status) {
  const config = leadInboxConfig();
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${config.table}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...supabaseHeaders(undefined, config), Prefer: "return=minimal" },
    body: JSON.stringify({ status, updated_at: new Date().toISOString() })
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    setStatus(friendlySupabaseError(result, "No se pudo actualizar contacto."), "danger");
    return;
  }
  setStatus("Contacto actualizado.", "ok");
}

async function deleteLead(id) {
  if (!confirm("¿Eliminar este contacto?")) return;
  const config = leadInboxConfig();
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${config.table}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...supabaseHeaders(undefined, config), Prefer: "return=minimal" }
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    setStatus(friendlySupabaseError(result, "No se pudo eliminar contacto."), "danger");
    return;
  }
  setStatus("Contacto eliminado.", "ok");
  loadLeads();
}

async function deleteClosedLeads() {
  if (!confirm("¿Eliminar contactos descartados e inscritos?")) return;
  const config = leadInboxConfig();
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${config.table}?status=in.(discarded,enrolled)`, {
    method: "DELETE",
    headers: { ...supabaseHeaders(undefined, config), Prefer: "return=minimal" }
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    setStatus(friendlySupabaseError(result, "No se pudieron limpiar contactos."), "danger");
    return;
  }
  setStatus("Contactos cerrados eliminados.", "ok");
  loadLeads();
}

function renderOrders() {
  const editor = document.querySelector("#editor");
  const config = orderInboxConfig();
  const session = supabaseSession();
  editor.innerHTML = `
    ${renderIntro(`<div class="intro-actions">
      <button id="load-orders" class="primary" type="button">Cargar pedidos</button>
      <button id="logout-supabase" type="button">Cerrar sesión Supabase</button>
    </div>`)}
    ${groupTemplate({
      title: "Conexión pedidos",
      help: "Usa la misma sesión privada de Supabase. Si quieres email automático, pega aquí una URL de webhook o Edge Function.",
      fields: [
        ["Pedidos activos", ["settings", "orderInbox", "enabled"], "booleanText"],
        ["Supabase URL", ["settings", "orderInbox", "supabaseUrl"], "input"],
        ["Supabase anon key", ["settings", "orderInbox", "anonKey"], "textarea"],
        ["Tabla pedidos", ["settings", "orderInbox", "table"], "input"],
        ["Webhook email", ["settings", "orderInbox", "emailWebhookUrl"], "input"]
      ]
    })}
    <article class="editor-group">
      <header>
        <div>
          <h3>Acceso privado a pedidos</h3>
          <p>Inicia sesión con tu usuario de Supabase para leer y actualizar pedidos.</p>
        </div>
      </header>
      <div class="field-grid">
        <label class="field"><span>Email Supabase</span><input id="orders-supabase-email" value="${escapeHtml(session?.user?.email || "")}" /></label>
        <label class="field"><span>Contraseña Supabase</span><input id="orders-supabase-password" type="password" /></label>
        <button id="orders-login-supabase" class="primary" type="button">${session ? "Sesión activa: renovar" : "Iniciar sesión"}</button>
      </div>
    </article>
    <article class="editor-group">
      <header>
        <div>
          <h3>Pedidos recibidos</h3>
          <p id="orders-status">${config.enabled ? "Pulsa Cargar pedidos. Puedes borrar pedidos antiguos o ya cerrados para mantener limpia la lista." : "Activa y configura Supabase primero."}</p>
        </div>
      </header>
      <div class="intro-actions">
        <button id="delete-closed-orders" class="danger" type="button">Borrar cerrados/cancelados</button>
      </div>
      <div id="orders-list" class="testimonial-inbox-list orders-list"></div>
    </article>
  `;
  bindFields(editor);
  document.querySelector("#orders-login-supabase").addEventListener("click", loginOrdersSupabase);
  document.querySelector("#load-orders").addEventListener("click", loadOrders);
  document.querySelector("#delete-closed-orders").addEventListener("click", deleteClosedOrders);
  document.querySelector("#logout-supabase").addEventListener("click", () => {
    localStorage.removeItem(SUPABASE_SESSION_KEY);
    setStatus("Sesión de Supabase cerrada.", "ok");
    renderOrders();
  });
}

async function loginOrdersSupabase() {
  const config = orderInboxConfig();
  const email = document.querySelector("#orders-supabase-email")?.value.trim();
  const password = document.querySelector("#orders-supabase-password")?.value;
  if (!config.supabaseUrl || !config.anonKey || !email || !password) {
    setStatus("Configura Supabase URL, anon key, email y contraseña.", "danger");
    return;
  }
  const response = await fetch(`${config.supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ email, password })
  });
  const result = await response.json();
  if (!response.ok) {
    setStatus(`No se pudo iniciar sesión: ${result.error_description || result.msg || "error"}`, "danger");
    return;
  }
  localStorage.setItem(SUPABASE_SESSION_KEY, JSON.stringify(result));
  setStatus("Sesión de Supabase iniciada.", "ok");
  renderOrders();
}

async function loadOrders() {
  const config = orderInboxConfig();
  const list = document.querySelector("#orders-list");
  const status = document.querySelector("#orders-status");
  if (!config.enabled || !config.supabaseUrl || !config.anonKey) {
    setStatus("Configura y activa pedidos con Supabase primero.", "danger");
    return;
  }
  if (!supabaseSession()?.access_token) {
    setStatus("Inicia sesión en Supabase para ver pedidos.", "danger");
    return;
  }
  status.textContent = "Cargando pedidos...";
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${config.table}?select=*&order=created_at.desc&limit=50`, {
    headers: supabaseHeaders(undefined, config)
  });
  const items = await response.json();
  if (!response.ok) {
    const message = friendlySupabaseError(items, "No se pudieron cargar pedidos.");
    status.textContent = message;
    setStatus(message, "danger");
    return;
  }
  status.textContent = items.length ? `${items.length} pedido(s) recibido(s).` : "No hay pedidos.";
  list.innerHTML = items.length ? items.map(orderTemplate).join("") : `<p class="empty-note">No hay pedidos.</p>`;
  list.querySelectorAll("[data-order-status]").forEach((select) => {
    select.addEventListener("change", () => updateOrderStatus(select.dataset.orderStatus, select.value));
  });
  list.querySelectorAll("[data-delete-order]").forEach((button) => {
    button.addEventListener("click", () => deleteOrder(button.dataset.deleteOrder, button.dataset.orderLabel || ""));
  });
}

function orderTemplate(order) {
  const items = Array.isArray(order.items) ? order.items : [];
  const phone = String(order.customer_phone || "").replace(/\D/g, "");
  const whatsappText = [
    "Hola, te escribimos por tu pedido de merchandising de SKBC GIPUZKOA.",
    "",
    `Pedido: ${order.id || ""}`
  ].join("\n");
  const whatsappUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(whatsappText)}` : "";
  return `<article class="pending-testimonial order-card">
    <span>${escapeHtml(order.status || "pending")} · ${escapeHtml(new Date(order.created_at || Date.now()).toLocaleString("es-ES"))}</span>
    <h3>${escapeHtml(order.customer_name || "Sin nombre")}</h3>
    <p><strong>Teléfono:</strong> ${escapeHtml(order.customer_phone || "")}</p>
    <p><strong>Email:</strong> ${escapeHtml(order.customer_email || "No indicado")}</p>
    <p><strong>Pago:</strong> ${escapeHtml(order.payment_method || "")}</p>
    <p><strong>Total:</strong> ${escapeHtml(String(order.total_estimated || 0))} €</p>
    ${items.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item.name || "")} · ${escapeHtml(item.size || "")} · ${escapeHtml(item.color || "")} · x${escapeHtml(item.quantity || 1)}</li>`).join("")}</ul>` : ""}
    ${order.custom_reference ? `<p><strong>JHK:</strong> ${escapeHtml(order.custom_reference)}</p>` : ""}
    ${order.custom_details ? `<p><strong>Detalles:</strong> ${escapeHtml(order.custom_details)}</p>` : ""}
    ${order.comments ? `<p><strong>Comentarios:</strong> ${escapeHtml(order.comments)}</p>` : ""}
    <div>
      <select data-order-status="${escapeHtml(order.id)}">
        ${["pending", "seen", "contacted", "payment_pending", "paid", "delivered", "cancelled"].map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${status}</option>`).join("")}
      </select>
      ${whatsappUrl ? `<a class="button-like" href="${whatsappUrl}" target="_blank" rel="noreferrer">WhatsApp cliente</a>` : ""}
      <button class="danger" type="button" data-delete-order="${escapeHtml(order.id)}" data-order-label="${escapeHtml(order.customer_name || order.id || "pedido")}">Eliminar pedido</button>
    </div>
  </article>`;
}

async function updateOrderStatus(id, status) {
  const config = orderInboxConfig();
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${config.table}?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { ...supabaseHeaders(undefined, config), Prefer: "return=minimal" },
    body: JSON.stringify({ status, updated_at: new Date().toISOString() })
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    setStatus(result.message || "No se pudo actualizar el pedido.", "danger");
    return;
  }
  setStatus("Estado del pedido actualizado.", "ok");
}

async function deleteOrder(id, label) {
  if (!id) return;
  const confirmed = window.confirm(`¿Eliminar definitivamente el pedido de ${label || id}?\n\nEsta acción lo borra de Supabase y no se puede deshacer.`);
  if (!confirmed) return;
  const config = orderInboxConfig();
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${config.table}?id=eq.${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers: { ...supabaseHeaders(undefined, config), Prefer: "return=minimal" }
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    setStatus(result.message || "No se pudo eliminar el pedido.", "danger");
    return;
  }
  setStatus("Pedido eliminado.", "ok");
  loadOrders();
}

async function deleteClosedOrders() {
  const confirmed = window.confirm("¿Borrar todos los pedidos cerrados, entregados o cancelados?\n\nSe eliminarán los pedidos con estado paid, delivered o cancelled. Los pendientes se conservan.");
  if (!confirmed) return;
  const config = orderInboxConfig();
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${config.table}?status=in.(paid,delivered,cancelled)`, {
    method: "DELETE",
    headers: { ...supabaseHeaders(undefined, config), Prefer: "return=minimal" }
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    setStatus(result.message || "No se pudieron eliminar los pedidos cerrados.", "danger");
    return;
  }
  setStatus("Pedidos cerrados/cancelados eliminados.", "ok");
  loadOrders();
}

function renderMerch() {
  const editor = document.querySelector("#editor");
  if (!data.settings.merch) data.settings.merch = { enabled: true, products: [] };
  const products = data.settings.merch.products || [];
  const intro = `<div class="intro-actions"><button id="add-merch-product" class="primary" type="button">Añadir producto</button></div>`;
  const general = groupTemplate({
    title: "Configuración de tienda",
    help: "La tienda funciona como reserva: no cobra online. El pedido se envía por WhatsApp para confirmarlo contigo.",
    fields: [
      ["Tienda activa", ["settings", "merch", "enabled"], "booleanText"],
      ["Enlace catálogo JHK", ["settings", "merch", "catalogUrl"], "input"],
      ["Nota de pago/confirmación", ["settings", "merch", "note"], "textarea"]
    ]
  });
  editor.innerHTML = `
    ${renderIntro(intro)}
    ${general}
    ${products.length ? products.map(merchProductTemplate).join("") : `<article class="editor-group"><header><h3>No hay productos</h3><p>Pulsa Añadir producto para crear la tienda.</p></header></article>`}
  `;
  bindFields(editor);
  document.querySelector("#add-merch-product").addEventListener("click", addMerchProduct);
  editor.querySelectorAll("[data-remove-merch-product]").forEach((button) => {
    button.addEventListener("click", () => removeMerchProduct(Number(button.dataset.removeMerchProduct)));
  });
}

function merchProductTemplate(product, index) {
  const base = ["settings", "merch", "products", index];
  const groups = [{
    title: `Producto ${index + 1}: ${product.name || "Sin nombre"}`,
    help: "Usa la referencia JHK real cuando la tengas. Colores: CODIGO | Nombre | #hex. Tallas: una talla por línea.",
    fields: [
      ["Activo", [...base, "enabled"], "booleanText"],
      ["Nombre visible", [...base, "name"], "input"],
      ["Nombre prenda JHK", [...base, "jhkName"], "input"],
      ["Referencia JHK", [...base, "jhkRef"], "input"],
      ["Enlace ficha JHK", [...base, "jhkUrl"], "input"],
      ["Imagen producto", [...base, "image"], "input"],
      ["Precio SKBC", [...base, "price"], "input"],
      ["Personalización", [...base, "personalization"], "input"],
      ["Tallas disponibles", [...base, "sizes"], "array"],
      ["Colores JHK", [...base, "colors"], "colorList"]
    ]
  }];
  return `<div class="custom-card">${groups.map(groupTemplate).join("")}<button class="danger" data-remove-merch-product="${index}" type="button">Eliminar este producto</button></div>`;
}

function addMerchProduct() {
  if (!data.settings.merch) data.settings.merch = { enabled: true, products: [] };
  if (!data.settings.merch.products) data.settings.merch.products = [];
  data.settings.merch.products.push({
    enabled: true,
    name: "Nuevo producto SKBC",
    jhkName: "Prenda base JHK",
    jhkRef: "REF pendiente",
    jhkUrl: data.settings.merch.catalogUrl || "https://www.jhktshirt.com/es/",
    image: "assets/logo-skbc.png",
    price: "0",
    personalization: "Personalización SKBC",
    sizes: ["S", "M", "L", "XL"],
    colors: [
      { code: "WH", name: "Blanco", hex: "#ffffff" },
      { code: "BK", name: "Negro", hex: "#111111" }
    ]
  });
  markDirty();
  renderMerch();
}

function removeMerchProduct(index) {
  if (!confirm("¿Eliminar este producto de la tienda?")) return;
  data.settings.merch.products.splice(index, 1);
  markDirty();
  renderMerch();
}

function customSectionTemplate(section, index) {
  const base = ["settings", "customSections", index];
  const groups = [
    {
      title: `Ãrea ${index + 1}`,
      help: "Puedes activarla, cambiar estilo, imagen, enlace y traducir sus textos.",
      fields: [
        ["Activa: true o false", [...base, "enabled"], "booleanText"],
        ["Estilo: normal, soft o dark", [...base, "style"], "sectionStyle"],
        ["Imagen de fondo/lateral", [...base, "image"], "input"],
        ["URL del botÃ³n", [...base, "url"], "input"],
        ["ES etiqueta", [...base, "languages", "es", "eyebrow"], "input"],
        ["ES tÃ­tulo", [...base, "languages", "es", "title"], "input"],
        ["ES texto", [...base, "languages", "es", "text"], "textarea"],
        ["ES botÃ³n", [...base, "languages", "es", "button"], "input"],
        ["EU etiqueta", [...base, "languages", "eu", "eyebrow"], "input"],
        ["EU tÃ­tulo", [...base, "languages", "eu", "title"], "input"],
        ["EU texto", [...base, "languages", "eu", "text"], "textarea"],
        ["EU botÃ³n", [...base, "languages", "eu", "button"], "input"],
        ["EN etiqueta", [...base, "languages", "en", "eyebrow"], "input"],
        ["EN tÃ­tulo", [...base, "languages", "en", "title"], "input"],
        ["EN texto", [...base, "languages", "en", "text"], "textarea"],
        ["EN botÃ³n", [...base, "languages", "en", "button"], "input"]
      ]
    }
  ];
  return `<div class="custom-card">${groups.map(groupTemplate).join("")}<button class="danger" data-remove-section="${index}" type="button">Eliminar esta Ã¡rea</button></div>`;
}

function addCustomSection() {
  if (!data.settings.customSections) data.settings.customSections = [];
  data.settings.customSections.push({
    enabled: true,
    style: "soft",
    image: "",
    url: "",
    languages: {
      es: { eyebrow: "Nueva Ã¡rea", title: "TÃ­tulo de la nueva Ã¡rea", text: "Escribe aquÃ­ el contenido.", button: "" },
      eu: { eyebrow: "Atal berria", title: "Atal berriaren izenburua", text: "Idatzi hemen edukia.", button: "" },
      en: { eyebrow: "New area", title: "New area title", text: "Write the content here.", button: "" }
    }
  });
  markDirty();
  renderCustom();
}

function removeCustomSection(index) {
  if (!confirm("Â¿Eliminar esta Ã¡rea nueva?")) return;
  data.settings.customSections.splice(index, 1);
  markDirty();
  renderCustom();
}

function renderAdvanced() {
  const editor = document.querySelector("#editor");
  editor.innerHTML = `
    ${renderIntro(`<p class="advanced-warning">AquÃ­ puedes editar absolutamente todo. Antes de tocarlo, usa Exportar copia.</p>`)}
    <article class="editor-group">
      <header>
        <h3>Contenido completo</h3>
        <p>Formato JSON. Si hay una coma mal puesta, no se aplicarÃ¡ el cambio.</p>
      </header>
      <div class="advanced-editor">
        <textarea id="json-editor" spellcheck="false">${escapeHtml(JSON.stringify(data, null, 2))}</textarea>
        <button id="apply-json" class="primary" type="button">Aplicar JSON</button>
      </div>
    </article>
  `;
  document.querySelector("#apply-json").addEventListener("click", () => {
    try {
      data = deepMerge(cloneDefault(), JSON.parse(document.querySelector("#json-editor").value));
      markDirty();
      setStatus("JSON aplicado. Falta guardar cambios.", "warning");
    } catch (error) {
      setStatus(`JSON no vÃ¡lido: ${error.message}`, "danger");
    }
  });
}

function bindFields(root) {
  root.querySelectorAll("[data-path]").forEach((field) => {
    const update = () => {
      const path = JSON.parse(decodeURIComponent(field.dataset.path));
      setByPath(data, path, parseFieldValue(field.value, field.dataset.type));
      markDirty();
    };
    const refreshIfNeeded = () => {
      const path = JSON.parse(decodeURIComponent(field.dataset.path));
      if (shouldRefreshEventEditor(path)) setTimeout(renderEvents, 0);
    };
    field.addEventListener("input", update);
    field.addEventListener("change", () => {
      update();
      refreshIfNeeded();
    });
  });
  root.querySelectorAll("[data-upload-path]").forEach((button) => {
    button.addEventListener("click", () => uploadImageForPath(button));
  });
  bindGalleryImages(root);
  bindSpecialVisualSchedules(root);
}

function bindGalleryImages(root) {
  root.querySelectorAll(".gallery-admin").forEach((gallery) => {
    const hidden = gallery.querySelector("[data-path]");
    const grid = gallery.querySelector(".gallery-admin-grid");
    const path = JSON.parse(decodeURIComponent(gallery.dataset.galleryPath));
    const getItems = () => Array.from(grid.querySelectorAll(".gallery-admin-item input"))
      .map((input) => input.value.trim())
      .filter(Boolean);
    const renderItems = (items) => {
      grid.innerHTML = items.map((image, index) => galleryImageItemTemplate(image, index)).join("");
    };
    const sync = () => {
      const items = getItems();
      hidden.value = items.join("\n");
      setByPath(data, path, items);
      markDirty();
    };
    grid.addEventListener("input", (event) => {
      const input = event.target.closest(".gallery-admin-item input");
      if (!input) return;
      input.closest(".gallery-admin-item").querySelector(".gallery-admin-thumb").style.backgroundImage = `url('${input.value.trim()}')`;
      sync();
    });
    grid.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-gallery-action]");
      if (!button) return;
      const item = button.closest(".gallery-admin-item");
      const index = Number(item.dataset.galleryIndex);
      const items = getItems();
      if (button.dataset.galleryAction === "remove") {
        items.splice(index, 1);
        renderItems(items);
        sync();
        return;
      }
      if (button.dataset.galleryAction === "up" && index > 0) {
        [items[index - 1], items[index]] = [items[index], items[index - 1]];
        renderItems(items);
        sync();
        return;
      }
      if (button.dataset.galleryAction === "down" && index < items.length - 1) {
        [items[index + 1], items[index]] = [items[index], items[index + 1]];
        renderItems(items);
        sync();
        return;
      }
      if (button.dataset.galleryAction === "upload") {
        const uploaded = await chooseAndUploadGalleryImage(button);
        if (!uploaded) return;
        items[index] = uploaded;
        renderItems(items);
        sync();
      }
    });
    gallery.querySelector(".add-gallery-image")?.addEventListener("click", async () => {
      const uploaded = await chooseAndUploadGalleryImage(gallery.querySelector(".add-gallery-image"));
      if (!uploaded) return;
      const items = getItems();
      items.push(uploaded);
      renderItems(items);
      sync();
    });
  });
}

function chooseAndUploadGalleryImage(button) {
  return new Promise((resolveUpload) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/png,image/jpeg,image/webp,image/gif";
    input.addEventListener("change", async () => {
      const [file] = input.files;
      if (!file) {
        resolveUpload("");
        return;
      }
      try {
        button.disabled = true;
        const originalText = button.textContent;
        button.textContent = "Subiendo...";
        const assetPath = await uploadImageFile(file);
        setStatus("Imagen añadida a galería. Falta publicar en GitHub.", "warning");
        resolveUpload(assetPath);
        button.textContent = originalText;
      } catch (error) {
        setStatus(`Error al subir imagen: ${error.message}`, "danger");
        resolveUpload("");
      } finally {
        button.disabled = false;
      }
    });
    input.click();
  });
}

function bindSpecialVisualSchedules(root) {
  root.querySelectorAll(".special-schedule-builder").forEach((builder) => {
    const hidden = builder.querySelector(".special-schedule-raw");
    const rows = builder.querySelector(".special-schedule-rows");
    const sync = () => {
      const value = Array.from(rows.querySelectorAll(".special-schedule-row")).map((row) => {
        const get = (field) => row.querySelector(`[data-schedule-field="${field}"]`)?.value?.trim() || "";
        return `${get("enabled") || "true"} | ${get("mode") || "christmas"} | ${get("intensity") || "medium"} | ${get("start")} | ${get("end")} | ${get("message")}`;
      }).join("\n");
      hidden.value = value;
      hidden.dispatchEvent(new Event("input", { bubbles: true }));
    };
    builder.querySelector(".add-special-schedule")?.addEventListener("click", () => {
      rows.insertAdjacentHTML("beforeend", specialVisualScheduleRow({ enabled: true, mode: "christmas", intensity: "medium" }));
      sync();
    });
    rows.addEventListener("input", sync);
    rows.addEventListener("change", sync);
    rows.addEventListener("click", (event) => {
      const button = event.target.closest(".remove-special-schedule");
      if (!button) return;
      button.closest(".special-schedule-row")?.remove();
      sync();
    });
  });
}

function shouldRefreshEventEditor(path) {
  if (currentPanel !== "events") return false;
  if (path[0] !== "settings" || path[1] !== "events") return false;
  return ["start", "end", "dates", "excludedDates", "enabled"].includes(path.at(-1)) || path.includes("repeat");
}

async function uploadImageForPath(button) {
  const path = JSON.parse(decodeURIComponent(button.dataset.uploadPath));
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/webp,image/gif";
  input.addEventListener("change", async () => {
    const [file] = input.files;
    if (!file) return;
    try {
      button.disabled = true;
      button.textContent = "Subiendo...";
      const assetPath = await uploadImageFile(file);
      setByPath(data, path, assetPath);
      const field = document.querySelector(`[data-path="${button.dataset.uploadPath}"]`);
      if (field) field.value = assetPath;
      markDirty();
      setStatus("Imagen subida. Falta guardar/publicar cambios.", "warning");
    } catch (error) {
      setStatus(`Error al subir imagen: ${error.message}`, "danger");
    } finally {
      button.disabled = false;
      button.textContent = "Subir imagen";
    }
  });
  input.click();
}

async function uploadImageFile(file) {
  const optimized = await optimizeImageForWeb(file);
  const uploadFile = optimized.file;
  const extension = optimized.extension;
  const safeBase = file.name
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42) || "imagen";
  const assetPath = `assets/uploads/${Date.now()}-${safeBase}.${extension}`;
  const content = await fileToBase64(uploadFile);

  if (shouldUseGithubApi()) {
    const token = await githubToken();
    await githubUploadFile(assetPath, content, token);
    return assetPath;
  }

  if (location.protocol === "file:") {
    throw new Error("Abre el editor con ABRIR-EDITOR-Y-PUBLICAR.bat para subir imÃ¡genes.");
  }

  const response = await fetch("/api/upload-image", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path: assetPath, content })
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "No se pudo subir la imagen");
  return result.path;
}

async function optimizeImageForWeb(file) {
  const originalExtension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "jpg";
  if (!file.type.startsWith("image/") || file.type === "image/gif") {
    return { file, extension: originalExtension };
  }
  try {
    const bitmap = await createImageBitmap(file);
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d", { alpha: false });
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await new Promise((resolveBlob) => canvas.toBlob(resolveBlob, "image/webp", 0.82));
    bitmap.close?.();
    if (!blob || blob.size >= file.size) return { file, extension: originalExtension };
    const optimizedName = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return {
      file: new File([blob], optimizedName, { type: "image/webp" }),
      extension: "webp"
    };
  } catch {
    return { file, extension: originalExtension };
  }
}

function fileToBase64(file) {
  return new Promise((resolvePromise, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolvePromise(String(reader.result).split(",")[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

async function githubUploadFile(path, content, token) {
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  await githubRequest(apiUrl, token, {
    method: "PUT",
    body: JSON.stringify({
      message: `Upload image ${path}`,
      branch: GITHUB_BRANCH,
      content
    })
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    currentPanel = tab.dataset.panel;
    render();
  });
});

document.querySelector("#save").addEventListener("click", () => {
  setStatus("Sin guardado local: para guardar de verdad usa Publicar en GitHub. Si cierras sin publicar, se descartan los cambios.", "warning");
});

document.querySelector("#publish").addEventListener("click", async () => {
  if (location.protocol === "file:") {
    setStatus("Para publicar, abre el editor con ABRIR-EDITOR-Y-PUBLICAR.bat", "danger");
    alert("El navegador no puede publicar en GitHub desde file://.\n\nAbre ABRIR-EDITOR-Y-PUBLICAR.bat y usa el editor desde localhost.");
    return;
  }

  if (!confirm("Â¿Guardar estos cambios y publicarlos en GitHub Pages?")) return;

  try {
    setStatus("Publicando en GitHub...", "warning");
    if (shouldUseGithubApi()) {
      const result = await publishWithGithubApi(data);
      dirty = false;
      setStatus(result.message, "ok");
      alert(`${result.message}\n\nURL: ${result.url}`);
      return;
    }

    const response = await fetch("/api/publish", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "No se pudo publicar");
    dirty = false;
    setStatus(result.message || "Publicado en GitHub Pages", "ok");
    alert(`${result.message}\n\nURL: ${result.url}`);
  } catch (error) {
    setStatus(`Error al publicar: ${error.message}`, "danger");
  }
});

async function publishWithGithubApi(contentData) {
  const token = await githubToken();
  const path = "content.js";
  const apiUrl = `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/contents/${path}`;
  const current = await githubRequest(`${apiUrl}?ref=${GITHUB_BRANCH}&ts=${Date.now()}`, token);
  const remote = parseSkbcContentJs(utf8FromBase64(current.content || ""));
  if (contentSignature(remote) !== publishedContentSignature) {
    throw new Error("La web publicada ha cambiado desde que abriste el editor. Recarga el admin antes de publicar para no pisar noticias, testimonios, calendario u otros cambios.");
  }
  await confirmNoPublishedCriticalContentWillDisappear(remote, contentData);
  const content = base64Utf8(`window.SKBC_CONTENT = ${JSON.stringify(contentData, null, 2)};\n`);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await githubRequest(apiUrl, token, {
        method: "PUT",
        body: JSON.stringify({
          message: "Update SKBC Gipuzkoa website content",
          branch: GITHUB_BRANCH,
          sha: current.sha,
          content
        })
      });
      break;
    } catch (error) {
      if (error.status === 409) {
        throw new Error("GitHub ha recibido otro cambio mientras publicabas. Recarga el admin y vuelve a intentarlo.");
      }
      throw error;
    }
  }
  publishedContentSignature = contentSignature(contentData);

  return {
    message: "Cambios publicados en GitHub Pages. Puede tardar unos minutos en verse.",
    url: `https://${GITHUB_OWNER}.github.io/${GITHUB_REPO}/`
  };
}

async function confirmNoPublishedCriticalContentWillDisappear(remote, contentData) {
  const losses = [
    {
      label: "Noticias",
      remoteCount: remote.settings?.news?.length || 0,
      nextCount: contentData.settings?.news?.length || 0
    },
    {
      label: "Eventos",
      remoteCount: remote.settings?.events?.length || 0,
      nextCount: contentData.settings?.events?.length || 0
    },
    {
      label: "Productos tienda",
      remoteCount: remote.settings?.merch?.products?.length || 0,
      nextCount: contentData.settings?.merch?.products?.length || 0
    },
    ...["es", "eu", "en"].map((lang) => ({
      label: `Testimonios ${lang.toUpperCase()}`,
      remoteCount: remote.languages?.[lang]?.testimonials?.items?.length || 0,
      nextCount: contentData.languages?.[lang]?.testimonials?.items?.length || 0
    }))
  ].filter((item) => item.remoteCount > item.nextCount);
  if (!losses.length) return;
  const detail = losses.map((item) => `${item.label}: ${item.remoteCount} publicado(s) -> ${item.nextCount}`).join("\n");
  const ok = confirm(`Atención: esta publicación reduce contenido importante.\n\n${detail}\n\nSi publicas así, ese contenido dejará de verse. Continúa solo si lo has eliminado a propósito.`);
  if (!ok) throw new Error("Publicación cancelada para no perder contenido publicado.");
}

function parseSkbcContentJs(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("};");
  if (start < 0 || end < 0) throw new Error("No se pudo leer el contenido publicado.");
  return JSON.parse(text.slice(start, end + 1));
}

function wait(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function shouldUseGithubApi() {
  return location.hostname.endsWith("github.io")
    || location.hostname.endsWith("skbcgipuzkoa.com")
    || location.hostname === "localhost"
    || location.hostname === "127.0.0.1";
}

async function githubToken() {
  const saved = sessionStorage.getItem(GITHUB_TOKEN_KEY) || localStorage.getItem(GITHUB_TOKEN_KEY);
  if (saved) return saved;

  const token = prompt("Pega tu token de GitHub con permiso de escritura solo para este repositorio:");
  if (!token) throw new Error("No se ha introducido token de GitHub.");
  if (confirm("Â¿Guardar este token en este navegador para futuras publicaciones?")) {
    localStorage.setItem(GITHUB_TOKEN_KEY, token.trim());
  } else {
    sessionStorage.setItem(GITHUB_TOKEN_KEY, token.trim());
  }
  return token.trim();
}

async function githubRequest(url, token, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Accept": "application/vnd.github+json",
      "Authorization": `Bearer ${token}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.message || `GitHub respondiÃ³ ${response.status}`);
    error.status = response.status;
    error.result = result;
    throw error;
  }
  return result;
}

function base64Utf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function utf8FromBase64(value) {
  const binary = atob(String(value).replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

document.querySelector("#export").addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "skbc-content.json";
  a.click();
  URL.revokeObjectURL(url);
});

document.querySelector("#import").addEventListener("change", async (event) => {
  const [file] = event.target.files;
  if (!file) return;
  try {
    data = deepMerge(cloneDefault(), JSON.parse(await file.text()));
    dirty = true;
    render();
    setStatus("Archivo importado en esta sesión. Revisa y publica en GitHub para guardarlo.", "warning");
  } catch {
    setStatus("No se pudo importar el archivo JSON", "danger");
  }
});

document.querySelector("#reset").addEventListener("click", () => {
  if (!confirm("¿Descartar los cambios no publicados y recargar el contenido publicado?")) return;
  data = cloneDefault();
  localStorage.removeItem(STORAGE_KEY);
  dirty = false;
  render();
  setStatus("Contenido publicado recargado. No se ha tocado GitHub.", "ok");
});

window.addEventListener("beforeunload", (event) => {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

render();
setStatus("Listo para editar", "neutral");


