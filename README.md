# NorAcua Suite v3.0 — NAS-Dev

Entorno de staging para NorAcua Suite v3.0.  
**Solo accesible para Daniel Romero e Ignacio López.**

## Stack

- React 18 SPA (sin build step — ES modules nativos)
- GitHub Pages en rama `main`
- Supabase v3 (proyecto nuevo — ver `.env.example`)

## Estructura

```
NAS-Dev/
├── index.html              ← Admin interface (NAS-MLB)
├── tecnico.html            ← Technician interface (NAS-Tecnicos)
├── src/
│   ├── config.js           ← Supabase URL + anon key (sustituir)
│   ├── api/                ← Capa de acceso a datos (una función por tabla)
│   │   ├── auth.js
│   │   ├── registros.js
│   │   ├── proyectos.js
│   │   ├── preciarios.js
│   │   ├── facturas.js
│   │   ├── informes.js
│   │   ├── hsse.js
│   │   └── session.js
│   ├── components/         ← Componentes React reutilizables
│   └── utils/
│       ├── hash.js         ← SHA-256 para passwords
│       └── fmt.js          ← Formateo de fechas, importes
├── sql/
│   ├── 01_ddl_noracua_v3.sql     ← DDL completo (ejecutado en Supabase)
│   └── 02_seed_preciario.sql     ← Datos iniciales de preciario
├── migration/
│   ├── 02_migration_v28_v30.py   ← Script de migración de datos
│   └── README_migration.md
└── docs/
    └── noracua-v3-schema.html    ← Schema de referencia
```

## Setup inicial

1. Crear proyecto en [supabase.com](https://supabase.com)
2. Ejecutar `sql/01_ddl_noracua_v3.sql` en el SQL Editor
3. Copiar URL y anon key a `src/config.js`
4. Activar GitHub Pages en Settings → Pages → rama `main`

## Variables de entorno

Ver `src/config.js.example` — copiar a `src/config.js` y rellenar.

## Importante

- Este repo es **staging**. Producción sigue en `NA-MLB` / `NAS-Tecnicos`.
- **No mezclar** datos: este repo apunta al proyecto Supabase v3 nuevo, no al de producción (`lhmawivuxgekxleqvqle`).
- Los GRANTs explícitos ya están incluidos en el DDL (requerido oct. 2026).
