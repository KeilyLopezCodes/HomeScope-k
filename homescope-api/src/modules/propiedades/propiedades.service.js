import { AppError } from '../../shared/errors/AppError.js';
import { PropiedadesRepository } from './propiedades.repository.js';
import { ComunicacionRepository } from '../comunicacion/comunicacion.repository.js';
import { FavoritosRepository } from '../favoritos/favoritos.repository.js';
import { GeoIndiceRepository } from '../geo-indice/geo-indice.repository.js';
import { ReputacionRepository } from '../reputacion/reputacion.repository.js';
import { TRANSICIONES, FOTOS_CONFIG, VIGENCIA_DIAS, DIAS_AVISO_EXPIRACION, PESTANAS_MIAS } from './propiedades.schemas.js';
import { IdentidadRepository } from '../identidad/identidad.repository.js';
import { ModeracionRepository } from '../moderacion/moderacion.repository.js';
import { rangoPeriodo, armarSerie, evaluarDesempeno, tasaInteres, diasActivos, UMBRALES } from './propiedades.estadisticas.js';
import { storage } from '../../shared/adapters/storage/index.js';
import { jobs } from '../../shared/adapters/jobs.adapter.js';
import { CALCULAR_INDICE, OPCIONES_CALCULAR_INDICE } from '../../jobs/trabajos.js';

const repo            = new PropiedadesRepository();
const comunicacionRepo = new ComunicacionRepository();
const favoritosRepo    = new FavoritosRepository();
const geoIndiceRepo    = new GeoIndiceRepository();
const reputacionRepo   = new ReputacionRepository();
const identidadRepo    = new IdentidadRepository();
const moderacionRepo   = new ModeracionRepository();

const DIA_MS = 24 * 60 * 60 * 1000;
const enDias = (dias, desde = new Date()) => new Date(desde.getTime() + dias * DIA_MS);

// Días que le quedan al anuncio (negativo si ya venció) y si está en el periodo de aviso
function vigencia(fechaExpiracion, ahora = new Date()) {
  if (!fechaExpiracion) return { dias_para_expirar: null, por_expirar: false, expirada: false };
  const dias = Math.ceil((new Date(fechaExpiracion).getTime() - ahora.getTime()) / DIA_MS);
  return { dias_para_expirar: dias, por_expirar: dias <= DIAS_AVISO_EXPIRACION, expirada: dias <= 0 };
}

const ROLES_ADMIN = ['administrador', 'admin'];

// Índice vigente → forma pública. Sin desglose para el catálogo, con desglose para la ficha (RNF-10)
export function formatearIndice(fila) {
  if (!fila) return null;
  return {
    puntaje:           Number(fila.puntaje_total),
    nivel:             fila.nivel_semaforo,
    version_algoritmo: fila.version_algoritmo,
    fecha_calculo:     fila.fecha_calculo,
    ...(fila.sub_puntajes && {
      radio_m:     fila.radio_m,
      subpuntajes: fila.sub_puntajes.map((s) => ({
        categoria:          s.categoria.nombre,
        peso:               Number(s.categoria.peso),
        puntaje:            Number(s.puntaje),
        cantidad_puntos:    s.cantidad_puntos,
        distancia_minima_m: s.distancia_minima_m,
      })),
    }),
  };
}

// ¿Cambió una coordenada? (Decimal de Prisma vs número del body; null cuenta como valor)
function coordenadaCambio(nueva, actual) {
  if (nueva === undefined) return false;
  if (nueva == null || actual == null) return (nueva == null) !== (actual == null);
  return Math.abs(Number(nueva) - Number(actual)) > 1e-7;
}

export class PropiedadesService {

  // ── Lectura ────────────────────────────────────────────────────────────────

  // GET /propiedades: catálogo de publicadas; con `q` y filtros es la búsqueda combinada
  async listar(filtros) {
    // ?ids=: el comparador pide esas propiedades con el índice desglosado. Las que ya no están
    // publicadas no vienen y se informan en no_disponibles
    if (filtros.ids) {
      const data = await this.resumenesPorIds(filtros.ids, { desglose: true });
      const vienen = new Set(data.map((p) => p.id));
      return {
        data, total: data.length, page: 1, pageSize: filtros.ids.length,
        filtros: { ids: filtros.ids },
        no_disponibles: filtros.ids.filter((id) => !vienen.has(id)),
      };
    }

    const { ids, total } = await repo.buscarIds(filtros);
    const { page, pageSize, ...aplicados } = filtros;
    return {
      // Sin índice vigente → indice_conveniencia null: el semáforo de la tarjeta muestra "en cálculo"
      data: await this.resumenesPorIds(ids),
      total,
      page,
      pageSize,
      // Filtros que se aplicaron de verdad (incluye los valores por defecto de orden y moneda)
      filtros: Object.fromEntries(Object.entries(aplicados).filter(([, v]) => v !== undefined)),
    };
  }

