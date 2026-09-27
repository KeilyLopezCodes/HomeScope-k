import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../errors/AppError.js';

export function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) throw new AppError('NO_TOKEN', 'Token requerido', 401);

  try {
    req.user = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET);
    next();
  } catch {
    throw new AppError('TOKEN_INVALIDO', 'Token inválido o expirado', 401);
  }
}

export function requirePermission(_permission) {
  // TODO: Verificar permiso contra los permisos del usuario en req.user
  return (_req, _res, next) => next();
}
