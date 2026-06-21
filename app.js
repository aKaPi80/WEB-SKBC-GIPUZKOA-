const STORAGE_KEY = "skbc_content_v2";
const state = {
  content: loadContent(),
  lang: new URLSearchParams(location.search).get("lang") || localStorage.getItem("skbc_lang") || "es",
  merchCart: []
};

function loadContent() {
  return window.SKBC_CONTENT;
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

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function truncateText(value, maxLength = 165) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
}

function ratingStars(value) {
  const rating = Number(value);
  if (!Number.isFinite(rating) || rating < 1) return "";
  const safeRating = Math.max(1, Math.min(5, Math.round(rating)));
  return `<span class="testimonial-stars" aria-label="${safeRating} de 5 estrellas">${"★".repeat(safeRating)}${"☆".repeat(5 - safeRating)}</span>`;
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
  const list = Array.isArray(images)
    ? images
    : String(images || "")
      .split(/\r?\n|,/)
      .map((image) => image.trim());
  return [...new Set(list.filter(Boolean))].filter((image) => !blocked.has(image));
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
  es: { kids: "Ni\u00f1os", adults: "Adultos", club: "Club", team: "Equipo", learn: "Aprendizaje", schedule: "Horarios", calendar: "Calendario", gallery: "Galer\u00eda", testimonials: "Testimonios", faq: "FAQ", news: "Noticias", social: "Redes", merch: "Tienda", kenshi: "\u00c1rea Kenshi", contact: "Contacto", more: "M\u00e1s" },
  eu: { kids: "Haurrak", adults: "Helduak", club: "Kluba", team: "Taldea", learn: "Ikaskuntza", schedule: "Ordutegiak", calendar: "Egutegia", gallery: "Galeria", testimonials: "Testigantzak", faq: "FAQ", news: "Albisteak", social: "Sareak", merch: "Denda", kenshi: "Kenshi Gunea", contact: "Kontaktua", more: "Gehiago" },
  en: { kids: "Kids", adults: "Adults", club: "Club", team: "Team", learn: "Learning", schedule: "Schedule", calendar: "Calendar", gallery: "Gallery", testimonials: "Testimonials", faq: "FAQ", news: "News", social: "Social", merch: "Shop", kenshi: "Kenshi Area", contact: "Contact", more: "More" }
};

const NAV_KEYS = ["kids", "adults", "club", "team", "learn", "schedule", "calendar", "gallery", "testimonials", "faq", "news", "social", "merch", "kenshi", "contact"];

function systemSettings() {
  return state.content.settings.system || {};
}

function systemLogo(key, fallback) {
  return systemSettings()[key] || fallback;
}

function decorativeBackgroundSettings() {
  const config = systemSettings().decorativeBackground || {};
  const enabled = config.enabled === true || config.enabled === "true";
  const preset = ["paper", "kanji", "waves", "dojo", "custom"].includes(config.preset) ? config.preset : "paper";
  const opacity = Math.max(0, Math.min(0.35, Number(config.opacity || 0.08)));
  const scope = ["light", "all", "soft"].includes(config.scope) ? config.scope : "light";
  return {
    enabled,
    preset,
    customImage: String(config.customImage || "").trim(),
    opacity: Number.isFinite(opacity) ? opacity : 0.08,
    size: String(config.size || "520px").trim(),
    position: String(config.position || "center top").trim(),
    scope
  };
}

function navLabels() {
  const fallback = NAV_TEXT[state.lang] || NAV_TEXT.es;
  const configured = systemSettings().navLabels?.[state.lang];
  if (!configured) return fallback;
  const parts = String(configured).split("|").map((part) => part.trim());
  if (parts.length === NAV_KEYS.length - 1 && !parts.some((part) => /kenshi/i.test(part))) {
    parts.splice(NAV_KEYS.indexOf("kenshi"), 0, fallback.kenshi);
  }
  return NAV_KEYS.reduce((labels, key, index) => {
    labels[key] = parts[index] || fallback[key];
    return labels;
  }, {});
}

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

function eventDateKeys(event) {
  return Array.isArray(event.dates) ? event.dates.filter(Boolean) : [];
}

function eventExcludedDateKeys(event) {
  return Array.isArray(event.excludedDates) ? event.excludedDates.filter(Boolean) : [];
}

function eventCopy(event) {
  return event.languages?.[state.lang] || event.languages?.es || {};
}

function eventTouchesDate(event, date) {
  const current = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const key = dateKey(date);
  if (eventExcludedDateKeys(event).includes(key)) return false;
  if (eventDateKeys(event).includes(key)) return true;
  if (event.repeat?.enabled) {
    const start = parseDate(event.repeat.start || event.start);
    const until = parseDate(event.repeat.until || event.end || event.start);
    const interval = Math.max(1, Number(event.repeat.everyDays || 15));
    const startTime = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const untilTime = new Date(until.getFullYear(), until.getMonth(), until.getDate()).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    const diff = Math.round((current - startTime) / dayMs);
    return current >= startTime && current <= untilTime && diff >= 0 && diff % interval === 0;
  }
  const start = parseDate(event.start).getTime();
  const end = parseDate(event.end || event.start).getTime();
  return current >= start && current <= end;
}

function eventDateLabel(event) {
  const dates = eventDateKeys(event);
  if (dates.length) {
    const visible = dates.slice(0, 4).join(", ");
    return dates.length > 4 ? `${visible} +${dates.length - 4}` : visible;
  }
  if (event.repeat?.enabled) {
    return `${event.repeat.start || event.start} / cada ${event.repeat.everyDays || 15} días / hasta ${event.repeat.until || event.end || ""}`;
  }
  return `${event.start}${event.end && event.end !== event.start ? ` / ${event.end}` : ""}`;
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

function nextThreeMonths() {
  const now = new Date();
  const year = now.getFullYear();
  return Array.from({ length: 3 }, (_, index) => new Date(year, now.getMonth() + index, 1))
    .filter((month) => month.getFullYear() === year);
}

function fullYearMonths() {
  const year = new Date().getFullYear();
  return Array.from({ length: 12 }, (_, index) => new Date(year, index, 1));
}

function upcomingEvents(events) {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const threeMonthLimit = new Date(today.getFullYear(), today.getMonth() + 3, 0).getTime();
  const yearLimit = new Date(today.getFullYear(), 11, 31).getTime();
  const until = Math.min(threeMonthLimit, yearLimit);
  return events.filter((event) => {
    for (let time = start; time <= until; time += 24 * 60 * 60 * 1000) {
      if (eventTouchesDate(event, new Date(time))) return true;
    }
    return false;
  }).slice(0, 8);
}

function eventTouchesYear(event, year) {
  const start = new Date(year, 0, 1).getTime();
  const until = new Date(year, 11, 31).getTime();
  for (let time = start; time <= until; time += 24 * 60 * 60 * 1000) {
    if (eventTouchesDate(event, new Date(time))) return true;
  }
  return false;
}

function publicCalendarEvents(events) {
  const year = new Date().getFullYear();
  return events.filter((event) => eventTouchesYear(event, year));
}

function printEventNumber(event, eventNumbers) {
  if (!eventNumbers.has(event)) eventNumbers.set(event, eventNumbers.size + 1);
  return eventNumbers.get(event);
}

function printableMonthGrid(monthDate, events, copy, eventNumbers) {
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
      <span class="print-markers">
        ${dayEvents.slice(0, 4).map((event) => `<i style="--event-color:${event.color || "#1f6fa9"}">${printEventNumber(event, eventNumbers)}</i>`).join("")}
      </span>
    </span>`);
  }
  return `<article class="calendar-month">
    <h3>${monthName(monthDate)}</h3>
    <div class="calendar-weekdays"><span>L</span><span>M</span><span>X</span><span>J</span><span>V</span><span>S</span><span>D</span></div>
    <div class="calendar-days">${cells.join("")}</div>
  </article>`;
}

function printableCalendarHtml(events, copy) {
  const eventNumbers = new Map();
  const months = fullYearMonths().map((month) => printableMonthGrid(month, events, copy.calendar, eventNumbers)).join("");
  const eventList = Array.from(eventNumbers.entries())
    .sort((a, b) => a[1] - b[1])
    .map(([event, number]) => {
      const text = eventCopy(event);
      return `<li style="--event-color:${event.color || "#1f6fa9"}"><b>${number}</b><span><strong>${text.title || copy.calendar.empty}</strong><em>${eventDateLabel(event)}${event.location ? ` · ${event.location}` : ""}${text.description ? ` · ${text.description}` : ""}</em></span></li>`;
    })
    .join("");
  return `<!doctype html>
    <html lang="${state.lang}">
      <head>
        <meta charset="utf-8" />
        <title>${copy.calendar.title} \u00b7 SKBC GIPUZKOA</title>
        <style>
          @page { size: A4 landscape; margin: 8mm; }
          * { box-sizing: border-box; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body { margin: 0; color: #101113; font-family: Arial, sans-serif; }
          .print-header { display: flex; justify-content: space-between; align-items: end; gap: 12px; margin-bottom: 7px; border-bottom: 2px solid #101113; padding-bottom: 5px; }
          .print-header p { margin: 0; color: #c52727; font-size: 9px; font-weight: 900; text-transform: uppercase; }
          .print-header h1 { margin: 1px 0 0; font-size: 18px; line-height: 1; }
          .print-header strong { font-size: 10px; }
          .calendar-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; }
          .calendar-month { break-inside: avoid; border: 1px solid #d9dee7; border-radius: 4px; padding: 4px; }
          .calendar-month h3 { margin: 0 0 3px; font-size: 9px; text-transform: capitalize; }
          .calendar-weekdays, .calendar-days { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 2px; }
          .calendar-weekdays span { color: #59606c; font-size: 6px; font-weight: 900; text-align: center; }
          .calendar-day { min-height: 19px; border: 1px solid #eef0f4; border-radius: 2px; padding: 2px; overflow: hidden; }
          .calendar-day.is-empty { border-color: transparent; }
          .calendar-day strong { display: block; font-size: 7px; line-height: 1; }
          .print-markers { display: flex; flex-wrap: wrap; gap: 1px; margin-top: 1px; }
          .print-markers i { display: inline-grid; place-items: center; min-width: 10px; height: 10px; border: 1px solid var(--event-color); border-radius: 999px; color: #fff; background: var(--event-color); font-size: 5px; font-style: normal; font-weight: 900; line-height: 1; }
          .print-legend-title { margin: 5px 0 3px; color: #101113; font-size: 8px; font-weight: 900; text-transform: uppercase; }
          .print-legend { display: grid; grid-template-columns: repeat(2, 1fr); gap: 3px 8px; margin: 0; padding: 0; list-style: none; }
          .print-legend li { display: grid; grid-template-columns: 15px 1fr; gap: 4px; align-items: start; break-inside: avoid; font-size: 6.5px; line-height: 1.15; }
          .print-legend b { display: grid; place-items: center; width: 13px; height: 13px; border-radius: 999px; color: #fff; background: var(--event-color); font-size: 7px; }
          .print-legend strong { display: block; font-size: 7px; }
          .print-legend em { display: block; color: #59606c; font-style: normal; }
          .print-footer { margin-top: 4px; color: #59606c; font-size: 6px; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        <div class="print-header">
          <div><p>SKBC GIPUZKOA</p><h1>${copy.calendar.title}</h1></div>
          <strong>${new Date().getFullYear()}</strong>
        </div>
        <div class="calendar-grid calendar-grid--year">${months}</div>
        <h2 class="print-legend-title">Eventos programados</h2>
        <ul class="print-legend">${eventList}</ul>
        <div class="print-footer">${copy.calendar.printHint || ""}</div>
      </body>
    </html>`;
}

