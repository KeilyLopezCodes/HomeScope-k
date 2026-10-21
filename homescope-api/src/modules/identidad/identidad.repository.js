import { prisma } from '../../config/prisma.js';

// Campos públicos del perfil (nunca expone password_hash)
const PERFIL_SELECT = {
  id: true, nombre: true, apellido: true, email: true,
  telefono: true, foto_url: true, estado: true,
  correo_verificado: true, fecha_registro: true, ultimo_acceso: true,
  usuario_rol: { select: { rol: { select: { nombre: true } } } },
};

export class IdentidadRepository {
  async crearUsuario({ nombre, apellido, email, passwordHash, telefono, roles }) {
    // roles: string[] — ej. ['comprador'] o ['comprador','vendedor']
    const rolesDb = await prisma.rol.findMany({
      where: { nombre: { in: roles } },
      select: { id: true },
    });

    return prisma.usuario.create({
      data: {
        nombre,
        apellido,
        email,
        password_hash: passwordHash,
        telefono,
        usuario_rol: { create: rolesDb.map((r) => ({ rol_id: r.id })) },
      },
      select: PERFIL_SELECT,
    });
  }

  async buscarPorEmail(email) {
    return prisma.usuario.findUnique({
      where: { email },
      include: { usuario_rol: { include: { rol: true } } },
    });
  }

  async buscarPorId(id) {
    return prisma.usuario.findUnique({
      where: { id },
      select: {
        ...PERFIL_SELECT,
        password_hash: true,
      },
    });
  }

  async estadoCuenta(id) {
    return prisma.usuario.findUnique({ where: { id }, select: { estado: true, correo_verificado: true } });
  }

  // Datos públicos de un usuario (perfil del vendedor): sin correo, teléfono ni nada de la cuenta (RNF-08)
  async perfilPublico(id) {
    return prisma.usuario.findUnique({
      where:  { id },
      select: {
        id: true, nombre: true, apellido: true, foto_url: true, fecha_registro: true, estado: true,
        usuario_rol: { select: { rol: { select: { nombre: true } } } },
      },
    });
  }

  async actualizarUsuario(id, datos) {
    return prisma.usuario.update({
      where: { id },
      data: datos,
      select: PERFIL_SELECT,
    });
  }

  async actualizarUltimoAcceso(id) {
    return prisma.usuario.update({
      where: { id },
      data: { ultimo_acceso: new Date() },
      select: { id: true },
    });
  }

  // ── Tokens ────────────────────────────────────────────────────────────────

  async crearToken({ usuarioId, tipo, tokenHash, expiraEn, recordarSesion = false }) {
    return prisma.tokenUsuario.create({
      data: {
        usuario_id: usuarioId,
        tipo,
        token_hash: tokenHash,
        expira_en: expiraEn,
        recordar_sesion: recordarSesion,
      },
    });
  }

  async buscarToken(tokenHash) {
    return prisma.tokenUsuario.findUnique({
      where: { token_hash: tokenHash },
      include: { usuario: { include: { usuario_rol: { include: { rol: true } } } } },
    });
  }

  async marcarTokenUsado(id) {
    return prisma.tokenUsuario.update({
      where: { id },
      data: { usado: true, usado_en: new Date() },
    });
  }

  // Rotación del refresh token en una transacción: marca el actual como usado y crea el nuevo.
  // Si el actual ya estaba usado (otra petición lo rotó primero), solo rota si ese uso fue hace menos
  // de `graciaMs`; usado_en no se cambia, para que la gracia cuente desde el primer uso. Devuelve si rotó
  async rotarRefreshToken(idActual, { usuarioId, tokenHash, expiraEn, recordarSesion }, { graciaMs = 0 } = {}) {
    return prisma.$transaction(async (tx) => {
      const { count } = await tx.tokenUsuario.updateMany({
        where: { id: idActual, usado: false },
        data:  { usado: true, usado_en: new Date() },
      });
      if (count === 0) {
        const actual = await tx.tokenUsuario.findUnique({ where: { id: idActual }, select: { usado_en: true } });
        if (!actual?.usado_en || Date.now() - actual.usado_en.getTime() >= graciaMs) return false;
      }
      await tx.tokenUsuario.create({
        data: { usuario_id: usuarioId, tipo: 'refresh', token_hash: tokenHash, expira_en: expiraEn, recordar_sesion: recordarSesion },
      });
      return true;
    });
  }

  async revocarTokensDeUsuario(usuarioId, tipo) {
    return prisma.tokenUsuario.updateMany({
      where: { usuario_id: usuarioId, tipo, usado: false },
      data: { usado: true, usado_en: new Date() },
    });
  }

  // ── Roles ─────────────────────────────────────────────────────────────────

  async agregarRol(usuarioId, nombreRol) {
    const rol = await prisma.rol.findUnique({ where: { nombre: nombreRol } });
    if (!rol) throw new Error(`Rol '${nombreRol}' no existe`);
    return prisma.usuarioRol.upsert({
      where: { usuario_id_rol_id: { usuario_id: usuarioId, rol_id: rol.id } },
      create: { usuario_id: usuarioId, rol_id: rol.id },
      update: {},
    });
  }

  async rolesDeUsuario(usuarioId) {
    const rows = await prisma.usuarioRol.findMany({
      where: { usuario_id: usuarioId },
      include: { rol: true },
    });
    return rows.map((r) => r.rol.nombre);
  }
}
