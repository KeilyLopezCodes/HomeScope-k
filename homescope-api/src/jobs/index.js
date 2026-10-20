// Workers de pg-boss. Pendientes: enviar-correo (MailPort con reintentos), expiraciones de propiedades.
import { jobs } from '../shared/adapters/jobs.adapter.js';
import { GeoIndiceService } from '../modules/geo-indice/geo-indice.service.js';
import { AgendaService } from '../modules/agenda/agenda.service.js';
import { ZONA_HORARIA } from '../modules/agenda/agenda.tiempo.js';
import { CALCULAR_INDICE, CRON_RECORDATORIOS, RECORDATORIOS_VISITAS } from './trabajos.js';

const geoIndice = new GeoIndiceService();
const agenda = new AgendaService();

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

  // Recordatorios de visitas: programado cada 15 minutos
  await jobs.trabajar(RECORDATORIOS_VISITAS, { teamSize: 1 }, async () => {
    const { revisadas, enviadas, fallidas } = await agenda.enviarRecordatorios();
    if (revisadas) console.log(`Recordatorios de visitas: ${enviadas} enviados, ${fallidas} fallidos`);
  });
  await jobs.programar(RECORDATORIOS_VISITAS, CRON_RECORDATORIOS, { tz: ZONA_HORARIA });

  console.log('Trabajos en segundo plano iniciados (pg-boss)');
}

export const detenerTrabajos = () => jobs.detener();
