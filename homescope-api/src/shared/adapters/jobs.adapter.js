import PgBoss from 'pg-boss';
import { env } from '../../config/env.js';
import { JobPort } from '../ports/index.js';

// Cola de trabajos sobre la misma PostgreSQL (ADR-05). pg-boss crea sus tablas en el esquema `pgboss`.
export class PgBossJobAdapter extends JobPort {
  #boss = null;
  #inicio = null;

  // Arranca una sola vez; enqueue y trabajar lo llaman solos si hace falta
  iniciar() {
    this.#inicio ??= (async () => {
      // `?schema=public` es un parámetro de Prisma, no de PostgreSQL
      const url = new URL(env.DATABASE_URL);
      url.searchParams.delete('schema');
      const boss = new PgBoss({ connectionString: url.toString(), schema: 'pgboss' });
      boss.on('error', (err) => console.error('pg-boss:', err.message));
      await boss.start();
      this.#boss = boss;
      return boss;
    })().catch((err) => { this.#inicio = null; throw err; });
    return this.#inicio;
  }

  async enqueue(nombre, datos, opciones = {}) {
    const boss = await this.iniciar();
    return boss.send(nombre, datos, opciones);
  }

  async trabajar(nombre, opciones, manejador) {
    const boss = await this.iniciar();
    return boss.work(nombre, opciones, manejador);
  }

  async detener() {
    if (this.#boss) await this.#boss.stop({ graceful: true, wait: true });
  }
}

export const jobs = new PgBossJobAdapter();
