import jwt from 'jsonwebtoken';
import { env } from '../../config/env.js';
import { AppError } from '../errors/AppError.js';
import { prisma } from '../../config/prisma.js';

// ── Estado de la cuenta ──────────────────────────────────────────────────────
// Una cuenta suspendida o inhabilitada pierde todo acceso aunque tenga un access token vigente
// (arquitectura §12, Seguridad). Se consulta en la BD con una caché corta para no hacerlo en cada petición;
// moderación la limpia al suspender o reactivar, así el cambio aplica de inmediato.
const CUENTAS_BLOQUEADAS = ['suspendido', 'inhabilitado'];
const CACHE_CUENTA_MS = 30 * 1000;
const cacheCuentas = new Map(); // usuarioId → { estado, hasta }

export function olvidarEstadoCuenta(usuarioId) {
  cacheCuentas.delete(Number(usuarioId));
}

export async function cuentaActiva(usuarioId) {
  const id = Number(usuarioId);
  let entrada = cacheCuentas.get(id);
  if (!entrada || entrada.hasta < Date.now()) {
    const usuario = await prisma.usuario.findUnique({ where: { id }, select: { estado: true } });
    entrada = { estado: usuario?.estado ?? null, hasta: Date.now() + CACHE_CUENTA_MS };
    cacheCuentas.set(id, entrada);
  }
  return entrada.estado !== null && !CUENTAS_BLOQUEADAS.includes(entrada.estado);
}

function verificarToken(header) {
  const usuario = jwt.verify(header.slice(7), env.JWT_ACCESS_SECRET);
  // Normalizar: tokens viejos solo tienen `rol`, nuevos tienen `roles`
  if (!usuario.roles) usuario.roles = [usuario.rol ?? 'comprador'];
  return usuario;
}

export async function authenticate(req, _res, next) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) return next(new AppError('NO_TOKEN', 'Token requerido', 401));

  try {
    req.user = verificarToken(header);
  } catch {
    return next(new AppError('TOKEN_INVALIDO', 'Token inválido o expirado', 401));
  }
  try {
    if (!(await cuentaActiva(req.user.sub)))
      return next(new AppError('CUENTA_SUSPENDIDA', 'Tu cuenta está suspendida', 403));
    next();
  } catch (err) {
    next(err);
  }
}

// Para endpoints públicos cuya respuesta cambia con la sesión: si hay un token válido llena req.user,
// si no hay, es inválido o la cuenta está suspendida, sigue como visitante (sin 401)
export async function optionalAuth(req, _res, next) {
  const header = req.headers.authorization;
  if (header?.startsWith('Bearer ')) {
    try {
      const usuario = verificarToken(header);
      // Con la cuenta suspendida se atiende como visitante
      if (await cuentaActiva(usuario.sub)) req.user = usuario;
    } catch { /* token inválido o expirado: se atiende como visitante */ }
  }
  next();
}

// Solo el rol administrador (sin distinguir mayúsculas). Los permisos admin.* no están registrados
// en la BD, así que requirePermission los dejaría pasar: las rutas /admin exigen el rol
const ROLES_ADMIN = ['administrador', 'admin'];
export function requireAdmin(req, _res, next) {
  if (!req.user?.roles?.some((r) => ROLES_ADMIN.includes(String(r).toLowerCase())))
    return next(new AppError('SIN_PERMISO', 'Solo el administrador puede usar esta función', 403));
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