  // Tarjetas con su índice para una lista de ids, en el mismo orden (resultados de búsqueda)
  async resumenesPorIds(ids, { desglose = false } = {}) {
    const [items, indices] = await Promise.all([
      repo.listarPorIds(ids),
      geoIndiceRepo.indicesVigentes(ids, { desglose }),
    ]);
    const porId = new Map(items.map((p) => [p.id, p]));
    return ids
      .filter((id) => porId.has(id))
      .map((id) => ({ ...porId.get(id), indice_conveniencia: formatearIndice(indices.get(id)) }));
  }

  // solicitante: { id, roles } del token (o null si es un visitante)
  async getById(propiedadId, solicitante = null) {
    const propiedad = await repo.buscarPorId(propiedadId);
    if (!propiedad) throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada', 404);

    const solicitanteId = solicitante?.id ?? null;
    const esDueno = solicitanteId === propiedad.vendedor.id;
    this._verificarVisible(propiedad.estado, propiedad.vendedor.id, solicitante);

    const { vendedor, ...resto } = propiedad;
    const contactoVisible =
      solicitanteId &&
      !esDueno &&
      (await comunicacionRepo.existeConversacion(propiedadId, solicitanteId));
    const esFavorito = solicitanteId && !esDueno
      ? Boolean(await favoritosRepo.existe(solicitanteId, propiedadId))
      : false;
    const reputacion = await reputacionRepo.resumenDeVendedor(vendedor.id);
    const indice = formatearIndice(
      (await geoIndiceRepo.indicesVigentes([propiedadId], { desglose: true })).get(propiedadId));
    const sinUbicacion = propiedad.latitud == null || propiedad.longitud == null;

    return {
      ...resto,
      vendedor: {
        id:       vendedor.id,
        nombre:   vendedor.nombre,
        apellido: vendedor.apellido,
        foto_url: vendedor.foto_url,
        verificado:            await moderacionRepo.vendedorVerificado(vendedor.id),
        calificacion_promedio: reputacion.promedio == null ? null : Math.round(reputacion.promedio * 10) / 10,
        total_resenas:         reputacion.total,
        ...(contactoVisible && { email: vendedor.email, telefono: vendedor.telefono }),
      },
      // Índice precalculado por el trabajo calcular-indice (ADR-08). Los puntos de interés de la ficha
      // se piden aparte: GET /geo/propiedades/:id/puntos-interes
      indice_conveniencia: indice,
      indice_estado:       indice ? 'calculado' : sinUbicacion ? 'sin_ubicacion' : 'en_calculo',
      es_dueno:            esDueno,
      es_favorito:         esFavorito,
    };
  }

  // GET /propiedades/:id/historial-precios — con la misma visibilidad que la ficha
  async historialPrecios(propiedadId, paginacion, solicitante = null) {
    await this.verificarVisible(propiedadId, solicitante);
    const [{ items, total }, actual] = await Promise.all([
      repo.listarHistorialPrecios(propiedadId, paginacion),
      repo.precioActual(propiedadId),
    ]);
    return {
      propiedad_id:      propiedadId,
      precio_actual:     actual.precio,
      moneda_actual:     actual.moneda,
      fecha_publicacion: actual.fecha_publicacion,
      data:  items.map((h) => {
        // La variación solo tiene sentido si no cambió la moneda
        const misma = h.moneda_anterior === h.moneda_nueva;
        const anterior = Number(h.precio_anterior);
        const diferencia = Number(h.precio_nuevo) - anterior;
        return {
          ...h,
          variacion: misma ? {
            monto:      Math.round(diferencia * 100) / 100,
            porcentaje: anterior ? Math.round((diferencia / anterior) * 1000) / 10 : null,
            tipo:       diferencia < 0 ? 'baja' : 'subida',
          } : { tipo: 'cambio_moneda' },
        };
      }),
      total,
      ...paginacion,
    };
  }

