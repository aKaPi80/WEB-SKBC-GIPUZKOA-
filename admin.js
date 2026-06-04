const STORAGE_KEY = "skbc_content_v2";
const GITHUB_TOKEN_KEY = "skbc_github_token";
const GITHUB_OWNER = "aKaPi80";
const GITHUB_REPO = "WEB-SKBC-GIPUZKOA-";
const GITHUB_BRANCH = "main";
const MEDIA_REPLACEMENTS = {
  "assets/uploads/1780601440879-manji.heic": "assets/uploads/1780604041486-manji.jpg",
  "assets/uploads/1780600913705-grupo-ninos.heic": "assets/uploads/1780604072168-grupo-ninos.jpg",
  "assets/uploads/1780601631346-adultos.heic": "assets/uploads/1780604082854-adultos.jpg"
};

let data = load();
let currentPanel = "settings";
let currentEventIndex = null;
let dirty = false;

const panelTitles = {
  settings: "Ajustes generales",
  es: "Textos en espaÃ±ol",
  eu: "Textos en euskera",
  en: "Textos en inglÃ©s",
  custom: "Ãreas nuevas",
  advanced: "Todo el contenido"
};

const labels = {
  es: "EspaÃ±ol",
  eu: "Euskera",
  en: "InglÃ©s",
  custom: "Secciones",
  advanced: "Avanzado"
};

panelTitles.events = "Calendario de eventos";
labels.events = "Calendario";
panelTitles.news = "Próximas noticias";
labels.news = "Noticias";
panelTitles.merch = "Tienda merchandising";
labels.merch = "Tienda";

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
    title: "Estilo visual",
    help: "Elige una paleta sugerida y el tipo de oscurecido de la foto principal.",
    fields: [
      ["Paleta visual", ["settings", "theme", "palette"], "palette"],
      ["Contraste de la foto principal", ["settings", "theme", "heroOverlay"], "overlay"]
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
      ["Imágenes de galería", ["settings", "images", "gallery"], "array"]
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
        ["Tarjetas adultos", [...root, "adults", "items"], "matrix"]
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
        ["TÃ­tulo merchandising", [...root, "merch", "title"], "input"],
        ["Texto merchandising", [...root, "merch", "text"], "textarea"],
        ["Botón catálogo JHK", [...root, "merch", "catalog"], "input"],
        ["Título pedido", [...root, "merch", "orderTitle"], "input"],
        ["Título datos comprador", [...root, "merch", "buyerTitle"], "input"],
        ["Texto otra prenda JHK", [...root, "merch", "customText"], "textarea"],
        ["Botón enviar pedido", [...root, "merch", "send"], "input"],
        ["TÃ­tulo contacto", [...root, "contact", "title"], "input"],
        ["Texto contacto", [...root, "contact", "text"], "textarea"],
        ["Opciones formulario", [...root, "contact", "options"], "array"],
        ["BotÃ³n formulario", [...root, "contact", "submit"], "input"]
      ]
    }
  ];
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    const base = cloneDefault();
    const loaded = saved ? deepMerge(base, saved) : base;
    const cleaned = replaceLegacyCanvaMedia(loaded, base);
    if (saved && JSON.stringify(cleaned) !== JSON.stringify(loaded)) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    }
    return cleaned;
  } catch {
    return cloneDefault();
  }
}

function cloneDefault() {
  return structuredClone(window.SKBC_CONTENT);
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
  if (currentPanel === "events") return renderEvents();
  if (currentPanel === "news") return renderNews();
  if (currentPanel === "merch") return renderMerch();
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
}