function openPrintableCalendar() {
  const copy = t();
  const events = (state.content.settings.events || []).filter((event) => event.enabled !== false);
  document.querySelector("#calendarPrintFrame")?.remove();
  const frame = document.createElement("iframe");
  frame.id = "calendarPrintFrame";
  frame.className = "print-frame";
  frame.onload = () => {
    setTimeout(() => {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    }, 250);
  };
  frame.srcdoc = printableCalendarHtml(events, copy);
  document.body.appendChild(frame);
}

function calendarSection(settings, copy) {
  const events = publicCalendarEvents((settings.events || []).filter((event) => event.enabled !== false));
  const upcoming = upcomingEvents(events);
  return `<section class="section calendar-section" id="calendario">
    <div class="section-heading">
      <p class="eyebrow">${copy.calendar.eyebrow}</p>
      <h2>${copy.calendar.title}</h2>
      <p>${copy.calendar.text}</p>
    </div>
    <div class="calendar-home-actions">
      <button class="button" type="button" data-open-calendar>${copy.calendar.openFull || "Ver calendario completo"}</button>
    </div>
    <div class="calendar-grid calendar-grid--quarter calendar-preview">
      ${nextThreeMonths().map((month) => monthGrid(month, events, copy.calendar)).join("")}
    </div>
    <div class="calendar-list">
      ${upcoming.length ? upcoming.map((event) => {
        const text = eventCopy(event);
        return `<article style="--event-color:${event.color || "#1f6fa9"}">
          <span>${eventDateLabel(event)}</span>
          <h3>${text.title || ""}</h3>
          <p>${event.location || ""}${event.location && text.description ? " · " : ""}${text.description || ""}</p>
        </article>`;
      }).join("") : `<p>${copy.calendar.empty}</p>`}
    </div>
    <div class="calendar-modal" id="calendarModal" aria-hidden="true">
      <div class="calendar-modal__panel" role="dialog" aria-modal="true" aria-label="${copy.calendar.title}">
        <div class="calendar-modal__header">
          <div>
            <p class="eyebrow">${copy.calendar.eyebrow}</p>
            <h2>${copy.calendar.title}</h2>
          </div>
          <div class="calendar-modal__actions">
            <button type="button" data-print-calendar>${copy.calendar.savePrint || copy.calendar.print || "Guardar / imprimir"}</button>
            <button type="button" data-close-calendar>${copy.calendar.back || "Volver"}</button>
          </div>
        </div>
        <p class="calendar-print-hint">${copy.calendar.printHint || ""}</p>
        <div class="print-area">
          <div class="calendar-grid calendar-grid--year calendar-print-grid">
            ${fullYearMonths().map((month) => monthGrid(month, events, copy.calendar)).join("")}
          </div>
          <div class="calendar-list calendar-print-list">
            ${events.length ? events.map((event) => {
              const text = eventCopy(event);
              return `<article style="--event-color:${event.color || "#1f6fa9"}">
                <span>${eventDateLabel(event)}</span>
                <h3>${text.title || ""}</h3>
                <p>${event.location || ""}${event.location && text.description ? " · " : ""}${text.description || ""}</p>
              </article>`;
            }).join("") : `<p>${copy.calendar.empty}</p>`}
          </div>
        </div>
      </div>
    </div>
  </section>`;
}

function newsExpiryTime(item) {
  const expiresAt = String(item?.expiresAt || "").trim();
  if (!expiresAt) return null;
  const expiresDate = new Date(expiresAt);
  return Number.isFinite(expiresDate.getTime()) ? expiresDate.getTime() : null;
}

function visibleNewsItems(settings) {
  const now = Date.now();
  return (settings.news || [])
    .filter((item) => {
      if (!item || item.enabled === false) return false;
      const expiry = newsExpiryTime(item);
      return expiry === null || expiry > now;
    })
    .sort((a, b) => String(a.date || "9999-12-31").localeCompare(String(b.date || "9999-12-31")));
}

function upcomingNewsSection(settings, copy) {
  const news = visibleNewsItems(settings);
  const cards = news.map((item) => {
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
  });
  const carouselCards = cards.length > 1 ? [...cards, ...cards] : cards;
  return `<section class="section soft" id="noticias">
    <div class="section-heading">
      <p class="eyebrow">${copy.news.eyebrow}</p>
      <h2>${copy.news.title}</h2>
      <p>${copy.news.text}</p>
    </div>
    <div class="news-carousel ${cards.length > 1 ? "is-animated" : ""}">
      ${cards.length ? `<div class="news-track">${carouselCards.join("")}</div>` : `<p>${copy.news.empty}</p>`}
    </div>
  </section>`;
}

function trialSection(copy) {
  if (!copy.trial) return "";
  const steps = copy.trial.steps || [];
  return `<section class="section trial-section" id="primer-mes-gratis">
    <div class="trial-layout">
      <div class="trial-copy">
        <p class="eyebrow">${copy.trial.eyebrow}</p>
        <h2>${copy.trial.title}</h2>
        <p>${copy.trial.text}</p>
        <div class="trial-actions">
          <a class="button" href="${whatsappLink(copy.trial.cta)}" target="_blank" rel="noreferrer">${copy.trial.cta}</a>
          <a class="button secondary" href="#horarios">${copy.trial.secondary || copy.hero?.secondary || "Ver horarios"}</a>
        </div>
      </div>
      <div class="trial-steps">
        ${steps.map((step) => `<article>
          <span>${escapeHtml(step[0] || "")}</span>
          <h3>${escapeHtml(step[1] || "")}</h3>
          <p>${escapeHtml(step[2] || "")}</p>
        </article>`).join("")}
      </div>
    </div>
  </section>`;
}

