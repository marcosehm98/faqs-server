# Archivo del proyecto

Material histórico o de un solo uso que **no participa** en el servidor ni en el build de producción. Se conserva por referencia.

## `inicial/`

HTML monolítico original (pre-Vue), antes de migrar a `frontend-public/` y `frontend-admin/`.

| Archivo | Descripción |
|---------|-------------|
| `public-index.html` | Vista pública vanilla (~840 líneas) |
| `admin-index.html` | Panel admin vanilla (~1439 líneas) |

El runtime usa solo los builds Vue en `public/index.html` y `admin/index.html`.

## `scripts/`

Scripts de mantenimiento ya ejecutados o herramientas de desarrollo puntuales.

Ejecutar desde la raíz del proyecto, por ejemplo:

```bash
node archive/scripts/bold-missing-faqs.js
node archive/scripts/reorder-operaciones.js
```

## `data/`

Copias y artefactos de migración/importación. El JSON activo para importar en admin es `data/logihub-faqs-import.json`.
