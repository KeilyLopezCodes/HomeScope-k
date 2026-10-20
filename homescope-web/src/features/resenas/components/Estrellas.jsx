import { useState } from 'react';
import { Star } from 'lucide-react';

// Estrellas de solo lectura; admite fracciones (4.3 → cuatro llenas y un tercio de la quinta)
export function Estrellas({ valor = 0, tamano = 16, className = '' }) {
  const etiqueta = `${Number(valor).toLocaleString('es-GT', { maximumFractionDigits: 1 })} de 5 estrellas`;
  return (
    <span role="img" aria-label={etiqueta} title={etiqueta} className={['inline-flex gap-0.5', className].join(' ')}>
      {[1, 2, 3, 4, 5].map((n) => {
        const relleno = Math.max(0, Math.min(1, valor - (n - 1)));
        return (
          <span key={n} className="relative inline-block" style={{ width: tamano, height: tamano }} aria-hidden="true">
            <Star size={tamano} className="absolute inset-0 text-secondary-300" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${relleno * 100}%` }}>
              <Star size={tamano} className="fill-warning-500 text-warning-500" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export const ETIQUETAS_CALIFICACION = { 1: 'Muy malo', 2: 'Malo', 3: 'Regular', 4: 'Bueno', 5: 'Excelente' };

// Selector de 1 a 5 estrellas: clic, o flechas del teclado dentro del grupo
export function SelectorEstrellas({ valor, onChange, id }) {
  const [sobre, setSobre] = useState(null);
  const mostrado = sobre ?? valor ?? 0;

  function teclado(e) {
    if (['ArrowRight', 'ArrowUp'].includes(e.key)) { e.preventDefault(); onChange(Math.min(5, (valor ?? 0) + 1)); }
    if (['ArrowLeft', 'ArrowDown'].includes(e.key)) { e.preventDefault(); onChange(Math.max(1, (valor ?? 2) - 1)); }
  }

  return (
    <div className="flex items-center gap-3">
      <div role="radiogroup" id={id} aria-label="Calificación" onKeyDown={teclado} onMouseLeave={() => setSobre(null)} className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={valor === n}
            aria-label={`${n} ${n === 1 ? 'estrella' : 'estrellas'}: ${ETIQUETAS_CALIFICACION[n]}`}
            // Solo la estrella elegida (o la primera) es tabulable; las flechas mueven la selección
            tabIndex={valor ? (valor === n ? 0 : -1) : (n === 1 ? 0 : -1)}
            onClick={() => onChange(n)}
            onMouseEnter={() => setSobre(n)}
            className="rounded p-0.5 transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
          >
            <Star
              size={28}
              aria-hidden="true"
              className={n <= mostrado ? 'fill-warning-500 text-warning-500' : 'text-secondary-300'}
            />
          </button>
        ))}
      </div>
      <span className="text-sm font-medium text-secondary-700" aria-live="polite">
        {mostrado ? ETIQUETAS_CALIFICACION[mostrado] : 'Elige de 1 a 5 estrellas'}
      </span>
    </div>
  );
}
