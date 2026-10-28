# Mejoras del editor aprobadas

Objetivo: vista previa de la sesión con ordenador/móvil, acceso a campos desde la vista previa, resumen de cambios antes de publicar y explicación de efectos manuales/programados. Sin borradores persistentes ni historial.

- [x] Crear `admin-editor-tools.js`: comparación de contenido por campos y listas, inventario de campos, explicación de efectos y destinos de edición; pruebas con Node VM.
- [x] Crear `admin-workspace.js`: controles de cabecera, contador de cambios, diálogo de revisión, diálogo de vista previa con tamaño de iframe y selección de idioma; enlazar a los callbacks del editor.
- [x] Crear `admin-preview-bridge.js`: iframe aislado con sandbox sin acceso al almacenamiento del gestor, intercambio de mensajes ligado a su ventana, bloqueo de formularios y enlaces externos, anotaciones para abrir el editor.
- [x] Integrar en `admin.js` y `admin.html`: actualización al cambiar campos, revisión previa a publicación, foco y apertura de sección desde vista previa; conservar protección de noticias sin guardar.
- [x] Ajustar `app.js` únicamente para omitir analítica/importación de pedidos y elegir idioma en la vista previa; mantener comportamiento público normal.
- [x] Añadir estilos adaptables, empaquetar dependencias del editor y comprobar publicación en copia aislada.
- [x] Verificar pruebas, vista previa real en navegador, edición por clic y avisos de programación; revisión de código y despliegue; contrastar archivos servidos.

La vista previa usa una copia en memoria del contenido de esta sesión. No publica contenido ni envía formularios. La revisión enumera cambios del contenido público, sin incluir registros privados de pedidos o solicitudes. La edición desde la vista previa enfoca el control existente; no crea un segundo sistema de almacenamiento.

Verificación: 33 pruebas aprobadas y revisión de código sin bloqueos. Navegador: móvil y ordenador, idiomas, edición de título y foto, revisión previa y salto a programación. Despliegue y contraste de archivos servidos como último paso.
