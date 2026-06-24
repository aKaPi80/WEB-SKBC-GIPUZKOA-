/**
 * SKBC GIPUZKOA - sincronizacion automatica Sheet1 -> Supabase.
 *
 * Instalacion:
 * 1. Abre el Google Sheet base.
 * 2. Extensiones > Apps Script.
 * 3. Pega este archivo.
 * 4. Si ya tienes una funcion onOpen en tu proyecto, anade dentro esta linea:
 *    installSkbcSyncMenu();
 *    Si no tienes onOpen, puedes crear una:
 *    function onOpen() {
 *      installSkbcSyncMenu();
 *    }
 * 5. Recarga la hoja y usa el menu SKBC Sync > Configurar Supabase.
 * 6. Ejecuta SKBC Sync > Sincronizar todo una vez y acepta permisos.
 * 7. Crea un activador instalable:
 *    Funcion: onKenshiSheetEdit
 *    Evento: Al editar
 */

const SKBC_SHEET_NAME = "Sheet1";
const SKBC_DIRECTORY_TABLE = "skbc_kenshi_directory";
const SKBC_MEMBERS_TABLE = "skbc_kenshi_members";
const SKBC_SUPABASE_URL = "https://wucxazuhrgokvtajqmsr.supabase.co";

function installSkbcSyncMenu() {
  SpreadsheetApp.getUi()
    .createMenu("SKBC Sync")
    .addItem("Configurar Supabase", "setupSkbcSupabaseProperties")
    .addItem("Comprobar configuracion", "checkSkbcSupabaseProperties")
    .addSeparator()
    .addItem("Sincronizar todo", "syncAllKenshiDirectory")
    .addToUi();
}

function setupSkbcSupabaseProperties() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt(
    "Configurar Supabase",
    "Pega aqui la service_role key de Supabase. No se guardara en la hoja, solo en las propiedades privadas del script.",
    ui.ButtonSet.OK_CANCEL
  );
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const serviceRoleKey = response.getResponseText().trim();
  if (!serviceRoleKey) {
    ui.alert("No se ha guardado nada porque la clave estaba vacia.");
    return;
  }
  PropertiesService.getScriptProperties().setProperties({
    SUPABASE_URL: SKBC_SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey
  }, false);
  ui.alert("Supabase configurado. Ahora puedes ejecutar SKBC Sync > Sincronizar todo.");
}

function checkSkbcSupabaseProperties() {
  const ui = SpreadsheetApp.getUi();
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = props.getProperty("SUPABASE_URL");
  const serviceRoleKey = props.getProperty("SUPABASE_SERVICE_ROLE_KEY");
  const maskedKey = serviceRoleKey
    ? `${serviceRoleKey.slice(0, 8)}...${serviceRoleKey.slice(-6)}`
    : "NO CONFIGURADA";
  ui.alert(
    "Configuracion SKBC Sync",
    `SUPABASE_URL: ${supabaseUrl || "NO CONFIGURADA"}\nSUPABASE_SERVICE_ROLE_KEY: ${maskedKey}`,
    ui.ButtonSet.OK
  );
}

function onKenshiSheetEdit(event) {
  try {
    const sheet = event && event.range && event.range.getSheet ? event.range.getSheet() : null;
    if (!sheet || sheet.getName() !== SKBC_SHEET_NAME) return;
    const rowNumber = event.range.getRow();
    if (rowNumber <= 1) return;
    syncKenshiDirectoryRow_(sheet, rowNumber);
  } catch (error) {
    console.error("Error sincronizando edicion Kenshi:", error);
  }
}

function syncAllKenshiDirectory() {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SKBC_SHEET_NAME);
  if (!sheet) throw new Error(`No existe la hoja ${SKBC_SHEET_NAME}`);
  const values = sheet.getDataRange().getDisplayValues();
  const headers = values.shift();
  const rows = values
    .map((row) => sheetRowToDirectory_(headers, row))
    .filter(Boolean);
  upsertDirectoryRows_(rows);
  syncMembersFromDirectory_(rows);
  console.log(`Sincronizados ${rows.length} alumno(s).`);
}

function syncKenshiDirectoryRow_(sheet, rowNumber) {
  const lastColumn = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0];
  const row = sheet.getRange(rowNumber, 1, 1, lastColumn).getDisplayValues()[0];
  const directoryRow = sheetRowToDirectory_(headers, row);
  if (!directoryRow) return;
  upsertDirectoryRows_([directoryRow]);
  syncMembersFromDirectory_([directoryRow]);
  console.log(`Sincronizado alumno ${directoryRow.full_name}`);
}

