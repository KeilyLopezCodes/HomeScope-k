// Agenda: disponibilidad declarada por el vendedor, solicitudes de visita y recordatorios.
import { AppError } from '../../shared/errors/AppError.js';
import { mailAdapter } from '../../shared/adapters/mail.adapter.js';
import { AgendaRepository, horaEfectiva } from './agenda.repository.js';
import {
  ANTICIPACION_MINIMA_MIN, DIAS_MAXIMOS, DURACION_VISITA_MIN, NOMBRES_DIA, ZONA_HORARIA,
  coincideConFranja, dentroDeAnticipacion, fechaHoraLegible, generarHorarios, horaDeBD,
} from './agenda.tiempo.js';
import { ESTADOS_ACTIVOS } from './agenda.schemas.js';
import { PropiedadesService } from '../propiedades/propiedades.service.js';
import { ComunicacionService } from '../comunicacion/comunicacion.service.js';

const repo = new AgendaRepository();
const propiedadesService = new PropiedadesService();
const comunicacion = new ComunicacionService();

const ROLES_VENDEDOR = ['vendedor', 'seller', 'administrador', 'admin'];
// El recordatorio se envía cuando faltan 24 horas o menos (el trabajo revisa cada 15 minutos)
export const HORAS_RECORDATORIO = 24;

const formatearFranja = (f) => ({
  id: f.id, dia_semana: f.dia_semana, dia: NOMBRES_DIA[f.dia_semana - 1],
  hora_inicio: horaDeBD(f.hora_inicio), hora_fin: horaDeBD(f.hora_fin),
});

// La misma visita vista por cada participante: su rol, con quién y qué acciones tiene disponibles
function formatearVisita(v, usuarioId) {
  const soyVendedor = v.propiedad.vendedor.id === usuarioId;
  const activa = ESTADOS_ACTIVOS.includes(v.estado);
  const futura = horaEfectiva(v) > new Date();
  return {
    id:                    v.id,
    rol:                   soyVendedor ? 'vendedor' : 'comprador',
    estado:                v.estado,
    fecha_hora:            horaEfectiva(v),
    fecha_hora_solicitada: v.fecha_hora_solicitada,
    fecha_hora_confirmada: v.fecha_hora_confirmada,
    propiedad:             { id: v.propiedad.id, titulo: v.propiedad.titulo, direccion: v.propiedad.direccion, municipio: v.propiedad.municipio },
    contraparte:           soyVendedor ? v.comprador : v.propiedad.vendedor,
    nota_comprador:        v.nota_comprador,
    recordatorio_enviado:  v.recordatorio_enviado,
    fecha_creacion:        v.fecha_creacion,
    // Lo que este usuario puede hacer ahora (el frontend lo usa para mostrar los botones)
    acciones: {
      confirmar:   soyVendedor && v.estado === 'solicitada' && futura,
      reprogramar: soyVendedor && activa && futura,
      cancelar:    activa && futura,
    },
  };
}

// La hora en español ya puede terminar en punto ("5:00 p. m."): solo se agrega si falta
const conPunto = (texto) => (texto.endsWith('.') ? texto : `${texto}.`);

