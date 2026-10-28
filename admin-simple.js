/* Task-based navigation layered over the existing, authenticated editors. */
(() => {
  const groups = [
    { id: 'home', label: 'Inicio', icon: '⌂', panels: [['dashboard', 'Inicio']] },
    { id: 'website', label: 'Editar web', icon: '✎', panels: [['es', 'Textos'], ['people', 'Equipo y personas'], ['settings', 'Fotos, horarios y contacto'], ['eu', 'Euskera'], ['en', 'Inglés'], ['custom', 'Otras secciones']] },
    { id: 'visual', label: 'Estilo visual', icon: '◐', panels: [['visual', 'Estilo visual']] },
    { id: 'updates', label: 'Calendario y noticias', icon: '▦', panels: [['events', 'Calendario'], ['news', 'Noticias']] },
    { id: 'shop', label: 'Tienda y pedidos', icon: '▤', panels: [['orders', 'Pedidos'], ['merch', 'Productos']] },
    { id: 'requests', label: 'Solicitudes', icon: '☰', panels: [['leads', 'Contactos'], ['kenshi', 'Accesos Kenshi'], ['testimonials', 'Testimonios']] },
    { id: 'configuration', label: 'Configuración', icon: '⚙', secondary: true, panels: [['tools', 'Copias y herramientas'], ['system', 'Google y ajustes técnicos'], ['advanced', 'Editor avanzado']] }
  ];
  const groupFor = panel => groups.find(group => group.panels.some(([key]) => key === panel));
  const escape = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
  let api;

  function home(events = []) {
    const actions = [
      ['es', '01', 'Cambiar textos o fotos', 'Actualiza el contenido de tu página.'],
      ['news', '02', 'Publicar una noticia', 'Cuenta las novedades del club.'],
      ['events', '03', 'Añadir un evento', 'Cursos, entrenamientos y fechas.'],
      ['orders', '04', 'Ver pedidos', 'Consulta y gestiona la tienda.'],
      ['leads', '05', 'Revisar solicitudes', 'Contactos, Kenshi y testimonios.']
    ];
    return `<div class="simple-welcome"><p class="simple-eyebrow">TU CLUB, AL DÍA</p><h2>¿Qué quieres hacer hoy?</h2><p>Elige una tarea. Te llevamos directamente a ella.</p></div>
      <div class="simple-tasks">${actions.map(([panel, number, title, description]) => `<button type="button" class="simple-task" data-open-panel="${panel}"><span class="simple-task__number">${number}</span><span><strong>${title}</strong><small>${description}</small></span><span aria-hidden="true">↗</span></button>`).join('')}</div>
      <div class="simple-home-footer"><section><h3>Próximas fechas</h3>${events.length ? events.slice(0, 3).map(event => `<div class="simple-event"><span>${escape(event.date)}</span><strong>${escape(event.title)}</strong></div>`).join('') : '<p>No hay eventos próximos en el calendario.</p>'}<button type="button" class="simple-text-button" data-open-panel="events">Abrir calendario →</button></section>
      <section class="simple-help"><h3>Editar → Revisar → Publicar</h3><p>Los cambios de la web se hacen públicos con <strong>Publicar cambios</strong>.</p><p>Las acciones de pedidos y solicitudes se guardan al realizarlas.</p><a href="index.html" target="_blank" rel="noreferrer">Ver cómo está la web ↗</a></section></div>`;
  }

  function install(callbacks) {
    api = callbacks;
    const aside = document.querySelector('#admin-shell aside');
    aside.innerHTML = `<p class="simple-nav-label">GESTIONAR</p><nav aria-label="Gestión de la web">${groups.map(group => `<button type="button" class="simple-nav${group.secondary ? ' simple-nav--secondary' : ''}" data-admin-group="${group.id}"><span aria-hidden="true">${group.icon}</span>${group.label}</button>`).join('')}</nav><div class="simple-sidebar-note">Un paso cada vez.<br>Tu web, sin complicaciones.</div>`;
    document.querySelector('#admin-shell').addEventListener('click', event => {
      const groupButton = event.target.closest('[data-admin-group]');
      if (groupButton) {
        const group = groups.find(item => item.id === groupButton.dataset.adminGroup);
        api.openPanel(group.panels[0][0]);
      }
      const panelButton = event.target.closest('[data-simple-panel]');
      if (panelButton) api.openPanel(panelButton.dataset.simplePanel);
      const toolButton = event.target.closest('[data-admin-tool]');
      if (toolButton) document.getElementById(toolButton.dataset.adminTool)?.click();
      const heading = event.target.closest('.mobile-collapse-toggle');
      if (heading) heading.setAttribute('aria-expanded', String(heading.closest('.editor-group').dataset.mobileCollapsed === 'false'));
    });
  }

  function enhance(panel) {
    const group = groupFor(panel) || groups[0];
    document.querySelectorAll('[data-admin-group]').forEach(button => {
      const active = button.dataset.adminGroup === group.id;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    const editor = document.querySelector('#editor');
    if (panel === 'events' && !editor.querySelector('[data-calendar-tools]')) {
      const actions = editor.querySelector('.event-bulk-actions');
      if (actions) {
        const details = document.createElement('details');
        details.className = 'simple-advanced';
        details.dataset.calendarTools = 'true';
        details.innerHTML = '<summary>Importar o duplicar calendario</summary><div class="simple-advanced__body intro-actions"></div>';
        const body = details.querySelector('div');
        [...actions.children].filter(child => child.id !== 'add-event').forEach(child => body.append(child));
        const sync = editor.querySelector('.calendar-sync-card');
        if (sync) details.append(sync);
        editor.querySelector('.editor-intro').after(details);
      }
    }
    if (panel === 'news') {
      const copy = editor.querySelector('.news-editor > .custom-card');
      if (copy) {
        const details = document.createElement('details');
        details.className = 'simple-advanced';
        details.innerHTML = '<summary>Textos de cabecera e idiomas</summary>';
        copy.before(details);
        details.append(copy);
      }
    }
    if (['orders', 'leads'].includes(panel)) {
      const cleanup = editor.querySelector('#delete-closed-orders, #delete-closed-leads');
      if (cleanup && !cleanup.closest('details')) {
        const details = document.createElement('details');
        details.className = 'simple-advanced';
        details.innerHTML = '<summary>Limpiar registros antiguos</summary>';
        cleanup.before(details);
        details.append(cleanup);
      }
    }
    const previousNav = editor.querySelector('.simple-subnav');
    if (previousNav && previousNav.dataset.panel !== panel) previousNav.remove();
    if (group.panels.length > 1 && !editor.querySelector('.simple-subnav')) {
      const nav = document.createElement('nav');
      nav.className = 'simple-subnav';
      nav.dataset.panel = panel;
      nav.setAttribute('aria-label', group.label);
      nav.innerHTML = group.panels.map(([key, label]) => `<button type="button" data-simple-panel="${key}"${key === panel ? ' aria-current="page"' : ''}>${label}</button>`).join('');
      editor.prepend(nav);
    }
    editor.querySelectorAll('.mobile-collapse-toggle').forEach(button => {
      button.setAttribute('aria-expanded', String(button.closest('.editor-group').dataset.mobileCollapsed === 'false'));
    });
    if (['orders', 'leads', 'kenshi', 'testimonials'].includes(panel)) {
      const note = editor.querySelector('.editor-intro > span');
      if (note) note.textContent = 'Las acciones de esta sección se guardan al realizarlas. No necesitas publicar la web.';
    }
  }

  function tools() {
    return `<div class="editor-intro"><p>Configuración</p><h2>Copias y herramientas</h2><span>Para cuando necesites una copia o recuperar el contenido publicado.</span></div><div class="simple-tools"><section><h3>Guardar una copia</h3><p>Descarga el contenido de esta sesión en un archivo.</p><button type="button" data-admin-tool="export">Descargar copia</button></section><section><h3>Recuperar una copia</h3><p>Importa un archivo y revísalo antes de publicar.</p><button type="button" data-admin-tool="import">Elegir archivo</button></section><section><h3>Volver a empezar</h3><p>Descarta los cambios de esta sesión y vuelve al contenido cargado al entrar.</p><button type="button" data-admin-tool="reset">Descartar cambios</button></section></div>`;
  }
  window.SKBC_ADMIN_SIMPLE = { groups, groupFor, home, install, enhance, tools };
})();
