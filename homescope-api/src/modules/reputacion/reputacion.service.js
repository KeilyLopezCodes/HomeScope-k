// Reseñas y calificación de vendedores (RF-30). Una reseña por comprador y propiedad, y solo si el
// comprador tuvo contacto real con la propiedad: escribió en su conversación o ya la visitó.
import { AppError } from '../../shared/errors/AppError.js';
import { ReputacionRepository } from './reputacion.repository.js';
import { PropiedadesService } from '../propiedades/propiedades.service.js';
import { PropiedadesRepository } from '../propiedades/propiedades.repository.js';
import { ComunicacionRepository } from '../comunicacion/comunicacion.repository.js';
import { ComunicacionService } from '../comunicacion/comunicacion.service.js';
import { AgendaRepository } from '../agenda/agenda.repository.js';
import { IdentidadRepository } from '../identidad/identidad.repository.js';

const repo = new ReputacionRepository();
const propiedadesService = new PropiedadesService();
const propiedadesRepo = new PropiedadesRepository();
const comunicacionRepo = new ComunicacionRepository();
const comunicacion = new ComunicacionService();
const agendaRepo = new AgendaRepository();
const identidadRepo = new IdentidadRepository();

const ROLES_VENDEDOR = ['vendedor', 'seller', 'administrador', 'admin'];
const ESTADOS_OCULTOS = ['suspendido', 'inhabilitado'];

const MOTIVOS = {
  PROPIEDAD_PROPIA:       'No puedes calificarte a ti mismo.',
  YA_RESENADA:            'Ya calificaste al vendedor por esta propiedad.',
  SIN_CONTACTO_NI_VISITA: 'Solo puedes calificar al vendedor si le escribiste por esta propiedad o ya la visitaste.',
};

const redondear1 = (n) => (n == null ? null : Math.round(n * 10) / 10);

// Promedio con un decimal y cuántas reseñas hay de cada calificación (las cinco, aunque sea 0)
export function formatearResumen({ promedio, total, distribucion }) {
  return {
    promedio: redondear1(promedio),
    total,
    distribucion: Object.fromEntries([5, 4, 3, 2, 1].map((n) => [n, distribucion?.[n] ?? 0])),
  };
}

export class ReputacionService {
  // ¿Puede este comprador calificar al vendedor de la propiedad? → { puede_resenar, motivo, mensaje, por, resena }
  async elegibilidad(compradorId, propiedadId) {
    const propiedad = await propiedadesService.datosParaConversacion(propiedadId);
    if (!propiedad) throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada', 404);

    const respuesta = (motivo, extra = {}) => ({
      propiedad_id: propiedadId, puede_resenar: !motivo, motivo, mensaje: motivo ? MOTIVOS[motivo] : null, ...extra,
    });

    if (propiedad.vendedor_id === compradorId) return respuesta('PROPIEDAD_PROPIA');

    const existente = await repo.buscarDeComprador(compradorId, propiedadId);
    if (existente) return respuesta('YA_RESENADA', { resena: existente });

    const [contacto, visita] = await Promise.all([
      comunicacionRepo.compradorEscribio(propiedadId, compradorId),
      agendaRepo.visitaRealizada(propiedadId, compradorId),
    ]);
    // `por`: qué le da derecho a calificar (para mostrarlo en la reseña o en la interfaz)
    const por = [contacto && 'contacto', visita && 'visita'].filter(Boolean);
    return por.length ? respuesta(null, { por }) : respuesta('SIN_CONTACTO_NI_VISITA');
  }

  async crearResena(compradorId, { propiedad_id, calificacion, comentario }) {
    const permiso = await this.elegibilidad(compradorId, propiedad_id);
    if (!permiso.puede_resenar) {
      const status = { PROPIEDAD_PROPIA: 422, YA_RESENADA: 409, SIN_CONTACTO_NI_VISITA: 403 }[permiso.motivo];
      throw new AppError(permiso.motivo, permiso.mensaje, status);
    }

    const { vendedor_id } = await propiedadesService.datosParaConversacion(propiedad_id);
    let resena;
    try {
      resena = await repo.crear({ vendedorId: vendedor_id, compradorId, propiedadId: propiedad_id, calificacion, comentario });
    } catch (err) {
      // Dos envíos a la vez: el índice único (comprador, propiedad) deja pasar solo uno
      if (err.code === 'P2002') throw new AppError('YA_RESENADA', MOTIVOS.YA_RESENADA, 409);
      throw err;
    }

    await comunicacion.notificar(vendedor_id, {
      tipo: 'resena',
      titulo: 'Recibiste una nueva reseña',
      contenido: `${resena.comprador.nombre} te calificó con ${calificacion} de 5 por "${resena.propiedad.titulo}".`,
      referencia_tipo: 'resena',
      referencia_id: resena.id,
    });
    return resena;
  }

  // Perfil público del vendedor con su calificación promedio (RF-30)
  async perfilVendedor(vendedorId) {
    const usuario = await identidadRepo.perfilPublico(vendedorId);
    const roles = usuario?.usuario_rol.map((r) => r.rol.nombre.toLowerCase()) ?? [];
    if (!usuario || ESTADOS_OCULTOS.includes(usuario.estado) || !roles.some((r) => ROLES_VENDEDOR.includes(r)))
      throw new AppError('NO_ENCONTRADO', 'Vendedor no encontrado', 404);

    const [resumen, publicadas] = await Promise.all([
      repo.resumenDeVendedor(vendedorId),
      propiedadesRepo.contarPublicadasDe(vendedorId),
    ]);
    return {
      id:                     usuario.id,
      nombre:                 usuario.nombre,
      apellido:               usuario.apellido,
      foto_url:               usuario.foto_url,
      miembro_desde:          usuario.fecha_registro,
      // TODO: insignia según verificacion_vendedor aprobada (RF-25)
      verificado:             false,
      propiedades_publicadas: publicadas,
      calificacion:           formatearResumen(resumen),
    };
  }

  async resenasDeVendedor(vendedorId, paginacion) {
    await this.perfilVendedor(vendedorId); // 404 si no es un vendedor visible
    const { items, total } = await repo.listarDeVendedor(vendedorId, paginacion);
    return { data: items, total, ...paginacion };
  }
}
