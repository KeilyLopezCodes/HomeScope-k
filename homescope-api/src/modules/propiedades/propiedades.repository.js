import { Prisma } from '@prisma/client';
import { prisma } from '../../config/prisma.js';

const VENDEDOR_PUBLICO = { id: true, nombre: true };

const FOTO_SELECT = { id: true, url: true, public_id: true, orden: true, es_portada: true, tamano_bytes: true };

// Debe ser la misma expresión del índice GIN ix_propiedad_texto (migración 20261018120000_busqueda_texto)
// para que PostgreSQL lo use. Es SQL fijo, sin datos del usuario.
const VECTOR_TEXTO = Prisma.raw(`to_tsvector('spanish', f_unaccent(
  p.titulo || ' ' || coalesce(p.descripcion, '') || ' ' || coalesce(p.direccion, '') || ' ' ||
  coalesce(p.zona, '') || ' ' || coalesce(p.municipio, '') || ' ' || coalesce(p.departamento, '')
))`);

const DESDE_CATALOGO = Prisma.sql`
  FROM propiedad p
  JOIN tipo_propiedad tp ON tp.id = p.tipo_propiedad_id
  LEFT JOIN indice_conveniencia ic ON ic.propiedad_id = p.id AND ic.es_vigente`;

const PROPIEDAD_LISTA = {
  id: true, titulo: true, direccion: true, precio: true, moneda: true,
  modalidad: true, estado: true, fecha_creacion: true,
  zona: true, municipio: true, departamento: true,
  habitaciones: true, banos: true, area_m2: true, parqueos: true, fecha_publicacion: true,
  tipo_propiedad: { select: { nombre: true } },
  vendedor:       { select: VENDEDOR_PUBLICO },
  fotos: {
    where:   { es_portada: true },
    select:  { url: true },
    take:    1,
  },
};

export class PropiedadesRepository {
  // ── Lectura ────────────────────────────────────────────────────────────────

  // Catálogo: ids de la página pedida y total de publicadas que cumplen el texto y los filtros.
  // Todos los valores del usuario van como parámetros de la consulta ($queryRaw con Prisma.sql),
  // nunca concatenados al SQL.
  async buscarIds(f) {
    // websearch_to_tsquery acepta cualquier texto sin errores de sintaxis ("casa jardín", "-terreno", "zona 10")
    const consulta = f.q ? Prisma.sql`websearch_to_tsquery('spanish', f_unaccent(${f.q}))` : null;

    const condiciones = [Prisma.sql`p.estado = 'publicado'`];
    if (consulta)                   condiciones.push(Prisma.sql`${VECTOR_TEXTO} @@ ${consulta}`);
    if (f.modalidad)                condiciones.push(Prisma.sql`p.modalidad = ${f.modalidad}`);
    if (f.tipo)                     condiciones.push(Prisma.sql`tp.nombre = ANY(${f.tipo})`);
    if (f.moneda)                   condiciones.push(Prisma.sql`p.moneda = ${f.moneda}`);
    if (f.precio_min != null)       condiciones.push(Prisma.sql`p.precio >= ${f.precio_min}`);
    if (f.precio_max != null)       condiciones.push(Prisma.sql`p.precio <= ${f.precio_max}`);
    if (f.habitaciones_min != null) condiciones.push(Prisma.sql`p.habitaciones >= ${f.habitaciones_min}`);
    if (f.indice_min != null)       condiciones.push(Prisma.sql`ic.puntaje_total >= ${f.indice_min}`);
    const donde = Prisma.join(condiciones, ' AND ');

    const ORDEN = {
      relevancia:  consulta && Prisma.sql`ts_rank(${VECTOR_TEXTO}, ${consulta}) DESC, p.fecha_publicacion DESC`,
      recientes:   Prisma.sql`p.fecha_publicacion DESC NULLS LAST`,
      precio_asc:  Prisma.sql`p.precio ASC`,
      precio_desc: Prisma.sql`p.precio DESC`,
      indice_desc: Prisma.sql`ic.puntaje_total DESC NULLS LAST`,
    };

    const [filas, [{ total }]] = await Promise.all([
      prisma.$queryRaw`
        SELECT p.id ${DESDE_CATALOGO}
        WHERE ${donde}
        ORDER BY ${ORDEN[f.orden]}, p.id DESC
        LIMIT ${f.pageSize} OFFSET ${(f.page - 1) * f.pageSize}`,
      prisma.$queryRaw`SELECT count(*)::int AS total ${DESDE_CATALOGO} WHERE ${donde}`,
    ]);

    return { ids: filas.map((r) => r.id), total };
  }

