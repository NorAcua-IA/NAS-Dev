// ============================================================
//  NorAcua Suite v3.0 — API: Facturas
//  El número de factura se genera mediante la función atómica
//  next_numero_factura() en PostgreSQL (FOR UPDATE, sin race condition).
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

async function rpcFetch(fn, params, usuarioId = null) {
  const headers = {
    'apikey':        SUPABASE_ANON,
    'Authorization': `Bearer ${SUPABASE_ANON}`,
    'Content-Type':  'application/json',
  };
  if (usuarioId) headers['X-App-User-Id'] = usuarioId;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ── LISTAR ────────────────────────────────────────────────────

export async function getFacturas({ usuarioId, clienteId = null, serieId = null, estado = null } = {}) {
  let q = 'na_facturas?order=fecha.desc&select=*,serie:na_series(codigo),cliente:na_clientes(nombre,codigo)';
  if (clienteId) q += `&cliente_id=eq.${clienteId}`;
  if (serieId)   q += `&serie_id=eq.${serieId}`;
  if (estado)    q += `&estado=eq.${estado}`;
  return sbFetch(q, {}, usuarioId);
}

export async function getFactura(id, usuarioId) {
  const rows = await sbFetch(
    `na_facturas?id=eq.${id}&select=*,lineas:na_lineas_factura(*),serie:na_series(codigo,iban),cliente:na_clientes(*)`,
    {},
    usuarioId
  );
  return rows?.[0] ?? null;
}

// ── CREAR FACTURA (con número atómico) ───────────────────────

/**
 * Crear una factura nueva.
 * El número se genera en PostgreSQL con SELECT FOR UPDATE.
 * @param {object} data  - campos de na_facturas sin `numero`
 * @param {string} usuarioId - UUID del admin que crea la factura
 */
export async function crearFactura(data, usuarioId) {
  // 1. Obtener número atómico desde PostgreSQL
  const numero = await rpcFetch('next_numero_factura', {
    p_serie_id: data.serie_id,
    p_tipo:     data.tipo,
    p_fecha:    data.fecha,
  }, usuarioId);

  // 2. Insertar factura con el número obtenido
  return sbFetch('na_facturas', {
    method: 'POST',
    body: JSON.stringify({
      ...data,
      numero,
      creado_por_id: usuarioId,
      creado_en:     new Date().toISOString(),
    }),
  }, usuarioId);
}

// ── LÍNEAS DE FACTURA ─────────────────────────────────────────

export async function crearLineasFactura(factura_id, lineas, usuarioId) {
  const rows = lineas.map((l, i) => ({ ...l, factura_id, orden: i }));
  return sbFetch('na_lineas_factura', {
    method: 'POST',
    body: JSON.stringify(rows),
    headers: { 'Prefer': 'return=representation' },
  }, usuarioId);
}

// ── ACTUALIZAR ESTADO ─────────────────────────────────────────

export async function actualizarEstadoFactura(id, estado, usuarioId) {
  // La RLS impide cambiar Cobrada/Anulada
  return sbFetch(`na_facturas?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  }, usuarioId);
}

// ── SERIES ────────────────────────────────────────────────────

export async function getSeries(usuarioId) {
  return sbFetch(
    'na_series?select=*,cliente:na_clientes(codigo,nombre)&order=codigo.asc',
    {},
    usuarioId
  );
}
