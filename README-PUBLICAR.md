# Web SKBC GIPUZKOA para GitHub Pages

Esta carpeta contiene la versión pública lista para subir a GitHub Pages.

## Archivos incluidos

- `index.html`
- `styles.css`
- `app.js`
- `content.js`
- `assets/`
- `feeds/`

## Cómo publicarla

1. Crea un repositorio nuevo en GitHub llamado, por ejemplo:
   `web-skbc-gipuzkoa`
2. Sube todo el contenido de esta carpeta a ese repositorio.
3. En GitHub entra en:
   `Settings > Pages`
4. En `Build and deployment`, elige:
   - Source: `Deploy from a branch`
   - Branch: `main`
   - Folder: `/root`
5. Guarda.
6. GitHub generará una URL parecida a:
   `https://TU-USUARIO.github.io/web-skbc-gipuzkoa/`

## Importante sobre el editor

El editor local (`admin.html`) no está incluido en esta carpeta pública.

Motivo: en GitHub Pages una web estática no puede guardar cambios reales en los archivos publicados. El editor solo guarda en el navegador local. Para cambiar textos de la web publicada, hay que editar localmente y volver a subir los archivos actualizados, o montar un CMS/editor con backend.