  // Coordenadas de una propiedad visible para el solicitante (lo usa geo-indice para los puntos de interés)
  async obtenerUbicacion(propiedadId, solicitante = null) {
    const propiedad = await repo.buscarUbicacion(propiedadId);
    if (!propiedad) throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada', 404);
    this._verificarVisible(propiedad.estado, propiedad.vendedor_id, solicitante);

    if (propiedad.latitud == null || propiedad.longitud == null)
      throw new AppError('SIN_UBICACION', 'La propiedad no tiene coordenadas registradas', 422);
    return { lat: Number(propiedad.latitud), lng: Number(propiedad.longitud) };
  }

  // Misma regla de visibilidad que la ficha (404 si no está publicada, salvo para su dueño y el administrador)
  async verificarVisible(propiedadId, solicitante = null) {
    const propiedad = await repo.buscarUbicacion(propiedadId);
    if (!propiedad) throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada', 404);
    this._verificarVisible(propiedad.estado, propiedad.vendedor_id, solicitante);
    return {
      id:          propiedad.id,
      estado:      propiedad.estado,
      vendedor_id: propiedad.vendedor_id,
      sin_ubicacion: propiedad.latitud == null || propiedad.longitud == null,
    };
  }

  // Datos que necesita la mensajería para abrir una conversación (dueño y estado)
  async datosParaConversacion(propiedadId) {
    const propiedad = await repo.buscarUbicacion(propiedadId);
    return propiedad && { estado: propiedad.estado, vendedor_id: propiedad.vendedor_id };
  }

  // Datos que necesita el cálculo del índice (trabajo interno, sin regla de visibilidad)
  async datosParaIndice(propiedadId) {
    const propiedad = await repo.buscarUbicacion(propiedadId);
    if (!propiedad) return null;
    return {
      estado: propiedad.estado,
      lat:    propiedad.latitud  != null ? Number(propiedad.latitud)  : null,
      lng:    propiedad.longitud != null ? Number(propiedad.longitud) : null,
    };
  }

  // GET /propiedades/mias: propiedades del vendedor en cualquier estado, por pestaña y paginadas
  async listarMias(usuarioId, { estado, page, pageSize }) {
    const { items, total, porEstado } = await repo.listarPorVendedor(usuarioId, { estados: PESTANAS_MIAS[estado], page, pageSize });
    const n = (e) => porEstado[e] ?? 0;
    return {
      data: items.map(({ fotos, ...p }) => ({
        ...p,
        portada: fotos[0]?.url ?? null,
        // La vigencia solo aplica a los anuncios publicados
        ...(p.estado === 'publicado' ? vigencia(p.fecha_expiracion) : { dias_para_expirar: null, por_expirar: false, expirada: false }),
      })),
      total,
      page,
      pageSize,
      estado,
      conteos: {
        todas:     Object.values(porEstado).reduce((s, c) => s + c, 0),
        borrador:  n('borrador'),
        publicado: n('publicado'),
        pausado:   n('pausado'),
        cerrada:   n('vendido') + n('alquilado'),
      },
    };
  }

