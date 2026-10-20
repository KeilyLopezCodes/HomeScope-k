import { Estrellas } from './Estrellas';

// calificacion: { promedio, total, distribucion: { 5: n, 4: n, … } } del perfil del vendedor
export default function ResumenCalificacion({ calificacion, compacto = false }) {
  const { promedio, total, distribucion } = calificacion;

  if (!total) {
    return (
      <div className="flex items-center gap-3">
        <Estrellas valor={0} tamano={compacto ? 16 : 20} />
        <p className="text-sm text-secondary-500">Este vendedor aún no tiene calificaciones.</p>
      </div>
    );
  }

  return (
    <div className={['flex gap-6', compacto ? 'flex-col sm:flex-row sm:items-center' : 'flex-col'].join(' ')}>
      <div className="flex items-center gap-3">
        <p className="text-4xl font-bold tabular-nums text-secondary-900">
          {promedio.toLocaleString('es-GT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
        </p>
        <div>
          <Estrellas valor={promedio} tamano={18} />
          <p className="mt-0.5 text-xs text-secondary-500">{total} {total === 1 ? 'reseña' : 'reseñas'}</p>
        </div>
      </div>

      {/* Cuántas reseñas tiene de cada calificación */}
      <dl className="min-w-0 flex-1 space-y-1" aria-label="Reseñas por calificación">
        {[5, 4, 3, 2, 1].map((n) => {
          const cantidad = distribucion?.[n] ?? 0;
          return (
            <div key={n} className="grid grid-cols-[3.5rem_1fr_1.5rem] items-center gap-2 text-xs">
              <dt className="text-secondary-600">{n} {n === 1 ? 'estrella' : 'estrellas'}</dt>
              <dd className="h-2 overflow-hidden rounded-full bg-secondary-100" aria-hidden="true">
                <div className="h-full rounded-full bg-warning-500" style={{ width: `${(cantidad / total) * 100}%` }} />
              </dd>
              <dd className="text-right tabular-nums text-secondary-600">{cantidad}</dd>
            </div>
          );
        })}
      </dl>
    </div>
  );
}
