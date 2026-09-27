# HomeScope

Plataforma web de compra, venta y alquiler de propiedades con Índice de Conveniencia.

| Campo | Valor |
|---|---|
| Curso | Desarrollo Web — Universidad Mariano Gálvez de Guatemala, Centro Universitario de Jalapa |
| Versión | 1.1 — PostgreSQL |
| Repositorio | `HomeScope-k` |

---

## Requisitos previos

Instalar las siguientes herramientas antes de continuar:

| Herramienta | Versión mínima | Descarga |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org |
| Docker Desktop | Cualquier versión reciente | https://www.docker.com/products/docker-desktop |
| Git | Cualquier versión reciente | https://git-scm.com |

Verificar que estén instalados:

```bash
node -v
docker -v
git -v
```

---

## Estructura del repositorio

```
HomeScope-k/
├── homescope-api/   # Backend — Node.js + Express + Prisma
├── homescope-web/   # Frontend — React + Vite + Tailwind CSS
├── docs/            # Arquitectura, modelo ER, matriz de roles
├── scripts/         # SQL de seed y configuración inicial
└── docker-compose.yml
```

---

## Paso 1 — Levantar la base de datos

Desde la raíz del repositorio:

```bash
docker compose up -d
```

Esto levanta PostgreSQL en el puerto `5432` con:

- **Usuario:** `admin`
- **Contraseña:** `Admin123456`
- **Base de datos:** `HomeScope-k`

Verificar que el contenedor esté corriendo:

```bash
docker ps
```

Debe aparecer un contenedor llamado `postgres` con estado `Up`.

---

## Paso 2 — Backend (`homescope-api`)

### 2.1 Instalar dependencias

```bash
cd homescope-api
npm install
```

### 2.2 Configurar variables de entorno

```bash
copy .env.example .env
```

> El archivo `.env` ya viene preconfigurado para conectarse al PostgreSQL local del paso 1. No es necesario modificarlo para desarrollo local.

### 2.3 Ejecutar migraciones

> **Nota:** este paso requiere que el modelo de datos esté definido en `prisma/schema.prisma`. Mientras el schema esté vacío (etapa actual), omitir este paso.

```bash
npm run db:migrate
```

### 2.4 Iniciar el servidor

```bash
npm run dev
```

La API queda disponible en: **http://localhost:3000**

---

## Paso 3 — Frontend (`homescope-web`)

Abrir una **nueva terminal** (dejar el backend corriendo).

### 3.1 Instalar dependencias

```bash
cd homescope-web
npm install
```

### 3.2 Configurar variables de entorno

```bash
copy .env.example .env
```

### 3.3 Iniciar el servidor de desarrollo

```bash
npm run dev
```

La aplicación queda disponible en: **http://localhost:5173**

---

## Paso 4 — Validar en el navegador

### Frontend

Abrir **http://localhost:5173** en el navegador.

Debe mostrarse la pantalla con el texto `HomeScope — Inicio`.

Rutas disponibles en esta etapa base:

| Ruta | Descripción |
|---|---|
| `/` | Inicio |
| `/registro` | Registro |
| `/login` | Login |
| `/propiedades` | Catálogo |
| `/propiedades/:id` | Ficha de propiedad |
| `/mensajes` | Mensajes |
| `/agenda` | Agenda |
| `/admin` | Panel de administración |

### Backend — Health check

Abrir **http://localhost:3000/health** en el navegador o ejecutar:

```bash
curl http://localhost:3000/health
```

Respuesta esperada:

```json
{ "status": "ok" }
```

### Backend — Endpoints (respuesta 501)

Todos los endpoints devuelven `501 Not implemented` hasta que se implementen las funcionalidades. Ejemplo:

```bash
curl http://localhost:3000/api/v1/propiedades
```

```json
{ "message": "Not implemented" }
```

---

## Comandos de referencia

### Backend

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor con recarga automática |
| `npm start` | Inicia el servidor sin recarga |
| `npm run db:migrate` | Crea y aplica migraciones de Prisma |
| `npm run db:deploy` | Aplica migraciones en producción |
| `npm run db:seed` | Carga datos iniciales (roles, permisos, tipos) |
| `npm run db:studio` | Abre Prisma Studio en el navegador |
| `npm test` | Ejecuta las pruebas con Jest |

### Frontend

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo con HMR |
| `npm run build` | Genera el build de producción en `dist/` |
| `npm run preview` | Previsualiza el build de producción |

### Base de datos (Docker)

| Comando | Descripción |
|---|---|
| `docker compose up -d` | Levanta PostgreSQL en segundo plano |
| `docker compose down` | Detiene y elimina el contenedor |
| `docker compose down -v` | Detiene el contenedor y borra los datos |
| `docker ps` | Lista los contenedores activos |

---

## Solución de problemas comunes

**El puerto 5432 ya está en uso**
Detener cualquier instancia local de PostgreSQL o cambiar el puerto en `docker-compose.yml` y en `homescope-api/.env`.

**El puerto 3000 ya está en uso**
Cambiar `PORT=3001` en `homescope-api/.env` y actualizar `VITE_API_URL=http://localhost:3001` en `homescope-web/.env`.

**El puerto 5173 ya está en uso**
Vite asigna automáticamente el siguiente puerto disponible (5174, 5175…). La URL correcta se muestra en la terminal al ejecutar `npm run dev`.

**Error de conexión a la base de datos**
Verificar que Docker esté corriendo y que el contenedor `postgres` esté activo con `docker ps`.

**`prisma generate` falla con "no models defined"**
Es el comportamiento esperado mientras el schema esté vacío. Se resuelve al definir los modelos en `homescope-api/prisma/schema.prisma`.
