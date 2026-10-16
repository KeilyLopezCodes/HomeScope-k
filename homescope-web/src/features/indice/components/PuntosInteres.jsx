import { CATEGORIAS } from './IndiceConveniencia';

function formatearDistancia(metros) {
  return metros < 1000 ? `${Math.round(metros)} m` : `${(metros / 1000).toFixed(1)} km`;
}

// puntos: [{ id, nombre, categoria, distancia_m }] precalculados en BD (ADR-08)
export default function PuntosInteres({ puntos = [] }) {
  if (!puntos.length) {
    return (
      <p className="text-sm text-secondary-500">
        Los puntos de interés cercanos se mostrarán cuando termine el cálculo del índice.
      </p>
    );
  }

  const porCategoria = puntos.reduce(
    (acc, p) => ({ ...acc, [p.categoria]: [...(acc[p.categoria] ?? []), p] }), {});

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {Object.entries(porCategoria).map(([categoria, lista]) => (
        <div key={categoria}>
          <h3 className="mb-1 text-sm font-semibold text-secondary-800">{CATEGORIAS[categoria] ?? categoria}</h3>
          <ul className="space-y-1">
            {[...lista].sort((a, b) => a.distancia_m - b.distancia_m).slice(0, 5).map((p) => (
              <li key={p.id} className="flex justify-between gap-2 text-sm">
                <span className="truncate text-secondary-600">{p.nombre}</span>
                <span className="shrink-0 text-secondary-500">{formatearDistancia(p.distancia_m)}</span>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
