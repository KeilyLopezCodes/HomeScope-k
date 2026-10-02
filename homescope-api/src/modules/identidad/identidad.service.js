import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { env } from '../../config/env.js';
import { AppError } from '../../shared/errors/AppError.js';
import { mailAdapter } from '../../shared/adapters/mail.adapter.js';
import { IdentidadRepository } from './identidad.repository.js';

const repo = new IdentidadRepository();
const BCRYPT_ROUNDS = 12;
const ACCESS_TTL           = '15m';
const REFRESH_TTL_NORMAL   = '1d';
const REFRESH_TTL_RECORDAR = '30d';
const VERIFICACION_TTL_MS  = 24 * 60 * 60 * 1000; // 24 h
const RECUPERACION_TTL_MS  =  1 * 60 * 60 * 1000; //  1 h

// ── Helpers ──────────────────────────────────────────────────────────────────

function generarAccessToken(usuario) {
  return jwt.sign(
    { sub: usuario.id, rol: usuario.rol },
    env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TTL }
  );
}

function generarRefreshToken(usuario, recordar) {
  return jwt.sign(
    { sub: usuario.id },
    env.JWT_REFRESH_SECRET,
    { expiresIn: recordar ? REFRESH_TTL_RECORDAR : REFRESH_TTL_NORMAL }
  );
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function expiracionDesde(ms) {
  return new Date(Date.now() + ms);
}

// ── Casos de uso ─────────────────────────────────────────────────────────────

export class IdentidadService {
  async registro({ nombre, email, password, telefono, rol }) {
    const existe = await repo.buscarPorEmail(email);
    if (existe) throw new AppError('EMAIL_EN_USO', 'El correo ya está registrado', 409);

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const usuario = await repo.crearUsuario({ nombre, email, passwordHash, telefono, rol });

    // Generar token de verificación
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

    return { id: usuario.id, nombre: usuario.nombre, email: usuario.email };
  }

  async verificarCorreo(tokenPlano) {
    const registro = await repo.buscarToken(hashToken(tokenPlano));

    if (!registro || registro.tipo !== 'verificacion' || registro.usado)
      throw new AppError('TOKEN_INVALIDO', 'El enlace no es válido', 400);

    if (registro.expira_en < new Date())
      throw new AppError('TOKEN_EXPIRADO', 'El enlace ha expirado', 400);

    await repo.marcarTokenUsado(registro.id);
    await repo.actualizarUsuario(registro.usuario_id, {
      correo_verificado: true,
      estado: 'activo',
    });
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
    const refreshPlano = generarRefreshToken(usuario, recordar);
    const ttlMs = recordar ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    await repo.crearToken({
      usuarioId: usuario.id,
      tipo: 'refresh',
      tokenHash: hashToken(refreshPlano),
      expiraEn: expiracionDesde(ttlMs),
    });

    return {
      accessToken,
      refreshToken: refreshPlano,
      usuario: { id: usuario.id, nombre: usuario.nombre, email: usuario.email, rol: usuario.rol },
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
    if (!registro || registro.usado || registro.expira_en < new Date())
      throw new AppError('TOKEN_INVALIDO', 'Refresh token inválido o expirado', 401);

    // Rotación: si el token ya fue usado, revocar toda la sesión (posible robo)
    if (registro.usado) {
      await repo.revocarTokensDeUsuario(payload.sub, 'refresh');
      throw new AppError('TOKEN_REUTILIZADO', 'Sesión revocada por seguridad', 401);
    }

    await repo.marcarTokenUsado(registro.id);

    const usuario = await repo.buscarPorId(payload.sub);
    if (usuario.estado === 'suspendido')
      throw new AppError('CUENTA_SUSPENDIDA', 'Tu cuenta ha sido suspendida', 403);

    // Preservar la duración original del token (recordar = expira en más de 1 día)
    const ttlOriginalMs = new Date(registro.expira_en) - new Date(registro.creado_en);
    const recordar = ttlOriginalMs > 24 * 60 * 60 * 1000;
    const ttlNuevoMs = recordar ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;

    const accessToken  = generarAccessToken(usuario);
    const refreshNuevo = generarRefreshToken(usuario, recordar);

    await repo.crearToken({
      usuarioId: usuario.id,
      tipo: 'refresh',
      tokenHash: hashToken(refreshNuevo),
      expiraEn: expiracionDesde(ttlNuevoMs),
    });

    return { accessToken, refreshToken: refreshNuevo, recordar };
  }

  async logout(usuarioId) {
    await repo.revocarTokensDeUsuario(usuarioId, 'refresh');
  }

  async solicitarRecuperacion(email) {
    const usuario = await repo.buscarPorEmail(email);
    // Respuesta genérica siempre para no revelar si el correo existe
    if (!usuario) return;

    // Invalidar tokens de recuperación previos no usados
    await repo.revocarTokensDeUsuario(usuario.id, 'recuperacion');

    const tokenPlano = crypto.randomBytes(32).toString('hex');
    await repo.crearToken({
      usuarioId: usuario.id,
      tipo: 'recuperacion',
      tokenHash: hashToken(tokenPlano),
      expiraEn: expiracionDesde(RECUPERACION_TTL_MS),
    });

    const url = `${env.CORS_ORIGIN}/recuperar/${tokenPlano}`;
    await mailAdapter.send(
      email,
      'Recupera tu contraseña — HomeScope',
      `<p>Hola ${usuario.nombre},</p>
       <p>Recibimos una solicitud para restablecer tu contraseña.</p>
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
    // Revocar todas las sesiones activas por seguridad
    await repo.revocarTokensDeUsuario(registro.usuario_id, 'refresh');
  }

  async getPerfil(usuarioId) {
    const usuario = await repo.buscarPorId(usuarioId);
    if (!usuario) throw new AppError('USUARIO_NO_ENCONTRADO', 'Usuario no encontrado', 404);
    const { password_hash, ...perfil } = usuario;
    return perfil;
  }

  async updatePerfil(usuarioId, datos) {
    const usuario = await repo.buscarPorId(usuarioId);
    if (!usuario) throw new AppError('USUARIO_NO_ENCONTRADO', 'Usuario no encontrado', 404);

    const actualizado = await repo.actualizarUsuario(usuarioId, datos);
    const { password_hash, ...perfil } = actualizado;
    return perfil;
  }
}
