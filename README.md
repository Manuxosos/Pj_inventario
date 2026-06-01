# 🖥️ Inventario IT — Edificio Principal

Sistema de gestión de inventario de equipos IT. Dashboard con gráficas, tabla filtrable, exportación a Excel y login seguro.

---

## Requisitos

- [Node.js](https://nodejs.org/en/download) v18 o superior
- Windows 10/11
- Git

---

## Instalación (primera vez)

```bash
# 1. Clonar el repositorio
git clone https://github.com/Manuxosos/Pj_inventario.git
cd Pj_inventario

# 2. Ejecutar el instalador (doble clic o desde terminal)
instalar.bat
```

El instalador hace todo automáticamente:
- Instala dependencias del backend y frontend
- Crea y carga la base de datos con los datos del inventario

---

## Uso diario

| Acción | Archivo |
|--------|---------|
| **Iniciar la app** | Doble clic en `iniciar.bat` |
| **Detener la app** | Doble clic en `detener.bat` |

La app abre automáticamente en `http://localhost:5173`

---

## Credenciales

| Campo | Valor |
|-------|-------|
| Usuario | `admin` |
| Contraseña | `inventario2025` |

> Para cambiar la contraseña edita `auth.js` — línea `bcrypt.hashSync('inventario2025', 10)`

---

## Estructura del proyecto

```
Pj_inventario/
├── frontend/          # React + Vite (interfaz)
│   └── src/
│       ├── components/
│       └── App.jsx
├── database.js        # Configuración SQLite
├── server.js          # API REST Express
├── seed.js            # Carga inicial de datos
├── seed_data.json     # Datos del inventario
├── auth.js            # Login + JWT
├── iniciar.bat        # Iniciar servidores
├── detener.bat        # Detener servidores
└── instalar.bat       # Instalación inicial
```

---

## Stack tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | React + Vite |
| Backend | Node.js + Express |
| Base de datos | SQLite (better-sqlite3) |
| Gráficas | Recharts |
| Autenticación | JWT + bcryptjs |
| Excel | ExcelJS |

---

## Seguridad

- El servidor solo escucha en `127.0.0.1` (no accesible desde la red)
- Todas las rutas de la API requieren token JWT
- Las sesiones expiran en 8 horas
