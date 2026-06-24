function onOpen(e) {
  const ui = SpreadsheetApp.getUi();

  try {
    skbcConstruirMenuPrincipal_(ui);
  } catch (error) {
    Logger.log('Error en skbcConstruirMenuPrincipal_: ' + error.message);
  }

  // ========== MENU SKBC SYNC KENSHI ==========
  try {
    installSkbcSyncMenu();
  } catch (error) {
    Logger.log('Error en menu SKBC SYNC KENSHI: ' + error.message);
  }

  // ========== MENU SKBC WEB ==========
  try {
    ui.createMenu('SKBC WEB')
      .addItem('Preparar columnas ficha web', 'SKBC_prepararColumnasFichaWeb')
      .addItem('Actualizar fichas web adultos activos', 'SKBC_sincronizarFichasWebActivos')
      .addItem('Crear acceso web del alumno seleccionado', 'SKBC_crearAccesoWebAlumnoSeleccionado')
      .addItem('Generar links personales', 'generarLinkPersonales')
      .addItem('Nota del Sensei', 'SKBC_dialogoNotaSensei')
      .addSeparator()
      .addItem('Regenerar cache alumno seleccionado', 'SKBC_regenerarCacheAlumnoSeleccionado')
      .addItem('Regenerar cache todos los adultos activos', 'SKBC_regenerarCacheTodasFichasActivasAdultos')
      .addItem('Estado proceso cache', 'SKBC_estadoProcesoCache_')
      .addItem('Cancelar proceso cache', 'SKBC_cancelarProcesoCache_')
      .addItem('Instalar trigger cache nocturna', 'SKBC_instalarTriggerActualizacionNocturna')
      .addItem('Borrar trigger cache nocturna', 'SKBC_borrarTriggersActualizacionNocturna')
      .addSeparator()
      .addItem('Diagnosticar alumno seleccionado', 'SKBC_diagnosticarAlumnoWebSeleccionado')
      .addItem('Diagnosticar imagenes alumno seleccionado', 'SKBC_diagnosticarImagenesAlumnoWebSeleccionado')
      .addItem('Probar URL Web App', 'SKBC_probarURLWebApp_')
      .addToUi();
  } catch (error) {
    Logger.log('Error en menu SKBC WEB: ' + error.message);
  }

  // ========== MENU CONVOCATORIA ==========
  try {
    ui.createMenu('Convocatoria')
      .addItem('Generar Lista de Convocatoria', 'generarListaConvocatoria')
      .addItem('Generar WORD', 'generarWordConvocatoria')
      .addSeparator()
      .addItem('Configurar Trigger Automatico (2 meses antes)', 'configurarTrigger')
      .addToUi();
  } catch (error) {
    Logger.log('Error en menu Convocatoria: ' + error.message);
  }

  // ========== MENU CORRECCION ASIGNACIONES ==========
  try {
    SKBC_CORR_instalarMenu();
  } catch (error) {
    Logger.log('Error en menu SKBC CORRECCION ASIGNACIONES: ' + error.message);
  }
}
