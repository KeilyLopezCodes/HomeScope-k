import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { mailAdapter } from '../../shared/adapters/mail.adapter.js';
import { IdentidadRepository } from './identidad.repository.js';

const repo = new IdentidadRepository();
const BCRYPT_ROUNDS        = 12;
const ACCESS_TTL           = '15m';
const REFRESH_TTL_NORMAL   = '1d';
const REFRESH_TTL_RECORDAR = '30d';
const VERIFICACION_TTL_MS  = 24 * 60 * 60 * 1000;
const RECUPERACION_TTL_MS  =  1 * 60 * 60 * 1000;
// Un refresh token recién rotado se acepta de nuevo durante este tiempo: si dos peticiones lo usan a la
// vez (dos pestañas que recargan, varias consultas que renuevan juntas) ninguna pierde la sesión
const REUSO_GRACIA_MS      = 10 * 1000;

// ── Helpers ───────────────────────────────────────────────────────────────────

function rolesDeUsuario(usuario) {
  // Soporta tanto el modelo RBAC (usuario_rol[]) como el campo legacy (rol string)
  if (usuario.usuario_rol?.length) {
    return usuario.usuario_rol.map((ur) => ur.rol?.nombre ?? ur.rol_id);
  }
  return [usuario.rol ?? 'comprador'];
}