  // GET /propiedades/mias/estadisticas — panel del vendedor: vistas, favoritos y mensajes de sus
  // propiedades (sin borradores) en los últimos `dias` días, la serie diaria y sugerencias.
  // Con propiedad_id todo se limita a esa propiedad
  async estadisticas(vendedorId, { dias, propiedad_id }) {
    const todas = await repo.listarParaEstadisticas(vendedorId);
    if (propiedad_id && !todas.some((p) => p.id === propiedad_id))
      throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada entre tus publicaciones', 404);

    const { fechas, desde } = rangoPeriodo(dias);
    const elegidas = propiedad_id ? todas.filter((p) => p.id === propiedad_id) : todas;
    const ids      = todas.map((p) => p.id);
    const idsSerie = elegidas.map((p) => p.id);

    // Las métricas por propiedad se calculan para todas: el promedio de vistas sirve de referencia
    const [vistas, favoritos, mensajes, vistasDia, favoritosDia, mensajesDia] = await Promise.all([
      repo.contarVistas(ids, desde),
      favoritosRepo.contarPorPropiedades(ids, desde),
      comunicacionRepo.estadisticasMensajes(ids, desde),
      repo.vistasPorDia(idsSerie, desde),
      favoritosRepo.porDia(idsSerie, desde),
      comunicacionRepo.mensajesPorDia(idsSerie, desde),
    ]);
    const porId   = (filas) => new Map(filas.map((f) => [f.propiedad_id, f]));
    const porDia  = (filas) => new Map(filas.map((f) => [f.fecha, f.total]));
    const [v, f, m] = [porId(vistas), porId(favoritos), porId(mensajes)];

    const metricas = (id) => ({
      vistas:            v.get(id)?.periodo ?? 0,
      favoritos:         f.get(id)?.periodo ?? 0,
      mensajes:          m.get(id)?.periodo ?? 0,
      contactos:         m.get(id)?.contactos ?? 0,
      mensajes_sin_leer: m.get(id)?.sin_leer ?? 0,
    });
    // Referencia: vistas por día activo de sus publicadas que ya se pueden evaluar
    const ahora = new Date();
    const evaluables = todas.filter((p) => p.estado === 'publicado' && p.fecha_publicacion
      && ahora.getTime() - p.fecha_publicacion.getTime() >= UMBRALES.diasParaEvaluar * DIA_MS);
    const promedioVistasDia = evaluables.length
      ? evaluables.reduce((s, p) => s + metricas(p.id).vistas / diasActivos(p, dias, ahora), 0) / evaluables.length
      : 0;

    const propiedades = elegidas.map(({ fotos, _count, descripcion, latitud, longitud, ...p }) => {
      const periodo = metricas(p.id);
      const evaluacion = evaluarDesempeno(
        { ...p, descripcion, latitud, longitud, total_fotos: _count.fotos },
        periodo,
        { dias, promedioVistasDia, ahora }
      );
      return {
        ...p,
        portada:  fotos[0]?.url ?? null,
        metricas: { ...periodo, tasa_interes: tasaInteres(periodo) },
        totales:  {
          vistas:    v.get(p.id)?.total ?? 0,
          favoritos: f.get(p.id)?.total ?? 0,
          mensajes:  m.get(p.id)?.total ?? 0,
        },
        ...evaluacion,
      };
    });

    const suma = (campo) => propiedades.reduce((s, p) => s + p.metricas[campo], 0);
    const resumen = { vistas: suma('vistas'), favoritos: suma('favoritos'), mensajes: suma('mensajes'), contactos: suma('contactos') };

    return {
      periodo:      { dias, desde: fechas[0], hasta: fechas.at(-1) },
      propiedad_id: propiedad_id ?? null,
      resumen:      { ...resumen, tasa_interes: tasaInteres(resumen) },
      serie:        armarSerie(fechas, { vistas: porDia(vistasDia), favoritos: porDia(favoritosDia), mensajes: porDia(mensajesDia) }),
      propiedades,
      promedio_vistas_dia: Math.round(promedioVistasDia * 10) / 10,
    };
  }

  // GET /propiedades/:id/estadisticas — vistas, favoritos y mensajes de una propiedad por día.
  // Solo su dueño (403 para cualquier otro, también el administrador)
  async estadisticasPropiedad(propiedadId, usuarioId, { dias }) {
    const propiedad = await repo.buscarUbicacion(propiedadId);
    if (!propiedad) throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada', 404);
    if (propiedad.vendedor_id !== usuarioId)
      throw new AppError('SIN_PERMISO', 'Solo el dueño puede ver las estadísticas de esta propiedad', 403);
    if (propiedad.estado === 'borrador')
      throw new AppError('ESTADO_INVALIDO', 'Un borrador aún no tiene estadísticas: publícalo para empezar a recibir vistas', 422);

    const { periodo, serie, propiedades: [detalle], promedio_vistas_dia } =
      await this.estadisticas(usuarioId, { dias, propiedad_id: propiedadId });
    const { metricas, totales, desempeno, sugerencias, ...datos } = detalle;
    return { periodo, propiedad: datos, metricas, totales, desempeno, sugerencias, serie, promedio_vistas_dia };
  }

  async listarVistas(usuarioId) {
    return repo.listarVistas(usuarioId);
  }