  // Tarjetas de varias propiedades publicadas (el orden lo decide quien llama)
  async listarPorIds(ids) {
    if (!ids.length) return [];
    return prisma.propiedad.findMany({
      where:  { id: { in: ids }, estado: 'publicado' },
      select: PROPIEDAD_LISTA,
    });
  }

  async buscarPorId(id) {
    return prisma.propiedad.findUnique({
      where:  { id },
      select: {
        id: true, titulo: true, descripcion: true, direccion: true,
        precio: true, moneda: true, modalidad: true, estado: true,
        habitaciones: true, banos: true, area_m2: true, parqueos: true,
        zona: true, municipio: true, departamento: true,
        latitud: true, longitud: true, paso_formulario: true,
        fecha_publicacion: true, fecha_expiracion: true, fecha_creacion: true, fecha_actualizacion: true,
        tipo_propiedad: { select: { id: true, nombre: true } },
        vendedor: {
          select: { id: true, nombre: true, apellido: true, foto_url: true, email: true, telefono: true },
        },
        fotos: {
          select:  { id: true, url: true, orden: true, es_portada: true },
          orderBy: { orden: 'asc' },
        },
        // Sin `cambiado_por`: quién cambió el precio no se expone en la ficha pública
        historial_precios: {
          select:  {
            id: true, precio_anterior: true, precio_nuevo: true, moneda_anterior: true, moneda_nueva: true, fecha_cambio: true,
          },
          orderBy: { fecha_cambio: 'asc' },
        },
      },
    });
  }

  async buscarUbicacion(id) {
    return prisma.propiedad.findUnique({
      where:  { id },
      select: { id: true, estado: true, vendedor_id: true, latitud: true, longitud: true },
    });
  }

  async contarPublicadasDe(vendedorId) {
    return prisma.propiedad.count({ where: { vendedor_id: vendedorId, estado: 'publicado' } });
  }

  // "Mis propiedades": página de las propiedades del vendedor en cualquier estado (estados: null = todas)
  // y cuántas tiene en cada estado, para las pestañas
  async listarPorVendedor(vendedorId, { estados = null, page = 1, pageSize = 10 } = {}) {
    const where = { vendedor_id: vendedorId, ...(estados && { estado: { in: estados } }) };
    const [items, total, porEstado] = await prisma.$transaction([
      prisma.propiedad.findMany({
        where,
        orderBy: [{ fecha_actualizacion: 'desc' }, { id: 'desc' }],
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        select:  {
          id: true, titulo: true, direccion: true, municipio: true, precio: true, moneda: true,
          modalidad: true, estado: true, paso_formulario: true,
          fecha_creacion: true, fecha_publicacion: true, fecha_expiracion: true, fecha_actualizacion: true,
          tipo_propiedad: { select: { nombre: true } },
          fotos: {
            where:  { es_portada: true },
            select: { url: true },
            take:   1,
          },
        },
      }),
      prisma.propiedad.count({ where }),
      prisma.propiedad.groupBy({ by: ['estado'], where: { vendedor_id: vendedorId }, _count: true, orderBy: { estado: 'asc' } }),
    ]);
    return { items, total, porEstado: Object.fromEntries(porEstado.map((g) => [g.estado, g._count])) };
  }

  async listarVistas(usuarioId, limit = 20) {
    const rows = await prisma.vistaPropiedad.findMany({
      where:    { usuario_id: usuarioId },
      orderBy:  { fecha_vista: 'desc' },
      take:     limit,
      distinct: ['propiedad_id'],
      select:   {
        fecha_vista: true,
        propiedad:   { select: PROPIEDAD_LISTA },
      },
    });
    return rows.map((r) => ({ ...r.propiedad, fecha_vista: r.fecha_vista }));
  }