function groupTemplate(group) {
  return `
    <article class="editor-group">
      <header>
        <h3>${group.title}</h3>
        <p>${group.help}</p>
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
  if (type === "booleanText") {
    return selectTemplate(id, encodedPath, value, [["true", "Activa"], ["false", "Oculta"]], type);
  }
  if (type === "sectionStyle") {
    return selectTemplate(id, encodedPath, value, [["normal", "Normal"], ["soft", "Fondo claro"], ["dark", "Fondo oscuro"]], type);
  }
  return `<input id="${id}" data-type="${type}" data-path="${encodedPath}" value="${escapeHtml(value)}" />`;
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

function shiftEventToYear(event, targetYear) {
  const copy = structuredClone(event);
  copy.start = shiftDateYear(copy.start, targetYear);
  copy.end = shiftDateYear(copy.end, targetYear);
  copy.dates = (copy.dates || []).map((date) => shiftDateYear(date, targetYear));
  copy.excludedDates = (copy.excludedDates || []).map((date) => shiftDateYear(date, targetYear));
  if (copy.repeat) {
    copy.repeat.start = shiftDateYear(copy.repeat.start || copy.start, targetYear);
    copy.repeat.until = shiftDateYear(copy.repeat.until || copy.end || copy.start, targetYear);
  }
  return copy;
}

function copyEventsToYear() {
  const targetYear = Number(document.querySelector("#copy-events-year")?.value);
  if (!targetYear) {
    setStatus("Indica el año al que quieres duplicar el calendario.", "danger");
    return;
  }
  const events = data.settings.events || [];
  if (!events.length) return;
  if (!confirm(`¿Duplicar los ${events.length} eventos al año ${targetYear}? Luego podrás modificar fechas, colores o eliminar lo que no necesites.`)) return;
  const copies = events.map((event) => shiftEventToYear(event, targetYear));
  data.settings.events.push(...copies);
  currentEventIndex = null;
  markDirty();
  setStatus(`Calendario duplicado a ${targetYear}. Revisa y elimina lo que no necesites.`, "warning");
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

function renderNews() {
  const editor = document.querySelector("#editor");
  const news = data.settings.news || [];
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
    <div class="custom-card">${sectionCopy}</div>
    ${news.length ? news.map(newsTemplate).join("") : `<article class="editor-group"><header><h3>No hay noticias</h3><p>Pulsa Añadir noticia para crear avisos visibles en la web.</p></header></article>`}
  `;
  bindFields(editor);
  document.querySelector("#add-news").addEventListener("click", addNews);
  editor.querySelectorAll("[data-remove-news]").forEach((button) => {
    button.addEventListener("click", () => removeNews(Number(button.dataset.removeNews)));
  });
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
  return `<div class="custom-card">${groups.map(groupTemplate).join("")}<button class="danger" data-remove-news="${index}" type="button">Eliminar esta noticia</button></div>`;
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
  markDirty();
  renderNews();
}

function removeNews(index) {
  if (!confirm("¿Eliminar esta noticia?")) return;
  data.settings.news.splice(index, 1);
  markDirty();
  renderNews();
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
  const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "jpg";
  const safeBase = file.name
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42) || "imagen";
  const assetPath = `assets/uploads/${Date.now()}-${safeBase}.${extension}`;
  const content = await fileToBase64(file);

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
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || "No se pudo subir la imagen");
  return result.path;
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

document.querySelectorAll(".tab").forEach((tab) => {
  tab.addEventListener("click", () => {
    currentPanel = tab.dataset.panel;
    render();
  });
});

document.querySelector("#save").addEventListener("click", () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  dirty = false;
  setStatus("Guardado correctamente en este navegador", "ok");
});

document.querySelector("#publish").addEventListener("click", async () => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
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
  const content = base64Utf8(`window.SKBC_CONTENT = ${JSON.stringify(contentData, null, 2)};\n`);

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const current = await githubRequest(`${apiUrl}?ref=${GITHUB_BRANCH}&ts=${Date.now()}`, token);
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
      if (attempt === 3 || error.status !== 409) throw error;
      await wait(900);
    }
  }

  return {
    message: "Cambios publicados en GitHub Pages. Puede tardar unos minutos en verse.",
    url: `https://${GITHUB_OWNER}.github.io/${GITHUB_REPO}/`
  };
}

function wait(ms) {
  return new Promise((resolvePromise) => setTimeout(resolvePromise, ms));
}

function shouldUseGithubApi() {
  return location.hostname.endsWith("github.io") || location.hostname.endsWith("skbcgipuzkoa.com");
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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    dirty = false;
    render();
    setStatus("Archivo importado y guardado", "ok");
  } catch {
    setStatus("No se pudo importar el archivo JSON", "danger");
  }
});

document.querySelector("#reset").addEventListener("click", () => {
  if (!confirm("Â¿Restaurar el contenido original de esta propuesta?")) return;
  data = cloneDefault();
  localStorage.removeItem(STORAGE_KEY);
  dirty = false;
  render();
  setStatus("Contenido original restaurado", "ok");
});

window.addEventListener("beforeunload", (event) => {
  if (!dirty) return;
  event.preventDefault();
  event.returnValue = "";
});

render();
setStatus("Listo para editar", "neutral");


