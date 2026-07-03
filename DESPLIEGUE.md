# 🚀 Despliegue en un servidor Windows

Guía para instalar Inventario IT en un servidor Windows (casero o del edificio) de forma que **corra como servicio**: arranca solo al encender la máquina, sin ventanas abiertas ni sesión iniciada, y es accesible desde cualquier equipo de la red local.

---

## 1. Requisitos en el servidor

Instalar una sola vez:

1. **[Node.js LTS](https://nodejs.org/en/download)** (v18 o superior) — instalador de Windows, siguiente-siguiente.
2. **[PostgreSQL](https://www.postgresql.org/download/windows/)** (14 o superior) — durante la instalación:
   - Anota la contraseña que le pongas al usuario `postgres`.
   - Deja que se instale como servicio de Windows (opción por defecto).
3. **[Git](https://git-scm.com/download/win)** (opcional, pero facilita actualizar después con `git pull`).

Crear la base de datos (una sola vez), desde **SQL Shell (psql)** o pgAdmin:

```sql
CREATE DATABASE inventario;
```

---

## 2. Descargar y configurar el proyecto

```bash
# En la carpeta donde vivirá la app (ej: C:\apps)
git clone https://github.com/Manuxosos/Pj_inventario.git
cd Pj_inventario
copy .env.example .env
```

Editar `.env` (con el Bloc de notas) para producción:

```ini
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventario
DB_USER=postgres
DB_PASSWORD=la_password_que_pusiste_al_instalar_postgres

PORT=3001
# 0.0.0.0 = aceptar conexiones de toda la red (no solo de este equipo)
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3001

# Genera una clave larga y aleatoria, distinta a la de desarrollo
JWT_SECRET=una_clave_secreta_larga_y_unica_para_este_servidor

# Credenciales del admin inicial (se crea solo si la tabla usuarios está vacía)
APP_USER=admin
APP_PASSWORD=elige_una_password_segura
```

> **Importante para la demo real:** no uses las contraseñas de prueba del desarrollo. Cambia `APP_PASSWORD` y `JWT_SECRET`.

---

## 3. Instalación inicial

Doble clic en **`instalar.bat`**. Esto:

- Instala dependencias del backend y frontend
- Crea las tablas en PostgreSQL y carga el inventario inicial (`seed_data.json`)
- Crea el usuario admin definido en `.env`
- Compila el frontend para producción (`frontend/dist`)

---

## 4. Instalar como servicio de Windows

Click derecho sobre **`servicio-instalar.bat`** → **Ejecutar como administrador**. El script:

1. Descarga [NSSM](https://nssm.cc) (el gestor que convierte Node en servicio) — solo la primera vez
2. Registra el servicio **`InventarioIT`** con arranque automático
3. Lo configura para arrancar **después** del servicio de PostgreSQL
4. Lo configura para **reiniciarse solo** si el proceso se cae
5. Guarda los logs en la carpeta `logs\`
6. Abre el puerto en el **firewall de Windows** para la red local
7. Arranca el servicio y te muestra la URL de acceso

Desde ese momento la app arranca sola cada vez que se enciende el servidor. No hace falta iniciar sesión en Windows ni dejar ventanas abiertas.

Para quitar el servicio: **`servicio-desinstalar.bat`** (también como administrador). No borra ni la app ni la base de datos.

---

## 5. Acceder desde otros equipos de la red

1. Averigua la IP del servidor (el script de instalación te la muestra; también con `ipconfig`).
2. Desde cualquier equipo de la misma red: `http://IP_DEL_SERVIDOR:3001` (ej: `http://192.168.1.50:3001`).

**Recomendado:** asigna una **IP fija** al servidor para que la URL no cambie:
- Opción fácil: en el router, busca "reserva DHCP" y asocia la MAC del servidor a una IP.
- Alternativa: configurar IP estática en Windows (Configuración → Red → Cambiar opciones del adaptador).

---

## 6. Administración del servicio

| Acción | Cómo |
|--------|------|
| Ver estado | `services.msc` → buscar "Inventario IT" |
| Reiniciar / detener | Desde `services.msc`, o `net stop InventarioIT` / `net start InventarioIT` (como admin) |
| Ver logs | Carpeta `logs\` del proyecto (`servicio.log` y `servicio-error.log`) |
| Actualizar la app | `git pull` → `instalar.bat` → reiniciar el servicio |

---

## 7. Solución de problemas

**El servicio no arranca**
- Revisa `logs\servicio-error.log`.
- Verifica que PostgreSQL esté corriendo (`services.msc` → postgresql-x64-XX).
- Verifica las credenciales de `.env` (sobre todo `DB_PASSWORD`).

**Funciona en el servidor pero no desde otros equipos**
- Confirma que `.env` tiene `HOST=0.0.0.0` (y reinicia el servicio si lo cambiaste).
- Confirma que existe la regla "Inventario IT" en el firewall de Windows (el script la crea).
- Confirma que ambos equipos están en la misma red (ojo con redes de invitados del WiFi, que aíslan dispositivos).

**Muestra el rol o los permisos incorrectos tras actualizar**
- Cerrar sesión y volver a entrar (el JWT viejo no tiene los campos nuevos).

---

## 8. Futuro: acceso desde internet

Para verlo desde fuera del edificio, las opciones ordenadas de más segura/fácil a menos:

1. **Cloudflare Tunnel** (gratis): sin abrir puertos en el router, da una URL `https://` pública. Es lo recomendado.
2. **Tailscale** (gratis): red privada virtual; solo acceden los dispositivos que tú autorices. Ideal si el acceso es solo para el equipo de IT.
3. **Abrir el puerto en el router** (port forwarding): funciona pero expone la app directamente a internet; requeriría añadir HTTPS y endurecer la seguridad antes.

Cuando llegue ese momento, conviene además: HTTPS obligatorio, contraseñas fuertes en todas las cuentas y respaldos automáticos de la base de datos (`pg_dump` programado).