function testimonialsSection(copy) {
  const testimonials = copy.testimonials?.items || [];
  const carouselItems = testimonials.length > 2 ? [...testimonials, ...testimonials] : testimonials;
  return `<section class="section testimonials-section" id="testimonios">
    <div class="section-heading">
      <p class="eyebrow">${copy.testimonials.eyebrow || "Testimonios"}</p>
      <h2>${copy.testimonials.title}</h2>
      <p>${copy.testimonials.text}</p>
      <a class="button secondary testimonial-jump" href="#testimonialForm">${copy.testimonials.cta || copy.testimonials.submit || "Enviar testimonio"}</a>
    </div>
    ${testimonials.length ? `<div class="testimonial-carousel ${testimonials.length > 2 ? "is-animated" : ""}" aria-label="${copy.testimonials.title}">
      <div class="testimonial-track">
      ${carouselItems.map((item, index) => {
        const [audience, quote, name, image, rating] = item;
        const realIndex = index % testimonials.length;
        return `<button class="testimonial-card" type="button" data-testimonial-index="${realIndex}" aria-label="${copy.testimonials.readFull || "Leer testimonio completo"}">
          ${name ? `<strong>${escapeHtml(name)}</strong>` : ""}
          ${ratingStars(rating)}
          ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(name || audience)}" />` : ""}
          <span>${escapeHtml(audience || "")}</span>
          <blockquote>${escapeHtml(truncateText(quote))}</blockquote>
          <em>${copy.testimonials.readFull || "Leer completo"}</em>
        </button>`;
      }).join("")}
      </div>
    </div>` : `<p class="testimonial-empty">${copy.testimonials.empty || "Sin testimonios por el momento."}</p>`}
    <form class="testimonial-form" id="testimonialForm">
      <h3>${copy.testimonials.formTitle || copy.testimonials.title}</h3>
      ${copy.testimonials.formIntro ? `<p>${copy.testimonials.formIntro}</p>` : ""}
      <label>${copy.testimonials.name || "Nombre"}<input name="name" required /></label>
      <label>${copy.testimonials.role || "Relación con el club"}<select name="role">${(copy.testimonials.roles || []).map((role) => `<option>${role}</option>`).join("")}</select></label>
      <label>${copy.testimonials.rating || "Valoración"}<select name="rating">${[5, 4, 3, 2, 1].map((value) => `<option value="${value}">${value} / 5</option>`).join("")}</select></label>
      <label>${copy.testimonials.message || "Testimonio"}<textarea name="message" rows="4" required></textarea></label>
      <label>${copy.testimonials.photo || "Foto opcional"}<input name="photo" type="file" accept="image/png,image/jpeg,image/webp" /></label>
      <p>${copy.testimonials.consent || ""}</p>
      <button class="button" type="submit">${copy.testimonials.submit || "Enviar testimonio"}</button>
    </form>
  </section>`;
}

function kenshiSection(copy) {
  const kenshi = copy.kenshi || {};
  const perks = Array.isArray(kenshi.perks) ? kenshi.perks : [];
  const relationships = Array.isArray(kenshi.relationships) && kenshi.relationships.length
    ? kenshi.relationships
    : ["Alumno/a actual", "Padre/madre", "Antiguo alumno/a", "Quiero informarme"];
  return `<section class="section kenshi-section" id="kenshi">
    <div class="kenshi-layout">
      <div class="kenshi-copy">
        <p class="eyebrow">${kenshi.eyebrow || "Area privada"}</p>
        <h2>${kenshi.title || "Area Kenshi SKBC"}</h2>
        <p>${kenshi.text || "Solicita acceso al area privada del club. Revisaremos tu solicitud antes de activar el acceso."}</p>
        <div class="kenshi-perks">
          ${perks.map((item) => `<article><strong>${escapeHtml(item[0] || "")}</strong><span>${escapeHtml(item[1] || "")}</span></article>`).join("")}
        </div>
      </div>
      <form class="kenshi-form">
        <h3>${kenshi.formTitle || "Solicitar acceso"}</h3>
        <p>${kenshi.formIntro || "El acceso no es automatico. El club revisa cada solicitud."}</p>
        <label>${kenshi.name || "Nombre y apellidos"}<input name="full_name" required /></label>
        <label>${kenshi.email || "Email"}<input name="email" type="email" required /></label>
        <label>${kenshi.phone || "Telefono"}<input name="phone" inputmode="tel" /></label>
        <label>${kenshi.relationship || "Relacion con el club"}<select name="relationship">${relationships.map((option) => `<option>${escapeHtml(option)}</option>`).join("")}</select></label>
        <label>${kenshi.grade || "Grado o nivel"}<input name="grade" /></label>
        <label>${kenshi.message || "Mensaje"}<textarea name="message" rows="4"></textarea></label>
        <button class="button" type="submit">${kenshi.submit || "Enviar solicitud"}</button>
        <p class="kenshi-form-status" aria-live="polite"></p>
      </form>
    </div>
  </section>`;
}

function galleryCarousel(images = [], copy = t()) {
  const photos = Array.isArray(images) ? [...new Set(images.filter(Boolean))] : [];
  if (!photos.length) return "";
  const positions = state.content.settings.images?.positions?.gallery || [];
  const loopPhotos = photos.length > 1 ? [...photos, ...photos] : photos;
  return `<div class="gallery-carousel ${photos.length > 1 ? "is-animated" : ""}" aria-label="${copy.media?.title || "Galería"}">
    <div class="gallery-track">
      ${loopPhotos.map((image, index) => `<button class="gallery-photo" type="button" data-gallery-image="${escapeHtml(image)}" data-gallery-index="${index % photos.length}">
        <img src="${image}" alt="${copy.media?.title || "SKBC GIPUZKOA"} ${index % photos.length + 1}" loading="lazy" style="object-position:${escapeHtml(positions[index % photos.length] || "center center")}" />
      </button>`).join("")}
    </div>
  </div>`;
}

function learnSection(settings, copy) {
  const items = copy.learn.items || [
    ["Técnica", "Bases, desplazamientos, ataques, defensas y aplicaciones progresivas."],
    ["Filosofía", "Respeto, cooperación, autocontrol y desarrollo personal dentro y fuera del dojo."],
    ["Recursos", "Materiales de consulta para repasar conceptos y seguir aprendiendo entre clases."]
  ];
  const concepts = copy.learn.concepts || ["Chinkon Gyo", "Howa", "Taiso", "Kihon", "Waza", "Kappo", "Appo", "Seiho", "Embu", "Randori", "Ukemi"];
  const url = copy.learn.url || "#galeria";
  const externalAttrs = /^https?:\/\//.test(url) ? ` target="_blank" rel="noreferrer"` : "";
  return `<section class="section dark learn-section" id="aprendizaje">
    <div class="learn-layout">
      <div class="learn-copy">
        <p class="eyebrow">${copy.learn.eyebrow}</p>
        <h2>${copy.learn.title}</h2>
        <p>${copy.learn.text}</p>
        <div class="learn-pill-list">${concepts.map((concept) => `<span>${escapeHtml(concept)}</span>`).join("")}</div>
        <a class="button" href="${escapeHtml(url)}"${externalAttrs}>${copy.learn.button || "Ver recursos"}</a>
      </div>
      <div class="learn-panel">
        <div class="learn-photo" style="${backgroundImageStyle(settings.images.learn, "learn")}"></div>
        <div class="learn-cards">
          ${items.map((item, index) => `<article>
            <span>${String(index + 1).padStart(2, "0")}</span>
            <h3>${escapeHtml(item[0] || "")}</h3>
            <p>${escapeHtml(item[1] || "")}</p>
          </article>`).join("")}
        </div>
      </div>
    </div>
  </section>`;
}

function testimonialInboxConfig() {
  const config = state.content.settings.testimonialInbox || {};
  return {
    enabled: config.enabled === true || config.enabled === "true",
    supabaseUrl: String(config.supabaseUrl || "").replace(/\/+$/, ""),
    anonKey: String(config.anonKey || "").trim(),
    table: config.table || "skbc_testimonials",
    storageBucket: config.storageBucket || "skbc-testimonials"
  };
}

function orderInboxConfig() {
  const testimonialConfig = testimonialInboxConfig();
  const config = state.content.settings.orderInbox || {};
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
  const config = state.content.settings.leadInbox || {};
  return {
    enabled: config.enabled === true || config.enabled === "true",
    supabaseUrl: String(config.supabaseUrl || testimonialConfig.supabaseUrl || "").replace(/\/+$/, ""),
    anonKey: String(config.anonKey || testimonialConfig.anonKey || "").trim(),
    table: config.table || "skbc_leads",
    emailWebhookUrl: String(config.emailWebhookUrl || "").trim()
  };
}

function kenshiInboxConfig() {
  const testimonialConfig = testimonialInboxConfig();
  const config = state.content.settings.kenshiInbox || {};
  return {
    enabled: config.enabled === true || config.enabled === "true",
    supabaseUrl: String(config.supabaseUrl || testimonialConfig.supabaseUrl || "").replace(/\/+$/, ""),
    anonKey: String(config.anonKey || testimonialConfig.anonKey || "").trim(),
    table: config.table || "skbc_kenshi_members",
    emailWebhookUrl: String(config.emailWebhookUrl || "").trim()
  };
}

function privateNotificationWebhookUrl() {
  const orderConfig = state.content.settings.orderInbox || {};
  const leadConfig = state.content.settings.leadInbox || {};
  const testimonialConfig = state.content.settings.testimonialInbox || {};
  const kenshiConfig = state.content.settings.kenshiInbox || {};
  return String(
    kenshiConfig.emailWebhookUrl ||
    orderConfig.emailWebhookUrl ||
    leadConfig.emailWebhookUrl ||
    testimonialConfig.emailWebhookUrl ||
    ""
  ).trim();
}

function postPrivateNotification(type, subject, lines, payload = {}) {
  const url = privateNotificationWebhookUrl();
  if (!url) return;
  const message = Array.isArray(lines) ? lines.filter(Boolean).join("\n") : String(lines || "");
  fetch(url, {
    method: "POST",
    mode: "no-cors",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({
      notification_type: type,
      type,
      subject,
      title: subject,
      message,
      email_to: "alvarocalvo8@gmail.com",
      page_lang: state.lang,
      source: "website",
      submitted_at: new Date().toISOString(),
      payload,
      ...payload
    })
  }).catch(() => {});
}

async function submitLeadToSupabase(lead) {
  const config = leadInboxConfig();
  if (!config.enabled || !config.supabaseUrl || !config.anonKey) return false;
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${config.table}`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(lead)
  });
  if (!response.ok) throw new Error("No se pudo guardar el contacto en Supabase");
  postPrivateNotification("contact", "Nuevo contacto abierto en SKBC GIPUZKOA", [
    "Nuevo contacto abierto en la bandeja privada.",
    "",
    `Nombre: ${lead.name || "No indicado"}`,
    `Teléfono: ${lead.phone || "No indicado"}`,
    `Email: ${lead.email || "No indicado"}`,
    `Interés: ${lead.interest || "No indicado"}`,
    `Idioma: ${lead.page_lang || state.lang}`,
    "",
    `Mensaje: ${lead.message || "Sin mensaje"}`,
    "",
    "Revísalo en el admin de SKBC GIPUZKOA."
  ], lead);
  return true;
}

