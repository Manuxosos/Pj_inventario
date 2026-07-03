# 🖥️ Inventario IT — Edificio Principal

Sistema de gestión de inventario de equipos IT. Dashboard con gráficas, tabla filtrable, exportación a Excel, login con roles y base de datos PostgreSQL.

---

## Requisitos

- [Node.js](https://nodejs.org/en/download) v18 o superior
- [PostgreSQL](https://www.postgresql.org/download/) 14 o superior, corriendo y accesible
- Windows 10/11
- Git

---

## Instalación (primera vez)

```bash
# 1. Clonar el repositorio
git clone https://github.com/Manuxosos/Pj_inventario.git
cd Pj_inventario

# 2. Configurar variables de entorno
copy .env.example .env
# Editar .env con tus credenciales de PostgreSQL y un JWT_SECRET propio

# 3. Ejecutar el instalador (doble clic o desde terminal)
instalar.bat
```

El instalador hace todo automáticamente:
- Instala dependencias del backend y frontend
- Crea las tablas en PostgreSQL y carga el inventario inicial (`seed_data.json`)
- Crea el usuario admin por defecto (definido en `.env`)
- Compila el frontend para producción

---

## Uso diario

| Acción | Archivo |
|--------|---------|
| **Iniciar la app** | Doble clic en `iniciar.bat` |
| **Detener la app** | Doble clic en `detener.bat` |

La app abre automáticamente en `http://localhost:5173` (desarrollo) o `http://localhost:3001` (producción, si existe `frontend/dist`).

### Modo servidor (recomendado para producción)

Para que la app corra como **servicio de Windows** — arranca sola al encender el servidor, sin ventanas ni sesión iniciada, accesible desde toda la red — sigue la guía **[DESPLIEGUE.md](DESPLIEGUE.md)** y usa `servicio-instalar.bat` / `servicio-desinstalar.bat`.

---

## Roles de usuario

| Rol | Permisos |
|-----|----------|
| **admin** | Acceso total: CRUD de equipos, exportar Excel, gestión de usuarios |
| **it** | CRUD de equipos (incluye eliminar), exportar Excel — sin gestión de usuarios |
| **observador** | Solo lectura del dashboard e inventario |

El primer usuario (admin) se crea automáticamente con las credenciales `APP_USER` / `APP_PASSWORD` definidas en `.env`. Desde la pestaña **Usuarios** (solo visible para admin) se pueden crear el resto de cuentas.

---

## Estructura del proyecto

```
Pj_inventario/
├── frontend/          # React + Vite (interfaz)
│   └── src/
│       ├── components/
│       └── App.jsx
├── database.js        # Pool de PostgreSQL, esquema (equipos + usuarios)
├── server.js           # API REST Express, middleware de roles
├── seed.js             # Carga inicial de datos (solo si la tabla está vacía)
├── seed_data.json      # Snapshot del inventario real
├── auth.js             # Login + JWT (incluye rol del usuario)
├── .env.example         # Plantilla de configuración
├── iniciar.bat          # Iniciar servidores (manual)
├── detener.bat          # Detener servidores (manual)
├── instalar.bat         # Instalación inicial
├── servicio-instalar.bat    # Instalar como servicio de Windows (auto-arranque)
├── servicio-desinstalar.bat # Quitar el servicio de Windows
└── DESPLIEGUE.md        # Guía de despliegue en servidor
```

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL (`pg`) |
| Gráficas | Recharts |
| Autenticación | JWT + bcryptjs, roles por middleware |
| Excel | ExcelJS |

---

## Seguridad

- Todas las rutas de la API (excepto login) requieren token JWT
- Las acciones de escritura están protegidas por rol (`requireRol`)
- Las sesiones expiran en 8 horas
- Por defecto el servidor escucha en `127.0.0.1`; para exponerlo a otros equipos/edificios, configurar `HOST=0.0.0.0` en `.env` y abrir el puerto correspondiente
