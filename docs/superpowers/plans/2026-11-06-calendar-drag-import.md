# Arrastrar eventos e importar calendario de gestión

Ampliación solicitada del calendario aprobado: arrastrar un evento a otro día desplaza su inicio/fin el mismo número de días y conserva su duración. Para series/días adicionales se desplaza el registro completo, avisando antes; no modificar el sistema de gestión. Añadir alternativa accesible «Mover» en la ficha y deshacer el último movimiento en la sesión.

Importación: usar únicamente festivos/cierres y eventos expresamente públicos; excluir alumnos, clases históricas y notas internas. Conservar eventos manuales y traducciones. Identificar registros importados por sourceKey para no duplicarlos y proteger ajustes locales de fechas.

- [x] Pruebas de desplazamientos por días naturales y conservación de metadatos/series.
- [x] Arrastrar, soltar, alternativa por teclado y deshacer.
- [x] Leer calendario de gestión y preparar importación sin duplicados.
- [x] Revisión, comprobación de interfaz, pruebas y publicación.

Verificacion: 45 pruebas aprobadas y revision de codigo aprobada. Arrastre real, deshacer y teclado comprobados en navegador. Fuente autenticada: https://skbc.vercel.app/calendario (2026 y 2027), 13 registros agrupados en 8 periodos. Conservados los 20 eventos anteriores. Excluidas notas internas. Despliegue con contraste de archivos servidos.