async function submitKenshiRequestToSupabase(request) {
  const config = kenshiInboxConfig();
  if (!config.enabled || !config.supabaseUrl || !config.anonKey) return false;
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${config.table}`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(request)
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.message || "No se pudo guardar la solicitud Kenshi");
  }
  postPrivateNotification("kenshi", "Nueva solicitud de Área Kenshi", [
    "Nueva solicitud de acceso al Área Kenshi.",
    "",
    `Nombre: ${request.full_name || "No indicado"}`,
    `Email: ${request.email || "No indicado"}`,
    `Teléfono: ${request.phone || "No indicado"}`,
    `Relación: ${request.relationship || "No indicado"}`,
    "",
    `Mensaje: ${request.message || "Sin mensaje"}`,
    "",
    "Revísalo en el admin de SKBC GIPUZKOA."
  ], request);
  return true;
}

async function signUpKenshiUser(request) {
  const config = kenshiInboxConfig();
  if (!config.enabled || !config.supabaseUrl || !config.anonKey) throw new Error("El Area Kenshi todavia no esta conectada");
  const authResponse = await fetch(`${config.supabaseUrl}/auth/v1/signup`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      email: request.email,
      password: request.password,
      data: {
        full_name: request.full_name,
        phone: request.phone,
        relationship: request.relationship,
        grade: request.grade
      }
    })
  });
  const authResult = await authResponse.json();
  if (!authResponse.ok) {
    throw new Error(authResult.error_description || authResult.msg || "No se pudo crear la cuenta");
  }
  const { password, ...safeRequest } = request;
  await submitKenshiRequestToSupabase({
    ...safeRequest,
    status: "pending",
    source: "kenshi_signup"
  });
  return authResult;
}

async function loginKenshiUser(email, password) {
  const config = kenshiInboxConfig();
  if (!config.enabled || !config.supabaseUrl || !config.anonKey) throw new Error("El Area Kenshi todavia no esta conectada");
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
    throw new Error(result.error_description || result.msg || "No se pudo iniciar sesion");
  }
  return result;
}

async function loadKenshiAccessForSession(session) {
  const config = kenshiInboxConfig();
  const email = session?.user?.email;
  if (!email) return null;
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${config.table}?email=eq.${encodeURIComponent(email)}&select=*&order=created_at.desc&limit=1`, {
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${session.access_token}`,
      "Content-Type": "application/json"
    }
  });
  const rows = await response.json();
  if (!response.ok) {
    throw new Error(rows.message || "No se pudo comprobar el acceso Kenshi");
  }
  return rows[0] || null;
}

async function uploadTestimonialPhoto(file) {
  const config = testimonialInboxConfig();
  if (!config.enabled || !config.supabaseUrl || !config.anonKey) return false;
  if (!file || !file.size) return "";
  const extension = file.name.includes(".") ? file.name.split(".").pop().toLowerCase() : "jpg";
  const safeName = file.name
    .replace(/\.[^.]+$/, "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42) || "testimonio";
  const filePath = `${Date.now()}-${safeName}.${extension}`;
  const response = await fetch(`${config.supabaseUrl}/storage/v1/object/${config.storageBucket}/${filePath}`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "false"
    },
    body: file
  });
  if (!response.ok) throw new Error("No se pudo subir la foto del testimonio");
  return `${config.supabaseUrl}/storage/v1/object/public/${config.storageBucket}/${filePath}`;
}

async function submitTestimonialToSupabase(payload, photoFile) {
  const config = testimonialInboxConfig();
  if (!config.enabled || !config.supabaseUrl || !config.anonKey) return false;
  const photoUrl = await uploadTestimonialPhoto(photoFile);
  const body = photoUrl ? { ...payload, photo_url: photoUrl } : payload;
  const insert = (insertBody) => fetch(`${config.supabaseUrl}/rest/v1/${config.table}`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(insertBody)
  });
  let response = await insert(body);
  if (!response.ok && (body.photo_url || body.rating)) {
    const fallbackBody = { ...body };
    delete fallbackBody.photo_url;
    delete fallbackBody.rating;
    response = await insert(fallbackBody);
  }
  if (!response.ok) throw new Error("No se pudo guardar el testimonio en Supabase");
  postPrivateNotification("testimonial", "Nuevo testimonio pendiente en SKBC GIPUZKOA", [
    "Hay un nuevo testimonio pendiente de revisar.",
    "",
    `Nombre: ${body.name || "No indicado"}`,
    `Perfil: ${body.role || "No indicado"}`,
    `Estrellas: ${body.rating || "No indicado"}`,
    `Idioma: ${body.page_lang || state.lang}`,
    body.photo_url ? `Foto: ${body.photo_url}` : "",
    "",
    `Testimonio: ${body.message || "Sin texto"}`,
    "",
    "Apruébalo o descártalo desde el admin."
  ], body);
  return true;
}

function faqSection(copy) {
  const items = copy.faq?.items || [];
  if (!items.length) return "";
  return `<section class="section soft faq-section" id="faq">
    <div class="section-heading">
      <p class="eyebrow">${copy.faq.eyebrow || "Preguntas frecuentes"}</p>
      <h2>${copy.faq.title}</h2>
      <p>${copy.faq.text}</p>
    </div>
    <div class="faq-list">
      ${items.map((item) => `<details>
        <summary>${item[0] || ""}</summary>
        <p>${item[1] || ""}</p>
      </details>`).join("")}
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
      <div class="merch-product__title">
        <h3>${product.name}</h3>
        <strong>${money(product.price)}</strong>
      </div>
      <p>${copy.merch.personalization}: ${product.personalization || "SKBC"}</p>
      <div class="swatches">
        ${colors.map((color) => `<i title="${color.code || ""} ${color.name || ""}" style="--swatch:${color.hex || "#d9dee7"}"></i>`).join("")}
      </div>
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
      <span><strong>${item.name}</strong><small>${item.size} · ${item.color} · x${item.quantity} · ${money(Number(item.price) * Number(item.quantity || 1))}</small></span>
      <button type="button" data-remove-merch="${index}">${copy.merch.remove}</button>
    </li>`).join("")}
  </ul>
  <p class="merch-total">${copy.merch.total}: <strong>${money(merchTotal())}</strong></p>`;
}

function merchWhatsappLines(order, copy) {
  return [
    "Nuevo pedido merchandising SKBC GIPUZKOA",
    "",
    `Nombre: ${order.customer_name}`,
    `Teléfono: ${order.customer_phone}`,
    `Email: ${order.customer_email || "No indicado"}`,
    "",
    "Productos SKBC:",
    ...(order.items.length ? order.items.map((item) => `- ${item.name} · REF ${item.ref || "consultar"} · ${item.size} · ${item.color} · x${item.quantity} · ${money(Number(item.price) * Number(item.quantity))}`) : ["- Sin productos SKBC directos"]),
    "",
    `Total estimado: ${money(order.total_estimated)}`,
    "",
    "Producto personalizado JHK:",
    `Referencia/enlace: ${order.custom_reference || "No indicado"}`,
    `Detalles: ${order.custom_details || "No indicado"}`,
    "",
    `Forma de pago: ${order.payment_method}`,
    `Comentarios: ${order.comments || "Sin comentarios"}`,
    "",
    copy.merch.orderThanks || ""
  ];
}

function merchOrderFromForm(form) {
  return {
    customer_name: String(form.get("name") || "").trim(),
    customer_phone: String(form.get("phone") || "").trim(),
    customer_email: String(form.get("email") || "").trim(),
    payment_method: String(form.get("payment") || "").trim(),
    custom_reference: String(form.get("customReference") || "").trim(),
    custom_details: String(form.get("customDetails") || "").trim(),
    comments: String(form.get("comments") || "").trim(),
    items: state.merchCart.map((item) => ({ ...item })),
    total_estimated: merchTotal(),
    status: "pending",
    source: "website",
    page_lang: state.lang
  };
}

async function submitMerchOrderToSupabase(order) {
  const config = orderInboxConfig();
  if (!config.enabled || !config.supabaseUrl || !config.anonKey) return false;
  const body = {
    customer_name: order.customer_name,
    customer_phone: order.customer_phone,
    customer_email: order.customer_email,
    payment_method: order.payment_method,
    custom_reference: order.custom_reference,
    custom_details: order.custom_details,
    comments: order.comments,
    items: order.items,
    total_estimated: order.total_estimated,
    status: order.status,
    source: order.source,
    page_lang: order.page_lang
  };
  const response = await fetch(`${config.supabaseUrl}/rest/v1/${config.table}`, {
    method: "POST",
    headers: {
      apikey: config.anonKey,
      Authorization: `Bearer ${config.anonKey}`,
      "Content-Type": "application/json",
      Prefer: "return=minimal"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error("No se pudo guardar el pedido en Supabase");
  postPrivateNotification("order", "Nuevo pedido abierto en SKBC GIPUZKOA", merchWhatsappLines(order, t()), order);
  return true;
}

function merchSection(settings, copy) {
  if (settings.merch?.enabled === false) return "";
  const products = merchProducts(settings);
  return `<section class="section merch-section" id="merchandising">
    <div class="merch-hero">
      <div>
        <p class="eyebrow">${copy.merch.eyebrow}</p>
        <h2>${copy.merch.title}</h2>
        <p>${copy.merch.text}</p>
      </div>
      <ol class="merch-steps">
        <li><strong>01</strong><span>${copy.merch.stepChoose || "Elige prenda, talla, color y cantidad."}</span></li>
        <li><strong>02</strong><span>${copy.merch.stepReserve || "Envia la reserva sin pago online."}</span></li>
        <li><strong>03</strong><span>${copy.merch.stepConfirm || "Te contactamos para confirmar disponibilidad y pago."}</span></li>
      </ol>
    </div>
    <div class="merch-layout">
      <div class="merch-catalog">
        <div class="merch-subheading">
          <span>${copy.merch.readyLabel || "Productos SKBC preparados"}</span>
          <p>${copy.merch.readyText || "Selecciona una de las prendas configuradas por el club."}</p>
        </div>
        ${products.map((product, index) => merchProductCard(product, index, copy)).join("")}
        <article class="merch-custom">
          <span>${copy.merch.customLabel || "Pedido especial"}</span>
          <h3>${copy.merch.customTitle}</h3>
          <p>${copy.merch.customText}</p>
          <a class="button secondary" href="${settings.merch?.catalogUrl || "https://www.jhktshirt.com/es/"}" target="_blank" rel="noreferrer">${copy.merch.catalog}</a>
        </article>
      </div>
      <aside class="merch-order">
        <h3>${copy.merch.orderTitle}</h3>
        <p class="merch-order-note">${copy.merch.orderIntro || "Revisa tu reserva. No se realiza ningun pago online."}</p>
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
          <p class="merch-form-status" aria-live="polite"></p>
        </form>
      </aside>
    </div>
  </section>`;
}

function parsePerson(person) {
  if (Array.isArray(person)) {
    const rawName = String(person[0] || "");
    const rawRole = String(person[1] || "");
    const [nameFromCombined, roleFromCombined = ""] = rawName.split(/\s*·\s*/);
    return {
      name: rawRole ? rawName : nameFromCombined,
      role: rawRole || roleFromCombined,
      text: person[2] || "",
      image: person[3] || ""
    };
  }
  const [name, role] = String(person).split(" · ");
  return { name, role: role || "", text: "", image: "" };
}

function profileText(person, group) {
  if (person.text) return person.text;
  const samePersonText = findPersonTextByName(person.name);
  if (samePersonText) return samePersonText;
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

function findPersonTextByName(name = "") {
  const normalized = normalizeName(String(name || "").split(/\s*Â·\s*|\s*Ã‚Â·\s*/)[0]);
  if (!normalized) return "";
  const copy = t();
  if (normalizeName(copy.instructor?.title || "") === normalized) {
    return [copy.instructor?.text, copy.instructor?.extra].filter(Boolean).join("\n\n");
  }
  const candidates = [
    ...(copy.technicalTeam?.leads || []),
    ...(copy.technicalTeam?.members || [])
  ];
  for (const item of candidates) {
    const profile = parsePerson(item);
    if (normalizeName(profile.name || "") === normalized && profile.text) return profile.text;
  }
  return "";
}

function normalizeName(name) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}

function imagePosition(key, fallback = "center center") {
  return state.content.settings.images?.positions?.[key] || fallback;
}

function backgroundImageStyle(image, positionKey, fallback = "center center") {
  return `background-image:url('${image}');background-position:${imagePosition(positionKey, fallback)}`;
}

function personImageKey(profile) {
  const name = String(profile.name || "").split(/\s*·\s*|\s*Â·\s*|\s*Ã‚Â·\s*/)[0];
  const normalized = normalizeName(name);
  if (normalized === "alvaro calvo") return "alvaro";
  if (normalized === "inaki ventureira") return "inaki";
  if (normalized === "andoni dominguez") return "andoni";
  if (normalized === "oskar mateos") return "oskar";
  if (normalized === "asier azurmendi") return "asier";
  if (normalized === "igone lasa") return "igone";
  if (normalized === "inaki iturrioz") return "iturrioz";
  if (normalized === "bharat martin") return "bharat";
  if (normalized === "pablo sanchez") return "pablo";
  if (normalized === "uxue garikano") return "uxue";
  if (normalized === "jorge redondo") return "jorge";
  return "";
}

function personImage(profile, index) {
  if (profile.image) return profile.image;
  const people = state.content.settings.images.people || {};
  const key = personImageKey(profile);
  if (key) return people[key];
  const name = String(profile.name || "").split(/\s*·\s*|\s*Â·\s*/)[0];
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

function personButton(person, group, index, extraClass = "") {
  const profile = parsePerson(person);
  const image = personImage(profile, index);
  const position = imagePosition(personImageKey(profile), "center 18%");
  const data = JSON.stringify({
    name: profile.name,
    role: profile.role,
    text: profileText(profile, group),
    image,
    position
  });
  return `<button class="person-card ${extraClass}" type="button" data-profile='${escapeHtml(data)}'>
    ${image ? `<span class="person-card__photo"><img src="${image}" alt="${profile.name}" style="object-position:${escapeHtml(position)}" /></span>` : ""}
    <span>${profile.role}</span>
    <strong>${profile.name}</strong>
  </button>`;
}

function personCarousel(items = [], group = "technical", startIndex = 0) {
  const people = Array.isArray(items) ? items.filter(Boolean) : [];
  if (!people.length) return "";
  const loopPeople = people.length > 1 ? [...people, ...people] : people;
  return `<div class="person-carousel ${people.length > 1 ? "is-animated" : ""}">
    <div class="person-track">
      ${loopPeople.map((item, index) => personButton(item, group, startIndex + (index % people.length), "person-card--carousel")).join("")}
    </div>
  </div>`;
}

function absoluteUrl(path = "") {
  if (/^https?:\/\//.test(path)) return path;
  return `https://www.skbcgipuzkoa.com/${String(path).replace(/^\/+/, "")}`;
}

function localizedUrl(lang = state.lang) {
  return lang === "es" ? "https://www.skbcgipuzkoa.com/" : `https://www.skbcgipuzkoa.com/?lang=${lang}`;
}

function ensureMeta(selector, create) {
  let element = document.head.querySelector(selector);
  if (!element) {
    element = create();
    document.head.appendChild(element);
  }
  return element;
}

function setMetaContent(selector, attrs, content) {
  const element = ensureMeta(selector, () => {
    const meta = document.createElement("meta");
    Object.entries(attrs).forEach(([key, value]) => meta.setAttribute(key, value));
    return meta;
  });
  element.setAttribute("content", content || "");
}

function setLink(selector, attrs) {
  const element = ensureMeta(selector, () => {
    const link = document.createElement("link");
    Object.entries(attrs).forEach(([key, value]) => link.setAttribute(key, value));
    return link;
  });
  Object.entries(attrs).forEach(([key, value]) => element.setAttribute(key, value));
}

function analyticsId() {
  const id = String(systemSettings().googleAnalyticsId || "").trim();
  return /^G-[A-Z0-9]+$/i.test(id) ? id : "";
}

function setupAnalytics() {
  const id = analyticsId();
  if (!id || document.querySelector("script[data-google-analytics]")) return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag(){ window.dataLayer.push(arguments); };
  window.gtag("js", new Date());
  window.gtag("config", id, { anonymize_ip: true });
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`;
  script.dataset.googleAnalytics = "true";
  document.head.appendChild(script);
}

function trackEvent(name, params = {}) {
  if (typeof window.gtag !== "function") return;
  window.gtag("event", name, {
    page_language: state.lang,
    ...params
  });
}

function setMeta(copy) {
  const system = systemSettings();
  document.documentElement.lang = state.lang;
  document.title = copy.seoTitle;
  document.querySelector("meta[name='description']").setAttribute("content", copy.seoDescription);
  const url = localizedUrl(state.lang);
  const image = absoluteUrl(system.socialImage || state.content.settings.images?.hero || "assets/logo-skbc-full.png");
  setLink("link[rel='canonical']", { rel: "canonical", href: url });
  setLink("link[rel='alternate'][hreflang='es']", { rel: "alternate", hreflang: "es", href: localizedUrl("es") });
  setLink("link[rel='alternate'][hreflang='eu']", { rel: "alternate", hreflang: "eu", href: localizedUrl("eu") });
  setLink("link[rel='alternate'][hreflang='en']", { rel: "alternate", hreflang: "en", href: localizedUrl("en") });
  setLink("link[rel='alternate'][hreflang='x-default']", { rel: "alternate", hreflang: "x-default", href: localizedUrl("es") });
  setLink("link[rel='icon']", { rel: "icon", href: system.favicon || "assets/logo-skbc.png" });
  setLink("link[rel='apple-touch-icon']", { rel: "apple-touch-icon", href: system.favicon || "assets/logo-skbc.png" });
  setMetaContent("meta[property='og:locale']", { property: "og:locale" }, state.lang === "eu" ? "eu_ES" : state.lang === "en" ? "en_GB" : "es_ES");
  setMetaContent("meta[property='og:title']", { property: "og:title" }, copy.seoTitle);
  setMetaContent("meta[property='og:description']", { property: "og:description" }, copy.seoDescription);
  setMetaContent("meta[property='og:url']", { property: "og:url" }, url);
  setMetaContent("meta[property='og:image']", { property: "og:image" }, image);
  setMetaContent("meta[name='twitter:title']", { name: "twitter:title" }, copy.seoTitle);
  setMetaContent("meta[name='twitter:description']", { name: "twitter:description" }, copy.seoDescription);
  setMetaContent("meta[name='twitter:image']", { name: "twitter:image" }, image);
  const schema = document.querySelector("#structured-data");
  if (schema) {
    schema.textContent = JSON.stringify({
      "@context": "https://schema.org",
      "@type": ["SportsActivityLocation", "LocalBusiness"],
      "@id": "https://www.skbcgipuzkoa.com/#club",
      name: system.siteName || "SKBC GIPUZKOA",
      alternateName: system.alternateName || "Kempo Basque Country Gipuzkoa",
      description: system.schemaDescription || copy.seoDescription,
      url: "https://www.skbcgipuzkoa.com/",
      logo: absoluteUrl(system.brandLogo || "assets/logo-skbc.png"),
      image,
      telephone: `+${state.content.settings.whatsapp || ""}`,
      sport: system.sport || "Shorinji Kempo",
      address: {
        "@type": "PostalAddress",
        streetAddress: system.streetAddress || "Garmendiola aldapa 2",
        addressLocality: system.addressLocality || "Tolosa",
        addressRegion: system.addressRegion || "Gipuzkoa",
        addressCountry: system.addressCountry || "ES"
      },
      areaServed: [system.addressLocality || "Tolosa", system.addressRegion || "Gipuzkoa", "Euskadi", "España"],
      sameAs: [state.content.settings.instagram, state.content.settings.facebook, state.content.settings.youtube, state.content.settings.ikaUrl].filter(Boolean),
      knowsAbout: String(system.knowsAbout || "Shorinji Kempo | artes marciales | defensa personal").split("|").map((item) => item.trim()).filter(Boolean)
    }, null, 2);
  }
}

function renderNav(copy) {
  const labels = navLabels();
  const system = systemSettings();
  const brandImage = document.querySelector(".brand-mark img");
  if (brandImage) {
    brandImage.src = systemLogo("brandLogo", "assets/logo-skbc.png");
    brandImage.alt = `Logo ${system.siteName || "SKBC GIPUZKOA"}`;
  }
  const brandTitle = document.querySelector(".brand strong");
  if (brandTitle) brandTitle.textContent = system.siteName || "SKBC GIPUZKOA";
  const brandSubtitle = document.querySelector(".brand small");
  if (brandSubtitle) brandSubtitle.textContent = system.brandSubtitle || "Shorinji Kempo · Tolosa";
  const baseNav = uniqueNavItems([
    { label: labels.kids, href: "#ninos" },
    { label: labels.adults, href: "#adultos" },
    { label: labels.club, href: "#club" },
    { label: labels.team, href: "#equipo" },
    { label: labels.learn, href: "#aprendizaje" },
    { label: labels.schedule, href: "#horarios" },
    { label: labels.calendar, href: "#calendario" },
    { label: labels.gallery, href: "#galeria" },
    { label: labels.testimonials, href: "#testimonios" },
    { label: labels.faq, href: "#faq" },
    { label: labels.news, href: "#noticias" },
    { label: labels.social, href: "#redes" },
    { label: labels.merch, href: "#merchandising" },
    ...customNavItems(state.content.settings),
    { label: labels.contact, href: "#contacto" }
  ]);
  const primaryHrefs = new Set(["#ninos", "#adultos", "#club", "#equipo", "#aprendizaje", "#horarios", "#calendario", "#testimonios", "#merchandising", "#contacto"]);
  const primaryNav = baseNav.filter((item) => primaryHrefs.has(item.href));
  const secondaryNav = baseNav.filter((item) => !primaryHrefs.has(item.href));
  document.querySelector(".main-nav").innerHTML = [
    ...primaryNav.map((item) => `<a href="${item.href}">${item.label}</a>`),
    secondaryNav.length ? `<details class="nav-more"><summary>${labels.more || "Más"}</summary><div>${secondaryNav.map((item) => `<a href="${item.href}">${item.label}</a>`).join("")}</div></details>` : ""
  ].join("");
  document.querySelector(".nav-cta").textContent = copy.ctaShort;
  document.querySelector(".nav-cta").href = whatsappLink(copy.contact.title);
  const kenshiAccess = document.querySelector(".kenshi-access");
  if (kenshiAccess) kenshiAccess.textContent = labels.kenshi || "Area Kenshi";
  document.querySelectorAll("[data-lang]").forEach((button) => {
    button.classList.toggle("active", button.dataset.lang === state.lang);
  });
  document.querySelector(".whatsapp-float").textContent = `WhatsApp · ${copy.ctaShort}`;
  document.querySelector(".whatsapp-float").href = whatsappLink(copy.contact.title);
}

function specialVisualSettings(settings) {
  const visual = settings.specialVisual || {};
  const allowedModes = new Set(["none", "christmas", "autumn", "carnival", "womensDay", "mourning"]);
  const allowedIntensities = new Set(["low", "medium", "high"]);
  const manual = {
    mode: allowedModes.has(visual.mode) ? visual.mode : "none",
    intensity: allowedIntensities.has(visual.intensity) ? visual.intensity : "medium",
    message: String(visual.message || "").trim()
  };
  const today = new Date();
  const todayKey = dateKey(today);
  const activeSchedule = (visual.schedule || []).find((item) => {
    if (!item || item.enabled === false) return false;
    if (!allowedModes.has(item.mode) || item.mode === "none") return false;
    const start = String(item.start || "").trim();
    const end = String(item.end || start).trim();
    return start && end && todayKey >= start && todayKey <= end;
  });
  if (!activeSchedule) return manual;
  return {
    mode: activeSchedule.mode,
    intensity: allowedIntensities.has(activeSchedule.intensity) ? activeSchedule.intensity : manual.intensity,
    message: String(activeSchedule.message || manual.message || "").trim()
  };
}

function specialVisualCopy(mode) {
  const labels = {
    es: {
      christmas: "Felices fiestas",
      autumn: "OtoÃ±o en el dojo",
      carnival: "Carnavales en Tolosa",
      womensDay: "8M · respeto, igualdad y confianza",
      mourning: "SKBC GIPUZKOA se suma al luto"
    },
    eu: {
      christmas: "Jai zoriontsuak",
      autumn: "Udazkena dojon",
      carnival: "Inauteriak Tolosan",
      womensDay: "M8 · errespetua, berdintasuna eta konfiantza",
      mourning: "SKBC GIPUZKOA doluarekin bat egiten du"
    },
    en: {
      christmas: "Happy holidays",
      autumn: "Autumn at the dojo",
      carnival: "Carnival in Tolosa",
      womensDay: "8M · respect, equality and confidence",
      mourning: "SKBC GIPUZKOA joins in mourning"
    }
  };
  return (labels[state.lang] || labels.es)[mode] || "";
}

function seasonalParticles(mode) {
  if (!["christmas", "autumn", "carnival"].includes(mode)) return "";
  return Array.from({ length: 42 }, (_, index) => {
    const x = (index * 17) % 101;
    const delay = -((index * 0.73) % 14).toFixed(2);
    const duration = 9 + (index % 9);
    const size = 6 + (index % 8);
    const drift = ((index % 2 ? 1 : -1) * (16 + (index % 5) * 8));
    return `<span style="--x:${x};--delay:${delay}s;--duration:${duration}s;--size:${size}px;--drift:${drift}px"></span>`;
  }).join("");
}

function specialVisualLayer(settings) {
  const visual = specialVisualSettings(settings);
  if (visual.mode === "none") return "";
  const message = escapeHtml(visual.message || specialVisualCopy(visual.mode));
  const particles = seasonalParticles(visual.mode);
  const layer = particles ? `<div class="seasonal-layer seasonal-layer--${visual.mode}" aria-hidden="true">${particles}</div>` : "";
  const icon = visual.mode === "mourning"
    ? `<svg class="mourning-ribbon" viewBox="0 0 220 300" aria-hidden="true" focusable="false">
        <defs>
          <linearGradient id="mourningRibbonA" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0" stop-color="#0b0f10" />
            <stop offset="0.48" stop-color="#293134" />
            <stop offset="1" stop-color="#050505" />
          </linearGradient>
          <linearGradient id="mourningRibbonB" x1="1" x2="0" y1="0" y2="1">
            <stop offset="0" stop-color="#111719" />
            <stop offset="0.5" stop-color="#4a5356" />
            <stop offset="1" stop-color="#030303" />
          </linearGradient>
        </defs>
        <path d="M110 20C63 20 38 55 47 98c7 34 31 70 63 111 31-41 56-77 63-111 9-43-16-78-63-78Zm0 34c24 0 36 16 32 39-4 20-17 44-32 68-16-24-29-48-33-68-4-23 9-39 33-39Z" fill="url(#mourningRibbonA)" />
        <path d="M102 143 28 272h55l73-128c15-26 21-47 16-71-3-17-11-31-24-40 6 33-5 65-46 110Z" fill="url(#mourningRibbonA)" />
        <path d="M119 143 192 272h-55L64 144C49 118 43 97 48 73c3-17 11-31 24-40-6 33 5 65 47 110Z" fill="url(#mourningRibbonB)" />
        <path d="M80 244h35l-31 43-15-29 11-14Zm60 0h-35l31 43 15-29-11-14Z" fill="#050505" />
      </svg>`
    : `<span aria-hidden="true"></span>`;
  const badge = message ? `<div class="special-badge special-badge--${visual.mode}">${icon}<strong>${message}</strong></div>` : "";
  return `${layer}${badge}`;
}

function alertBannerSettings(settings) {
  const banner = settings.alertBanner || {};
  const enabled = banner.enabled === true || banner.enabled === "true";
  const expiresAt = String(banner.expiresAt || "").trim();
  const expiresDate = expiresAt ? new Date(expiresAt) : null;
  const isExpired = expiresDate && Number.isFinite(expiresDate.getTime()) && expiresDate.getTime() <= Date.now();
  const allowedStyles = new Set(["construction", "vacation", "dojo", "info", "urgent"]);
  const textSource = banner.text && typeof banner.text === "object" ? banner.text : { es: banner.text || "" };
  const text = String(textSource[state.lang] || textSource.es || "").trim();
  return {
    enabled: enabled && !isExpired && Boolean(text),
    style: allowedStyles.has(banner.style) ? banner.style : "vacation",
    text,
    url: String(banner.url || "").trim()
  };
}

function alertBannerLayer(settings) {
  const banner = alertBannerSettings(settings);
  if (!banner.enabled) return "";
  const text = escapeHtml(banner.text);
  const repeatedText = Array.from({ length: 6 }, () => text).join(" · ");
  const content = `<span>${repeatedText} · </span><span aria-hidden="true">${repeatedText} · </span>`;
  const tag = banner.url ? "a" : "div";
  const attrs = banner.url ? ` href="${banner.url}" target="_blank" rel="noreferrer"` : "";
  return `
    <aside class="alert-ribbon alert-ribbon--${banner.style}" aria-label="${text}">
      <${tag} class="alert-ribbon__track"${attrs}>
        ${content}
      </${tag}>
    </aside>
  `;
}

function render() {
  const copy = t();
  const { settings } = state.content;
  const system = systemSettings();
  const decorative = decorativeBackgroundSettings();
  const visual = specialVisualSettings(settings);
  const alertBanner = alertBannerSettings(settings);
  document.documentElement.dataset.theme = settings.theme?.palette || "skbc";
  document.documentElement.dataset.overlay = settings.theme?.heroOverlay || "classic";
  document.documentElement.dataset.specialVisual = visual.mode;
  document.documentElement.dataset.specialIntensity = visual.intensity;
  document.documentElement.dataset.alertBanner = alertBanner.enabled ? alertBanner.style : "none";
  document.documentElement.dataset.decorativeBackground = decorative.enabled ? decorative.preset : "none";
  document.documentElement.dataset.decorativeScope = decorative.scope;
  document.documentElement.style.setProperty("--decorative-bg-size", decorative.size);
  document.documentElement.style.setProperty("--decorative-bg-position", decorative.position);
  document.documentElement.style.setProperty("--decorative-bg-opacity", decorative.opacity);
  document.documentElement.style.setProperty("--decorative-bg-image", decorative.preset === "custom" && decorative.customImage ? `url("${decorative.customImage}")` : "none");
  const peopleImages = settings.images.people || {};
  const socialEmbeds = embeddedSocial(settings);
  const galleryImages = uniqueImages(settings.images.gallery);
  setMeta(copy);
  setupAnalytics();
  renderNav(copy);

  document.querySelector("#app").innerHTML = `
    <section class="hero" id="inicio">
      <div class="hero-bg" style="${backgroundImageStyle(settings.images.hero, "hero")}"></div>
      <div class="hero-logo"><img src="${systemLogo("heroLogo", "assets/logo-skbc.png")}" alt="Logo ${system.siteName || "SKBC GIPUZKOA"}" /></div>
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

    ${trialSection(copy)}

    <section class="section" id="ninos">
      <div class="split">
        <div class="split-media" style="${backgroundImageStyle(settings.images.kids, "kids")}"></div>
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
        <div class="split-media" style="${backgroundImageStyle(settings.images.adults, "adults")}"></div>
      </div>
    </section>

    <section class="section" id="club">
      <div class="club-intro">
        <div class="club-logo-panel">
          <img src="${systemLogo("clubLogo", "assets/logo-skbc-full.png")}" alt="Logo completo ${system.siteName || "SKBC GIPUZKOA"}" />
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
        <div class="instructor-photo" style="${backgroundImageStyle(peopleImages.alvaro || settings.images.learn, "alvaro", "center 18%")}"></div>
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
        <div class="team-feature__image" style="${backgroundImageStyle(peopleImages.technicalTeam || settings.images.adults, "technicalTeam")}"></div>
        <div>
          <h3>${copy.technicalTeam.groupTitle || copy.technicalTeam.title}</h3>
          <p>${copy.technicalTeam.groupText || copy.technicalTeam.text}</p>
        </div>
      </div>
      ${personCarousel([...(copy.technicalTeam.leads || []), ...(copy.technicalTeam.members || [])], "technical")}
    </section>

    <section class="section">
      <div class="section-heading"><p class="eyebrow">${copy.board.eyebrow}</p><h2>${copy.board.title}</h2></div>
      ${personCarousel(copy.board.members || [], "board")}
    </section>

    ${learnSection(settings, copy)}

    <section class="section" id="galeria">
      <div class="section-heading"><p class="eyebrow">${copy.media.eyebrow}</p><h2>${copy.media.title}</h2><p>${copy.media.text}</p></div>
      ${galleryCarousel(galleryImages, copy)}
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

    ${testimonialsSection(copy)}

    ${faqSection(copy)}

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
          <label>${copy.contact.phone || "Teléfono"}<input name="phone" inputmode="tel" /></label>
          <label>${copy.contact.email || "Email"}<input name="email" type="email" /></label>
          <label>${copy.contact.interest}<select name="interest">${copy.contact.options.map((option) => `<option>${option}</option>`).join("")}</select></label>
          <label>${copy.contact.message}<textarea name="message" rows="4" required></textarea></label>
          <button class="button" type="submit">${copy.contact.submit}</button>
        </form>
      </div>
    </section>
    ${alertBannerLayer(settings)}
    ${specialVisualLayer(settings)}
  `;

  document.querySelector(".contact-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const lead = {
      name: String(data.get("name") || "").trim(),
      phone: String(data.get("phone") || "").trim(),
      email: String(data.get("email") || "").trim(),
      interest: String(data.get("interest") || "").trim(),
      message: String(data.get("message") || "").trim(),
      status: "new",
      source: "website_contact",
      page_lang: state.lang
    };
    try {
      await submitLeadToSupabase(lead);
      trackEvent("contact_submit", { interest: lead.interest, saved: true });
    } catch (error) {
      console.warn(error);
      trackEvent("contact_submit", { interest: lead.interest, saved: false });
    }
    const text = `${lead.name} · ${lead.phone || "-"} · ${lead.email || "-"} · ${lead.interest} · ${lead.message}`;
    window.open(whatsappLink(text), "_blank", "noopener,noreferrer");
  });
  document.querySelectorAll("a[href*='wa.me']").forEach((link) => {
    link.addEventListener("click", () => trackEvent("whatsapp_click", { label: link.textContent.trim().slice(0, 80) }));
  });
  bindTestimonials(copy);
  bindTestimonialCards(copy);
  bindGalleryPhotos();
  bindProfiles();
  bindCalendar();
  bindMerch(copy);
  bindKenshiPortal(copy);
}

function bindTestimonials(copy) {
  document.querySelector(".testimonial-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const photoFile = form.get("photo");
    const payload = {
      name: String(form.get("name") || "").trim(),
      role: String(form.get("role") || "").trim(),
      message: String(form.get("message") || "").trim(),
      rating: Number(form.get("rating") || 5),
      page_lang: state.lang,
      status: "pending",
      source: "website"
    };
    try {
      const saved = await submitTestimonialToSupabase(payload, photoFile);
      if (saved) {
        formElement.reset();
        alert(copy.testimonials.thanks || "Gracias. Revisaremos el testimonio antes de publicarlo.");
        return;
      }
    } catch (error) {
      alert(`${error.message}. Se abrirá WhatsApp como alternativa.`);
    }
    const text = [
      "Nuevo testimonio para SKBC GIPUZKOA",
      "",
      `Nombre: ${payload.name}`,
      `Perfil: ${payload.role}`,
      "",
      `Testimonio: ${payload.message}`,
      "",
      "Pendiente de aprobación antes de publicarse en la web."
    ].join("\n");
    window.open(whatsappLink(text), "_blank", "noopener,noreferrer");
    formElement.reset();
    alert(copy.testimonials.thanks || "Gracias. Revisaremos el testimonio antes de publicarlo.");
  });
}

function bindKenshi(copy) {
  document.querySelector(".kenshi-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const status = formElement.querySelector(".kenshi-form-status");
    const form = new FormData(formElement);
    const request = {
      full_name: String(form.get("full_name") || "").trim(),
      email: String(form.get("email") || "").trim(),
      phone: String(form.get("phone") || "").trim(),
      relationship: String(form.get("relationship") || "").trim(),
      grade: String(form.get("grade") || "").trim(),
      message: String(form.get("message") || "").trim(),
      status: "pending",
      page_lang: state.lang,
      source: "website_kenshi"
    };
    if (!request.full_name || !request.email) return;
    const kenshi = copy.kenshi || {};
    if (status) status.textContent = kenshi.sending || "Enviando solicitud...";
    try {
      const saved = await submitKenshiRequestToSupabase(request);
      if (!saved) throw new Error(kenshi.notConfigured || "El Area Kenshi todavia no esta conectada");
      formElement.reset();
      if (status) status.textContent = kenshi.thanks || "Solicitud enviada. El club la revisara antes de activar el acceso.";
      alert(kenshi.thanks || "Solicitud enviada. El club la revisara antes de activar el acceso.");
    } catch (error) {
      const message = `${error.message || "No se pudo enviar la solicitud"}.`;
      if (status) status.textContent = message;
      alert(message);
    }
  });
}

function bindKenshiPortal(copy) {
  const modal = document.querySelector("#kenshiModal");
  if (!modal) return;
  const kenshi = copy.kenshi || {};
  modal.querySelector("#kenshiModalEyebrow").textContent = kenshi.eyebrow || "Area privada";
  modal.querySelector("#kenshiModalTitle").textContent = kenshi.title || "Area Kenshi SKBC";
  modal.querySelector("#kenshiModalText").textContent = kenshi.text || "Acceso privado para miembros aprobados del club.";
  const status = modal.querySelector(".kenshi-auth-status");
  const privatePanel = modal.querySelector(".kenshi-private-panel");
  document.querySelectorAll("[data-open-kenshi]").forEach((button) => {
    button.addEventListener("click", () => openKenshiModal());
  });
  modal.querySelector(".kenshi-modal__close")?.addEventListener("click", closeKenshiModal);
  modal.addEventListener("click", (event) => {
    if (event.target.id === "kenshiModal") closeKenshiModal();
  });
  modal.querySelectorAll("[data-kenshi-tab]").forEach((button) => {
    button.addEventListener("click", () => activateKenshiTab(button.dataset.kenshiTab));
  });
  modal.querySelector('[data-kenshi-form="register"]')?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const request = {
      full_name: String(form.get("full_name") || "").trim(),
      email: String(form.get("email") || "").trim(),
      password: String(form.get("password") || ""),
      phone: String(form.get("phone") || "").trim(),
      relationship: String(form.get("relationship") || "").trim(),
      grade: String(form.get("grade") || "").trim(),
      message: String(form.get("message") || "").trim(),
      page_lang: state.lang
    };
    if (status) status.textContent = kenshi.sending || "Creando cuenta y enviando solicitud...";
    try {
      await signUpKenshiUser(request);
      event.currentTarget.reset();
      if (status) status.textContent = kenshi.registerThanks || "Cuenta creada y solicitud enviada. Cuando el club apruebe el acceso, podras entrar con este email y contraseña.";
    } catch (error) {
      if (status) status.textContent = error.message || "No se pudo crear la cuenta.";
    }
  });
  modal.querySelector('[data-kenshi-form="login"]')?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    if (status) status.textContent = kenshi.checking || "Comprobando acceso...";
    privatePanel.hidden = true;
    try {
      const session = await loginKenshiUser(String(form.get("email") || "").trim(), String(form.get("password") || ""));
      const access = await loadKenshiAccessForSession(session);
      if (!access) {
        if (status) status.textContent = kenshi.noRequest || "Cuenta creada, pero no encontramos una solicitud Kenshi asociada. Solicita acceso desde la pestaña Registrarme.";
        return;
      }
      if (access.status === "approved") {
        if (status) status.textContent = kenshi.approved || "Acceso aprobado.";
        privatePanel.hidden = false;
        return;
      }
      if (access.status === "revoked") {
        if (status) status.textContent = kenshi.revoked || "Tu acceso Kenshi ha sido revocado por el club.";
        return;
      }
      if (access.status === "rejected") {
        if (status) status.textContent = kenshi.rejected || "Tu solicitud no ha sido aprobada.";
        return;
      }
      if (status) status.textContent = kenshi.pending || "Tu solicitud esta pendiente de aprobacion por el club.";
    } catch (error) {
      if (status) status.textContent = error.message || "No se pudo iniciar sesion.";
    }
  });
}

function openKenshiModal() {
  document.querySelector("#kenshiModal")?.classList.add("is-open");
  document.querySelector("#kenshiModal")?.setAttribute("aria-hidden", "false");
}

function closeKenshiModal() {
  document.querySelector("#kenshiModal")?.classList.remove("is-open");
  document.querySelector("#kenshiModal")?.setAttribute("aria-hidden", "true");
}

function activateKenshiTab(tab) {
  const modal = document.querySelector("#kenshiModal");
  modal?.querySelectorAll("[data-kenshi-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.kenshiTab === tab);
  });
  modal?.querySelectorAll("[data-kenshi-form]").forEach((form) => {
    form.classList.toggle("active", form.dataset.kenshiForm === tab);
  });
  const status = modal?.querySelector(".kenshi-auth-status");
  const privatePanel = modal?.querySelector(".kenshi-private-panel");
  if (status) status.textContent = "";
  if (privatePanel) privatePanel.hidden = true;
}

function bindProfiles() {
  document.querySelectorAll("[data-profile]").forEach((button) => {
    button.addEventListener("click", () => {
      openProfile(JSON.parse(button.dataset.profile));
    });
  });
}

function bindGalleryPhotos() {
  document.querySelectorAll("[data-gallery-image]").forEach((button) => {
    button.addEventListener("click", () => openGalleryImage(button.dataset.galleryImage));
  });
}

function bindTestimonialCards(copy) {
  document.querySelectorAll("[data-testimonial-index]").forEach((button) => {
    button.addEventListener("click", () => {
      const testimonials = copy.testimonials?.items || [];
      const item = testimonials[Number(button.dataset.testimonialIndex)];
      if (item) openTestimonial(item, copy);
    });
  });
}

function bindCalendar() {
  document.querySelector("[data-open-calendar]")?.addEventListener("click", () => {
    document.querySelector("#calendarModal")?.classList.add("is-open");
    document.querySelector("#calendarModal")?.setAttribute("aria-hidden", "false");
  });
  document.querySelector("[data-close-calendar]")?.addEventListener("click", closeCalendarModal);
  document.querySelector("[data-print-calendar]")?.addEventListener("click", openPrintableCalendar);
  document.querySelector("#calendarModal")?.addEventListener("click", (event) => {
    if (event.target.id === "calendarModal") closeCalendarModal();
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

function closeCalendarModal() {
  document.querySelector("#calendarModal")?.classList.remove("is-open");
  document.querySelector("#calendarModal")?.setAttribute("aria-hidden", "true");
}

function bindMerch(copy = t()) {
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
  document.querySelector(".merch-form")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const statusElement = formElement.querySelector(".merch-form-status");
    const form = new FormData(formElement);
    const order = merchOrderFromForm(form);
    if (!order.items.length && !order.custom_reference && !order.custom_details) {
      if (statusElement) statusElement.textContent = copy.merch.orderRequired || "Añade algún producto antes de enviar el pedido.";
      alert(copy.merch.orderRequired || "Añade algún producto antes de enviar el pedido.");
      return;
    }
    const lines = merchWhatsappLines(order, copy);
    if (statusElement) statusElement.textContent = "Enviando pedido...";
    try {
      const saved = await submitMerchOrderToSupabase(order);
      if (saved) {
        state.merchCart = [];
        formElement.reset();
        render();
        document.querySelector(".merch-form-status")?.replaceChildren(document.createTextNode(copy.merch.orderThanks || "Pedido guardado correctamente."));
        if (confirm(`${copy.merch.orderThanks || "Pedido guardado correctamente."}\n\n${copy.merch.whatsappOptional || "¿Enviar también por WhatsApp?"}`)) {
          window.open(whatsappLink(lines.join("\n")), "_blank", "noopener,noreferrer");
        }
        return;
      }
    } catch (error) {
      if (statusElement) statusElement.textContent = copy.merch.orderError || `${error.message}. Se abrirá WhatsApp como alternativa.`;
      alert(copy.merch.orderError || `${error.message}. Se abrirá WhatsApp como alternativa.`);
    }
    window.open(whatsappLink(lines.join("\n")), "_blank", "noopener,noreferrer");
  });
}

function openProfile(profile) {
  const modal = document.querySelector("#profileModal");
  const imageElement = modal.querySelector("#profileImage");
  if (profile.image) {
    imageElement.src = profile.image;
    imageElement.alt = profile.name;
    imageElement.style.objectPosition = profile.position || "center 18%";
    imageElement.hidden = false;
  } else {
    imageElement.hidden = true;
    imageElement.removeAttribute("src");
    imageElement.style.objectPosition = "";
  }
  modal.querySelector("#profileRole").textContent = profile.role;
  modal.querySelector("#profileTitle").textContent = profile.name;
  modal.querySelector("#profileText").textContent = profile.text;
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function openGalleryImage(image) {
  if (!image) return;
  const modal = document.querySelector("#galleryModal");
  const imageElement = modal.querySelector("#galleryModalImage");
  imageElement.src = image;
  imageElement.alt = t().media?.title || "Galería SKBC GIPUZKOA";
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function openTestimonial(item, copy) {
  const [audience, quote, name, image, rating] = item;
  const modal = document.querySelector("#testimonialModal");
  modal.querySelector("#testimonialModalName").textContent = name || copy.testimonials.title || "Testimonio";
  modal.querySelector("#testimonialModalRole").textContent = audience || "";
  modal.querySelector("#testimonialModalStars").innerHTML = ratingStars(rating);
  modal.querySelector("#testimonialModalText").textContent = quote || "";
  const imageElement = modal.querySelector("#testimonialModalImage");
  if (image) {
    imageElement.src = image;
    imageElement.alt = name || audience || "Testimonio";
    imageElement.hidden = false;
  } else {
    imageElement.hidden = true;
    imageElement.removeAttribute("src");
  }
  modal.classList.add("is-open");
  modal.setAttribute("aria-hidden", "false");
}

function closeTestimonial() {
  const modal = document.querySelector("#testimonialModal");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function closeProfile() {
  const modal = document.querySelector("#profileModal");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
}

function closeGalleryImage() {
  const modal = document.querySelector("#galleryModal");
  const imageElement = modal.querySelector("#galleryModalImage");
  modal.classList.remove("is-open");
  modal.setAttribute("aria-hidden", "true");
  imageElement.removeAttribute("src");
}

document.querySelectorAll("[data-lang]").forEach((button) => {
  button.addEventListener("click", () => {
    state.lang = button.dataset.lang;
    localStorage.setItem("skbc_lang", state.lang);
    trackEvent("language_change", { language: state.lang });
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
document.querySelector(".testimonial-modal__close").addEventListener("click", closeTestimonial);
document.querySelector("#testimonialModal").addEventListener("click", (event) => {
  if (event.target.id === "testimonialModal") closeTestimonial();
});
document.querySelector(".gallery-modal__close").addEventListener("click", closeGalleryImage);
document.querySelector("#galleryModal").addEventListener("click", (event) => {
  if (event.target.id === "galleryModal") closeGalleryImage();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeProfile();
    closeGalleryImage();
    closeTestimonial();
  }
});

window.addEventListener("scroll", () => {
  document.querySelector(".topbar").classList.toggle("is-scrolled", window.scrollY > 12);
}, { passive: true });

render();
