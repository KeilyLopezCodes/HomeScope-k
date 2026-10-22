import path from 'path';
import { env } from '../../../config/env.js';
import { LocalStorageStrategy } from './local.strategy.js';
import { CloudinaryStorageStrategy } from './cloudinary.strategy.js';

// Directorio físico de los archivos locales (lo usa app.js para servirlos)
export const UPLOADS_DIR = path.resolve(env.UPLOADS_DIR);
// Archivos privados (documentos de identidad): fuera de UPLOADS_DIR, la API no los sirve
export const UPLOADS_PRIVADOS_DIR = path.resolve(env.UPLOADS_PRIVADOS_DIR);

// Registro de estrategias: para agregar un proveedor nuevo basta con sumarlo aquí
const estrategias = {
  local: () => new LocalStorageStrategy({
    directorio:        UPLOADS_DIR,
    directorioPrivado: UPLOADS_PRIVADOS_DIR,
    baseUrl:    env.API_PUBLIC_URL ?? `http://localhost:${env.PORT}`,
  }),
  cloudinary: () => new CloudinaryStorageStrategy({ url: env.CLOUDINARY_URL }),
};

// Estrategia activa según STORAGE_DRIVER
export const storage = estrategias[env.STORAGE_DRIVER]();
