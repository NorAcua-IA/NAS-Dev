// NorAcua Suite v3.0 — API: Proyectos
import { SUPABASE_URL, SUPABASE_ANON } from '../config.js';

async function sbFetch(path, opts = {}, usuarioId = null) {
  const headers = {
    'apikey':         SUPABASE_ANON,
    'Authorization':  `Bearer ${SUPABASE_ANON}`,
    'Content-Type':   'application/json',
    'Prefer':         'return=representation',
    'Accept-Profile': 'v3',
    ...opts.headers,
  };
  if (opts.write) headers['Content-Profile'] = 'v3';
  if (usuarioId)  headers['X-App-User-Id']   = usuarioId;

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function getProyectos({ usuarioId, clienteId = null, zona = null, activo = true } = {}) {
  let q = 'na_proyectos?order=nombre.asc'
        + `&activo=eq.${activo}`
        + '&select=*,cliente:na_clientes(id,codigo,nombre),estacion:na_estaciones(id,nombre),responsable:na_responsables(id,nombre)';
  if (clienteId) q += `&cliente_id=eq.${clienteId}`;
  if (zona)      q += `&zona=eq.${zona}`;
  return sbFetch(q, {}, usuarioId);
}

export async function getProyecto(id, usuarioId) {
  const rows = await sbFetch(
    `na_proyectos?id=eq.${id}&select=*,cliente:na_clientes(*),estacion:na_estaciones(*),responsable:na_responsables(*)`,
    {}, usuarioId
  );
  return rows?.[0] ?? null;
}

export async function crearProyecto(data, usuarioId) {
  return sbFetch('na_proyectos', { method: 'POST', write: true, body: JSON.stringify(data) }, usuarioId);
}

export async function actualizarProyecto(id, cambios, usuarioId) {
  return sbFetch(`na_proyectos?id=eq.${id}`, { method: 'PATCH', write: true, body: JSON.stringify(cambios) }, usuarioId);
}

export async function toggleProyecto(id, activo, usuarioId) {
  return actualizarProyecto(id, { activo }, usuarioId);
}
