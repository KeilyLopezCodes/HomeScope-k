import { prisma } from '../../config/prisma.js';

const VENDEDOR_PUBLICO = { id: true, nombre: true };

const FOTO_SELECT = { id: true, url: true, public_id: true, orden: true, es_portada: true, tamano_bytes: true };

const PROPIEDAD_LISTA = {
  id: true, titulo: true, direccion: true, precio: true, moneda: true,
  modalidad: true, estado: true, fecha_creacion: true,
  zona: true, municipio: true, departamento: true,
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

  // Devuelve la página pedida y el total de publicadas, en una sola transacción
  async listar({ page = 1, pageSize = 20 } = {}) {
    const where = { estado: 'publicado' };
    const [items, total] = await prisma.$transaction([
      prisma.propiedad.findMany({
        where,
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        orderBy: [{ fecha_publicacion: 'desc' }, { id: 'desc' }],
        select:  PROPIEDAD_LISTA,
      }),
      prisma.propiedad.count({ where }),
    ]);
    return { items, total };
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
        fecha_publicacion: true, fecha_creacion: true, fecha_actualizacion: true,
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
          select:  { id: true, precio_anterior: true, precio_nuevo: true, fecha_cambio: true },
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

  async listarPorVendedor(vendedorId) {
    return prisma.propiedad.findMany({
      where:   { vendedor_id: vendedorId },
      orderBy: { fecha_creacion: 'desc' },
      select:  {
        id: true, titulo: true, direccion: true, precio: true, moneda: true,
        modalidad: true, estado: true, paso_formulario: true, fecha_creacion: true,
        tipo_propiedad: { select: { nombre: true } },
        fotos: {
          where:  { es_portada: true },
          select: { url: true },
          take:   1,
        },
      },
    });
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

  async actualizar(id, datos) {
    return prisma.propiedad.update({
      where:  { id },
      data:   datos,
      select: { id: true, titulo: true, estado: true, fecha_actualizacion: true },
    });
  }

  async eliminar(id) {
    return prisma.propiedad.delete({ where: { id } });
  }

  // Cambia estado y registra fecha_publicacion si pasa a 'publicado'
  async cambiarEstado(id, nuevoEstado) {
    return prisma.propiedad.update({
      where: { id },
      data:  {
        estado: nuevoEstado,
        ...(nuevoEstado === 'publicado' && { fecha_publicacion: new Date() }),
      },
      select: { id: true, estado: true },
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

  // Registra cambio de precio en historial
  async registrarHistorialPrecio(propiedadId, precioAnterior, precioNuevo, usuarioId) {
    return prisma.historialPrecio.create({
      data: {
        propiedad_id:    propiedadId,
        precio_anterior: precioAnterior,
        precio_nuevo:    precioNuevo,
        cambiado_por:    usuarioId,
      },
    });
  }
}