function sheetRowToDirectory_(headers, row) {
  const index = {};
  headers.forEach((header, column) => {
    index[normalizeHeader_(header)] = column;
  });
  const get = (...headerNames) => {
    for (const header of headerNames) {
      const column = index[normalizeHeader_(header)];
      if (column !== undefined) return row[column] || "";
    }
    return "";
  };
  const studentId = get("ID");
  const fullName = [get("Nombre"), get("Apellidos")].filter(Boolean).join(" ").trim();
  if (!studentId || !fullName) return null;
  const fichaUrl = firstFilled_(
    get("FICHA_PERSONAL"),
    get("URL_FICHA_WEB"),
    get("FICHA_PADRES"),
    get("URL_FICHA")
  );
  const phone = firstFilled_(
    get("Telefono Alumno", "Teléfono Alumno"),
    get("Telefono Tutor", "Teléfono Tutor")
  );
  return {
    student_id: studentId,
    full_name: fullName,
    normalized_name: normalizeName_(fullName),
    email_family: get("EmailFamilia") || null,
    phone: phone || null,
    class_group: get("Clase") || null,
    entry_date: get("Fecha Ingreso", "Fecha de Ingreso") || null,
    status: get("Estado") || null,
    grade: get("Grado") || null,
    photo_url: normalizeDriveImageUrl_(get("AlumnoFotoURL")) || null,
    ficha_url: fichaUrl || null,
    parent_ficha_url: get("FICHA_PADRES") || null,
    site_url: get("URL_Site") || null,
    folder_url: get("URL_CARPETA_ALUMNO") || null,
    attendance_total: parseIntegerOrNull_(get("AsistenciasTotales")),
    attendance_percent: parseNumberOrNull_(get("PorcentajeAsistencia")),
    next_exam: get("ProximoExamen") || null,
    exam_notice: get("Aviso") || null,
    updated_at: new Date().toISOString()
  };
}

function upsertDirectoryRows_(rows) {
  if (!rows.length) return;
  supabaseFetch_(`/rest/v1/${SKBC_DIRECTORY_TABLE}?on_conflict=student_id`, {
    method: "post",
    payload: JSON.stringify(rows),
    headers: {
      Prefer: "resolution=merge-duplicates,return=minimal"
    }
  });
}

function syncMembersFromDirectory_(directoryRows) {
  if (!directoryRows.length) return;
  const members = supabaseFetch_(`/rest/v1/${SKBC_MEMBERS_TABLE}?select=*&limit=1000`, {
    method: "get"
  });
  (members || []).forEach((member) => {
    const match = findDirectoryMatch_(member, directoryRows);
    if (!match) return;
    supabaseFetch_(`/rest/v1/${SKBC_MEMBERS_TABLE}?id=eq.${encodeURIComponent(member.id)}`, {
      method: "patch",
      payload: JSON.stringify(directoryRowToMemberPayload_(match)),
      headers: {
        Prefer: "return=minimal"
      }
    });
  });
}

function directoryRowToMemberPayload_(row) {
  return {
    full_name: row.full_name || "",
    phone: row.phone || "",
    photo_url: normalizeDriveImageUrl_(row.photo_url || ""),
    ficha_url: row.ficha_url || row.parent_ficha_url || "",
    source_student_id: row.student_id || "",
    class_group: row.class_group || "",
    entry_date: row.entry_date || "",
    grade: row.grade || "",
    attendance_total: row.attendance_total,
    attendance_percent: row.attendance_percent,
    next_exam: row.next_exam || "",
    exam_notice: row.exam_notice || "",
    site_url: row.site_url || "",
    folder_url: row.folder_url || "",
    directory_synced_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

function findDirectoryMatch_(member, rows) {
  const name = normalizeName_(member.full_name || "");
  const email = String(member.email || "").trim().toLowerCase();
  if (name) {
    const exact = rows.find((row) => normalizeName_(row.full_name) === name || normalizeName_(row.normalized_name) === name);
    if (exact) return exact;
  }
  if (email) {
    const exactEmail = rows.find((row) => String(row.email_family || "").trim().toLowerCase() === email);
    if (exactEmail) return exactEmail;
  }
  if (name) {
    return rows.find((row) => {
      const rowName = normalizeName_(row.full_name || row.normalized_name || "");
      return rowName && (rowName.includes(name) || name.includes(rowName));
    }) || null;
  }
  return null;
}

function normalizeHeader_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function supabaseFetch_(path, options) {
  const props = PropertiesService.getScriptProperties();
  const supabaseUrl = String(props.getProperty("SUPABASE_URL") || "").replace(/\/+$/, "");
  const serviceRoleKey = String(props.getProperty("SUPABASE_SERVICE_ROLE_KEY") || "");
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en propiedades del script.");
  }
  const response = UrlFetchApp.fetch(`${supabaseUrl}${path}`, {
    method: options.method || "get",
    contentType: "application/json",
    payload: options.payload,
    muteHttpExceptions: true,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...(options.headers || {})
    }
  });
  const code = response.getResponseCode();
  const text = response.getContentText();
  if (code < 200 || code >= 300) {
    throw new Error(`Supabase ${code}: ${text}`);
  }
  return text ? JSON.parse(text) : null;
}

function normalizeName_(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function normalizeDriveImageUrl_(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const idMatch = raw.match(/[?&]id=([^&]+)/) || raw.match(/\/file\/d\/([^/]+)/);
  if (!idMatch) return raw;
  return `https://drive.google.com/thumbnail?id=${encodeURIComponent(decodeURIComponent(idMatch[1]))}&sz=w900`;
}

function firstFilled_(...values) {
  return values.find((value) => String(value || "").trim()) || "";
}

function parseIntegerOrNull_(value) {
  const number = parseInt(String(value || "").trim(), 10);
  return Number.isFinite(number) ? number : null;
}

function parseNumberOrNull_(value) {
  const number = Number(String(value || "").trim().replace(",", "."));
  return Number.isFinite(number) ? number : null;
}
