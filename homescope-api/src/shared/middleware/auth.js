import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../errors/AppError.js';
import { prisma } from '../../config/prisma.js';

export function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new AppError('NO_TOKEN', 'Token requerido', 401);

  try {
    req.user = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET);
    // Normalizar: tokens viejos solo tienen `rol`, nuevos tienen `roles`
    if (!req.user.roles) req.user.roles = [req.user.rol ?? 'comprador'];
    next();
  } catch {
    throw new AppError('TOKEN_INVALIDO', 'Token inválido o expirado', 401);
  }
}

// Para endpoints públicos cuya respuesta cambia con la sesión: si hay un token válido llena req.user,
// si no hay o es inválido sigue como visitante (sin 401)
export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      req.user = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET);
      if (!req.user.roles) req.user.roles = [req.user.rol ?? 'comprador'];
    } catch { /* token inválido o expirado: se atiende como visitante */ }
  }
  next();
}

// Verifica que el usuario tenga el permiso requerido consultando la BD
export function requirePermission(codigoPermiso) {
  return async (req, _res, next) => {
    try {
      const permiso = await prisma.permiso.findUnique({
        where: { codigo: codigoPermiso },
        select: {
          rol_permiso: {
            select: { rol: { select: { nombre: true } } },
          },
        },
      });

      if (!permiso) return next(); // permiso no registrado → no bloquear

      const rolesConPermiso = permiso.rol_permiso.map((rp) => rp.rol.nombre);
      const tienePermiso = req.user.roles.some((r) => rolesConPermiso.includes(r));

      if (!tienePermiso)
        throw new AppError('SIN_PERMISO', 'No tienes permiso para realizar esta acción', 403);

      next();
    } catch (err) {
      next(err);
    }
  };
}

// Helper para verificar rol directamente (sin BD)
export function requireRol(...roles) {
  return (req, _res, next) => {
    const tieneRol = req.user?.roles?.some((r) => roles.includes(r));
    if (!tieneRol)
      throw new AppError('SIN_PERMISO', 'No tienes permiso para realizar esta acción', 403);
    next();
  };
}
