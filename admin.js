const STORAGE_KEY = "skbc_content_v2";
const GITHUB_TOKEN_KEY = "skbc_github_token";
const GITHUB_OWNER = "aKaPi80";
const GITHUB_REPO = "WEB-SKBC-GIPUZKOA-";
const GITHUB_BRANCH = "main";

let data = load();
let currentPanel = "settings";
let dirty = false;

const panelTitles = {
  settings: "Ajustes generales",
  es: "Textos en español",
  eu: "Textos en euskera",
  en: "Textos en inglés",
  custom: "Áreas nuevas",
  advanced: "Todo el contenido"
};

const labels = {
  es: "Español",
  eu: "Euskera",
  en: "Inglés",
  custom: "Secciones",
  advanced: "Avanzado"
};

const settingsGroups = [
  {
    title: "Contacto y redes oficiales",
    help: "Facebook se mantiene como enlace oficial. Las publicaciones visibles deben venir solo desde Instagram para evitar duplicados.",
    fields: [
      ["WhatsApp", ["settings", "whatsapp"], "input"],
      ["Instagram", ["settings", "instagram"], "input"],
      ["Facebook", ["settings", "facebook"], "input"],
      ["YouTube", ["settings", "youtube"], "input"],
      ["Google Maps", ["settings", "maps"], "input"]
    ]
  },
  {
    title: "Publicaciones visibles en la web",
    help: "Pega una URL por línea. Instagram acepta enlaces de posts o reels. YouTube acepta enlaces de vídeos, shorts o youtu.be.",
    fields: [
      ["Posts/Reels de Instagram", ["settings", "socialFeeds", "instagramUrls"], "textarea"],
      ["Vídeos de YouTube", ["settings", "socialFeeds", "youtubeUrls"], "textarea"]
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
    title: "Imágenes principales",
    help: "Estas son las fotos de fondo principales de la web. Pega una URL o una ruta local dentro de esta carpeta.",
    fields: [
      ["Foto hero/inicio", ["settings", "images", "hero"], "input"],
      ["Foto niños", ["settings", "images", "kids"], "input"],
      ["Foto adultos", ["settings", "images", "adults"], "input"],
      ["Foto técnica/aprendizaje", ["settings", "images", "learn"], "input"],
      ["Foto equipo técnico", ["settings", "images", "people", "technicalTeam"], "input"]
    ]
  },
  {
    title: "Fotos de personas",
    help: "Estas miniaturas se usan en equipo técnico y directiva. Si no hay foto correcta, deja el campo vacío.",
    fields: [
      ["Álvaro Calvo", ["settings", "images", "people", "alvaro"], "input"],
      ["Iñaki Ventureira", ["settings", "images", "people", "inaki"], "input"],
      ["Andoni Domínguez", ["settings", "images", "people", "andoni"], "input"],
      ["Oskar Mateos", ["settings", "images", "people", "oskar"], "input"],
      ["Asier Azurmendi", ["settings", "images", "people", "asier"], "input"],
      ["Igone Lasa", ["settings", "images", "people", "igone"], "input"],
      ["Iñaki Iturrioz", ["settings", "images", "people", "iturrioz"], "input"],
      ["Bharat Martin", ["settings", "images", "people", "bharat"], "input"],
      ["Pablo Sánchez", ["settings", "images", "people", "pablo"], "input"],
      ["Uxue Garikano", ["settings", "images", "people", "uxue"], "input"],
      ["Jorge Redondo", ["settings", "images", "people", "jorge"], "input"]
    ]
  }
];

function languageGroups(lang) {
  const root = ["languages", lang];
  return [
    {
      title: "SEO y navegación",
      help: "Título y descripción para Google, menú, llamada principal y formularios.",
      fields: [
        ["Título SEO", [...root, "seoTitle"], "input"],
        ["Descripción SEO", [...root, "seoDescription"], "textarea"],
        ["Menú principal", [...root, "nav"], "array"],
        ["Botón principal corto", [...root, "ctaShort"], "input"]
      ]
    },
    {
      title: "Inicio",
      help: "Primera pantalla de la web.",
      fields: [
        ["Etiqueta superior", [...root, "hero", "eyebrow"], "input"],
        ["Título principal", [...root, "hero", "title"], "textarea"],
        ["Texto principal", [...root, "hero", "text"], "textarea"],
        ["Botón principal", [...root, "hero", "primary"], "input"],
        ["Botón secundario", [...root, "hero", "secondary"], "input"],
        ["Tarjetas del hero", [...root, "hero", "cards"], "matrix"]
      ]
    },
    {
      title: "Bloques de aprendizaje",
      help: "Beneficios, explicación de Shorinji Kempo, niños y adultos.",
      fields: [
        ["Título beneficios", [...root, "benefits", "title"], "input"],
        ["Texto beneficios", [...root, "benefits", "text"], "textarea"],
        ["Tarjetas beneficios", [...root, "benefits", "items"], "matrix"],
        ["Título Shorinji Kempo", [...root, "shorinji", "title"], "input"],
        ["Texto Shorinji Kempo", [...root, "shorinji", "text"], "textarea"],
        ["Bloques Shorinji Kempo", [...root, "shorinji", "blocks"], "matrix"],
        ["Título niños", [...root, "kids", "title"], "input"],
        ["Texto niños", [...root, "kids", "text"], "textarea"],
        ["Lista niños", [...root, "kids", "items"], "array"],
        ["Botón niños", [...root, "kids", "cta"], "input"],
        ["Título adultos", [...root, "adults", "title"], "input"],
        ["Texto adultos", [...root, "adults", "text"], "textarea"],
        ["Tarjetas adultos", [...root, "adults", "items"], "matrix"]
      ]
    },
    {
      title: "Club, IKA y profesor",
      help: "Identidad del club, representación internacional y responsable técnico.",
      fields: [
        ["Título club", [...root, "club", "title"], "input"],
        ["Texto club", [...root, "club", "text"], "textarea"],
        ["Tarjetas club", [...root, "club", "items"], "matrix"],
        ["Título IKA", [...root, "ika", "title"], "input"],
        ["Texto IKA", [...root, "ika", "text"], "textarea"],
        ["Nota IKA", [...root, "ika", "note"], "textarea"],
        ["Título responsable técnico", [...root, "instructor", "title"], "input"],
        ["Texto responsable técnico", [...root, "instructor", "text"], "textarea"],
        ["Texto adicional responsable", [...root, "instructor", "extra"], "textarea"]
      ]
    },
    {
      title: "Equipo y directiva",
      help: "Puedes añadir, quitar o cambiar nombres desde estas listas.",
      fields: [
        ["Título equipo técnico", [...root, "technicalTeam", "title"], "input"],
        ["Texto equipo técnico", [...root, "technicalTeam", "text"], "textarea"],
        ["Responsables técnicos", [...root, "technicalTeam", "leads"], "matrix"],
        ["Miembros equipo técnico", [...root, "technicalTeam", "members"], "array"],
        ["Título directiva", [...root, "board", "title"], "input"],
        ["Miembros directiva", [...root, "board", "members"], "array"]
      ]
    },
    {
      title: "Horarios, galerías, redes, merchandising y contacto",
      help: "Zona final de la web, enlaces y formulario.",
      fields: [
        ["Título horarios", [...root, "schedule", "title"], "input"],
        ["Texto horarios", [...root, "schedule", "text"], "textarea"],
        ["Horario niños", [...root, "schedule", "kids"], "input"],
        ["Horario adultos", [...root, "schedule", "adults"], "input"],
        ["Lugar", [...root, "schedule", "place"], "input"],
        ["Título galería", [...root, "media", "title"], "input"],
        ["Texto galería", [...root, "media", "text"], "textarea"],
        ["Título redes", [...root, "social", "title"], "input"],
        ["Texto redes", [...root, "social", "text"], "textarea"],
        ["Texto Instagram", [...root, "social", "instagram"], "input"],
        ["Texto Facebook", [...root, "social", "facebook"], "input"],
        ["Texto YouTube", [...root, "social", "youtube"], "input"],
        ["Título merchandising", [...root, "merch", "title"], "input"],
        ["Texto merchandising", [...root, "merch", "text"], "textarea"],
        ["Productos merchandising", [...root, "merch", "items"], "array"],
        ["Título contacto", [...root, "contact", "title"], "input"],
        ["Texto contacto", [...root, "contact", "text"], "textarea"],
        ["Opciones formulario", [...root, "contact", "options"], "array"],
        ["Botón formulario", [...root, "contact", "submit"], "input"]
      ]
    }
  ];
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? deepMerge(cloneDefault(), saved) : cloneDefault();
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
  if (type === "matrix") {
    return value.split(/\r?\n/).map((line) => line.split("|").map((part) => part.trim()).filter(Boolean)).filter((row) => row.length);
  }
  return value;
}

function formatFieldValue(value, type) {
  if (type === "booleanText") return value === false ? "false" : "true";
  if (type === "array") return Array.isArray(value) ? value.join("\n") : "";
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
  if (currentPanel === "advanced") return renderAdvanced();
  renderGroups(currentPanel === "settings" ? settingsGroups : languageGroups(currentPanel));
}

function renderIntro(extra = "") {
  return `
    <div class="editor-intro">
      <p>${currentPanel === "settings" ? "Configuración" : labels[currentPanel]}</p>
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
  const control = controlTemplate(id, encodedPath, value, type);
  return `<label class="field" for="${id}"><span>${label}</span>${control}</label>`;
}

function controlTemplate(id, encodedPath, value, type) {
  if (type === "textarea" || type === "array" || type === "matrix") {
    const rows = type === "matrix" ? 6 : 4;
    const hint = type === "matrix" ? `<small>Una línea por elemento. Usa | para separar título, texto y detalles.</small>` : "";
    return `${hint}<textarea id="${id}" data-type="${type}" data-path="${encodedPath}" rows="${rows}">${escapeHtml(value)}</textarea>`;
  }
  if (type === "palette") {
    return selectTemplate(id, encodedPath, value, [["skbc", "SKBC original"], ["azul", "Azul deportivo"], ["dojo", "Dojo cálido"], ["clara", "Clara familiar"]]);
  }
  if (type === "overlay") {
    return selectTemplate(id, encodedPath, value, [["classic", "Contraste normal"], ["soft", "Más luminoso"], ["strong", "Más oscuro"]]);
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
    ${renderIntro(`<div class="intro-actions"><button id="add-section" class="primary" type="button">Añadir área</button></div>`)}
    ${sections.length ? sections.map(customSectionTemplate).join("") : `<article class="editor-group"><header><h3>No hay áreas nuevas</h3><p>Pulsa Añadir área para crear un bloque nuevo en la web.</p></header></article>`}
  `;
  bindFields(editor);
  document.querySelector("#add-section").addEventListener("click", addCustomSection);
  editor.querySelectorAll("[data-remove-section]").forEach((button) => {
    button.addEventListener("click", () => removeCustomSection(Number(button.dataset.removeSection)));
  });
}

function customSectionTemplate(section, index) {
  const base = ["settings", "customSections", index];
  const groups = [
    {
      title: `Área ${index + 1}`,
      help: "Puedes activarla, cambiar estilo, imagen, enlace y traducir sus textos.",
      fields: [
        ["Activa: true o false", [...base, "enabled"], "booleanText"],
        ["Estilo: normal, soft o dark", [...base, "style"], "sectionStyle"],
        ["Imagen de fondo/lateral", [...base, "image"], "input"],
        ["URL del botón", [...base, "url"], "input"],
        ["ES etiqueta", [...base, "languages", "es", "eyebrow"], "input"],
        ["ES título", [...base, "languages", "es", "title"], "input"],
        ["ES texto", [...base, "languages", "es", "text"], "textarea"],
        ["ES botón", [...base, "languages", "es", "button"], "input"],
        ["EU etiqueta", [...base, "languages", "eu", "eyebrow"], "input"],
        ["EU título", [...base, "languages", "eu", "title"], "input"],
        ["EU texto", [...base, "languages", "eu", "text"], "textarea"],
        ["EU botón", [...base, "languages", "eu", "button"], "input"],
        ["EN etiqueta", [...base, "languages", "en", "eyebrow"], "input"],
        ["EN título", [...base, "languages", "en", "title"], "input"],
        ["EN texto", [...base, "languages", "en", "text"], "textarea"],
        ["EN botón", [...base, "languages", "en", "button"], "input"]
      ]
    }
  ];
  return `<div class="custom-card">${groups.map(groupTemplate).join("")}<button class="danger" data-remove-section="${index}" type="button">Eliminar esta área</button></div>`;
}

function addCustomSection() {
  if (!data.settings.customSections) data.settings.customSections = [];
  data.settings.customSections.push({
    enabled: true,
    style: "soft",
    image: "",
    url: "",
    languages: {
      es: { eyebrow: "Nueva área", title: "Título de la nueva área", text: "Escribe aquí el contenido.", button: "" },
      eu: { eyebrow: "Atal berria", title: "Atal berriaren izenburua", text: "Idatzi hemen edukia.", button: "" },
      en: { eyebrow: "New area", title: "New area title", text: "Write the content here.", button: "" }
    }
  });
  markDirty();
  renderCustom();
}

function removeCustomSection(index) {
  if (!confirm("¿Eliminar esta área nueva?")) return;
  data.settings.customSections.splice(index, 1);
  markDirty();
  renderCustom();
}

function renderAdvanced() {
  const editor = document.querySelector("#editor");
  editor.innerHTML = `
    ${renderIntro(`<p class="advanced-warning">Aquí puedes editar absolutamente todo. Antes de tocarlo, usa Exportar copia.</p>`)}
    <article class="editor-group">
      <header>
        <h3>Contenido completo</h3>
        <p>Formato JSON. Si hay una coma mal puesta, no se aplicará el cambio.</p>
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
      setStatus(`JSON no válido: ${error.message}`, "danger");
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
    field.addEventListener("input", update);
    field.addEventListener("change", update);
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

  if (!confirm("¿Guardar estos cambios y publicarlos en GitHub Pages?")) return;

  try {
    setStatus("Publicando en GitHub...", "warning");
    if (location.hostname.endsWith("github.io")) {
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
  const current = await githubRequest(`${apiUrl}?ref=${GITHUB_BRANCH}`, token);
  const body = {
    message: "Update SKBC Gipuzkoa website content",
    branch: GITHUB_BRANCH,
    sha: current.sha,
    content: base64Utf8(`window.SKBC_CONTENT = ${JSON.stringify(contentData, null, 2)};\n`)
  };

  await githubRequest(apiUrl, token, {
    method: "PUT",
    body: JSON.stringify(body)
  });

  return {
    message: "Cambios publicados en GitHub Pages. Puede tardar unos minutos en verse.",
    url: `https://${GITHUB_OWNER}.github.io/${GITHUB_REPO}/`
  };
}

async function githubToken() {
  const saved = sessionStorage.getItem(GITHUB_TOKEN_KEY) || localStorage.getItem(GITHUB_TOKEN_KEY);
  if (saved) return saved;

  const token = prompt("Pega tu token de GitHub con permiso de escritura solo para este repositorio:");
  if (!token) throw new Error("No se ha introducido token de GitHub.");
  if (confirm("¿Guardar este token en este navegador para futuras publicaciones?")) {
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
  if (!response.ok) throw new Error(result.message || `GitHub respondió ${response.status}`);
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
  if (!confirm("¿Restaurar el contenido original de esta propuesta?")) return;
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
