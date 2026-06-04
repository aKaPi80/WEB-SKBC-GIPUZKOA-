const STORAGE_KEY = "skbc_content_v2";
const state = {
  content: loadContent(),
  lang: new URLSearchParams(location.search).get("lang") || localStorage.getItem("skbc_lang") || "es",
  merchCart: []
};

function loadContent() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return saved ? deepMerge(window.SKBC_CONTENT, saved) : window.SKBC_CONTENT;
  } catch {
    return window.SKBC_CONTENT;
  }
}

function deepMerge(base, override) {
  if (Array.isArray(base) || Array.isArray(override)) return override ?? base;
  if (!base || typeof base !== "object" || !override || typeof override !== "object") return override ?? base;
  return Object.keys({ ...base, ...override }).reduce((merged, key) => {
    merged[key] = deepMerge(base[key], override[key]);
    return merged;
  }, {});
}

function t() {
  return state.content.languages[state.lang] || state.content.languages.es;
}

function whatsappLink(message) {
  return `https://wa.me/${state.content.settings.whatsapp}?text=${encodeURIComponent(message)}`;
}

function cardGrid(items, columns = 4) {
  return `<div class="grid-${columns}">${items.map((item) => `
    <article class="card">
      <span>${item[0]}</span>
      <h3>${item[0]}</h3>
      <p>${item[1] || ""}</p>
    </article>`).join("")}</div>`;
}

function uniqueImages(images, excluded = []) {
  const blocked = new Set(excluded.filter(Boolean));
  return [...new Set((images || []).filter(Boolean))].filter((image) => !blocked.has(image));
}

function linesFrom(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

function youtubeEmbedUrl(url) {
  const value = String(url || "").trim();
  const id = value.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/))([a-zA-Z0-9_-]{6,})/)?.[1];
  return id ? `https://www.youtube.com/embed/${id}` : "";
}

