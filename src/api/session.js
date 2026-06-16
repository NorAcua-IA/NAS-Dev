// NorAcua Suite v3.0 — Gestión de sesión
// Auto-logout por inactividad (30 min) con aviso a los 25 min
// Compatible con el sistema de sesiones de v2.x

import { login, logout, heartbeat, verificarSesion } from './auth.js';

const STORAGE_KEY   = 'nas_v3_sesion';
const INACTIVO_MS   = 30 * 60 * 1000;   // 30 min
const AVISO_MS      = 25 * 60 * 1000;   // aviso a los 25 min
const HEARTBEAT_MS  =  1 * 60 * 1000;   // heartbeat cada 1 min

let _sesion       = null;
let _timerLogout  = null;
let _timerAviso   = null;
let _timerHb      = null;
let _onAviso      = null;   // callback para mostrar modal de aviso
let _onLogout     = null;   // callback para redirigir al login

// ── Inicializar desde storage ──────────────────────────────

export async function iniciarSesionDesdeStorage() {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const sesion = JSON.parse(raw);
    const valida = await verificarSesion(sesion.sesionId);
    if (!valida) { limpiarSesion(); return null; }
    _sesion = sesion;
    _arrancarTimers();
    return sesion;
  } catch {
    return null;
  }
}

// ── Login ──────────────────────────────────────────────────

export async function iniciarSesion(nombre, password, { onAviso, onLogout } = {}) {
  _onAviso  = onAviso;
  _onLogout = onLogout;
  const { usuario, sesionId } = await login(nombre, password);
  _sesion = { usuario, sesionId };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(_sesion));
  _arrancarTimers();
  return _sesion;
}

// ── Logout ─────────────────────────────────────────────────

export async function cerrarSesion() {
  if (_sesion?.sesionId) await logout(_sesion.sesionId);
  limpiarSesion();
  _onLogout?.();
}

export function limpiarSesion() {
  _sesion = null;
  sessionStorage.removeItem(STORAGE_KEY);
  _pararTimers();
}

// ── Getters ────────────────────────────────────────────────

export function getSesion()   { return _sesion; }
export function getUsuario()  { return _sesion?.usuario ?? null; }
export function getSesionId() { return _sesion?.sesionId ?? null; }
export function esAdmin()     { return _sesion?.usuario?.rol === 'admin'; }

// ── Timers de inactividad ──────────────────────────────────

function _arrancarTimers() {
  _pararTimers();

  // Heartbeat periódico
  _timerHb = setInterval(() => {
    if (_sesion?.sesionId) heartbeat(_sesion.sesionId);
  }, HEARTBEAT_MS);

  // Aviso de inactividad
  _timerAviso = setTimeout(() => {
    _onAviso?.();
  }, AVISO_MS);

  // Auto-logout
  _timerLogout = setTimeout(() => {
    cerrarSesion();
  }, INACTIVO_MS);

  // Resetear timers en cualquier interacción
  ['click','keydown','mousemove','touchstart'].forEach(ev =>
    document.addEventListener(ev, _resetTimers, { passive: true })
  );
}

function _resetTimers() {
  clearTimeout(_timerAviso);
  clearTimeout(_timerLogout);
  _timerAviso = setTimeout(() => _onAviso?.(), AVISO_MS);
  _timerLogout = setTimeout(() => cerrarSesion(), INACTIVO_MS);
}

function _pararTimers() {
  clearInterval(_timerHb);
  clearTimeout(_timerAviso);
  clearTimeout(_timerLogout);
  ['click','keydown','mousemove','touchstart'].forEach(ev =>
    document.removeEventListener(ev, _resetTimers)
  );
}

// ── Extender sesión (llamar desde el modal de aviso) ───────

export function extenderSesion() {
  _resetTimers();
  if (_sesion?.sesionId) heartbeat(_sesion.sesionId);
}
