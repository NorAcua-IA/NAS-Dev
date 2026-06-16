// NorAcua Suite v3.0 — API: Informes
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

export async function getInformes({ usuarioId, clienteId = null, estado = null } = {}) {
  let q = 'na_informes?eliminado_en=is.null&order=periodo_desde.desc'
        + '&select=*,cliente:na_clientes(codigo,nombre),factura:na_facturas(numero,estado)';
  if (clienteId) q += `&cliente_id=eq.${clienteId}`;
  if (estado)    q += `&estado=eq.${estado}`;
  return sbFetch(q, {}, usuarioId);
}

export async function getInforme(id, usuarioId) {
  const rows = await sbFetch(
    `na_informes?id=eq.${id}&select=*,cliente:na_clientes(*),factura:na_facturas(*)`,
    {}, usuarioId
  );
  return rows?.[0] ?? null;
}

export async function crearInforme(data, usuarioId) {
  return sbFetch('na_informes', { method: 'POST', write: true, body: JSON.stringify({
    ...data,
    estado:    data.estado ?? 'borrador',
    creado_en: new Date().toISOString(),
  })}, usuarioId);
}

export async function actualizarInforme(id, cambios, usuarioId) {
  return sbFetch(`na_informes?id=eq.${id}`, { method: 'PATCH', write: true, body: JSON.stringify(cambios) }, usuarioId);
}

export async function eliminarInforme(id, usuarioId) {
  return actualizarInforme(id, { eliminado_en: new Date().toISOString() }, usuarioId);
}

// Obtener registros que pertenecen a un informe
export async function getRegistrosInforme(informeId, usuarioId) {
  return sbFetch(
    `na_registros?informe_id=eq.${informeId}&eliminado_en=is.null`
    + '&select=*,proyecto:na_proyectos(nombre,zona),tecnico:na_usuarios!tecnico_id(nombre)',
    {}, usuarioId
  );
}
