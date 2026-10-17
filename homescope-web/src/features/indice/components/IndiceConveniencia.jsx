import { Loader2, MapPinOff } from 'lucide-react';
import Semaforo, { nivelIndice } from './Semaforo';
import { CATEGORIAS } from '../config/categorias';

// indice: { puntaje, subpuntajes: [{ categoria, puntaje }], fecha_calculo } o null
// estado: 'calculado' | 'en_calculo' | 'sin_ubicacion' (indice_estado de la API)
export default function IndiceConveniencia({ indice, estado }) {
  if (!indice && estado === 'sin_ubicacion') {
    return (
      <section aria-labelledby="indice-titulo" className="rounded-lg border border-secondary-200 bg-white p-4 sm:p-5">
        <h2 id="indice-titulo" className="text-base font-semibold text-secondary-900">Índice de Conveniencia</h2>
        <div className="mt-3 flex items-start gap-3 rounded-md bg-secondary-50 p-3">
          <MapPinOff size={18} className="mt-0.5 shrink-0 text-secondary-400" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-secondary-800">Índice no disponible</p>
            <p className="text-xs text-secondary-500">
              Esta propiedad no tiene su ubicación exacta registrada. El índice se calcula cuando el vendedor la marca en el mapa.
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!indice) {
    return (
      <section aria-labelledby="indice-titulo" className="rounded-lg border border-secondary-200 bg-white p-4 sm:p-5">
        <h2 id="indice-titulo" className="text-base font-semibold text-secondary-900">Índice de Conveniencia</h2>
        <div className="mt-3 flex items-start gap-3 rounded-md bg-secondary-50 p-3">
          <Loader2 size={18} className="mt-0.5 shrink-0 animate-spin text-primary-600" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-secondary-800">Índice en cálculo</p>
            <p className="text-xs text-secondary-500">
              Estamos analizando los servicios cercanos a esta propiedad. El puntaje y su desglose
              aparecerán aquí en cuanto estén listos.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const nivel = nivelIndice(indice.puntaje);

  return (
    <section aria-labelledby="indice-titulo" className="rounded-lg border border-secondary-200 bg-white p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="indice-titulo" className="text-base font-semibold text-secondary-900">
          Índice de Conveniencia: {Math.round(indice.puntaje)}
        </h2>
        <Semaforo puntaje={indice.puntaje} />
      </div>

      {indice.subpuntajes?.length > 0 && (
        <dl className="mt-4 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
          {indice.subpuntajes.map(({ categoria, puntaje }) => (
            <div key={categoria} className="grid grid-cols-[6.5rem_1fr_2rem] items-center gap-2 text-sm">
              <dt className="text-secondary-600">{CATEGORIAS[categoria]?.nombre ?? categoria}</dt>
              <dd className="h-2 overflow-hidden rounded-full bg-secondary-100" aria-hidden="true">
                <div
                  className={['h-full rounded-full', nivelIndice(puntaje)?.luz ?? nivel.luz].join(' ')}
                  style={{ width: `${Math.min(100, Math.max(0, puntaje))}%` }}
                />
              </dd>
              <dd className="text-right font-medium text-secondary-800">{Math.round(puntaje)}</dd>
            </div>
          ))}
        </dl>
      )}

      {indice.fecha_calculo && (
        <p className="mt-4 text-xs text-secondary-400">
          Calculado el {new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium' }).format(new Date(indice.fecha_calculo))}
          {' '}con servicios a menos de 1.5 km · algoritmo {indice.version_algoritmo}
        </p>
      )}
    </section>
  );
}
