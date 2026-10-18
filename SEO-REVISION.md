# Revisión SEO — 19 de octubre de 2026

La portada se ha encontrado en búsquedas públicas durante la revisión. Esto no confirma todas las URLs indexadas por Google, las posiciones ni el tráfico. Esa información requiere acceso a Search Console.

## Cambios comprobados

- Enlaces HTML rastreables a español, euskera e inglés; al cambiar de idioma, la URL y la etiqueta canonical corresponden al idioma elegido. El idioma guardado de otra visita no cambia el contenido de la URL española.
- Corrección de `sameAs`: la asociación internacional IKA es una entidad distinta del club y no debe figurar como si fuera otra identidad del mismo negocio.
- Eliminación de las fechas `lastmod` desactualizadas del sitemap. Se conservan las URLs públicas y las referencias recíprocas de idioma.
- Cuatro imágenes convertidas a WebP sin pérdida, conservando tamaño, transparencia y píxeles: de 2.825.677 a 1.525.548 bytes en conjunto (aproximadamente un 46 % menos). Las imágenes originales siguen disponibles. Las nuevas subidas del editor conservan su URL.
- Cabecera comprobada entre 320 y 768 píxeles, en los tres idiomas, para evitar controles fuera de la pantalla.

No se han medido Core Web Vitals con datos de usuarios reales. La reducción de bytes es verificable; no equivale a una mejora demostrada en posiciones o en esos indicadores.

## Activar la medición de Google

1. Abrir https://search.google.com/search-console/ con la cuenta de Google del club y comprobar si ya aparece la propiedad `https://www.skbcgipuzkoa.com/`. Hay un archivo de verificación de Google publicado; esto no permite saber quién tiene acceso ni garantiza una verificación vigente.
2. Si no aparece, añadir esa URL como propiedad de prefijo y seguir el método de verificación que Google ofrezca. Si solicita un archivo nuevo, será necesario publicarlo; el archivo existente puede pertenecer a otra cuenta.
3. En «Sitemaps», enviar `https://www.skbcgipuzkoa.com/sitemap.xml`.
4. En «Inspección de URLs», revisar la portada y sus variantes `?lang=eu` y `?lang=en`: estado de indexación, canonical elegida por Google y página renderizada. Solicitar indexación de las URLs principales tras revisar el resultado.
5. Consultar «Rendimiento» y «Indexación de páginas» para conocer búsquedas reales, impresiones, clics y exclusiones. Comparar periodos equivalentes; no hay garantía de plazos ni de posiciones.

## Siguientes mejoras de mayor interés

- Buscar primero si existe un Perfil de Empresa del club en Google Maps. Reclamar el existente evita duplicados. Mantener nombre, dirección, teléfono, categoría, horarios y enlace coherentes con la web, y añadir fotos actuales y reseñas auténticas.
- Preparar páginas útiles y diferenciadas sobre clases infantiles y clases para adultos en Tolosa: edades, horarios, ubicación, qué se practica y cómo probar. No crear páginas casi idénticas para cada municipio.
- Las traducciones siguen utilizando JavaScript para generar el contenido y actualizar el HTML inicial español. Google puede renderizar JavaScript, pero servir HTML propio con contenido y metadatos por idioma reduciría esa dependencia. Requiere integrar la generación con todas las vías de publicación del editor para no dejar información antigua.
- Priorizar información clara sobre Shorinji Kempo en Tolosa y defensa personal en Gipuzkoa; ampliar los temas según las consultas reales que muestre Search Console.

Fuentes oficiales:
- https://developers.google.com/search/docs/monitor-debug/search-console-start
- https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://support.google.com/business/answer/7091?hl=es