  async registrarVista(usuarioId, propiedadId, origen = 'catalogo') {
    return prisma.vistaPropiedad.create({
      data: { usuario_id: usuarioId, propiedad_id: propiedadId, origen },
    });
  }

  // ── Escritura ──────────────────────────────────────────────────────────────

  async crear(datos) {
    return prisma.propiedad.create({
      data:   datos,
      select: { id: true, titulo: true, estado: true, fecha_creacion: true },
    });
  }

  // Actualiza la propiedad y, si cambió el precio o la moneda, registra el cambio en el historial.
  // Todo en una transacción: no queda un registro de historial de un cambio que no se guardó, ni al revés.
  // cambioPrecio: { precio_anterior, precio_nuevo, moneda_anterior, moneda_nueva, cambiado_por } o null
  async actualizar(id, datos, cambioPrecio = null) {
    return prisma.$transaction(async (tx) => {
      if (cambioPrecio) await tx.historialPrecio.create({ data: { propiedad_id: id, ...cambioPrecio } });
      return tx.propiedad.update({
        where:  { id },
        data:   datos,
        select: { id: true, titulo: true, estado: true, precio: true, moneda: true, fecha_actualizacion: true },
      });
    });
  }

  // db: el cliente o una transacción (moderación elimina y registra la acción en la misma transacción)
  async eliminar(id, db = prisma) {
    return db.propiedad.delete({ where: { id } });
  }

  // Cambia el estado; al publicar registra fecha_publicacion y, si se indica, la nueva fecha_expiracion
  async cambiarEstado(id, nuevoEstado, { fechaExpiracion } = {}, db = prisma) {
    return db.propiedad.update({
      where: { id },
      data:  {
        estado: nuevoEstado,
        ...(nuevoEstado === 'publicado' && { fecha_publicacion: new Date() }),
        ...(fechaExpiracion && { fecha_expiracion: fechaExpiracion }),
      },
      select: { id: true, estado: true, fecha_publicacion: true, fecha_expiracion: true },
    });
  }

  async renovar(id, fechaExpiracion) {
    return prisma.propiedad.update({
      where:  { id },
      data:   { fecha_expiracion: fechaExpiracion },
      select: { id: true, estado: true, fecha_publicacion: true, fecha_expiracion: true },
    });
  }

  // ── Fotos ──────────────────────────────────────────────────────────────────

  async listarFotos(propiedadId) {
    return prisma.fotoPropiedad.findMany({
      where:   { propiedad_id: propiedadId },
      orderBy: { orden: 'asc' },
      select:  FOTO_SELECT,
    });
  }

  async buscarFoto(propiedadId, fotoId) {
    return prisma.fotoPropiedad.findFirst({
      where:  { id: fotoId, propiedad_id: propiedadId },
      select: FOTO_SELECT,
    });
  }

  // fotos: [{ url, public_id, tamano_bytes }] en el orden deseado; se agregan al final.
  // indicePortada: índice dentro de `fotos` que pasa a ser portada (o null).
  async agregarFotos(propiedadId, fotos, indicePortada = null) {
    return prisma.$transaction(async (tx) => {
      const ultima = await tx.fotoPropiedad.aggregate({
        where: { propiedad_id: propiedadId },
        _max:  { orden: true },
      });
      const hayPortada = await tx.fotoPropiedad.count({
        where: { propiedad_id: propiedadId, es_portada: true },
      });
      // Si no hay portada previa ni se indicó una, la primera foto nueva es la portada
      const portada = indicePortada ?? (hayPortada ? null : 0);
      if (portada !== null && hayPortada) {
        await tx.fotoPropiedad.updateMany({
          where: { propiedad_id: propiedadId },
          data:  { es_portada: false },
        });
      }

      const base = (ultima._max.orden ?? 0) + 1;
      await tx.fotoPropiedad.createMany({
        data: fotos.map((f, i) => ({
          propiedad_id: propiedadId,
          url:          f.url,
          public_id:    f.public_id,
          tamano_bytes: f.tamano_bytes,
          orden:        base + i,
          es_portada:   i === portada,
        })),
      });
    });
  }

