import { z } from 'zod';
import 'dotenv/config';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string(),
  JWT_ACCESS_SECRET: z.string(),
  JWT_REFRESH_SECRET: z.string(),
  CORS_ORIGIN: z.string(),
  GOOGLE_MAPS_API_KEY: z.string(),
  // Almacenamiento de archivos: 'local' (disco de este equipo) | 'cloudinary'
  STORAGE_DRIVER: z.enum(['local', 'cloudinary']).default('local'),
  UPLOADS_DIR: z.string().default('uploads'),
  // URL pública con la que el navegador accede a la API (para armar URLs de archivos locales)
  API_PUBLIC_URL: z.string().url().optional(),
  CLOUDINARY_URL: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(),
});

export const env = envSchema
  .refine((e) => e.STORAGE_DRIVER !== 'cloudinary' || e.CLOUDINARY_URL, {
    message: 'CLOUDINARY_URL es requerido cuando STORAGE_DRIVER=cloudinary',
    path: ['CLOUDINARY_URL'],
  })
  .parse(process.env);
