import { writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const spreadsheetId = "1GGVrz7UVNhlDu-NaE9qGs4U2bxXkh7pzXfdixTjYDrc";
const gid = "608472568";
const outputPath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
  "SUPABASE-KENSHI-DIRECTORY-IMPORT-PRIVATE.sql"
);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (quoted) {
      if (char === '"' && next === '"') {
        value += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        value += char;
      }
      continue;
    }
    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(value);
      value = "";
    } else if (char === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
    } else if (char !== "\r") {
      value += char;
    }
  }
  if (value || row.length) {
    row.push(value);
    rows.push(row);
  }
  return rows;
}

function normalizeName(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ")
    .toUpperCase();
}

function sql(value) {
  if (value === null || value === undefined || value === "") return "null";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function intSql(value) {
  const number = Number.parseInt(String(value || "").trim(), 10);
  return Number.isFinite(number) ? String(number) : "null";
}

function numericSql(value) {
  const number = Number(String(value || "").trim().replace(",", "."));
  return Number.isFinite(number) ? String(number) : "null";
}

function firstFilled(...values) {
  return values.find((value) => String(value || "").trim()) || "";
}

const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`;
const response = await fetch(url);
if (!response.ok) {
  throw new Error(`No se pudo descargar la hoja: ${response.status}`);
}

const rows = parseCsv(await response.text()).filter((row) => row.some((cell) => String(cell || "").trim()));
const headers = rows.shift();
const index = Object.fromEntries(headers.map((header, column) => [header.trim(), column]));
const get = (row, header) => row[index[header]] || "";

const valueRows = rows
  .map((row) => {
    const studentId = get(row, "ID");
    const name = [get(row, "Nombre"), get(row, "Apellidos")].filter(Boolean).join(" ").trim();
    if (!studentId || !name) return "";
    const fichaUrl = firstFilled(get(row, "FICHA_PERSONAL"), get(row, "URL_FICHA_WEB"), get(row, "FICHA_PADRES"), get(row, "URL_FICHA"));
    const phone = firstFilled(get(row, "Teléfono Alumno"), get(row, "Teléfono Tutor"));
    return `  (${[
      sql(studentId),
      sql(name),
      sql(normalizeName(name)),
      sql(get(row, "EmailFamilia")),
      sql(phone),
      sql(get(row, "Clase")),
      sql(get(row, "Estado")),
      sql(get(row, "Grado ")),
      sql(get(row, "AlumnoFotoURL")),
      sql(fichaUrl),
      sql(get(row, "FICHA_PADRES")),
      sql(get(row, "URL_Site")),
      sql(get(row, "URL_CARPETA_ALUMNO")),
      intSql(get(row, "AsistenciasTotales")),
      numericSql(get(row, "PorcentajeAsistencia")),
      sql(get(row, "ProximoExamen")),
      sql(get(row, "Aviso")),
      "now()"
    ].join(", ")})`;
  })
  .filter(Boolean);

const body = `-- IMPORTANTE: este archivo contiene datos privados de alumnos.
-- No lo subas a GitHub. Ejecutalo solo en Supabase SQL Editor.

insert into public.skbc_kenshi_directory (
  student_id,
  full_name,
  normalized_name,
  email_family,
  phone,
  class_group,
  status,
  grade,
  photo_url,
  ficha_url,
  parent_ficha_url,
  site_url,
  folder_url,
  attendance_total,
  attendance_percent,
  next_exam,
  exam_notice,
  updated_at
)
values
${valueRows.join(",\n")}
on conflict (student_id) do update set
  full_name = excluded.full_name,
  normalized_name = excluded.normalized_name,
  email_family = excluded.email_family,
  phone = excluded.phone,
  class_group = excluded.class_group,
  status = excluded.status,
  grade = excluded.grade,
  photo_url = excluded.photo_url,
  ficha_url = excluded.ficha_url,
  parent_ficha_url = excluded.parent_ficha_url,
  site_url = excluded.site_url,
  folder_url = excluded.folder_url,
  attendance_total = excluded.attendance_total,
  attendance_percent = excluded.attendance_percent,
  next_exam = excluded.next_exam,
  exam_notice = excluded.exam_notice,
  updated_at = now();
`;

await writeFile(outputPath, body, "utf8");
console.log(`Import SQL generado: ${outputPath}`);
console.log(`Registros: ${valueRows.length}`);
