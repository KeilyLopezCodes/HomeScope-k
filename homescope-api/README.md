# homescope-api

API REST de HomeScope — Node.js 20 + Express + Prisma + PostgreSQL.

## Requisitos

- Node.js 20 LTS
- Docker (para PostgreSQL local)

## Inicio rápido

```bash
cp .env.example .env
npm install
npm run db:migrate
npm run dev
```

## Estructura

```
src/
├── config/        Variables de entorno validadas con Zod
├── shared/
│   ├── middleware/ auth, requirePermission, errorHandler
│   ├── errors/    AppError
│   ├── ports/     MapsPort, StoragePort, MailPort, RealtimePort, JobPort
│   └── adapters/  Implementaciones de los puertos
├── modules/
│   ├── identidad/
│   ├── propiedades/
│   ├── geo-indice/
│   ├── busqueda/
│   ├── comunicacion/
│   ├── agenda/
│   ├── reputacion/
│   └── moderacion/
└── jobs/          Workers de pg-boss
```

Todas las rutas bajo `/api/v1`. Health check en `GET /health`.
