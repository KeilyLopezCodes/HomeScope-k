import { useState } from 'react';
import { CarFront, Footprints } from 'lucide-react';
import { CATEGORIAS, formatearDistancia } from '../config/categorias';

const VISIBLES = 5;

export function IconoCategoria({ categoria, size = 14, className = '' }) {
  const { Icono, color } = CATEGORIAS[categoria];
  return (
    <span
      aria-hidden="true"
      style={{ backgroundColor: color }}
      className={['inline-flex shrink-0 items-center justify-center rounded-full text-white', className].join(' ')}
    >
      <Icono size={size} strokeWidth={2.25} />
    </span>
  );
}

function GrupoCategoria({ grupo, radio }) {
  const [todos, setTodos] = useState(false);
  const { nombre } = CATEGORIAS[grupo.categoria];
  const visibles = todos ? grupo.puntos : grupo.puntos.slice(0, VISIBLES);

  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-secondary-800">
        <IconoCategoria categoria={grupo.categoria} className="h-6 w-6" />
        {nombre}
        <span className="font-normal text-secondary-500">({grupo.total})</span>
      </h3>

      {grupo.error ? (
        <p className="text-xs text-danger-600">No se pudo cargar esta categoría.</p>
      ) : !grupo.total ? (
        <p className="text-xs text-secondary-500">Ninguno a menos de {formatearDistancia(radio)}.</p>
      ) : (
        <>
          <ul className="space-y-1.5">
            {visibles.map((p) => (
              <li key={p.place_id} className="flex items-start justify-between gap-3 text-sm">
                <span className="min-w-0 truncate text-secondary-700" title={p.nombre}>{p.nombre}</span>
                <span className="shrink-0 text-right text-xs text-secondary-500">
                  <span className="block font-medium text-secondary-800">{formatearDistancia(p.distancia_m)}</span>
                  <span className="inline-flex items-center gap-2">
                    <span className="inline-flex items-center gap-0.5" title="Caminando (estimado)">
                      <Footprints size={12} aria-hidden="true" />
                      <span className="sr-only">Caminando:</span>{p.tiempo_estimado.caminando_min} min
                    </span>
                    <span className="inline-flex items-center gap-0.5" title="En auto (estimado)">
                      <CarFront size={12} aria-hidden="true" />
                      <span className="sr-only">En auto:</span>{p.tiempo_estimado.en_auto_min} min
                    </span>
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {grupo.total > VISIBLES && (
            <button
              type="button"
              onClick={() => setTodos((v) => !v)}
              className="mt-1.5 text-xs font-medium text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            >
              {todos ? 'Ver menos' : `Ver los ${grupo.total}`}
            </button>
          )}
        </>
      )}
    </div>
  );
}

// grupos: categorias de la respuesta de /geo/propiedades/:id/puntos-interes
export default function PuntosInteres({ grupos = [], radio }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {grupos.map((g) => <GrupoCategoria key={g.categoria} grupo={g} radio={radio} />)}
    </div>
  );
}