const escaparHtml = (t) => String(t).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export class AgendaService {
  // ── Disponibilidad ─────────────────────────────────────────────────────────

  async obtenerDisponibilidad(vendedorId) {
    const franjas = await repo.listarFranjas(vendedorId);
    return {
      franjas: franjas.map(formatearFranja),
      zona_horaria: ZONA_HORARIA,
      duracion_visita_min: DURACION_VISITA_MIN,
    };
  }

  // Reemplaza todas las franjas semanales del vendedor
  async guardarDisponibilidad(usuario, franjas) {
    if (!usuario.roles?.some((r) => ROLES_VENDEDOR.includes(String(r).toLowerCase())))
      throw new AppError('SIN_PERMISO', 'Solo los vendedores pueden declarar disponibilidad para visitas', 403);
    await repo.reemplazarFranjas(usuario.id, franjas);
    return this.obtenerDisponibilidad(usuario.id);
  }

  // GET /propiedades/:id/horarios: horarios libres de los próximos días
  async horariosDePropiedad(propiedadId, { dias }) {
    const propiedad = await this._propiedadPublicada(propiedadId);
    const franjas = (await repo.listarFranjas(propiedad.vendedor_id)).map(formatearFranja);
    const ocupados = await repo.horariosOcupados(propiedad.vendedor_id);
    return {
      propiedad_id: propiedadId,
      zona_horaria: ZONA_HORARIA,
      duracion_visita_min: DURACION_VISITA_MIN,
      // El frontend distingue "el vendedor no tiene horarios" de "están todos ocupados"
      vendedor_tiene_disponibilidad: franjas.length > 0,
      dias: generarHorarios(franjas, { dias, ocupados }).map((d) => ({
        ...d,
        horarios: d.horarios.map((h) => ({ fecha_hora: h.inicio, hora: h.hora })),
      })),
    };
  }

  // ── Visitas ────────────────────────────────────────────────────────────────

  async solicitarVisita(compradorId, { propiedad_id, fecha_hora, nota }) {
    const propiedad = await this._propiedadPublicada(propiedad_id);
    if (propiedad.vendedor_id === compradorId)
      throw new AppError('PROPIEDAD_PROPIA', 'No puedes solicitar una visita a tu propia propiedad', 422);
    await this._validarHorario(propiedad.vendedor_id, fecha_hora);

    const visita = await repo.crearVisitaSiLibre({
      propiedadId: propiedad_id, vendedorId: propiedad.vendedor_id, compradorId, fechaHora: fecha_hora, nota,
    });

    await comunicacion.notificar(propiedad.vendedor_id, {
      tipo: 'visita',
      titulo: 'Nueva solicitud de visita',
      contenido: conPunto(`${visita.comprador.nombre} quiere visitar "${visita.propiedad.titulo}" el ${fechaHoraLegible(fecha_hora)}`),
      referencia_tipo: 'visita',
      referencia_id: visita.id,
    });
    return formatearVisita(visita, compradorId);
  }

  async listarVisitas(usuarioId, filtros) {
    const { items, total } = await repo.listarVisitas(usuarioId, filtros);
    return { data: items.map((v) => formatearVisita(v, usuarioId)), total, page: filtros.page, pageSize: filtros.pageSize };
  }

  async obtenerVisita(id, usuarioId) {
    return formatearVisita(await this._visitaDeParticipante(id, usuarioId), usuarioId);
  }

  // PATCH /visitas/:id → confirmar o reprogramar (vendedor) o cancelar (cualquiera de los dos)
  async actualizarVisita(id, usuarioId, cambio) {
    const visita = await this._visitaDeParticipante(id, usuarioId);
    const soyVendedor = visita.propiedad.vendedor.id === usuarioId;
    const vista = formatearVisita(visita, usuarioId);

    if (!ESTADOS_ACTIVOS.includes(visita.estado))
      throw new AppError('VISITA_CANCELADA', 'La visita ya está cancelada', 422);
    if (horaEfectiva(visita) <= new Date())
      throw new AppError('VISITA_PASADA', 'No se puede cambiar una visita cuya hora ya pasó', 422);

    let datos;
    let aviso;
    if (cambio.estado === 'confirmada') {
      if (!soyVendedor) throw new AppError('SIN_PERMISO', 'Solo el vendedor puede confirmar la visita', 403);
      if (!vista.acciones.confirmar)
        throw new AppError('TRANSICION_INVALIDA', `No se puede confirmar una visita ${visita.estado}`, 422);
      datos = { estado: 'confirmada', fechaHoraConfirmada: visita.fecha_hora_solicitada };
      aviso = { titulo: 'Visita confirmada', texto: (f) => conPunto(`Tu visita a "${visita.propiedad.titulo}" quedó confirmada para el ${f}`) };
    } else if (cambio.estado === 'reprogramada') {
      if (!soyVendedor) throw new AppError('SIN_PERMISO', 'Solo el vendedor puede reprogramar la visita', 403);
      await this._validarHorario(visita.propiedad.vendedor.id, cambio.fecha_hora);
      datos = { estado: 'reprogramada', fechaHoraConfirmada: cambio.fecha_hora, vendedorId: usuarioId };
      aviso = { titulo: 'Visita reprogramada', texto: (f) => conPunto(`${visita.propiedad.vendedor.nombre} reprogramó tu visita a "${visita.propiedad.titulo}" para el ${f}`) };
    } else {
      datos = { estado: 'cancelada' };
      const quien = soyVendedor ? visita.propiedad.vendedor.nombre : visita.comprador.nombre;
      aviso = { titulo: 'Visita cancelada', texto: () => conPunto(`${quien} canceló la visita a "${visita.propiedad.titulo}" del ${fechaHoraLegible(horaEfectiva(visita))}`) };
    }

    const actualizada = await repo.actualizarVisita(id, datos);
    const destinatario = soyVendedor ? visita.comprador.id : visita.propiedad.vendedor.id;
    await comunicacion.notificar(destinatario, {
      tipo: 'visita',
      titulo: aviso.titulo,
      contenido: aviso.texto(fechaHoraLegible(horaEfectiva(actualizada))),
      referencia_tipo: 'visita',
      referencia_id: id,
    });
    return formatearVisita(actualizada, usuarioId);
  }

  // ── Recordatorios (trabajo programado `recordatorios-visitas`) ─────────────

  // Envía correo y notificación a los dos participantes de cada visita confirmada que ocurre dentro
  // de las próximas 24 horas y aún no tiene recordatorio. Un fallo en una visita no detiene las demás.
  async enviarRecordatorios(ahora = new Date()) {
    const hasta = new Date(ahora.getTime() + HORAS_RECORDATORIO * 60 * 60 * 1000);
    const visitas = await repo.visitasParaRecordar(ahora, hasta);
    const resultado = { revisadas: visitas.length, enviadas: 0, fallidas: 0 };

    for (const v of visitas) {
      const cuando = fechaHoraLegible(v.fecha_hora_confirmada);
      const lugar = [v.propiedad.direccion, v.propiedad.municipio].filter(Boolean).join(', ');
      const participantes = [
        { usuario: v.comprador, texto: `${conPunto(`Tienes una visita a "${v.propiedad.titulo}" el ${cuando}`)} Dirección: ${lugar}.` },
        { usuario: v.propiedad.vendedor, texto: conPunto(`${v.comprador.nombre} visitará tu propiedad "${v.propiedad.titulo}" el ${cuando}`) },
      ];
      try {
        for (const { usuario, texto } of participantes) {
          await mailAdapter.send(
            usuario.email,
            `Recordatorio: visita el ${cuando}`,
            `<p>Hola ${escaparHtml(usuario.nombre)},</p><p>${escaparHtml(texto)}</p>`
            + '<p>Si necesitas cambiarla, entra a HomeScope en la sección de visitas.</p><p>— HomeScope</p>',
          );
          await comunicacion.notificar(usuario.id, {
            tipo: 'visita', titulo: 'Recordatorio de visita', contenido: texto, referencia_tipo: 'visita', referencia_id: v.id,
          });
        }
        await repo.marcarRecordatorioEnviado(v.id);
        resultado.enviadas++;
      } catch (err) {
        // Queda sin marcar: el siguiente ciclo del trabajo lo vuelve a intentar
        console.error(`No se pudo enviar el recordatorio de la visita ${v.id}:`, err.message);
        resultado.fallidas++;
      }
    }
    return resultado;
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  async _propiedadPublicada(propiedadId) {
    const propiedad = await propiedadesService.datosParaConversacion(propiedadId);
    if (!propiedad || propiedad.estado !== 'publicado')
      throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada', 404);
    return propiedad;
  }

  // El horario debe ser el inicio de un bloque dentro de la disponibilidad del vendedor y estar en el rango permitido
  async _validarHorario(vendedorId, fechaHora) {
    if (!dentroDeAnticipacion(fechaHora))
      throw new AppError('HORARIO_FUERA_DE_RANGO',
        `La visita debe ser con al menos ${ANTICIPACION_MINIMA_MIN / 60} horas de anticipación y dentro de los próximos ${DIAS_MAXIMOS} días`, 422);
    const franjas = (await repo.listarFranjas(vendedorId)).map(formatearFranja);
    if (!coincideConFranja(franjas, fechaHora))
      throw new AppError('HORARIO_NO_DISPONIBLE',
        'Ese horario no está en la disponibilidad del vendedor. Consulta los horarios disponibles de la propiedad.', 422);
  }

  // Para quien no participa, la visita no existe (404)
  async _visitaDeParticipante(id, usuarioId) {
    const visita = await repo.buscarVisita(id);
    if (!visita || ![visita.comprador.id, visita.propiedad.vendedor.id].includes(usuarioId))
      throw new AppError('NO_ENCONTRADO', 'Visita no encontrada', 404);
    return visita;
  }
}
