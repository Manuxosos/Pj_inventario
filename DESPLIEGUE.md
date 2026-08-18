# 🚀 Despliegue en un servidor Windows

Guía para instalar Inventario IT en un servidor Windows — casero, del edificio principal, o de un edificio nuevo — de forma que **corra como servicio**: arranca solo al encender la máquina (sin que nadie inicie sesión), y es accesible desde cualquier equipo de la red local.

> Esta guía usa **PM2** como gestor de procesos, porque es la herramienta con la que ya está corriendo el sistema en producción. Si vas a replicar el sistema en otro edificio, seguir esta misma guía deja ambos servidores administrados exactamente igual (mismos comandos, mismos logs).

---

## 1. Requisitos en el servidor

Instalar una sola vez:

1. **[Node.js LTS](https://nodejs.org/en/download)** (v18 o superior).
2. **[PostgreSQL](https://www.postgresql.org/download/windows/)** (14 o superior) — instalado como servicio de Windows (opción por defecto del instalador). Anota la contraseña del usuario `postgres`.
3. **[Git](https://git-scm.com/download/win)** — facilita actualizar después con `git pull`.

Si el servidor está unido a un dominio (Active Directory), no afecta nada de lo siguiente: la instalación no depende de cuentas de dominio, solo necesitas una cuenta local con permisos de Administrador para instalar el servicio.

Crear la base de datos (una sola vez), desde **SQL Shell (psql)** o pgAdmin:

```sql
CREATE DATABASE inventario;
```

---

## 2. Obtener el proyecto

### Opción A — Clonar desde GitHub (recomendado)

Si el equipo que va a mantener este servidor tiene acceso al repositorio:

```bash
git clone https://github.com/Manuxosos/Pj_inventario.git C:\inventario
cd C:\inventario
```

### Opción B — Paquete sin Git

Si prefieres no dar acceso al repositorio (por ejemplo, para el equipo de otro edificio), se puede generar un `.zip` del proyecto y transferirlo por USB, red interna o correo. Ese paquete **no incluye** `.env`, `node_modules` ni la base de datos — cada servidor genera los suyos en la instalación.

Descomprimir en `C:\inventario` y continuar igual que la Opción A.

---

## 3. Configurar el entorno

```bash
copy .env.example .env
```

Editar `.env` para producción — **usa credenciales y claves distintas en cada servidor**, nunca copies el `.env` de un edificio a otro. `JWT_SECRET` es obligatorio: el servidor no arranca sin él.

```ini
DB_HOST=localhost
DB_PORT=5432
DB_NAME=inventario
DB_USER=postgres
DB_PASSWORD=la_password_de_este_servidor

PORT=3001
# 0.0.0.0 = aceptar conexiones de toda la red (no solo de este equipo)
HOST=0.0.0.0
CORS_ORIGIN=http://localhost:3001

# Genera una clave larga y aleatoria, DISTINTA en cada servidor
JWT_SECRET=una_clave_secreta_larga_y_unica_para_este_servidor

# Credenciales del admin inicial (se crea solo si la tabla usuarios está vacía)
APP_USER=admin
APP_PASSWORD=elige_una_password_segura_y_distinta_en_cada_servidor
```

---

## 4. Instalación inicial

Doble clic en **`instalar.bat`**. Esto:

- Instala dependencias del backend y frontend
- Crea las tablas en PostgreSQL
- **Carga el inventario de `seed_data.json` como plantilla inicial** (los equipos del edificio original) — la tabla `equipos` solo se llena automáticamente si está vacía, así que esto ocurre una única vez, en la primera instalación
- Crea el usuario admin definido en `.env`
- Compila el frontend para producción (`frontend/dist`)

> Si este servidor es para **otro edificio**, la plantilla cargada son equipos de ejemplo del edificio original, no los suyos — está pensado como punto de partida editable. Ese equipo debe hacer su propio recorrido de inventario y actualizar/reemplazar esos registros desde la app, igual que se hizo la primera vez en el edificio original.

---

## 5. Instalar como servicio de Windows (con PM2)

El objetivo es que la app sobreviva un reinicio del servidor **sin que nadie tenga que iniciar sesión en Windows**. PM2 por sí solo no lo garantiza — necesita un componente adicional que lo registre como servicio real. Usamos **[pm2-installer](https://github.com/jessety/pm2-installer)**, que instala PM2 como servicio de Windows corriendo bajo la cuenta `Local Service` (no depende de tu usuario ni de tu contraseña, y funciona igual en un servidor de dominio).

### 5.1 Instalar PM2 y arrancar la app (una vez)

Desde una consola **como Administrador**:

```bash
npm install -g pm2
cd C:\inventario
pm2 start server.js --name inventario-it
pm2 save
```

Verifica que quedó arriba:

```bash
pm2 list
```

### 5.2 Registrar PM2 como servicio de Windows (persistencia real)

1. Descargar la [última release de pm2-installer](https://github.com/jessety/pm2-installer/releases) (el `.zip`, no el código fuente) y descomprimirla, por ejemplo en `C:\pm2-installer`.
2. Desde una consola **como Administrador**, dentro de esa carpeta:

```bash
cd C:\pm2-installer
npm run configure
npm run setup
```

   - `configure` prepara las rutas de npm para que sean accesibles por la cuenta `Local Service`.
   - `setup` usa PowerShell para instalar PM2 como servicio de Windows bajo esa cuenta. Al terminar, aparecerá un servicio llamado **PM2** en `services.msc`, con arranque automático.

3. Vuelve a guardar la lista de procesos para que el nuevo servicio la recuerde al arrancar:

```bash
pm2 save
```

### 5.3 Abrir el puerto en el firewall

```bash
netsh advfirewall firewall add rule name="Inventario IT" dir=in action=allow protocol=TCP localport=3001
```

(Ajusta `3001` si usaste otro `PORT` en `.env`.)

### 5.4 Probar la persistencia

**Importante:** reinicia el servidor completo (no solo cierres sesión) y, sin iniciar sesión de Windows, verifica desde otro equipo que `http://IP_DEL_SERVIDOR:3001` responde. Esa es la única forma de confirmar que quedó realmente configurado como servicio.

> Los scripts `servicio-instalar.bat` / `servicio-desinstalar.bat` del repo automatizan los pasos 5.1 y 5.3 (arrancar/detener la app en PM2 y el firewall) — pero **no automatizan el 5.2**, porque instala una herramienta de terceros con su propio proceso de configuración; ese paso se hace una vez, a mano, siguiendo esta guía.

---

## 6. Acceder desde otros equipos de la red

Desde cualquier equipo de la misma red: `http://IP_DEL_SERVIDOR:3001` (ej: `http://192.168.1.50:3001`).

**Recomendado:** asigna una **IP fija** al servidor (reserva DHCP en el router, o IP estática en Windows) para que la URL no cambie.

---

## 7. Actualizar la app (cambios de código)

Con PM2 ya instalado y corriendo, actualizar es siempre el mismo flujo, en cualquiera de los servidores:

```bash
cd C:\inventario
git pull
cd frontend
npm run build
cd ..
pm2 restart inventario-it
```

Si el cambio no tocó el frontend, puedes saltarte el `npm run build`. La base de datos nunca se toca en este proceso.

**Importante:** si haces cambios de código directo en el servidor (editando archivos ahí), recuerda hacer `git add` / `git commit` / `git push` desde ahí también — si solo reinicias PM2 sin commitear, esos cambios quedan atrapados en ese servidor y no llegan al repositorio ni a otros edificios.

---

## 8. Administración del servicio

| Acción | Comando |
|--------|---------|
| Ver estado | `pm2 list` |
| Reiniciar | `pm2 restart inventario-it` |
| Detener | `pm2 stop inventario-it` |
| Ver logs en vivo | `pm2 logs inventario-it` |
| Ver últimas líneas de log | `pm2 logs inventario-it --lines 50` |
| Servicio de Windows (PM2 en sí) | `services.msc` → buscar "PM2" |

---

## 9. Replicar el sistema en otro edificio

Resumen del flujo completo cuando se instala en un servidor nuevo:

1. **Entregar el proyecto** al equipo del otro edificio — clonando el repositorio de Git (Opción A del punto 2) o enviando el paquete `.zip` (Opción B).
2. Ellos siguen esta misma guía de punta a punta, **con su propio `.env`** (contraseñas y `JWT_SECRET` distintos a los tuyos — nunca se comparten entre servidores).
3. Su instalación arranca con los equipos de `seed_data.json` como plantilla; deben reemplazarlos por su propio inventario haciendo su recorrido físico y editando/creando equipos desde la app.
4. Quedan con el mismo stack, los mismos scripts y los mismos comandos de administración — cualquiera de los dos servidores se opera igual.

No es necesario exportar ni transferir la base de datos de tu servidor al de ellos: cada edificio arranca con su propia base de datos PostgreSQL, sembrada solo con la plantilla de ejemplo.

---

## 10. Solución de problemas

**La app no arranca (`pm2 list` muestra `errored`)**
- `pm2 logs inventario-it --lines 50` para ver el error.
- Verifica que PostgreSQL esté corriendo: `Get-Service | Where-Object {$_.Name -like "*postgresql*"}`.
- Verifica las credenciales de `.env` (sobre todo `DB_PASSWORD`), y que `JWT_SECRET` esté definido — el servidor no arranca sin él.

**No sobrevive un reinicio del servidor**
- Confirma que el servicio de Windows **PM2** existe y está en `Automatic`: `services.msc`.
- Si no existe, no se completó el paso 5.2 — repítelo.
- Después de cualquier cambio a la lista de procesos, no olvides `pm2 save`.

**Funciona en el servidor pero no desde otros equipos**
- Confirma `HOST=0.0.0.0` en `.env` (y reinicia con `pm2 restart inventario-it` si lo cambiaste).
- Confirma la regla de firewall del punto 5.3.
- Verifica que ambos equipos estén en la misma red (cuidado con redes de invitados del WiFi, que aíslan dispositivos).

**Muestra el rol o los permisos incorrectos tras actualizar**
- Cerrar sesión en la app y volver a entrar (el JWT viejo no tiene los campos nuevos).

---

## 11. Futuro: acceso desde internet

Para verlo desde fuera del edificio, en orden de más segura/fácil a menos:

1. **Cloudflare Tunnel** (gratis): sin abrir puertos en el router, da una URL `https://` pública. Es lo recomendado.
2. **Tailscale** (gratis): red privada virtual; solo acceden los dispositivos que tú autorices. Ideal si el acceso es solo para el equipo de IT.
3. **Abrir el puerto en el router** (port forwarding): funciona pero expone la app directamente a internet; requeriría añadir HTTPS y endurecer la seguridad antes.

Cuando llegue ese momento, conviene además: HTTPS obligatorio, contraseñas fuertes en todas las cuentas y respaldos automáticos de la base de datos (`pg_dump` programado). Esto aplica igual a cada servidor por separado — no es algo que se comparta entre edificios.