  // Cada apertura de la ficha de una publicada suma una vista, con o sin sesión (usuarioId null).
  // No cuentan las del propio vendedor. Devuelve si se registró
  async registrarVista(propiedadId, usuarioId = null, origen = 'catalogo') {
    const propiedad = await repo.buscarUbicacion(propiedadId);
    if (!propiedad || propiedad.estado !== 'publicado') return false;
    if (usuarioId && propiedad.vendedor_id === usuarioId) return false;
    await repo.registrarVista(usuarioId, propiedadId, origen);
    return true;
  }

  // ── Escritura ──────────────────────────────────────────────────────────────

  async crear(datos, vendedorId) {
    const { paso_formulario = 1, ...campos } = datos;
    return repo.crear({
      ...campos,
      vendedor_id:     vendedorId,
      estado:          'borrador',   // siempre inicia como borrador
      paso_formulario,
    });
  }

  async actualizar(propiedadId, datos, usuarioId) {
    const propiedad = await this._verificarDueno(propiedadId, usuarioId);

    // No se puede editar una propiedad vendida o alquilada
    if (['vendido', 'alquilado'].includes(propiedad.estado))
      throw new AppError('ESTADO_INVALIDO', 'No se puede editar una propiedad vendida o alquilada', 422);

    // Si cambia el precio o la moneda, el cambio queda en el historial (en la misma transacción)
    const precioNuevo = datos.precio  ?? propiedad.precio;
    const monedaNueva = datos.moneda  ?? propiedad.moneda;
    const cambioPrecio = Number(precioNuevo) !== Number(propiedad.precio) || monedaNueva !== propiedad.moneda
      ? {
        precio_anterior: propiedad.precio, moneda_anterior: propiedad.moneda,
        precio_nuevo:    precioNuevo,      moneda_nueva:    monedaNueva,
        cambiado_por:    usuarioId,
      }
      : null;

    const actualizada = await repo.actualizar(propiedadId, datos, cambioPrecio);

    // Si cambió la ubicación de una propiedad publicada, se recalcula su índice (RF-17).
    // Las no publicadas se calculan al publicarse.
    const cambioUbicacion = coordenadaCambio(datos.latitud, propiedad.latitud)
      || coordenadaCambio(datos.longitud, propiedad.longitud);
    const recalculando = cambioUbicacion && propiedad.estado === 'publicado'
      && await this._encolarIndice(propiedadId);

    return {
      ...actualizada,
      precio_registrado_en_historial: Boolean(cambioPrecio),
      recalculando_indice:            Boolean(recalculando),
    };
  }

  async eliminar(propiedadId, usuarioId) {
    await this._verificarDueno(propiedadId, usuarioId);
    const fotos = await repo.listarFotos(propiedadId);
    await repo.eliminar(propiedadId); // las filas de fotos se borran en cascada
    await this._borrarArchivos(fotos.map((f) => f.public_id));
  }

  // ── Fotos ──────────────────────────────────────────────────────────────────

  // archivos: req.files de multer (ya validados en tipo y tamaño), en el orden enviado
  async agregarFotos(propiedadId, archivos, indicePortada, usuarioId) {
    await this._verificarEditable(propiedadId, usuarioId);

    if (!archivos?.length)
      throw new AppError('SIN_ARCHIVOS', 'Debes enviar al menos una imagen', 422);
    if (indicePortada !== undefined && indicePortada >= archivos.length)
      throw new AppError('VALIDACION', 'El índice de portada no corresponde a ninguna imagen enviada', 422);

    const actuales = await repo.listarFotos(propiedadId);
    const { maxPorPropiedad } = FOTOS_CONFIG;
    if (actuales.length + archivos.length > maxPorPropiedad)
      throw new AppError(
        'LIMITE_FOTOS',
        `Una propiedad admite máximo ${maxPorPropiedad} fotos (ya tiene ${actuales.length})`,
        422
      );

    // Subir a la estrategia de storage; si algo falla, revertir lo ya subido
    const subidas = [];
    try {
      for (const archivo of archivos) {
        const { url, public_id } = await storage.subir(archivo, `propiedades/${propiedadId}`);
        subidas.push({ url, public_id, tamano_bytes: archivo.size });
      }
      await repo.agregarFotos(propiedadId, subidas, indicePortada ?? null);
    } catch (err) {
      await this._borrarArchivos(subidas.map((s) => s.public_id));
      throw err;
    }

    return repo.listarFotos(propiedadId);
  }

