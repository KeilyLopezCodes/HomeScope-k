import { z } from 'zod';

// La búsqueda por texto y filtros es parte del catálogo: GET /propiedades (propiedades.schemas.js)
// TODO: búsqueda por área del mapa (HU-21) y alertas de búsqueda guardada (RF-28)
export const alertaSchema = z.object({});