  // Elimina la foto, compacta el orden y reasigna portada si hacía falta
  async eliminarFoto(propiedadId, fotoId) {
    return prisma.$transaction(async (tx) => {
      const foto = await tx.fotoPropiedad.delete({ where: { id: fotoId } });
      const restantes = await tx.fotoPropiedad.findMany({
        where:   { propiedad_id: propiedadId },
        orderBy: { orden: 'asc' },
        select:  { id: true, es_portada: true },
      });
      const asignarPortada = foto.es_portada && restantes.length > 0;
      await Promise.all(restantes.map((f, i) =>
        tx.fotoPropiedad.update({
          where: { id: f.id },
          data:  { orden: i + 1, ...(asignarPortada && i === 0 && { es_portada: true }) },
        })
      ));
      return foto;
    });
  }

  // ids: todos los ids de fotos de la propiedad en el nuevo orden
  async reordenarFotos(ids) {
    return prisma.$transaction(ids.map((id, i) =>
      prisma.fotoPropiedad.update({ where: { id }, data: { orden: i + 1 } })
    ));
  }

  async definirPortada(propiedadId, fotoId) {
    return prisma.$transaction([
      prisma.fotoPropiedad.updateMany({
        where: { propiedad_id: propiedadId, es_portada: true },
        data:  { es_portada: false },
      }),
      prisma.fotoPropiedad.update({ where: { id: fotoId }, data: { es_portada: true } }),
    ]);
  }

  // Historial de precios de una propiedad, del cambio más reciente al más antiguo.
  // Sin `cambiado_por`: quién hizo el cambio no se expone (solo el dueño puede editar el precio)
  async listarHistorialPrecios(propiedadId, { page, pageSize }) {
    const where = { propiedad_id: propiedadId };
    const [items, total] = await prisma.$transaction([
      prisma.historialPrecio.findMany({
        where,
        orderBy: [{ fecha_cambio: 'desc' }, { id: 'desc' }],
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        select:  {
          id: true, fecha_cambio: true,
          precio_anterior: true, moneda_anterior: true, precio_nuevo: true, moneda_nueva: true,
        },
      }),
      prisma.historialPrecio.count({ where }),
    ]);
    return { items, total };
  }

  async precioActual(id) {
    return prisma.propiedad.findUnique({ where: { id }, select: { precio: true, moneda: true, fecha_publicacion: true } });
  }

  // ── Panel del vendedor ──────────────────────────────────────────────────────

  // Propiedades del vendedor que ya se publicaron (sin borradores), con lo que necesitan las sugerencias
  async listarParaEstadisticas(vendedorId) {
    return prisma.propiedad.findMany({
      where:   { vendedor_id: vendedorId, estado: { not: 'borrador' } },
      orderBy: [{ fecha_publicacion: 'desc' }, { id: 'desc' }],
      select:  {
        id: true, titulo: true, estado: true, modalidad: true, precio: true, moneda: true,
        descripcion: true, latitud: true, longitud: true, fecha_publicacion: true, fecha_expiracion: true,
        fotos:  { where: { es_portada: true }, select: { url: true }, take: 1 },
        _count: { select: { fotos: true } },
      },
    });
  }

  // Vistas por propiedad: total histórico y desde `desde` → [{ propiedad_id, total, periodo }]
  async contarVistas(ids, desde) {
    return prisma.$queryRaw`
      SELECT propiedad_id,
             count(*)::int                                     AS total,
             count(*) FILTER (WHERE fecha_vista >= ${desde})::int AS periodo
        FROM vista_propiedad
       WHERE propiedad_id = ANY(${ids}::int[])
       GROUP BY propiedad_id`;
  }