  async eliminarFoto(propiedadId, fotoId, usuarioId) {
    await this._verificarEditable(propiedadId, usuarioId);
    await this._verificarFoto(propiedadId, fotoId);
    const foto = await repo.eliminarFoto(propiedadId, fotoId);
    await this._borrarArchivos([foto.public_id]);
    return repo.listarFotos(propiedadId);
  }

  async reordenarFotos(propiedadId, orden, usuarioId) {
    await this._verificarEditable(propiedadId, usuarioId);
    const actuales = await repo.listarFotos(propiedadId);
    const idsActuales = new Set(actuales.map((f) => f.id));
    const idsNuevos   = new Set(orden);

    const mismoConjunto =
      orden.length === idsActuales.size &&
      idsNuevos.size === orden.length &&
      orden.every((id) => idsActuales.has(id));
    if (!mismoConjunto)
      throw new AppError('ORDEN_INVALIDO', 'El orden debe incluir exactamente todas las fotos de la propiedad, sin repetir', 422);

    await repo.reordenarFotos(orden);
    return repo.listarFotos(propiedadId);
  }

  async definirPortada(propiedadId, fotoId, usuarioId) {
    await this._verificarEditable(propiedadId, usuarioId);
    await this._verificarFoto(propiedadId, fotoId);
    await repo.definirPortada(propiedadId, fotoId);
    return repo.listarFotos(propiedadId);
  }

  // POST /propiedades/:id/publicar  → borrador|pausado → publicado
  async publicar(propiedadId, usuarioId) {
    const propiedad = await this._verificarDueno(propiedadId, usuarioId);
    this._validarTransicion(propiedad.estado, 'publicado');
    await this._verificarPoliticaPublicacion(usuarioId);
    const publicada = await repo.cambiarEstado(propiedadId, 'publicado', { fechaExpiracion: this._nuevaExpiracion(propiedad) });
    await this._encolarIndice(propiedadId);
    return publicada;
  }

  // PATCH /propiedades/:id/estado  → cualquier transición válida
  async cambiarEstado(propiedadId, nuevoEstado, usuarioId) {
    const propiedad = await this._verificarDueno(propiedadId, usuarioId);
    this._validarTransicion(propiedad.estado, nuevoEstado);
    // Reactivar una pausada es volver a publicarla: aplica la misma política
    if (nuevoEstado === 'publicado') {
      await this._verificarPoliticaPublicacion(usuarioId);
      const ultima = await moderacionRepo.ultimaAccion({ propiedadId }, ['pausar', 'aprobar']);
      if (ultima?.accion === 'pausar')
        throw new AppError('PAUSADA_POR_MODERACION',
          'Esta publicación fue pausada por el equipo de moderación: no puedes reactivarla hasta que la revisen de nuevo.', 403);
    }
    const actualizada = await repo.cambiarEstado(propiedadId, nuevoEstado, {
      fechaExpiracion: nuevoEstado === 'publicado' ? this._nuevaExpiracion(propiedad) : undefined,
    });
    if (nuevoEstado === 'publicado') await this._encolarIndice(propiedadId);
    return actualizada;
  }

  // POST /propiedades/:id/renovar: extiende la vigencia de un anuncio publicado que está por vencer
  async renovar(propiedadId, usuarioId) {
    const propiedad = await this._verificarDueno(propiedadId, usuarioId);
    if (propiedad.estado !== 'publicado')
      throw new AppError('ESTADO_INVALIDO', 'Solo se pueden renovar anuncios publicados', 422);
    const { dias_para_expirar, por_expirar } = vigencia(propiedad.fecha_expiracion);
    if (dias_para_expirar != null && !por_expirar)
      throw new AppError('AUN_VIGENTE',
        `El anuncio vence en ${dias_para_expirar} días. Podrás renovarlo cuando falten ${DIAS_AVISO_EXPIRACION} días o menos.`, 422);
    const renovada = await repo.renovar(propiedadId, enDias(VIGENCIA_DIAS));
    return { ...renovada, ...vigencia(renovada.fecha_expiracion) };
  }

  // ── Helpers privados ───────────────────────────────────────────────────────

