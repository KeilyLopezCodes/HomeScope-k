import { IdentidadService } from './identidad.service.js';
import { registroSchema, loginSchema, updatePerfilSchema, recuperarSchema, resetPasswordSchema } from './identidad.schemas.js';

const service = new IdentidadService();

const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  path: '/api/v1/auth',
};

export async function registro(req, res, next) {
  try {
    const datos = registroSchema.parse(req.body);
    const usuario = await service.registro(datos);
    res.status(201).json({ message: 'Registro exitoso. Revisa tu correo para verificar tu cuenta.', usuario });
  } catch (err) { next(err); }
}

export async function verificarCorreo(req, res, next) {
  try {
    await service.verificarCorreo(req.query.token);
    res.json({ message: 'Correo verificado correctamente.' });
  } catch (err) { next(err); }
}

export async function login(req, res, next) {
  try {
    const datos = loginSchema.parse(req.body);
    const { accessToken, refreshToken, usuario } = await service.login(datos);

    const maxAge = datos.recordar ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTS, maxAge });
    res.json({ accessToken, usuario });
  } catch (err) { next(err); }
}

export async function refresh(req, res, next) {
  try {
    const tokenPlano = req.cookies?.refreshToken;
    if (!tokenPlano) return res.status(401).json({ error: { code: 'NO_TOKEN', message: 'Token requerido' } });

    const { accessToken, refreshToken, recordar } = await service.refresh(tokenPlano);
    const maxAge = recordar ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    res.cookie('refreshToken', refreshToken, { ...COOKIE_OPTS, maxAge });
    res.json({ accessToken });
  } catch (err) { next(err); }
}

export async function logout(req, res, next) {
  try {
    await service.logout(req.user.sub);
    res.clearCookie('refreshToken', COOKIE_OPTS);
    res.json({ message: 'Sesión cerrada.' });
  } catch (err) { next(err); }
}

export async function getPerfil(req, res, next) {
  try {
    const perfil = await service.getPerfil(req.user.sub);
    res.json(perfil);
  } catch (err) { next(err); }
}

export async function updatePerfil(req, res, next) {
  try {
    const datos = updatePerfilSchema.parse(req.body);
    const perfil = await service.updatePerfil(req.user.sub, datos);
    res.json(perfil);
  } catch (err) { next(err); }
}

export async function solicitarRecuperacion(req, res, next) {
  try {
    const { email } = recuperarSchema.parse(req.body);
    await service.solicitarRecuperacion(email);
    // Respuesta genérica siempre (no revelar si el correo existe)
    res.json({ message: 'Si el correo está registrado, recibirás un enlace en breve.' });
  } catch (err) { next(err); }
}

export async function resetPassword(req, res, next) {
  try {
    const { password } = resetPasswordSchema.parse(req.body);
    await service.resetPassword(req.params.token, password);
    res.json({ message: 'Contraseña actualizada correctamente. Ya puedes iniciar sesión.' });
  } catch (err) { next(err); }
}
