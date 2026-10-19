import { useState } from 'react';
import { ChevronDown, Loader2, MapPinOff } from 'lucide-react';
import { SemaforoGrande, formatearPuntaje, nivelIndice } from './Semaforo';
import { IconoCategoria } from './PuntosInteres';
import { CATEGORIAS, formatearDistancia } from '../config/categorias';

const RESUMEN_NIVEL = {
  verde:    'Tiene cerca la mayoría de los servicios del día a día.',
  amarillo: 'Tiene cerca algunos servicios; para otros hay que desplazarse.',
  rojo:     'Pocos servicios cercanos; la mayoría requiere desplazarse.',
};

// Fila del desglose: peso, subpuntaje (barra con el color de su nivel), aporte al total y datos de apoyo
function FilaCategoria({ sub, radio = 1500 }) {
  const { nombre } = CATEGORIAS[sub.categoria] ?? { nombre: sub.categoria };
  const nivelSub = nivelIndice(sub.puntaje);
  const aporte = sub.peso != null ? sub.peso * sub.puntaje : null;

  return (
    <li className="py-2.5">
      <div className="flex items-center gap-2 text-sm">
        {CATEGORIAS[sub.categoria] && <IconoCategoria categoria={sub.categoria} size={12} className="h-5 w-5" />}
        <span className="font-medium text-secondary-800">{nombre}</span>
        {sub.peso != null && <span className="text-xs text-secondary-400">peso {Math.round(sub.peso * 100)} %</span>}
        <span className="ml-auto font-semibold tabular-nums text-secondary-900">{formatearPuntaje(sub.puntaje)}</span>
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-secondary-100" aria-hidden="true">
        <div
          className={['h-full rounded-full', nivelSub.luz].join(' ')}
          style={{ width: `${Math.min(100, Math.max(0, sub.puntaje))}%` }}
        />
      </div>
      <p className="mt-1 flex flex-wrap justify-between gap-x-3 text-xs text-secondary-500">
        <span>
          {sub.cantidad_puntos != null && (sub.cantidad_puntos
            ? `${sub.cantidad_puntos} ${sub.cantidad_puntos === 1 ? 'lugar' : 'lugares'} a menos de ${formatearDistancia(radio)}`
            : `Ninguno a menos de ${formatearDistancia(radio)}`)}
          {sub.distancia_minima_m != null && ` · el más cercano a ${formatearDistancia(sub.distancia_minima_m)}`}
        </span>
        {aporte != null && <span className="tabular-nums">aporta {formatearPuntaje(Math.round(aporte * 100) / 100)}</span>}
      </p>
    </li>
  );
}

// indice: { puntaje, nivel, subpuntajes: [{ categoria, peso, puntaje, cantidad_puntos, distancia_minima_m }],
//           radio_m, fecha_calculo, version_algoritmo } o null
// estado: 'calculado' | 'en_calculo' | 'sin_ubicacion' (indice_estado de la API)
export default function IndiceConveniencia({ indice, estado }) {
  // El desglose empieza cerrado: se abre con el botón
  const [abierto, setAbierto] = useState(false);

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

  const nivel = nivelIndice(indice.puntaje, indice.nivel);
  const subpuntajes = indice.subpuntajes ?? [];

  return (
    <section aria-labelledby="indice-titulo" className="rounded-lg border border-secondary-200 bg-white p-4 sm:p-5">
      <div className="flex items-center gap-4">
        <SemaforoGrande puntaje={indice.puntaje} nivel={indice.nivel} className="shrink-0" />
        <div className="min-w-0">
          <h2 id="indice-titulo" className="text-sm font-medium text-secondary-600">Índice de Conveniencia</h2>
          <p className="flex items-baseline gap-1">
            <span className={['text-3xl font-bold tabular-nums', nivel.texto].join(' ')}>
              {formatearPuntaje(indice.puntaje)}
            </span>
            <span className="text-sm text-secondary-500">/ 100</span>
          </p>
          <p className={['text-sm font-semibold', nivel.texto].join(' ')}>Conveniencia {nivel.etiqueta.toLowerCase()}</p>
          <p className="mt-0.5 text-xs text-secondary-500">{RESUMEN_NIVEL[nivel.clave]}</p>
        </div>
      </div>

      {subpuntajes.length > 0 && (
        <>
          <button
            type="button"
            onClick={() => setAbierto((v) => !v)}
            aria-expanded={abierto}
            aria-controls="indice-desglose"
            className="mt-4 flex w-full items-center justify-between rounded-md border border-secondary-200 px-3 py-2 text-sm font-medium text-secondary-700 hover:bg-secondary-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            {abierto ? 'Ocultar desglose' : 'Ver desglose por categoría'}
            <ChevronDown size={16} aria-hidden="true" className={['transition-transform', abierto ? 'rotate-180' : ''].join(' ')} />
          </button>

          {abierto && (
            <div id="indice-desglose" className="mt-3">
              <ul className="divide-y divide-secondary-100">
                {subpuntajes.map((s) => <FilaCategoria key={s.categoria} sub={s} radio={indice.radio_m} />)}
              </ul>
              <p className="mt-2 flex justify-between border-t border-secondary-200 pt-2 text-sm font-semibold text-secondary-900">
                <span>Índice (suma de aportes)</span>
                <span className="tabular-nums">{formatearPuntaje(indice.puntaje)}</span>
              </p>
              <p className="mt-2 text-xs text-secondary-500">
                Cada categoría se califica de 0 a 100 según qué tan cerca está el lugar más cercano y cuántos hay cerca;
                su aporte es esa calificación multiplicada por su peso.
              </p>
            </div>
          )}
        </>
      )}

      {indice.fecha_calculo && (
        <p className="mt-4 text-xs text-secondary-400">
          Calculado el {new Intl.DateTimeFormat('es-GT', { dateStyle: 'medium' }).format(new Date(indice.fecha_calculo))}
          {' '}con servicios a menos de {formatearDistancia(indice.radio_m ?? 1500)} · algoritmo {indice.version_algoritmo}
        </p>
      )}
    </section>
  );
}
