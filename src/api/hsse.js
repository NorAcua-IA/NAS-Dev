// NorAcua Suite v3.0 — API: HSSE Supervisiones
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

// Listar supervisiones — técnico ve solo las suyas, admin ve todas
export async function getSupervisiones({ usuarioId, tecnicoId = null, desde = null, hasta = null } = {}) {
  let q = 'na_hsse_supervisiones?order=fecha.desc'
        + '&select=*,tecnico:na_usuarios!tecnico_id(nombre)';
  if (tecnicoId) q += `&tecnico_id=eq.${tecnicoId}`;
  if (desde)     q += `&fecha=gte.${desde}`;
  if (hasta)     q += `&fecha=lte.${hasta}`;
  return sbFetch(q, {}, usuarioId);
}

export async function getSupervision(id, usuarioId) {
  const rows = await sbFetch(
    `na_hsse_supervisiones?id=eq.${id}&select=*,tecnico:na_usuarios!tecnico_id(nombre)`,
    {}, usuarioId
  );
  return rows?.[0] ?? null;
}

export async function crearSupervision(data, usuarioId) {
  return sbFetch('na_hsse_supervisiones', {
    method: 'POST', write: true,
    body: JSON.stringify({
      ...data,
      estado:    data.estado ?? 'pendiente',
      creado_en: new Date().toISOString(),
    }),
  }, usuarioId);
}

export async function actualizarSupervision(id, cambios, usuarioId) {
  return sbFetch(`na_hsse_supervisiones?id=eq.${id}`, {
    method: 'PATCH', write: true, body: JSON.stringify(cambios),
  }, usuarioId);
}

export async function aprobarSupervision(id, usuarioId) {
  return actualizarSupervision(id, {
    estado:        'aprobada',
    aprobado_por_id: usuarioId,
    aprobado_en:   new Date().toISOString(),
  }, usuarioId);
}

// KPIs para el informe HSSE mensual
export async function getKpisHsse({ usuarioId, desde, hasta } = {}) {
  const sups = await getSupervisiones({ usuarioId, desde, hasta });
  const aprobadas = (sups || []).filter(s => s.estado === 'aprobada');
  return {
    totalSupervisiones: aprobadas.length,
    totalHoras:         aprobadas.reduce((acc, s) => acc + (s.horas_facturables || 0), 0),
    totalImporte:       aprobadas.reduce((acc, s) => acc + (s.datos_supervision?.importe || 0), 0),
    porTecnico:         Object.groupBy?.(aprobadas, s => s.tecnico?.nombre) ?? {},
  };
}
