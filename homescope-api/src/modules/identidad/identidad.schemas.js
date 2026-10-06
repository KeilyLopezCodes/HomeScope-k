import { z } from 'zod';

export const registroSchema = z.object({
  nombre:   z.string().min(2).max(100),
  apellido: z.string().min(2).max(100),
  email:    z.string().email(),
  password: z.string().min(8).max(72),
  telefono: z.string().max(20).optional(),
  roles:    z.array(z.enum(['comprador', 'vendedor'])).min(1).default(['comprador']),
});

export const loginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
  recordar: z.boolean().default(false),
});

export const updatePerfilSchema = z.object({
  nombre:   z.string().min(2).max(100).optional(),
  apellido: z.string().min(2).max(100).optional(),
  telefono: z.string().max(20).optional(),
  foto_url: z.string().url().max(500).optional(),
});

export const recuperarSchema = z.object({
  email: z.string().email(),
});

export const resetPasswordSchema = z.object({
  password: z.string().min(8).max(72),
});