  // Política de publicación (arquitectura §10.1): cuenta activa y correo verificado.
  // TODO: exigir también vendedor verificado cuando exista verificacion_vendedor (RF-25)
  async _verificarPoliticaPublicacion(usuarioId) {
    const cuenta = await identidadRepo.estadoCuenta(usuarioId);
    if (!cuenta || ['suspendido', 'inhabilitado'].includes(cuenta.estado))
      throw new AppError('CUENTA_SUSPENDIDA', 'Tu cuenta está suspendida: no puedes publicar ni reactivar propiedades.', 403);
    if (!cuenta.correo_verificado)
      throw new AppError('CORREO_NO_VERIFICADO',
        'Verifica tu correo electrónico para publicar o reactivar propiedades. Revisa el enlace que te enviamos al registrarte.', 403);
    // Identidad del vendedor verificada por un administrador (los administradores no la necesitan)
    const esAdmin = cuenta.usuario_rol.some((ur) => ROLES_ADMIN.includes(ur.rol.nombre.toLowerCase()));
    if (!esAdmin && !(await moderacionRepo.vendedorVerificado(usuarioId)))
      throw new AppError('VENDEDOR_NO_VERIFICADO',
        'Verifica tu identidad para publicar: envía tu documento desde "Verificar identidad" y un administrador lo revisará.', 403);
  }

  // Al publicar o reactivar: si no tenía vigencia o ya venció, empieza un periodo nuevo; si no, se conserva
  _nuevaExpiracion(propiedad) {
    const vigente = propiedad.fecha_expiracion && new Date(propiedad.fecha_expiracion) > new Date();
    return vigente ? undefined : enDias(VIGENCIA_DIAS);
  }

  // Encola el cálculo del índice. Si la cola falla no se interrumpe la operación del usuario:
  // la propiedad queda con el índice "en cálculo" y se puede recalcular con `npm run indice:recalcular`.
  async _encolarIndice(propiedadId) {
    try {
      await jobs.enqueue(CALCULAR_INDICE, { propiedadId }, OPCIONES_CALCULAR_INDICE(propiedadId));
      return true;
    } catch (err) {
      console.error(`No se pudo encolar el índice de la propiedad ${propiedadId}:`, err.message);
      return false;
    }
  }

  // Las no publicadas solo las ven su dueño y el administrador; para los demás no existen
  _verificarVisible(estado, vendedorId, solicitante) {
    if (estado === 'publicado') return;
    const esDueno = solicitante?.id != null && solicitante.id === vendedorId;
    const esAdmin = solicitante?.roles?.some((r) => ROLES_ADMIN.includes(r)) ?? false;
    if (!esDueno && !esAdmin) throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada', 404);
  }

  async _verificarDueno(propiedadId, usuarioId) {
    const propiedad = await repo.buscarPorId(propiedadId);
    if (!propiedad)
      throw new AppError('NO_ENCONTRADO', 'Propiedad no encontrada', 404);
    if (propiedad.vendedor.id !== usuarioId)
      throw new AppError('SIN_PERMISO', 'No tienes permiso para modificar esta propiedad', 403);
    return propiedad;
  }

  async _verificarEditable(propiedadId, usuarioId) {
    const propiedad = await this._verificarDueno(propiedadId, usuarioId);
    if (['vendido', 'alquilado'].includes(propiedad.estado))
      throw new AppError('ESTADO_INVALIDO', 'No se puede editar una propiedad vendida o alquilada', 422);
    return propiedad;
  }

  async _verificarFoto(propiedadId, fotoId) {
    const foto = await repo.buscarFoto(propiedadId, fotoId);
    if (!foto) throw new AppError('NO_ENCONTRADO', 'Foto no encontrada', 404);
    return foto;
  }

  // Borra archivos del storage sin interrumpir la operación si alguno falla
  async _borrarArchivos(publicIds) {
    const resultados = await Promise.allSettled(publicIds.map((id) => storage.eliminar(id)));
    resultados
      .filter((r) => r.status === 'rejected')
      .forEach((r) => console.error('No se pudo eliminar archivo del storage:', r.reason?.message));
  }

  _validarTransicion(estadoActual, estadoDestino) {
    const permitidos = TRANSICIONES[estadoActual] ?? [];
    if (!permitidos.includes(estadoDestino))
      throw new AppError(
        'TRANSICION_INVALIDA',
        `No se puede pasar de "${estadoActual}" a "${estadoDestino}". Estados permitidos: ${permitidos.join(', ') || 'ninguno'}`,
        422
      );
  }
}
