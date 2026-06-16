// NorAcua Suite v3.0 — API: Registros (sin JOINs para compatibilidad con schema v3)
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

export async function getRegistros({ tecnicoId = null, proyectoId = null } = {}) {
  let q = 'na_registros?eliminado_en=is.null&order=fecha.desc&select=*';
  if (tecnicoId)  q += `&tecnico_id=eq.${tecnicoId}`;
  if (proyectoId) q += `&proyecto_id=eq.${proyectoId}`;
  const registros = await sbFetch(q);

  // Enriquecer con datos de proyecto y técnico en llamadas separadas
  const proyIds = [...new Set(registros.map(r => r.proyecto_id).filter(Boolean))];
  const tecIds  = [...new Set(registros.map(r => r.tecnico_id).filter(Boolean))];

  const [proyectos, tecnicos] = await Promise.all([
    proyIds.length ? sbFetch(`na_proyectos?id=in.(${proyIds.join(',')})&select=id,nombre,zona,cliente_id`) : [],
    tecIds.length  ? sbFetch(`na_usuarios?id=in.(${tecIds.join(',')})&select=id,nombre`) : [],
  ]);

  const proyMap = Object.fromEntries((proyectos || []).map(p => [p.id, p]));
  const tecMap  = Object.fromEntries((tecnicos  || []).map(t => [t.id, t]));

  return registros.map(r => ({
    ...r,
    proyecto: proyMap[r.proyecto_id] ?? null,
    tecnico:  tecMap[r.tecnico_id]   ?? null,
  }));
}

export async function getRegistro(id) {
  const rows = await sbFetch(`na_registros?id=eq.${id}&select=*`);
  return rows?.[0] ?? null;
}

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
  });
}

export async function actualizarRegistro(id, cambios) {
  return sbFetch(`na_registros?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify(cambios),
  });
}

export async function eliminarRegistro(id) {
  return sbFetch(`na_registros?id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ eliminado_en: new Date().toISOString() }),
  });
}

export async function aprobarRegistro(id)  { return actualizarRegistro(id, { estado: 'aprobado' }); }
export async function rechazarRegistro(id) { return actualizarRegistro(id, { estado: 'rechazado' }); }
