// NorAcua Suite v3.0 — API: Facturas (sin JOINs)
import { SUPABASE_URL, SUPABASE_ANON } from '../config.js';

async function sbFetch(path, opts = {}) {
  const headers = {
    'apikey':          SUPABASE_ANON,
    'Authorization':   `Bearer ${SUPABASE_ANON}`,
    'Content-Type':    'application/json',
    'Prefer':          'return=representation',
    'Accept-Profile':  'v3',
    'Content-Profile': 'v3',
    ...opts.headers,
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...opts, headers });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

async function rpcFetch(fn, params) {
  const headers = {
    'apikey':          SUPABASE_ANON,
    'Authorization':   `Bearer ${SUPABASE_ANON}`,
    'Content-Type':    'application/json',
    'Content-Profile': 'v3',
  };
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST', headers, body: JSON.stringify(params),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getFacturas({ clienteId = null, serieId = null, estado = null } = {}) {
  let q = 'na_facturas?order=fecha.desc&select=*';
  if (clienteId) q += `&cliente_id=eq.${clienteId}`;
  if (serieId)   q += `&serie_id=eq.${serieId}`;
  if (estado)    q += `&estado=eq.${estado}`;
  const facturas = await sbFetch(q);

  const cliIds = [...new Set(facturas.map(f => f.cliente_id).filter(Boolean))];
  const clientes = cliIds.length
    ? await sbFetch(`na_clientes?id=in.(${cliIds.join(',')})&select=id,codigo,nombre`)
    : [];

  const cliMap = Object.fromEntries((clientes || []).map(c => [c.id, c]));

  return facturas.map(f => ({
    ...f,
    cliente: cliMap[f.cliente_id] ?? null,
  }));
}

export async function getFactura(id) {
  const rows = await sbFetch(`na_facturas?id=eq.${id}&select=*`);
  if (!rows?.[0]) return null;
  const lineas = await sbFetch(`na_lineas_factura?factura_id=eq.${id}&order=orden.asc&select=*`);
  return { ...rows[0], lineas: lineas || [] };
}

export async function crearFactura(data, usuarioId) {
  const numero = await rpcFetch('next_numero_factura', {
    p_serie_id: data.serie_id,
    p_tipo:     data.tipo,
    p_fecha:    data.fecha,
  });
  return sbFetch('na_facturas', {
    method: 'POST',
    body: JSON.stringify({ ...data, numero, creado_por_id: usuarioId, creado_en: new Date().toISOString() }),
  });
}

export async function actualizarEstadoFactura(id, estado) {
  return sbFetch(`na_facturas?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ estado }),
  });
}

export async function getSeries() {
  return sbFetch('na_series?select=*&order=codigo.asc');
}
