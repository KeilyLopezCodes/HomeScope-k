import { X } from 'lucide-react';
import { MODALIDADES, TIPOS } from '../config/filtros';

const precio = (valor, moneda) => new Intl.NumberFormat('es-GT', {
  style: 'currency', currency: moneda ?? 'GTQ', maximumFractionDigits: 0,
}).format(valor);

export function formatearRangoPrecio({ precio_min, precio_max, moneda }) {
  if (precio_min != null && precio_max != null) return `${precio(precio_min, moneda)} – ${precio(precio_max, moneda)}`;
  if (precio_min != null) return `Desde ${precio(precio_min, moneda)}`;
  return `Hasta ${precio(precio_max, moneda)}`;
}

// Un chip por filtro aplicado; `claves` son los parámetros que borra su ✕
function chips(f) {
  const lista = [];
  if (f.q) lista.push({ id: 'q', texto: `“${f.q}”`, claves: ['q'] });
  if (f.modalidad) lista.push({ id: 'modalidad', texto: MODALIDADES.find((m) => m.valor === f.modalidad).etiqueta, claves: ['modalidad'] });
  if (f.tipo) lista.push({ id: 'tipo', texto: f.tipo.map((t) => TIPOS.find((x) => x.valor === t).etiqueta).join(', '), claves: ['tipo'] });
  if (f.precio_min != null || f.precio_max != null)
    lista.push({ id: 'precio', texto: formatearRangoPrecio(f), claves: ['precio_min', 'precio_max', 'moneda'] });
  if (f.habitaciones_min != null)
    lista.push({ id: 'hab', texto: `${f.habitaciones_min}+ habitaciones`, claves: ['habitaciones_min'] });
  if (f.indice_min != null) lista.push({ id: 'indice', texto: `Índice ${f.indice_min}+`, claves: ['indice_min'] });
  return lista;
}

export default function FiltrosActivos({ filtros, onQuitar, onLimpiar }) {
  const lista = chips(filtros);
  if (!lista.length) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label="Filtros activos">
      <span className="text-xs font-medium uppercase tracking-wide text-secondary-500">Filtros activos:</span>
      <ul className="contents">
        {lista.map((c) => (
          <li key={c.id}>
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary-800 py-1 pl-3 pr-1 text-xs font-medium text-white">
              {c.texto}
              <button
                type="button"
                onClick={() => onQuitar(...c.claves)}
                aria-label={`Quitar filtro ${c.texto}`}
                className="rounded-full p-0.5 hover:bg-secondary-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                <X size={12} aria-hidden="true" />
              </button>
            </span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onLimpiar}
        className="text-xs font-medium text-primary-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
      >
        Limpiar filtros
      </button>
    </div>
  );
}
