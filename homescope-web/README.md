# homescope-web

SPA de HomeScope — React 18 + Vite + Tailwind CSS.

## Requisitos

- Node.js 20 LTS

## Inicio rápido

```bash
cp .env.example .env
npm install
npm run dev
```

## Estructura

```
src/
├── app/           Router, proveedores, layout, estilos globales
├── features/      Una carpeta por funcionalidad (espejo de módulos del backend)
│   ├── auth/
│   ├── propiedades/
│   ├── mapa/
│   ├── indice/
│   ├── busqueda/
│   ├── favoritos/
│   ├── mensajes/
│   ├── agenda/
│   ├── resenas/
│   └── admin/
└── shared/
    ├── api/        Cliente HTTP con renovación automática del token
    ├── components/ Componentes reutilizables
    └── hooks/
```
