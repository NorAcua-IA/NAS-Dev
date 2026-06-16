// ============================================================
//  NorAcua Suite v3.0 — API: Registros (Actividades)
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

// ── SELECT ────────────────────────────────────────────────────

/**
 * Listar registros activos (no eliminados).
 * Si tecnicoId se pasa, filtra por técnico (para la vista técnico).
 */
export async function getRegistros({ usuarioId, tecnicoId = null, proyectoId = null } = {}) {
  let q = 'na_registros?eliminado_en=is.null&order=fecha.desc';

  if (tecnicoId)  q += `&tecnico_id=eq.${tecnicoId}`;
  if (proyectoId) q += `&proyecto_id=eq.${proyectoId}`;

  // JOIN: traer datos básicos de proyecto, técnico y concepto
  q += '&select=*,proyecto:na_proyectos(id,nombre,zona,cliente_id),tecnico:na_usuarios!tecnico_id(id,nombre),concepto:na_conceptos(id,nombre,unidad)';

  return sbFetch(q, {}, usuarioId);
}

/**
 * Obtener un registro por ID con sus líneas (si es grupo).
 */
export async function getRegistro(id, usuarioId) {
  const rows = await sbFetch(
    `na_registros?id=eq.${id}&select=*,lineas:na_lineas_registro(*,concepto:na_conceptos(id,nombre,unidad))`,
    {},
    usuarioId
  );
  return rows?.[0] ?? null;
}

// ── INSERT ────────────────────────────────────────────────────

export async function crearRegistro(data, usuarioId) {
  return sbFetch('na_registros', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      creado_por_id:  usuarioId,
      estado:         data.estado ?? 'pendiente',
      creado_en:      new Date().toISOString(),
      actualizado_en: new Date().toISOString(),
    }),
  }, usuarioId);
}

export async function crearLineaRegistro(data, usuarioId) {
  return sbFetch('na_lineas_registro', {
    method: 'POST',
    body: JSON.stringify(data),
  }, usuarioId);
}

// ── UPDATE ────────────────────────────────────────────────────

export async function actualizarRegistro(id, cambios, usuarioId) {
  return sbFetch(`na_registros?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(cambios),
  }, usuarioId);
}

/**
 * Soft delete — solo admin.
 * Pone eliminado_en = now() en lugar de borrar la fila.
 */
export async function eliminarRegistro(id, usuarioId) {
  return sbFetch(`na_registros?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ eliminado_en: new Date().toISOString() }),
  }, usuarioId);
}

// ── TRANSICIÓN DE ESTADO ──────────────────────────────────────

export async function aprobarRegistro(id, usuarioId) {
  return actualizarRegistro(id, { estado: 'aprobado' }, usuarioId);
}

export async function rechazarRegistro(id, usuarioId) {
  return actualizarRegistro(id, { estado: 'rechazado' }, usuarioId);
}

export async function enviarCertificacion(id, usuarioId) {
  return actualizarRegistro(id, { estado_certif: 'enviada' }, usuarioId);
}

export async function aprobarCertificacion(id, usuarioId) {
  return actualizarRegistro(id, { estado_certif: 'aprobada' }, usuarioId);
}
