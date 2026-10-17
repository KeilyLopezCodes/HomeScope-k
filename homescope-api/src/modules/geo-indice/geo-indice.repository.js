import { prisma } from '../../config/prisma.js';

const INDICE_SELECT = {
  propiedad_id: true, puntaje_total: true, nivel_semaforo: true,
  radio_m: true, version_algoritmo: true, fecha_calculo: true,
};

export class GeoIndiceRepository {
  async categoriasActivas() {
    return prisma.categoriaInteres.findMany({
      where:   { activa: true },
      orderBy: { id: 'asc' },
      select:  { id: true, nombre: true, google_place_types: true, peso: true },
    });
  }

  // Guarda un cálculo completo en una transacción: reemplaza los puntos de interés de la propiedad,
  // marca el índice anterior como no vigente e inserta el nuevo con sus subpuntajes.
  // puntos:      [{ categoria_id, google_place_id, nombre, latitud, longitud, distancia_m, tiempo_estimado_min, radio_consulta_m }]
  // subpuntajes: [{ categoria_id, puntaje, cantidad_puntos, distancia_minima_m }]
  async guardarCalculo(propiedadId, { puntos, indice, subpuntajes }) {
    return prisma.$transaction(async (tx) => {
      await tx.puntoInteres.deleteMany({ where: { propiedad_id: propiedadId } });
      if (puntos.length) {
        await tx.puntoInteres.createMany({
          data: puntos.map((p) => ({ ...p, propiedad_id: propiedadId })),
        });
      }

      await tx.indiceConveniencia.updateMany({
        where: { propiedad_id: propiedadId, es_vigente: true },
        data:  { es_vigente: false },
      });
      return tx.indiceConveniencia.create({
        data: {
          ...indice,
          propiedad_id: propiedadId,
          sub_puntajes: { create: subpuntajes },
        },
        select: { id: true, ...INDICE_SELECT },
      });
    });
  }

  async desactivarIndice(propiedadId) {
    return prisma.indiceConveniencia.updateMany({
      where: { propiedad_id: propiedadId, es_vigente: true },
      data:  { es_vigente: false },
    });
  }

  // Índices vigentes de varias propiedades → Map(propiedad_id → índice). Con `desglose`, incluye subpuntajes.
  async indicesVigentes(propiedadIds, { desglose = false } = {}) {
    if (!propiedadIds.length) return new Map();
    const filas = await prisma.indiceConveniencia.findMany({
      where:  { propiedad_id: { in: propiedadIds }, es_vigente: true },
      select: {
        ...INDICE_SELECT,
        ...(desglose && {
          sub_puntajes: {
            orderBy: { categoria_id: 'asc' },
            select: {
              puntaje: true, cantidad_puntos: true, distancia_minima_m: true,
              categoria: { select: { nombre: true, peso: true } },
            },
          },
        }),
      },
    });
    return new Map(filas.map((f) => [f.propiedad_id, f]));
  }
}
