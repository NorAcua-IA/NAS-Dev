// ============================================================
//  NorAcua Suite v3.0 — API: Preciarios
//  Soporta doble preciario en convivencia y asignación
//  por técnico / por proyecto.
// ============================================================

import { SUPABASE_URL, SUPABASE_ANON } from '../config.js';

async function sbFetch(path, opts = {}, usuarioId = null) {
  const headers = {
    'apikey':        SUPABASE_ANON,
    'Authorization': `Bearer ${SUPABASE_ANON}`,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation',
    ...opts.headers,
  };
  if (usuarioId) headers['X-App-User-Id'] = usuarioId;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── PRECIARIOS DISPONIBLES ────────────────────────────────────

/**
 * Listar todos los preciarios activos (admin).
 * Incluye nombre del cliente y si tiene asignaciones.
 */
export async function getPreciarios(usuarioId) {
  return sbFetch(
    'na_preciarios?activo=eq.true&select=*,cliente:na_clientes(codigo,nombre)&order=vigente_desde.desc',
    {},
    usuarioId
  );
}

/**
 * Determinar qué preciario debe ver un técnico para un proyecto dado.
 * Prioridad: asignación específica técnico+proyecto > solo técnico > solo proyecto > activo del cliente
 */
export async function getPreciarioParaTecnico(tecnicoId, proyectoId, clienteId, usuarioId) {
  // 1. Asignación específica técnico + proyecto
  let rows = await sbFetch(
    `na_preciario_asignaciones?tecnico_id=eq.${tecnicoId}&proyecto_id=eq.${proyectoId}&select=preciario_id`,
    {},
    usuarioId
  );
  if (rows?.length) return rows[0].preciario_id;

  // 2. Solo técnico
  rows = await sbFetch(
    `na_preciario_asignaciones?tecnico_id=eq.${tecnicoId}&proyecto_id=is.null&select=preciario_id`,
    {},
    usuarioId
  );
  if (rows?.length) return rows[0].preciario_id;

  // 3. Solo proyecto
  rows = await sbFetch(
    `na_preciario_asignaciones?proyecto_id=eq.${proyectoId}&tecnico_id=is.null&select=preciario_id`,
    {},
    usuarioId
  );
  if (rows?.length) return rows[0].preciario_id;

  // 4. Fallback: preciario activo del cliente (el más reciente)
  rows = await sbFetch(
    `na_preciarios?cliente_id=eq.${clienteId}&activo=eq.true&order=vigente_desde.desc.nullslast&limit=1&select=id`,
    {},
    usuarioId
  );
  return rows?.[0]?.id ?? null;
}

// ── CATÁLOGO ──────────────────────────────────────────────────

/**
 * Obtener capítulos + conceptos de un preciario.
 * Admin: incluye precio.
 * Técnico: usa la vista na_conceptos_tecnico (sin precio).
 */
export async function getCatalogo(preciarioId, esAdmin, usuarioId) {
  // Capítulos del preciario
  const capitulos = await sbFetch(
    `na_capitulos?preciario_id=eq.${preciarioId}&order=orden.asc&select=*`,
    {},
    usuarioId
  );

  if (!capitulos?.length) return [];

  const capIds = capitulos.map(c => c.id);
  const inClause = capIds.map(id => `capitulo_id.eq.${id}`).join(',');

  // Conceptos — con precio si admin, sin precio si técnico
  const tablaConcept = esAdmin ? 'na_conceptos' : 'na_conceptos_tecnico';
  const conceptos = await sbFetch(
    `${tablaConcept}?or=(${inClause})&order=orden.asc&activo=eq.true`,
    {},
    usuarioId
  );

  // Agrupar conceptos por capítulo
  return capitulos.map(cap => ({
    ...cap,
    conceptos: (conceptos ?? []).filter(c => c.capitulo_id === cap.id),
  }));
}

// ── ASIGNACIONES ──────────────────────────────────────────────

export async function getAsignaciones(usuarioId) {
  return sbFetch(
    'na_preciario_asignaciones?select=*,preciario:na_preciarios(nombre),tecnico:na_usuarios!tecnico_id(nombre),proyecto:na_proyectos(nombre)',
    {},
    usuarioId
  );
}

export async function crearAsignacion(data, usuarioId) {
  return sbFetch('na_preciario_asignaciones', {
    method: 'POST',
    body: JSON.stringify(data),
  }, usuarioId);
}

export async function eliminarAsignacion(id, usuarioId) {
  return sbFetch(`na_preciario_asignaciones?id=eq.${id}`, {
    method: 'DELETE',
  }, usuarioId);
}
