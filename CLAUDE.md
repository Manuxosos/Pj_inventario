# Inventario IT — contexto del proyecto

Sistema de inventario de equipos IT para un edificio con varios pisos. React + Vite (frontend), Node/Express (backend REST), PostgreSQL (antes SQLite, migrado para escalar y permitir despliegue en servidor).

Repo: https://github.com/Manuxosos/Pj_inventario

## Stack

- Frontend: React + Vite, Recharts (gráficas), axios, lucide-react (iconos)
- Backend: Node.js + Express, JWT (jsonwebtoken) + bcryptjs
- DB: PostgreSQL vía `pg` (Pool), todas las queries con parámetros posicionales `$1,$2...`
- Excel: ExcelJS (import/export)

## Estructura clave

```
database.js      # Pool de pg, initSchema() crea tablas equipos + usuarios, siembra admin por defecto
auth.js           # login() async contra tabla usuarios, JWT incluye {id, usuario, rol, nombre}
server.js         # API REST, requireRol(...roles) middleware por ruta
seed.js           # Carga seed_data.json si la tabla equipos está vacía (instalación nueva)
seed_data.json    # Snapshot del inventario real (regenerar si la BD cambia mucho)
frontend/src/
  App.jsx                       # Extrae rol del JWT, tabs condicionados por rol
  components/Dashboard.jsx      # KPIs + gráficas, click navega a Inventario con filtro
  components/EquiposList.jsx    # Tabla + filtros (piso, no estado), oculta editar/eliminar si rol=observador
  components/Usuarios.jsx       # CRUD de usuarios (solo admin)
```

## Sistema de roles

Tres roles, controlados por `requireRol(...roles)` en `server.js` y por `rol` extraído del JWT en el frontend:

- **admin**: todo + gestión de usuarios (`/api/usuarios` CRUD)
- **it**: CRUD de equipos (incluye eliminar) + exportar Excel — sin gestión de usuarios
- **observador**: solo lectura del dashboard e inventario

Usuarios de prueba actuales en la BD:
| Usuario | Contraseña | Rol |
|---|---|---|
| `admin` | `REDACTED_PASSWORD` | admin |
| `usuario.it` | `REDACTED_PASSWORD` | it |
| `obsv.it` | `REDACTED_PASSWORD` | observador |

## Convenciones importantes

- Las rutas `/api/equipos` (POST/PUT/DELETE) y `/api/exportar` requieren rol admin o it
- Las rutas `/api/usuarios` requieren rol admin
- El JWT viejo (emitido antes de que existiera el campo `rol`) no tiene ese campo — si la UI muestra el rol incorrecto, cerrar sesión y volver a entrar
- El filtro de **estado** se quitó del dropdown del inventario; solo queda el filtro de **piso**. El filtrado por estado se hace navegando desde el dashboard (clicks en gráficas/KPIs pasan `estado` o `estadoIn` como filtro)
- Dashboard → Inventario: el click en gráficas de barra debe ir en el `onClick` del componente `Bar` (no del `BarChart` contenedor), porque el evento del contenedor no siempre captura `activePayload` de forma confiable
- Los valores de RAM se normalizan (trim + uppercase + colapsar espacios) antes de agrupar para el gráfico, porque el Excel original tiene inconsistencias como "8 GB" vs "8GB"
- `.env` (no está en git) define `DB_HOST/PORT/NAME/USER/PASSWORD`, `JWT_SECRET`, `APP_USER/APP_PASSWORD` (admin por defecto si la tabla usuarios está vacía), `CORS_ORIGIN`, `HOST/PORT` del backend

## Flujo de datos del inventario

La fuente de verdad operativa es el Excel maestro (`inventariomaster.xlsx`, vive en el escritorio del usuario, no en el repo). Cuando se actualiza el Excel, se reimporta a PostgreSQL con un script puntual (truncar tabla `equipos`, parsear filas de sección "PISO X"/"BODEGA" para asignar el campo `piso`, upsert por `numero_serie` para manejar duplicados). Después de reimportar conviene regenerar `seed_data.json` desde la BD para que una instalación nueva en otro servidor arranque con el inventario real.

## Despliegue / trabajar desde otra máquina

- El backend escucha en `HOST` (por defecto `127.0.0.1`) y `PORT` (3001); para acceso desde otros equipos/edificios hay que poner `HOST=0.0.0.0` y abrir el puerto
- PostgreSQL corre como servicio de Windows en la máquina actual del usuario — si se abre una sesión de Claude Code en otra máquina o en la nube, **no tendrá acceso a esa base de datos local** salvo que se exponga la red o se use una instancia de Postgres accesible remotamente
- `instalar.bat` / `iniciar.bat` / `detener.bat` son scripts de Windows pensados para uso local en la máquina servidor

## Preferencias del usuario (de sesiones previas)

- Prefiere que se le pregunte antes de hacer `git push`
- Le gusta que los scripts puntuales (importaciones, fixes de datos) se borren del repo después de usarlos, no dejarlos como deuda
- Comunicación en español
