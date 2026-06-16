// NorAcua Suite v3.0 — Utilidades de formato

export function fmtFecha(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

export function fmtEuros(n) {
  if (n == null) return '—';
  return Number(n).toLocaleString('es-ES', { style: 'currency', currency: 'EUR' });
}

export function previewNumero(serieCodigo, contador, fecha) {
  const anyo = String(new Date(fecha).getFullYear()).slice(-2);
  return `${serieCodigo}${String(contador + 1).padStart(3,'0')}/${anyo}`;
}

const ZONAS = ['CENTRO','NORTE','CATALUÑA','BALEARES','OTROS'];
export function normZona(s) {
  const u = (s || '').toUpperCase().trim();
  if (u === 'CATALUÑA/BALEARES') return 'CATALUÑA';
  return ZONAS.includes(u) ? u : 'OTROS';
}

export function estadoReg(estado) {
  const map = {
    pendiente:  { label: 'Pendiente',  color: '#f59e0b' },
    aprobado:   { label: 'Aprobado',   color: '#10b981' },
    rechazado:  { label: 'Rechazado',  color: '#ef4444' },
    ofertada:   { label: 'Ofertada',   color: '#6366f1' },
  };
  return map[estado] || { label: estado, color: '#6b7280' };
}
