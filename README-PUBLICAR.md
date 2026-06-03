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

La web incluye un editor online en:

```text
https://akapi80.github.io/WEB-SKBC-GIPUZKOA-/admin.html
```

Ese editor puede publicar cambios en `content.js` usando la API de GitHub.

## Token recomendado para editar desde iPad

Crear un token fino en GitHub:

1. GitHub > Settings > Developer settings > Personal access tokens > Fine-grained tokens.
2. Generate new token.
3. Repository access: solo `WEB-SKBC-GIPUZKOA-`.
4. Permissions:
   - Contents: Read and write.
5. Copiar el token.
6. Abrir `admin.html` desde iPad.
7. Pulsar `Publicar en GitHub`.
8. Pegar el token cuando lo pida.

No uses un token con permisos amplios. Si se pierde el iPad o navegador, revoca el token desde GitHub.