function instagramEmbedUrl(url) {
  const value = String(url || "").trim();
  const match = value.match(/instagram\.com\/(p|reel|tv)\/([^/?#]+)/);
  return match ? `https://www.instagram.com/${match[1]}/${match[2]}/embed` : "";
}

function socialEmbedCard(type, url) {
  const embedUrl = type === "youtube" ? youtubeEmbedUrl(url) : instagramEmbedUrl(url);
  if (!embedUrl) return "";
  const title = type === "youtube" ? "YouTube SKBC GIPUZKOA" : "Instagram SKBC GIPUZKOA";
  return `<article class="embed-card ${type === "instagram" ? "embed-card--instagram" : ""}">
    <iframe src="${embedUrl}" title="${title}" loading="lazy" allowfullscreen></iframe>
  </article>`;
}

function autoFeed() {
  return window.SKBC_SOCIAL_FEED || { instagram: [], stories: [], youtube: [] };
}

function autoFeedInstagramCard(item) {
  const embedUrl = instagramEmbedUrl(item.permalink);
  if (embedUrl) {
    return `<article class="embed-card embed-card--instagram">
      <iframe src="${embedUrl}" title="Instagram SKBC GIPUZKOA" loading="lazy" allowfullscreen></iframe>
    </article>`;
  }
  const image = item.thumbnailUrl || item.mediaUrl || "";
  return `<a class="social-preview" href="${item.permalink}" target="_blank" rel="noreferrer">
    ${image ? `<img src="${image}" alt="${item.caption || "Instagram SKBC GIPUZKOA"}" />` : ""}
    <span>Instagram</span>
    <strong>${item.caption || "Ver publicación"}</strong>
  </a>`;
}

function autoFeedStoryCard(item) {
  const image = item.thumbnailUrl || item.mediaUrl || "";
  return `<a class="social-preview social-preview--story" href="${item.permalink || state.content.settings.instagram}" target="_blank" rel="noreferrer">
    ${image ? `<img src="${image}" alt="Historia SKBC GIPUZKOA" />` : ""}
    <span>Historia</span>
    <strong>${item.caption || "Historia activa de Instagram"}</strong>
  </a>`;
}

function autoFeedYoutubeCard(item) {
  const embedUrl = item.videoId ? `https://www.youtube.com/embed/${item.videoId}` : youtubeEmbedUrl(item.url);
  if (!embedUrl) return "";
  return `<article class="embed-card">
    <iframe src="${embedUrl}" title="${item.title || "YouTube SKBC GIPUZKOA"}" loading="lazy" allowfullscreen></iframe>
  </article>`;
}

function embeddedSocial(settings) {
  const feed = autoFeed();
  const automaticInstagram = (feed.instagram || []).slice(0, 6).map(autoFeedInstagramCard).join("");
  const automaticStories = (feed.stories || []).slice(0, 3).map(autoFeedStoryCard).join("");
  const automaticYoutube = (feed.youtube || []).slice(0, 3).map(autoFeedYoutubeCard).join("");
  const manualInstagram = linesFrom(settings.socialFeeds?.instagramUrls).map((url) => socialEmbedCard("instagram", url)).join("");
  const manualYoutube = linesFrom(settings.socialFeeds?.youtubeUrls).map((url) => socialEmbedCard("youtube", url)).join("");
  const instagram = automaticInstagram || manualInstagram;
  const stories = automaticStories;
  const youtube = automaticYoutube || manualYoutube;
  return { instagram, stories, youtube, hasEmbeds: Boolean(instagram || stories || youtube) };
}

function customSections(settings) {
  return (settings.customSections || [])
    .filter((section) => section && section.enabled !== false)
    .map((section, index) => {
      const copy = section.languages?.[state.lang] || section.languages?.es || {};
      const style = ["soft", "dark"].includes(section.style) ? section.style : "";
      const image = section.image || "";
      const button = copy.button && section.url
        ? `<a class="button ${style === "dark" ? "secondary" : ""}" href="${section.url}" target="_blank" rel="noreferrer">${copy.button}</a>`
        : "";
      const text = `
        <div class="custom-copy">
          ${copy.eyebrow ? `<p class="eyebrow">${copy.eyebrow}</p>` : ""}
          ${copy.title ? `<h2>${copy.title}</h2>` : ""}
          ${copy.text ? `<p>${copy.text}</p>` : ""}
          ${button}
        </div>
      `;
      const content = image
        ? `<div class="split ${index % 2 ? "split-reverse" : ""}">
            <div class="split-media" style="background-image:url('${image}')"></div>
            ${text}
          </div>`
        : `<div class="section-heading">${text}</div>`;
      return `<section class="section custom-section ${style}" id="area-${index + 1}">${content}</section>`;
    })
    .join("");
}

function customNavItems(settings) {
  return (settings.customSections || [])
    .filter((section) => section && section.enabled !== false)
    .map((section, index) => {
      const copy = section.languages?.[state.lang] || section.languages?.es || {};
      return copy.title ? { label: copy.title, href: `#area-${index + 1}` } : null;
    })
    .filter(Boolean);
}

const NAV_TEXT = {
  es: { kids: "Ni\u00f1os", adults: "Adultos", club: "Club", team: "Equipo", schedule: "Horarios", calendar: "Calendario", gallery: "Galer\u00eda", news: "Noticias", merch: "Merchandising", contact: "Contacto" },
  eu: { kids: "Haurrak", adults: "Helduak", club: "Kluba", team: "Taldea", schedule: "Ordutegiak", calendar: "Egutegia", gallery: "Galeria", news: "Albisteak", merch: "Merchandising", contact: "Kontaktua" },
  en: { kids: "Kids", adults: "Adults", club: "Club", team: "Team", schedule: "Schedule", calendar: "Calendar", gallery: "Gallery", news: "News", merch: "Merchandising", contact: "Contact" }
};

function uniqueNavItems(items) {
  const seenHrefs = new Set();
  const seenLabels = new Set();
  return items.filter((item) => {
    const labelKey = normalizeName(item.label);
    if (seenHrefs.has(item.href) || seenLabels.has(labelKey)) return false;
    seenHrefs.add(item.href);
    seenLabels.add(labelKey);
    return true;
  });
}

const calendarState = {
  view: "year",
  date: new Date()
};

function pad(number) {
  return String(number).padStart(2, "0");
}

function dateKey(date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function parseDate(value) {
  const [year, month, day] = String(value || "").split("-").map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, day || 1);
}

function eventCopy(event) {
  return event.languages?.[state.lang] || event.languages?.es || {};
}

function eventTouchesDate(event, date) {
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const start = parseDate(event.start).getTime();
  const end = parseDate(event.end || event.start).getTime();
  return current >= start && current <= end;
}

function monthName(date) {
  return new Intl.DateTimeFormat(state.lang === "eu" ? "eu-ES" : state.lang, { month: "long", year: "numeric" }).format(date);
}

function monthGrid(monthDate, events, copy) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const days = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < offset; i += 1) cells.push(`<span class="calendar-day is-empty"></span>`);
  for (let day = 1; day <= days; day += 1) {
    const current = new Date(year, month, day);
    const dayEvents = events.filter((event) => eventTouchesDate(event, current));
    cells.push(`<span class="calendar-day ${dayEvents.length ? "has-event" : ""}">
      <strong>${day}</strong>
      ${dayEvents.slice(0, 3).map((event) => {
        const text = eventCopy(event);
        return `<em style="--event-color:${event.color || "#1f6fa9"}" title="${text.title || ""}">${text.title || copy.empty}</em>`;
      }).join("")}
    </span>`);
  }
  return `<article class="calendar-month">
    <h3>${monthName(monthDate)}</h3>
    <div class="calendar-weekdays"><span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
    <div class="calendar-days">${cells.join("")}</div>
  </article>`;
}

function calendarMonths() {
  const base = new Date(calendarState.date.getFullYear(), calendarState.date.getMonth(), 1);
  if (calendarState.view === "year") {
    return Array.from({ length: 12 }, (_, index) => new Date(base.getFullYear(), index, 1));
  }
  if (calendarState.view === "quarter") {
    const start = Math.floor(base.getMonth() / 3) * 3;
    return Array.from({ length: 3 }, (_, index) => new Date(base.getFullYear(), start + index, 1));
  }
  return [base];
}

function calendarSection(settings, copy) {
  const events = (settings.events || []).filter((event) => event.enabled !== false);
  return `<section class="section calendar-section" id="calendario">
    <div class="section-heading">
      <p class="eyebrow">${copy.calendar.eyebrow}</p>
      <h2>${copy.calendar.title}</h2>
      <p>${copy.calendar.text}</p>
    </div>
    <div class="calendar-toolbar">
      <div class="calendar-view">
        <button type="button" data-calendar-view="year" class="${calendarState.view === "year" ? "active" : ""}">${copy.calendar.year}</button>
        <button type="button" data-calendar-view="quarter" class="${calendarState.view === "quarter" ? "active" : ""}">${copy.calendar.quarter}</button>
        <button type="button" data-calendar-view="month" class="${calendarState.view === "month" ? "active" : ""}">${copy.calendar.month}</button>
      </div>
      <div class="calendar-step">
        <button type="button" data-calendar-step="-1">${copy.calendar.previous}</button>
        <strong>${calendarState.view === "year" ? calendarState.date.getFullYear() : monthName(calendarState.date)}</strong>
        <button type="button" data-calendar-step="1">${copy.calendar.next}</button>
      </div>
    </div>
    <div class="calendar-grid calendar-grid--${calendarState.view}">
      ${calendarMonths().map((month) => monthGrid(month, events, copy.calendar)).join("")}
    </div>
    <div class="calendar-list">
      ${events.length ? events.map((event) => {
        const text = eventCopy(event);
        return `<article style="--event-color:${event.color || "#1f6fa9"}">
          <span>${event.start}${event.end && event.end !== event.start ? ` / ${event.end}` : ""}</span>
          <h3>${text.title || ""}</h3>
          <p>${event.location || ""}${event.location && text.description ? " · " : ""}${text.description || ""}</p>
        </article>`;
      }).join("") : `<p>${copy.calendar.empty}</p>`}
    </div>
  </section>`;
}

function upcomingNewsSection(settings, copy) {
  const news = (settings.news || []).filter((item) => item.enabled !== false);
  return `<section class="section soft" id="noticias">
    <div class="section-heading">
      <p class="eyebrow">${copy.news.eyebrow}</p>
      <h2>${copy.news.title}</h2>
      <p>${copy.news.text}</p>
    </div>
    <div class="news-grid">
      ${news.length ? news.map((item) => {
        const text = item.languages?.[state.lang] || item.languages?.es || {};
        const image = item.image ? `<img src="${item.image}" alt="${text.title || ""}" />` : "";
        const inner = `
          ${image}
          <span style="--news-color:${item.color || "#1f6fa9"}">${item.date || ""}</span>
          <h3>${text.title || ""}</h3>
          <p>${text.text || ""}</p>
        `;
        return item.url
          ? `<a class="news-card" href="${item.url}" target="_blank" rel="noreferrer">${inner}</a>`
          : `<article class="news-card">${inner}</article>`;
      }).join("") : `<p>${copy.news.empty}</p>`}
    </div>
  </section>`;
}

function money(value) {
  const number = Number(String(value || "0").replace(",", "."));
  return Number.isFinite(number) ? `${number.toFixed(number % 1 ? 2 : 0)}€` : `${value}€`;
}

function merchProducts(settings) {
  return (settings.merch?.products || []).filter((product) => product && product.enabled !== false);
}

function colorOption(color) {
  const label = `${color.code || ""}${color.code ? " · " : ""}${color.name || ""}`.trim();
  return `<option value="${label}">${label}</option>`;
}

function merchProductCard(product, index, copy) {
  const sizes = product.sizes?.length ? product.sizes : ["S", "M", "L", "XL"];
  const colors = product.colors?.length ? product.colors : [{ code: "", name: "Consultar", hex: "#d9dee7" }];
  return `<article class="merch-product">
    <div class="merch-product__image">
      <img src="${product.image || "assets/logo-skbc.png"}" alt="${product.name}" />
    </div>
    <div class="merch-product__body">
      <span>${copy.merch.base}: ${product.jhkName || "JHK"} · ${copy.merch.ref}: ${product.jhkRef || "Consultar"}</span>
      <h3>${product.name}</h3>
      <p>${copy.merch.personalization}: ${product.personalization || "SKBC"}</p>
      <div class="swatches">
        ${colors.map((color) => `<i title="${color.code || ""} ${color.name || ""}" style="--swatch:${color.hex || "#d9dee7"}"></i>`).join("")}
      </div>
      <strong>${money(product.price)}</strong>
      <div class="merch-controls">
        <label>${copy.merch.size}<select data-merch-size="${index}">${sizes.map((size) => `<option>${size}</option>`).join("")}</select></label>
        <label>${copy.merch.color}<select data-merch-color="${index}">${colors.map(colorOption).join("")}</select></label>
        <label>${copy.merch.quantity}<input type="number" min="1" value="1" data-merch-quantity="${index}" /></label>
      </div>
      <div class="merch-actions">
        <button class="button" type="button" data-add-merch="${index}">${copy.merch.add}</button>
        <a href="${product.jhkUrl || state.content.settings.merch?.catalogUrl}" target="_blank" rel="noreferrer">${copy.merch.catalog}</a>
      </div>
    </div>
  </article>`;
}

function merchTotal() {
  return state.merchCart.reduce((total, item) => total + Number(item.price || 0) * Number(item.quantity || 1), 0);
}

function merchCartHtml(copy) {
  if (!state.merchCart.length) return `<p class="merch-empty">${copy.merch.emptyOrder}</p>`;
  return `<ul class="merch-cart-list">
    ${state.merchCart.map((item, index) => `<li>
      <span><strong>${item.name}</strong>${item.size} · ${item.color} · x${item.quantity}</span>
      <button type="button" data-remove-merch="${index}">${copy.merch.remove}</button>
    </li>`).join("")}
  </ul>
  <p class="merch-total">${copy.merch.total}: <strong>${money(merchTotal())}</strong></p>`;
}

function merchSection(settings, copy) {
  if (settings.merch?.enabled === false) return "";
  const products = merchProducts(settings);
  return `<section class="section merch-section" id="merchandising">
    <div class="section-heading">
      <p class="eyebrow">${copy.merch.eyebrow}</p>
      <h2>${copy.merch.title}</h2>
      <p>${copy.merch.text}</p>
    </div>
    <div class="merch-layout">
      <div class="merch-catalog">
        ${products.map((product, index) => merchProductCard(product, index, copy)).join("")}
        <article class="merch-custom">
          <h3>${copy.merch.customTitle}</h3>
          <p>${copy.merch.customText}</p>
          <a class="button secondary" href="${settings.merch?.catalogUrl || "https://www.jhktshirt.com/es/"}" target="_blank" rel="noreferrer">${copy.merch.catalog}</a>
        </article>
      </div>
      <aside class="merch-order">
        <h3>${copy.merch.orderTitle}</h3>
        <div id="merchCart">${merchCartHtml(copy)}</div>
        <form class="merch-form">
          <h4>${copy.merch.buyerTitle}</h4>
          <label>${copy.merch.name}<input name="name" required /></label>
          <label>${copy.merch.phone}<input name="phone" required /></label>
          <label>${copy.merch.email}<input name="email" type="email" /></label>
          <label>${copy.merch.payment}<select name="payment"><option>${copy.merch.paymentDojo}</option><option>${copy.merch.paymentContact}</option></select></label>
          <label>${copy.merch.customReference}<input name="customReference" /></label>
          <label>${copy.merch.customDetails}<textarea name="customDetails" rows="3"></textarea></label>
          <label>${copy.merch.comments}<textarea name="comments" rows="3"></textarea></label>
          <p><strong>${copy.merch.noteTitle}:</strong> ${settings.merch?.note || ""}</p>
          <button class="button" type="submit">${copy.merch.send}</button>
        </form>
      </aside>
    </div>
  </section>`;
}

function parsePerson(person) {
  if (Array.isArray(person)) {
    return { name: person[0], role: person[1], text: person[2] || "" };
  }
  const [name, role] = String(person).split(" · ");
  return { name, role: role || "", text: "" };
}

function profileText(person, group) {
  if (person.text) return person.text;
  if (state.lang === "eu") {
    if (group === "technical") {
      return `${person.name} SKBC GIPUZKOAko talde teknikoaren parte da, eta klubaren espirituari leiala den praktika hurbila eta jarraitua transmititzen laguntzen du.`;
    }
    return `${person.name} SKBC GIPUZKOAko zuzendaritzaren parte da, klubaren antolaketan eta eguneroko funtzionamenduan lagunduz.`;
  }
  if (state.lang === "en") {
    if (group === "technical") {
      return `${person.name} is part of the SKBC GIPUZKOA technical team and helps transmit a close, consistent practice faithful to the spirit of the club.`;
    }
    return `${person.name} is part of the SKBC GIPUZKOA board, helping with the organisation and daily running of the club.`;
  }
  if (group === "technical") {
    return `${person.name} forma parte del equipo técnico de SKBC GIPUZKOA y ayuda a transmitir una práctica cercana, constante y fiel al espíritu del club.`;
  }
  return `${person.name} forma parte de la directiva de SKBC GIPUZKOA, colaborando en la organización y el funcionamiento diario del club.`;
}

function normalizeName(name) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function personImage(name, index) {
  const people = state.content.settings.images.people || {};
  const normalized = normalizeName(name);
  if (normalized === "alvaro calvo") return people.alvaro;
  if (normalized === "inaki ventureira") return people.inaki;
  if (normalized === "andoni dominguez") return people.andoni;
  if (normalized === "oskar mateos") return people.oskar;
  if (normalized === "asier azurmendi") return people.asier;
  if (normalized === "igone lasa") return people.igone;
  if (normalized === "inaki iturrioz") return people.iturrioz;
  if (normalized === "bharat martin") return people.bharat;
  if (normalized === "pablo sanchez") return people.pablo;
  if (normalized === "uxue garikano") return people.uxue;
  if (normalized === "jorge redondo") return people.jorge;
  return "";
}

function personButton(person, group, index) {
  const profile = parsePerson(person);
  const image = personImage(profile.name, index);
  const data = JSON.stringify({
    name: profile.name,
    role: profile.role,
    text: profileText(profile, group)
  });
  return `<button class="person-card" type="button" data-profile='${data}'>
    ${image ? `<span class="person-card__photo"><img src="${image}" alt="${profile.name}" /></span>` : ""}
    <span>${profile.role}</span>
    <strong>${profile.name}</strong>
  </button>`;
}

function setMeta(copy) {
  document.documentElement.lang = state.lang;
  document.title = copy.seoTitle;
  document.querySelector("meta[name='description']").setAttribute("content", copy.seoDescription);
}

function renderNav(copy) {
  const labels = NAV_TEXT[state.lang] || NAV_TEXT.es;
  const baseNav = uniqueNavItems([
    { label: labels.kids, href: "#ninos" },
    { label: labels.adults, href: "#adultos" },
    { label: labels.club, href: "#club" },
    { label: labels.team, href: "#equipo" },
    { label: labels.schedule, href: "#horarios" },
    { label: labels.calendar, href: "#calendario" },
    { label: labels.gallery, href: "#galeria" },
    { label: labels.news, href: "#noticias" },
    { label: labels.merch, href: "#merchandising" },
    ...customNavItems(state.content.settings),
    { label: labels.contact, href: "#contacto" }
  ]);
  document.querySelector(".main-nav").innerHTML = baseNav.map((item) => `<a href="${item.href}">${item.label}</a>`).join("");
  document.querySelector(".nav-cta").textContent = copy.ctaShort;
  document.querySelector(".nav-cta").href = whatsappLink(copy.contact.title);
  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === state.lang);
  });
  document.querySelector(".whatsapp-float").textContent = `WhatsApp · ${copy.ctaShort}`;
  document.querySelector(".whatsapp-float").href = whatsappLink(copy.contact.title);
}

function render() {
  const copy = t();
  const { settings } = state.content;
  document.documentElement.dataset.theme = settings.theme?.palette || "skbc";
  document.documentElement.dataset.overlay = settings.theme?.heroOverlay || "classic";
  const peopleImages = settings.images.people || {};
  const socialEmbeds = embeddedSocial(settings);
  const galleryImages = uniqueImages(settings.images.gallery, [
    settings.images.hero,
    settings.images.kids,
    settings.images.adults,
    settings.images.learn
  ]);
  setMeta(copy);
  renderNav(copy);

  document.querySelector("#app").innerHTML = `
    <section class="hero" id="inicio">
      <div class="hero-bg" style="background-image:url('${settings.images.hero}')"></div>
      <img class="hero-logo" src="assets/logo-skbc.png" alt="Logo SKBC GIPUZKOA" />
      <div class="hero-content">
        <p class="eyebrow">${copy.hero.eyebrow}</p>
        <h1>${copy.hero.title}</h1>
        <p>${copy.hero.text}</p>
        <div class="hero-actions">
          <a class="button" href="${whatsappLink(copy.hero.primary)}" target="_blank" rel="noreferrer">${copy.hero.primary}</a>
          <a class="button secondary" href="#horarios">${copy.hero.secondary}</a>
        </div>
      </div>
      <div class="hero-proof">
        ${copy.hero.cards.map((card) => `<article><strong>${card[0]}</strong><span>${card[1]}</span></article>`).join("")}
      </div>
    </section>

    <section class="section">
      <div class="section-heading"><p class="eyebrow">${copy.benefits.eyebrow}</p><h2>${copy.benefits.title}</h2><p>${copy.benefits.text}</p></div>
      ${cardGrid(copy.benefits.items, 4)}
    </section>

    <section class="section soft">
      <div class="section-heading"><p class="eyebrow">${copy.shorinji.eyebrow}</p><h2>${copy.shorinji.title}</h2><p>${copy.shorinji.text}</p></div>
      ${cardGrid(copy.shorinji.blocks, 4)}
    </section>

    <section class="section" id="ninos">
      <div class="split">
        <div class="split-media" style="background-image:url('${settings.images.kids}')"></div>
        <div class="split-copy">
          <p class="eyebrow">${copy.kids.eyebrow}</p>
          <h2>${copy.kids.title}</h2>
          <p>${copy.kids.text}</p>
          <ul class="check-list">${copy.kids.items.map((item) => `<li>${item}</li>`).join("")}</ul>
          <a class="button" href="${whatsappLink(copy.kids.cta)}" target="_blank" rel="noreferrer">${copy.kids.cta}</a>
        </div>
      </div>
    </section>

    <section class="section soft" id="adultos">
      <div class="split">
        <div class="split-copy">
          <p class="eyebrow">${copy.adults.eyebrow}</p>
          <h2>${copy.adults.title}</h2>
          <p>${copy.adults.text}</p>
          <div class="grid-3">${copy.adults.items.map((item) => `<article class="card"><span>${item[0]}</span><h3>${item[0]}</h3><p>${item[1]}</p></article>`).join("")}</div>
        </div>
        <div class="split-media" style="background-image:url('${settings.images.adults}')"></div>
      </div>
    </section>

    <section class="section" id="club">
      <div class="club-intro">
        <div class="club-logo-panel">
          <img src="assets/logo-skbc-full.png" alt="Logo completo SKBC GIPUZKOA" />
        </div>
        <div>
          <p class="eyebrow">${copy.club.eyebrow}</p>
          <h2>${copy.club.title}</h2>
          <p>${copy.club.text}</p>
        </div>
      </div>
      ${cardGrid(copy.club.items, 3)}
    </section>

    <section class="section ika-band">
      <div class="ika-layout">
        <div>
          <p class="eyebrow">${copy.ika.eyebrow}</p>
          <h2>${copy.ika.title}</h2>
          <p>${copy.ika.text}</p>
          <p>${copy.ika.note || ""}</p>
          <a class="button" href="${settings.ikaUrl}" target="_blank" rel="noreferrer">${copy.ika.button}</a>
        </div>
        <div class="ika-badge">
          <img src="assets/ika-logo-white.png?v=2" alt="Logo International Kempo Association" />
          <strong>${copy.ika.badge || copy.ika.title}</strong>
          <span>International Kempo Association</span>
        </div>
      </div>
    </section>

    <section class="section">
      <div class="instructor-layout">
        <div class="instructor-photo" style="background-image:url('${peopleImages.alvaro || settings.images.learn}')"></div>
        <div class="instructor-copy">
          <p class="eyebrow">${copy.instructor.eyebrow}</p>
          <h2>${copy.instructor.title}</h2>
          <p>${copy.instructor.text}</p>
          <p>${copy.instructor.extra}</p>
        </div>
      </div>
    </section>

    <section class="section soft" id="equipo">
      <div class="section-heading"><p class="eyebrow">${copy.technicalTeam.eyebrow}</p><h2>${copy.technicalTeam.title}</h2><p>${copy.technicalTeam.text}</p></div>
      <div class="team-feature">
        <div class="team-feature__image" style="background-image:url('${peopleImages.technicalTeam || settings.images.adults}')"></div>
        <div>
          <h3>${copy.technicalTeam.groupTitle || copy.technicalTeam.title}</h3>
          <p>${copy.technicalTeam.groupText || copy.technicalTeam.text}</p>
        </div>
      </div>
      <div class="grid-2 person-grid">${copy.technicalTeam.leads.map((item, index) => personButton(item, "technical", index)).join("")}</div>
      <div class="profile-list">${copy.technicalTeam.members.map((item, index) => personButton(item, "technical", index + copy.technicalTeam.leads.length)).join("")}</div>
    </section>

    <section class="section">
      <div class="section-heading"><p class="eyebrow">${copy.board.eyebrow}</p><h2>${copy.board.title}</h2></div>
      <div class="profile-list">${copy.board.members.map((item, index) => personButton(item, "board", index)).join("")}</div>
    </section>

    <section class="section dark">
      <div class="section-heading"><p class="eyebrow">${copy.learn.eyebrow}</p><h2>${copy.learn.title}</h2><p>${copy.learn.text}</p></div>
    </section>

    <section class="section" id="galeria">
      <div class="section-heading"><p class="eyebrow">${copy.media.eyebrow}</p><h2>${copy.media.title}</h2><p>${copy.media.text}</p></div>
      <div class="link-list">${(settings.galleryLinks || []).map((item) => `<a href="${item.url}" target="_blank" rel="noreferrer">${item.label}</a>`).join("")}</div>
    </section>

    <section class="section dark" id="horarios">
      <div class="section-heading"><p class="eyebrow">${copy.schedule.eyebrow}</p><h2>${copy.schedule.title}</h2><p>${copy.schedule.text}</p></div>
      <div class="grid-3">
        <article class="card"><span>01</span><h3>${copy.schedule.kids}</h3></article>
        <article class="card"><span>02</span><h3>${copy.schedule.adults}</h3></article>
        <article class="card"><span>03</span><h3>${copy.schedule.place}</h3><p><a href="${settings.maps}" target="_blank" rel="noreferrer">${copy.schedule.maps}</a></p></article>
      </div>
    </section>

    ${calendarSection(settings, copy)}

    ${upcomingNewsSection(settings, copy)}

    <section class="section soft" id="redes">
      <div class="section-heading"><p class="eyebrow">${copy.social.eyebrow}</p><h2>${copy.social.title}</h2><p>${copy.social.text}</p></div>
      ${socialEmbeds.hasEmbeds ? `
        <div class="embed-layout">
          ${socialEmbeds.instagram}
          ${socialEmbeds.stories}
          ${socialEmbeds.youtube}
        </div>
      ` : ""}
      <div class="grid-3">
        <a class="card" href="${settings.instagram}" target="_blank" rel="noreferrer"><span>Instagram</span><h3>${copy.social.instagram}</h3></a>
        <a class="card" href="${settings.facebook}" target="_blank" rel="noreferrer"><span>Facebook</span><h3>${copy.social.facebook}</h3></a>
        <a class="card" href="${settings.youtube}" target="_blank" rel="noreferrer"><span>YouTube</span><h3>${copy.social.youtube}</h3></a>
      </div>
    </section>

    ${merchSection(settings, copy)}

    ${customSections(settings)}

    <section class="section soft" id="contacto">
      <div class="contact-layout">
        <div>
          <p class="eyebrow">${copy.contact.eyebrow}</p>
          <h2>${copy.contact.title}</h2>
          <p>${copy.contact.text}</p>
          <div class="social-row">
            <a href="${settings.instagram}" target="_blank" rel="noreferrer">Instagram</a>
            <a href="${settings.facebook}" target="_blank" rel="noreferrer">Facebook</a>
            <a href="${settings.youtube}" target="_blank" rel="noreferrer">YouTube</a>
          </div>
        </div>
        <form class="contact-form">
          <label>${copy.contact.name}<input name="name" required /></label>
          <label>${copy.contact.interest}<select name="interest">${copy.contact.options.map((option) => `<option>${option}</option>`).join("")}</select></label>
          <label>${copy.contact.message}<textarea name="message" rows="4" required></textarea></label>
          <button class="button" type="submit">${copy.contact.submit}</button>
        </form>
      </div>
    </section>
  `;

  document.querySelector(".contact-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = `${data.get("name")} · ${data.get("interest")} · ${data.get("message")}`;
    window.open(whatsappLink(text), "_blank", "noopener,noreferrer");
  });
  bindProfiles();
  bindCalendar();
  bindMerch();
}

function bindProfiles() {
  document.querySelectorAll("[data-profile]").forEach((button) => {
    button.addEventListener("click", () => {
      openProfile(JSON.parse(button.dataset.profile));
    });
  });
}

function bindCalendar() {
  document.querySelectorAll("[data-calendar-view]").forEach((button) => {
    button.addEventListener("click", () => {
      calendarState.view = button.dataset.calendarView;
      render();
    });
  });
  document.querySelectorAll("[data-calendar-step]").forEach((button) => {
    button.addEventListener("click", () => {
      const direction = Number(button.dataset.calendarStep);
      if (calendarState.view === "year") {
        calendarState.date = new Date(calendarState.date.getFullYear() + direction, calendarState.date.getMonth(), 1);
      } else if (calendarState.view === "quarter") {
        calendarState.date = new Date(calendarState.date.getFullYear(), calendarState.date.getMonth() + direction * 3, 1);
      } else {
        calendarState.date = new Date(calendarState.date.getFullYear(), calendarState.date.getMonth() + direction, 1);
      }
      render();
    });
  });
}

function bindMerch() {
  const products = merchProducts(state.content.settings);
  document.querySelectorAll("[data-add-merch]").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.addMerch);
      const product = products[index];
      if (!product) return;
      const quantity = Math.max(1, Number(document.querySelector(`[data-merch-quantity="${index}"]`)?.value || 1));
      state.merchCart.push({
        name: product.name,
        ref: product.jhkRef || "",
        price: Number(product.price || 0),
        size: document.querySelector(`[data-merch-size="${index}"]`)?.value || "",
        color: document.querySelector(`[data-merch-color="${index}"]`)?.value || "",
        quantity
      });
      render();
      document.querySelector("#merchandising")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  document.querySelectorAll("[data-remove-merch]").forEach((button) => {
    button.addEventListener("click", () => {
      state.merchCart.splice(Number(button.dataset.removeMerch), 1);
      render();
      document.querySelector("#merchandising")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
  document.querySelector(".merch-form")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const lines = [
      "Nuevo pedido merchandising SKBC GIPUZKOA",
      "",
      `Nombre: ${form.get("name")}`,
      `Teléfono: ${form.get("phone")}`,
      `Email: ${form.get("email") || "No indicado"}`,
      "",
      "Productos SKBC:",
      ...(state.merchCart.length ? state.merchCart.map((item) => `- ${item.name} · REF ${item.ref || "consultar"} · ${item.size} · ${item.color} · x${item.quantity} · ${money(Number(item.price) * Number(item.quantity))}`) : ["- Sin productos SKBC directos"]),
      "",
      `Total estimado: ${money(merchTotal())}`,
      "",
      "Producto personalizado JHK:",
      `Referencia/enlace: ${form.get("customReference") || "No indicado"}`,
      `Detalles: ${form.get("customDetails") || "No indicado"}`,
      "",
      `Forma de pago: ${form.get("payment")}`,
      `Comentarios: ${form.get("comments") || "Sin comentarios"}`
    ];
    window.open(whatsappLink(lines.join("\n")), "_blank", "noopener,noreferrer");
  });
}

function openProfile(profile) {
  const modal = document.querySelector("#profileModal");
  modal.querySelector("#profileRole").textContent = profile.role;
  modal.querySelector("#profileTitle").textContent = profile.name;
  modal.querySelector("#profileText").textContent = profile.text;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeProfile() {
  const modal = document.querySelector("#profileModal");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

document.querySelectorAll("[data-lang]").forEach((button) => {
  button.addEventListener("click", () => {
    state.lang = button.dataset.lang;
    localStorage.setItem("skbc_lang", state.lang);
    render();
  });
});

document.querySelector(".menu-button").addEventListener("click", () => {
  const nav = document.querySelector(".main-nav");
  const isOpen = nav.classList.toggle("is-open");
  document.querySelector(".menu-button").setAttribute("aria-expanded", String(isOpen));
});

document.querySelector(".profile-modal__close").addEventListener("click", closeProfile);
document.querySelector("#profileModal").addEventListener("click", (event) => {
  if (event.target.id === "profileModal") closeProfile();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeProfile();
});

window.addEventListener("scroll", () => {
  document.querySelector(".topbar").classList.toggle("is-scrolled", window.scrollY > 12);
}, { passive: true });

render();
