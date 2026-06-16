// ============================================================
//  NorAcua Suite v3.0 — API: Autenticación y Sesión
//  Mantiene compatibilidad con el sistema SHA-256 actual.
//  No usa Supabase Auth — usa app.usuario_id como contexto.
// ============================================================

import { SUPABASE_URL, SUPABASE_ANON } from '../config.js';

// ── Helpers base ──────────────────────────────────────────────

async function sbFetch(path, opts = {}, sessionToken = null) {
  const headers = {
    'apikey':       SUPABASE_ANON,
    'Authorization': `Bearer ${SUPABASE_ANON}`,
    'Content-Type': 'application/json',
    'Prefer':       'return=representation',
    ...opts.headers,
  };

  // Contexto de sesión RLS: SET LOCAL app.usuario_id
  if (sessionToken) {
    headers['X-App-User-Id'] = sessionToken;
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...opts,
    headers,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message || `HTTP ${res.status}`);
  }

  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

// ── SHA-256 (igual que en v2.x) ──────────────────────────────

export async function sha256hex(str) {
  const buf  = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Login ─────────────────────────────────────────────────────

/**
 * Autenticar usuario por nombre + password.
 * Devuelve { usuario, sesionId } o lanza error.
 */
export async function login(nombre, password) {
  const hash = await sha256hex(password);

  const rows = await sbFetch(
    `na_usuarios?nombre=eq.${encodeURIComponent(nombre)}&password_hash=eq.${hash}&activo=eq.true&select=id,nombre,rol,zonas`
  );

  if (!rows || rows.length === 0) {
    throw new Error('Usuario o contraseña incorrectos');
  }

  const usuario = rows[0];

  // Crear entrada de sesión
  const sesion = await sbFetch('na_sesiones', {
    method: 'POST',
    body: JSON.stringify({
      usuario_id: usuario.id,
      user_agent: navigator.userAgent,
    }),
  });

  // Actualizar última sesión del usuario
  await sbFetch(`na_usuarios?id=eq.${usuario.id}`, {
    method: 'PATCH',
    body: JSON.stringify({ ultima_sesion: new Date().toISOString() }),
  });

  return {
    usuario,
    sesionId: sesion[0].id,
  };
}

// ── Logout ────────────────────────────────────────────────────

export async function logout(sesionId) {
  if (!sesionId) return;
  await sbFetch(`na_sesiones?id=eq.${sesionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ expirada: true }),
  }).catch(() => {});  // no lanzar si falla
}

// ── Heartbeat (llamar cada 60 s mientras la pestaña esté viva) ──

export async function heartbeat(sesionId) {
  if (!sesionId) return;
  await sbFetch(`na_sesiones?id=eq.${sesionId}`, {
    method: 'PATCH',
    body: JSON.stringify({ ultimo_heartbeat: new Date().toISOString() }),
  }).catch(() => {});
}

// ── Verificar sesión vigente ──────────────────────────────────

export async function verificarSesion(sesionId) {
  if (!sesionId) return false;
  const rows = await sbFetch(
    `na_sesiones?id=eq.${sesionId}&expirada=eq.false&select=id,ultimo_heartbeat`
  ).catch(() => []);

  if (!rows || rows.length === 0) return false;

  // Sesión zombi: sin heartbeat en los últimos 30 min
  const ultima = new Date(rows[0].ultimo_heartbeat);
  const diffMin = (Date.now() - ultima.getTime()) / 60000;
  return diffMin < 30;
}
