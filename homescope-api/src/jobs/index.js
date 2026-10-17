// Workers de pg-boss. Pendientes: enviar-correo (MailPort con reintentos), recordatorios de visitas,
// expiraciones de propiedades.
import { jobs } from '../shared/adapters/jobs.adapter.js';
import { GeoIndiceService } from '../modules/geo-indice/geo-indice.service.js';
import { CALCULAR_INDICE } from './trabajos.js';

const geoIndice = new GeoIndiceService();

export async function iniciarTrabajos() {
  await jobs.iniciar();

  // Índice de Conveniencia: se encola al publicar y al cambiar la ubicación (servicio de propiedades)
  await jobs.trabajar(CALCULAR_INDICE, { teamSize: 2, teamConcurrency: 2 }, async (job) => {
    const { propiedadId } = job.data;
    const resultado = await geoIndice.calcularYGuardar(propiedadId);
    if (resultado.omitido) {
      console.log(`Índice de la propiedad ${propiedadId} omitido: ${resultado.omitido}`);
    } else {
      console.log(`Índice de la propiedad ${propiedadId}: ${resultado.puntaje_total} (${resultado.nivel_semaforo})`);
    }
  });

  console.log('Trabajos en segundo plano iniciados (pg-boss)');
}

export const detenerTrabajos = () => jobs.detener();