function generarAccessToken(usuario) {
  const roles = rolesDeUsuario(usuario);
  return jwt.sign(
    { sub: usuario.id, roles, rol: roles[0] }, // rol singular por compatibilidad con middleware
    env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

// jti aleatorio: sin él, dos tokens del mismo usuario emitidos en el mismo segundo son idénticos
// (mismo hash) y el segundo choca con la restricción única de token_hash
function generarRefreshToken(usuario, recordar = false) {
  return jwt.sign({ sub: usuario.id, jti: crypto.randomUUID() }, env.JWT_REFRESH_SECRET, {
    expiresIn: recordar ? REFRESH_TTL_RECORDAR : REFRESH_TTL_NORMAL,
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function expiracionDesde(ms) {
  return new Date(Date.now() + ms);
}

function perfilPublico(usuario) {
  const { password_hash, ...rest } = usuario;
  const roles = rolesDeUsuario(usuario);
  return {
    ...rest,
    roles,
    rol: roles[0], // igual que el login: el frontend guarda la sesión con `rol`
  };
}

// ── Casos de uso ──────────────────────────────────────────────────────────────

export class IdentidadService {
  async registro({ nombre, apellido, email, password, telefono, roles }) {
    const existe = await repo.buscarPorEmail(email);
    if (existe) throw new AppError('EMAIL_EN_USO', 'El correo ya está registrado', 409);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const usuario = await repo.crearUsuario({
      nombre, apellido, email, passwordHash, telefono,
      roles: roles ?? ['comprador'],
    });

    const tokenPlano = crypto.randomBytes(32).toString('hex');
    await repo.crearToken({
      usuarioId: usuario.id,
      tipo: 'verificacion',
      tokenHash: hashToken(tokenPlano),
      expiraEn: expiracionDesde(VERIFICACION_TTL_MS),
    });

    const url = `${env.CORS_ORIGIN}/verificar-correo?token=${tokenPlano}`;
    await mailAdapter.send(
      email,
      'Verifica tu correo — HomeScope',
      `<p>Hola ${nombre},</p>
       <p>Haz clic en el siguiente enlace para verificar tu cuenta (válido 24 h):</p>
       <p><a href="${url}">${url}</a></p>`
    );

    return { id: usuario.id, nombre: usuario.nombre, apellido: usuario.apellido, email: usuario.email };
  }

  // Idempotente: abrir de nuevo un enlace ya usado (doble clic, recargar la página, el doble efecto de
  // React en desarrollo) no es un error si la cuenta ya quedó verificada. Devuelve { yaVerificado }
  async verificarCorreo(tokenPlano) {
    const registro = await repo.buscarToken(hashToken(tokenPlano ?? ''));

    if (registro?.tipo === 'verificacion' && registro.usado && registro.usuario?.correo_verificado)
      return { yaVerificado: true };

    if (!registro || registro.tipo !== 'verificacion' || registro.usado)
      throw new AppError('TOKEN_INVALIDO', 'El enlace no es válido', 400);

    if (registro.expira_en < new Date())
      throw new AppError('TOKEN_EXPIRADO', 'El enlace ha expirado', 400);

    await repo.marcarTokenUsado(registro.id);
    await repo.actualizarUsuario(registro.usuario_id, {
      correo_verificado: true,
      estado: 'activo',
    });
    return { yaVerificado: false };
  }

  async login({ email, password, recordar }) {
    const usuario = await repo.buscarPorEmail(email);
    if (!usuario) throw new AppError('CREDENCIALES_INVALIDAS', 'Credenciales incorrectas', 401);

    const passwordOk = await bcrypt.compare(password, usuario.password_hash);
    if (!passwordOk) throw new AppError('CREDENCIALES_INVALIDAS', 'Credenciales incorrectas', 401);

    if (!usuario.correo_verificado)
      throw new AppError('CORREO_NO_VERIFICADO', 'Debes verificar tu correo antes de iniciar sesión', 403);

    if (usuario.estado === 'suspendido')
      throw new AppError('CUENTA_SUSPENDIDA', 'Tu cuenta ha sido suspendida', 403);

    const accessToken  = generarAccessToken(usuario);
    const refreshPlano = generarRefreshToken(usuario, !!recordar);
    const ttlMs = recordar ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    await repo.crearToken({
      usuarioId: usuario.id,
      tipo: 'refresh',
      tokenHash: hashToken(refreshPlano),
      expiraEn: expiracionDesde(ttlMs),
      recordarSesion: !!recordar,
    });

    await repo.actualizarUltimoAcceso(usuario.id);

    const roles = rolesDeUsuario(usuario);
    return {
      accessToken,
      refreshToken: refreshPlano,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        apellido: usuario.apellido,
        email: usuario.email,
        roles,
        rol: roles[0], // compatibilidad con frontend existente
      },
    };
  }

  async refresh(tokenPlano) {
    let payload;
    try {
      payload = jwt.verify(tokenPlano, env.JWT_REFRESH_SECRET);
    } catch {
      throw new AppError('TOKEN_INVALIDO', 'Refresh token inválido o expirado', 401);
    }

    const registro = await repo.buscarToken(hashToken(tokenPlano));
    const ahora = Date.now();
    const recienUsado = registro?.usado && registro.usado_en && ahora - registro.usado_en.getTime() < REUSO_GRACIA_MS;
    if (!registro || registro.tipo !== 'refresh' || registro.expira_en < new Date() || (registro.usado && !recienUsado))
      throw new AppError('TOKEN_INVALIDO', 'Refresh token inválido o expirado', 401);

    const usuario = await repo.buscarPorId(payload.sub);
    if (usuario.estado === 'suspendido')
      throw new AppError('CUENTA_SUSPENDIDA', 'Tu cuenta ha sido suspendida', 403);

    const recordar = registro.recordar_sesion;
    const ttlMs = recordar ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const accessToken  = generarAccessToken(usuario);
    const refreshNuevo = generarRefreshToken(usuario, recordar);

    // Marcar el anterior como usado y guardar el nuevo, todo o nada: si falla, la cookie actual sigue sirviendo
    const rotado = await repo.rotarRefreshToken(registro.id, {
      usuarioId: usuario.id,
      tokenHash: hashToken(refreshNuevo),
      expiraEn: expiracionDesde(ttlMs),
      recordarSesion: recordar,
    }, { graciaMs: REUSO_GRACIA_MS });
    if (!rotado) throw new AppError('TOKEN_INVALIDO', 'Refresh token inválido o expirado', 401);

    return { accessToken, refreshToken: refreshNuevo, recordar };
  }

  // Identifica al usuario por el refresh token de la cookie (no requiere access token).
  // Idempotente: si no hay token o es inválido, no hay nada que revocar.
  async logout(tokenPlano) {
    if (!tokenPlano) return;
    let payload;
    try {
      payload = jwt.verify(tokenPlano, env.JWT_REFRESH_SECRET, { ignoreExpiration: true });
    } catch {
      return;
    }
    await repo.revocarTokensDeUsuario(payload.sub, 'refresh');
  }

  async solicitarRecuperacion(email) {
    const usuario = await repo.buscarPorEmail(email);
    if (!usuario) return;

    await repo.revocarTokensDeUsuario(usuario.id, 'recuperacion');

    const tokenPlano = crypto.randomBytes(32).toString('hex');
    await repo.crearToken({
      usuarioId: usuario.id,
      tipo: 'recuperacion',
      tokenHash: hashToken(tokenPlano),
      expiraEn: expiracionDesde(RECUPERACION_TTL_MS),
    });

    const url = `${env.CORS_ORIGIN}/recuperar-contrasena/${tokenPlano}`;
    await mailAdapter.send(
      email,
      'Recupera tu contraseña — HomeScope',
      `<p>Hola ${usuario.nombre},</p>
       <p>Haz clic en el siguiente enlace (válido 1 hora):</p>
       <p><a href="${url}">${url}</a></p>
       <p>Si no solicitaste esto, ignora este correo.</p>`
    );
  }

  async resetPassword(tokenPlano, nuevaPassword) {
    const registro = await repo.buscarToken(hashToken(tokenPlano));

    if (!registro || registro.tipo !== 'recuperacion' || registro.usado)
      throw new AppError('TOKEN_INVALIDO', 'El enlace no es válido o ya fue utilizado.', 400);

    if (registro.expira_en < new Date())
      throw new AppError('TOKEN_EXPIRADO', 'El enlace ha expirado. Solicita uno nuevo.', 400);

    const passwordHash = await bcrypt.hash(nuevaPassword, BCRYPT_ROUNDS);
    await repo.marcarTokenUsado(registro.id);
    await repo.actualizarUsuario(registro.usuario_id, { password_hash: passwordHash });
    await repo.revocarTokensDeUsuario(registro.usuario_id, 'refresh');
  }

  async getPerfil(usuarioId) {
    const usuario = await repo.buscarPorId(usuarioId);
    if (!usuario) throw new AppError('USUARIO_NO_ENCONTRADO', 'Usuario no encontrado', 404);
    return perfilPublico(usuario);
  }

  async updatePerfil(usuarioId, datos) {
    const usuario = await repo.buscarPorId(usuarioId);
    if (!usuario) throw new AppError('USUARIO_NO_ENCONTRADO', 'Usuario no encontrado', 404);
    const actualizado = await repo.actualizarUsuario(usuarioId, datos);
    return perfilPublico(actualizado);
  }
}