  // Vistas por día (hora de Guatemala) desde `desde` → [{ fecha: 'YYYY-MM-DD', total }]
  async vistasPorDia(ids, desde) {
    return prisma.$queryRaw`
      SELECT to_char(fecha_vista AT TIME ZONE 'America/Guatemala', 'YYYY-MM-DD') AS fecha, count(*)::int AS total
        FROM vista_propiedad
       WHERE propiedad_id = ANY(${ids}::int[]) AND fecha_vista >= ${desde}
       GROUP BY 1`;
  }

  // ── Moderación ──────────────────────────────────────────────────────────────

  async datosModeracion(id) {
    return prisma.propiedad.findUnique({
      where:  { id },
      select: { id: true, titulo: true, estado: true, vendedor_id: true, fecha_expiracion: true },
    });
  }

  // Publicaciones para el administrador; con reportadas, solo las que tienen reportes abiertos,
  // las más reportadas primero
  // ids: limitar a esas propiedades (las pausadas por moderación)
  async listarParaModeracion({ reportadas, estado, ids, page, pageSize }) {
    const abiertos = { estado: { in: ['pendiente', 'en_revision'] } };
    const where = {
      ...(estado && { estado }),
      ...(reportadas && { reportes: { some: abiertos } }),
      ...(ids && { id: { in: ids } }),
    };
    const [items, total] = await prisma.$transaction([
      prisma.propiedad.findMany({
        where,
        orderBy: reportadas
          ? [{ reportes: { _count: 'desc' } }, { id: 'desc' }]
          : [{ fecha_actualizacion: 'desc' }, { id: 'desc' }],
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        select:  {
          id: true, titulo: true, estado: true, precio: true, moneda: true, fecha_publicacion: true,
          vendedor: { select: { id: true, nombre: true, apellido: true, estado: true } },
          fotos:    { where: { es_portada: true }, select: { url: true }, take: 1 },
          reportes: {
            where:   abiertos,
            orderBy: { fecha_creacion: 'desc' },
            select:  { id: true, motivo: true, descripcion: true, fecha_creacion: true, reportante: { select: { id: true, nombre: true } } },
          },
        },
      }),
      prisma.propiedad.count({ where }),
    ]);
    return { items, total };
  }

  async idsPublicadasDe(vendedorId) {
    const filas = await prisma.propiedad.findMany({ where: { vendedor_id: vendedorId, estado: 'publicado' }, select: { id: true } });
    return filas.map((f) => f.id);
  }

  // Cambia el estado de varias propiedades, solo de las que siguen en `desde`
  async cambiarEstadoVarias(ids, desde, hacia, db = prisma) {
    if (!ids.length) return [];
    const actuales = await db.propiedad.findMany({ where: { id: { in: ids }, estado: desde }, select: { id: true } });
    const cambiar = actuales.map((p) => p.id);
    if (cambiar.length) await db.propiedad.updateMany({ where: { id: { in: cambiar } }, data: { estado: hacia } });
    return cambiar;
  }

  // Estadísticas de la plataforma: propiedades por estado, publicaciones y vistas del período y por día
  async estadisticasPlataforma(desde) {
    const [porEstado, publicadas, vistas, publicadasPorDia, vistasPorDia] = await Promise.all([
      prisma.propiedad.groupBy({ by: ['estado'], _count: true }),
      prisma.propiedad.count({ where: { fecha_publicacion: { gte: desde } } }),
      prisma.vistaPropiedad.count({ where: { fecha_vista: { gte: desde } } }),
      prisma.$queryRaw`
      SELECT to_char(fecha_publicacion AT TIME ZONE 'America/Guatemala', 'YYYY-MM-DD') AS fecha, count(*)::int AS total
        FROM propiedad
       WHERE fecha_publicacion >= ${desde}
       GROUP BY 1`,
      prisma.$queryRaw`
      SELECT to_char(fecha_vista AT TIME ZONE 'America/Guatemala', 'YYYY-MM-DD') AS fecha, count(*)::int AS total
        FROM vista_propiedad
       WHERE fecha_vista >= ${desde}
       GROUP BY 1`,
    ]);
    return {
      porEstado: Object.fromEntries(porEstado.map((g) => [g.estado, g._count])),
      publicadas, vistas, publicadasPorDia, vistasPorDia,
    };
  }
}
