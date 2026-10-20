// Ejecuta una vez el envío de recordatorios de visitas (el trabajo programado lo hace cada 15 minutos).
//   npm run visitas:recordatorios
import { prisma } from '../config/prisma.js';
import { AgendaService, HORAS_RECORDATORIO } from '../modules/agenda/agenda.service.js';

const resultado = await new AgendaService().enviarRecordatorios();
console.log(`Visitas confirmadas en las próximas ${HORAS_RECORDATORIO} h sin recordatorio: ${resultado.revisadas}`);
console.log(`Recordatorios enviados: ${resultado.enviadas} · fallidos: ${resultado.fallidas}`);
await prisma.$disconnect();
process.exit(0);
