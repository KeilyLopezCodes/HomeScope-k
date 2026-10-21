import { ArrowLeftRight, TrendingDown, TrendingUp } from 'lucide-react';
import { formatearFecha, formatearPrecio } from '../utils/formato';

// historial: [{ id, precio_anterior, precio_nuevo, fecha_cambio }] del más antiguo al más reciente
export default function HistorialPrecios({ historial = [], moneda, fechaPublicacion }) {
  if (!historial.length) {
    return (
      <p className="text-sm text-secondary-500">
        El precio no ha cambiado{fechaPublicacion ? ` desde su publicación el ${formatearFecha(fechaPublicacion)}` : ''}.
      </p>
    );
  }

  // Línea de tiempo: el cambio más reciente arriba
  return (
    <ol className="space-y-3 border-l-2 border-secondary-200 pl-4">
      {[...historial].reverse().map((cambio) => {
        const anterior = Number(cambio.precio_anterior);
        const nuevo    = Number(cambio.precio_nuevo);
        // Cada cambio guarda su moneda; los registros antiguos sin ella usan la actual de la propiedad
        const monedaAnterior = cambio.moneda_anterior ?? moneda;
        const monedaNueva    = cambio.moneda_nueva ?? moneda;
        const cambioMoneda   = monedaAnterior !== monedaNueva;
        const bajo     = nuevo < anterior;
        const pct      = anterior ? Math.abs(((nuevo - anterior) / anterior) * 100) : 0;
        const Icono    = cambioMoneda ? ArrowLeftRight : bajo ? TrendingDown : TrendingUp;

        return (
          <li key={cambio.id} className="relative">
            <span className="absolute -left-[1.3rem] top-1.5 h-2.5 w-2.5 rounded-full bg-secondary-300" aria-hidden="true" />
            <p className="text-xs text-secondary-500">{formatearFecha(cambio.fecha_cambio)}</p>
            <p className="flex flex-wrap items-center gap-x-2 text-sm">
              <span className="text-secondary-400 line-through">{formatearPrecio(anterior, monedaAnterior)}</span>
              <span className="font-semibold text-secondary-900">{formatearPrecio(nuevo, monedaNueva)}</span>
              {cambioMoneda ? (
                <span className="inline-flex items-center gap-0.5 text-xs font-medium text-secondary-600">
                  <Icono size={14} aria-hidden="true" /> Cambió de moneda ({monedaAnterior} → {monedaNueva})
                </span>
              ) : (
                <span className={['inline-flex items-center gap-0.5 text-xs font-medium', bajo ? 'text-success-700' : 'text-danger-600'].join(' ')}>
                  <Icono size={14} aria-hidden="true" />
                  {bajo ? 'Bajó' : 'Subió'} {pct.toFixed(1)}%
                </span>
              )}
            </p>
          </li>
        );
      })}
    </ol>
  );
}
