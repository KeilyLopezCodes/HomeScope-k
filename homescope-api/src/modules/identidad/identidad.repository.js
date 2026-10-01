import { prisma } from '../../config/prisma.js';

export class IdentidadRepository {
  async crearUsuario({ nombre, email, passwordHash, telefono, rol }) {
    return prisma.usuario.create({
      data: { nombre, email, password_hash: passwordHash, telefono, rol },
    });
  }

  async buscarPorEmail(email) {
    return prisma.usuario.findUnique({ where: { email } });
  }

  async buscarPorId(id) {
    return prisma.usuario.findUnique({ where: { id } });
  }

  async actualizarUsuario(id, datos) {
    return prisma.usuario.update({ where: { id }, data: datos });
  }

  async crearToken({ usuarioId, tipo, tokenHash, expiraEn }) {
    return prisma.tokenUsuario.create({
      data: { usuario_id: usuarioId, tipo, token_hash: tokenHash, expira_en: expiraEn },
    });
  }

  async buscarToken(tokenHash) {
    return prisma.tokenUsuario.findUnique({
      where: { token_hash: tokenHash },
      include: { usuario: true },
    });
  }

  async marcarTokenUsado(id) {
    return prisma.tokenUsuario.update({ where: { id }, data: { usado: true } });
  }

  async revocarTokensDeUsuario(usuarioId, tipo) {
    return prisma.tokenUsuario.updateMany({
      where: { usuario_id: usuarioId, tipo, usado: false },
      data: { usado: true },
    });
  }
}
